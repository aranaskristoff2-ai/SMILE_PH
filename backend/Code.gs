// =====================================================
// SMILE v10 - See More of Islands' Landmarks and Events (PhilPost Western Visayas: Panay, Guimaras and the Negros Island Region)
// Backend: Google Apps Script + Meta Model API (Muse Spark for text and vision, Muse Image for the photobooth)
// Flow: Isidro -> Challenge -> Maps -> Postcard -> Mail -> Adopt
// Photobooth: Actual / AI Outfit (Moderated) -> CONQUERED Postcard
//
// v10 changes: every place and shop has a "province" (aklan, antique, capiz, guimaras, iloilo,
//  negros-occidental, negros-oriental, siquijor). Places column J and Shops column K hold it; setup() adds
//  the columns and the built-in places across the eight provinces. Isidro picks from the tourist's province first.
//  v15.3: police stations, barangay tanod outposts, fire stations, DRRMOs and municipal health offices can enroll too.
//  v15.2: Hotline partners: hospitals, clinics, vets and drugstores enroll with phone and GPS pin (pending until verified);
//         Hotlines sheet gains lat, lng, address, contact_person, created.
//  v15.0: SMILE Pass and staff awards removed (postcards come with the stamp from authorized merchants);
//         Isidro "near me" can point to the nearest post office.
//  v14.9: Hotline button: national numbers (911, Red Cross 143), nearest police/hospital/clinic/vet/drugstore
//         map search, and local numbers from the Hotlines sheet (status "approved").
//  v14.8: profile photos (selfie or upload, checked by Muse Spark; Accounts column K, shown on profiles and Hub posts).
//  v14.7: Isidro "near me": the phone GPS location (sent with the question, never saved) gives distances to places
//         and shops; Shops columns N and O hold lat and lng (setup() fills the built-in shops; merchants can pin by GPS).
//  v13: Muse Voice Transcribe (mic for Isidro and the journal), accounts, travel journal, SMILE Hub.
//  v12: Isidro chat with memory, festival calendar, merchant dashboard (ShopStats sheet, Shops column M manage_code).
//  v11: SAM 3.1 finds products in merchants' photos and promo videos; media saved in Google Drive (Media sheet).
//  v10.2: Shops column L "featured": type yes for merchants on the featured subscription; they list first.
//
// v9 changes (matches the SMILE v9 GitHub Pages frontend):
//  - Places sheet has a 9th column "maps_url". When it is filled, Directions use it
//    (Kap Esing's and Fort in the City at Iloilo Central Market, Arevalo seafood).
//  - New places: chicken-inasal, seafoods. pancit-molo now points to Kap Esing's.
//  - setup() is now SAFE to run again: it never clears Users, Postcards, Journey, etc.
//    It only creates missing sheets/headers and adds/updates the built-in places.
//  - Fixed: adopt_postcard read the sender from the wrong row.
//  - Fixed: vision cut the photo data in half (broken image); now sends the full photo
//    and also returns match / confidence / reason fields.
//  - Fixed: a postcard could be mailed again before anyone adopted it.
//  - Locks now wait properly and points updates for adopt are locked too.
// =====================================================

var SS_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE"; // your own Google Sheet ID (kept private)
var VERSION = "SMILE v15.3";

var PROVINCES = {"aklan":"Aklan","antique":"Antique","capiz":"Capiz","guimaras":"Guimaras","iloilo":"Iloilo","negros-occidental":"Negros Occidental","negros-oriental":"Negros Oriental","siquijor":"Siquijor"};
function provinceId(v){ var k=String(v||"").toLowerCase().trim(); return PROVINCES[k] ? k : "iloilo"; }
function provinceName(v){ return PROVINCES[provinceId(v)]; }

// Festival calendar (the app has the same list). "when" is what Isidro tells tourists.
var EVENTS = [
  {id:"ati-atihan", place:"ati-atihan", months:[1], when:"third Sunday of January (week-long)"},
  {id:"dinagyang", place:"dinagyang", months:[1], when:"fourth Sunday of January (festival weekend)"},
  {id:"paraw-regatta", place:"paraw-regatta", months:[2], when:"usually the third weekend of February"},
  {id:"panaad", place:"panaad", months:[3,4], when:"March or April (dates set each year)"},
  {id:"healing-festival", place:"healing-festival", months:[3,4], when:"Holy Week, highlight on Black Saturday"},
  {id:"manggahan", place:"manggahan", months:[5], when:"May (activities can start in late April)"},
  {id:"masskara", place:"masskara", months:[10], when:"October, climax on the fourth Sunday"},
  {id:"buglasan", place:"buglasan", months:[10], when:"October (dates set each year)"},
  {id:"sinadya", place:"sinadya", months:[12], when:"early December, around December 8"},
  {id:"binirayan", place:"binirayan", months:[12], when:"December (dates set each year)"}
];
function manilaToday_(){ return Utilities.formatDate(new Date(), "Asia/Manila", "EEEE, MMMM d, yyyy"); }
function eventsText_(){
  var names = {}; getPlacesData().forEach(function(p){ names[p.id] = p.name+" ("+provinceName(p.province)+")"; });
  return EVENTS.map(function(e){ return (names[e.place]||e.id)+" [place id "+e.place+"]: "+e.when; }).join("; ");
}

var CENTRAL_MARKET = {lat:10.6966, lng:122.5683};

var PLACES_FALLBACK = [
  {province:"iloilo", id:"molo-church", name:"Molo Church", cat:"landmark", barangay:"Molo", desc:"Gothic church with all-female saints.", points:10, lat:10.6974, lng:122.5441},
  {province:"iloilo", id:"jaro-cathedral", name:"Jaro Cathedral", cat:"landmark", barangay:"Jaro", desc:"Our Lady of Candles shrine, est. 1874.", points:10, lat:10.7240, lng:122.5563},
  {province:"iloilo", id:"miagao-church", name:"Miagao Church UNESCO", cat:"landmark", barangay:"Miagao", desc:"World Heritage baroque fortress church.", points:20, lat:10.6420, lng:122.2358},
  {province:"iloilo", id:"calle-real", name:"Calle Real", cat:"heritage", barangay:"City Proper", desc:"Heritage street, old buildings, museums & coffee.", points:10, lat:10.6938, lng:122.5742},
  {province:"iloilo", id:"iloilo-capitol", name:"Iloilo Provincial Capitol", cat:"heritage", barangay:"City Proper", desc:"Iconic capitol with PH flag, near Calle Real.", points:10, lat:10.7020, lng:122.5685},
  {province:"iloilo", id:"esplanade", name:"Iloilo Esplanade", cat:"nature", barangay:"Mandurriao", desc:"Best sunset riverside walk in Iloilo City.", points:5, lat:10.7085, lng:122.5488},
  {province:"iloilo", id:"lapaz-batchoy", name:"Netong's Batchoy", cat:"food", barangay:"La Paz", desc:"Original La Paz Batchoy since 1940s.", points:5, lat:10.7118, lng:122.5690},
  {province:"iloilo", id:"pancit-molo", name:"Pancit Molo at Kap Esing's", cat:"food", barangay:"Iloilo Central Market", desc:"Kap Esing's classic Ilonggo pancit molo: pork dumplings in garlicky chicken broth.", points:5, lat:CENTRAL_MARKET.lat, lng:CENTRAL_MARKET.lng,
    maps_url:"https://www.google.com/maps/search/?api=1&query=Kap+Esing%27s+Pancit+Molo+Iloilo+Central+Market"},
  {province:"iloilo", id:"chicken-inasal", name:"Chicken Inasal at Fort in the City", cat:"food", barangay:"Iloilo Central Market", desc:"Charcoal-grilled Ilonggo inasal with garlic rice and chicken oil at Fort in the City.", points:5, lat:CENTRAL_MARKET.lat, lng:CENTRAL_MARKET.lng,
    maps_url:"https://www.google.com/maps/search/?api=1&query=Fort+in+the+City+Iloilo+Central+Market"},
  {province:"iloilo", id:"seafoods", name:"Seafood Feast in Arevalo", cat:"food", barangay:"Villa Arevalo", desc:"Fresh crabs, prawns, scallops and mussels by the sea.", points:5, lat:10.6877, lng:122.5135,
    maps_url:"https://www.google.com/maps/search/?api=1&query=Seafood+restaurant+Villa+Arevalo+Iloilo"},
  {province:"iloilo", id:"robertos-siopao", name:"Queen Siopao at Roberto's", cat:"food", barangay:"J.M. Basa St, City Proper", desc:"Roberto's famous giant Queen siopao, stuffed with chicken and pork adobo. Go late morning before it sells out.", points:5, lat:10.6935, lng:122.5718,
    maps_url:"https://www.google.com/maps/search/?api=1&query=Roberto%27s+Siopao+J.M.+Basa+Street+Iloilo+City"},
  {province:"iloilo", id:"dinagyang", name:"Dinagyang Festival", cat:"festival", barangay:"City Proper", desc:"Ati warriors dance, last weekend of January.", points:25, lat:10.6930, lng:122.5720},
  {province:"iloilo", id:"gigantes", name:"Islas de Gigantes", cat:"stay", barangay:"Carles", desc:"Island hopping, lagoons, fresh scallops in Carles.", points:20, lat:11.5867, lng:123.1767},
  {province:"iloilo", id:"garin-farm", name:"Garin Farm", cat:"nature", barangay:"San Joaquin", desc:"Pilgrimage hill with giant white cross.", points:15, lat:10.5978, lng:122.0983},
  {"id": "boracay-white-beach", "province": "aklan", "name": "White Beach, Boracay", "cat": "stay", "barangay": "Balabag, Boracay", "desc": "Boracay's famous powdery white-sand beach. Stay for the sunset and the paraw sailboats.", "points": 20, "lat": 11.9674, "lng": 121.9248, "maps_url": "https://www.google.com/maps/search/?api=1&query=White+Beach+Boracay"},
  {"id": "puka-beach", "province": "aklan", "name": "Puka Shell Beach", "cat": "nature", "barangay": "Yapak, Boracay", "desc": "Quieter northern beach with shell sand and clear blue water.", "points": 15, "lat": 11.9945, "lng": 121.9175, "maps_url": "https://www.google.com/maps/search/?api=1&query=Puka+Shell+Beach+Boracay"},
  {"id": "ati-atihan", "province": "aklan", "name": "Ati-Atihan Festival", "cat": "festival", "barangay": "Kalibo", "desc": "Kalibo's street festival for the Santo Niño every January. Paint your face and dance to the drums.", "points": 25, "lat": 11.7071, "lng": 122.3647, "maps_url": "https://www.google.com/maps/search/?api=1&query=Ati-Atihan+Festival+Kalibo"},
  {"id": "bakhawan-eco-park", "province": "aklan", "name": "Bakhawan Eco-Park", "cat": "nature", "barangay": "New Buswang, Kalibo", "desc": "Bamboo boardwalk through a planted mangrove forest out to the sea.", "points": 10, "lat": 11.7183, "lng": 122.3797, "maps_url": "https://www.google.com/maps/search/?api=1&query=Bakhawan+Eco-Park+Kalibo"},
  {"id": "real-coffee-boracay", "province": "aklan", "name": "Calamansi Muffins at Real Coffee", "cat": "food", "barangay": "Balabag, Boracay", "desc": "Boracay's famous calamansi muffins. Grab a few before the beach.", "points": 5, "lat": 11.9625, "lng": 121.9255, "maps_url": "https://www.google.com/maps/search/?api=1&query=Real+Coffee+and+Tea+Cafe+Boracay"},
  {"id": "mararison-island", "province": "antique", "name": "Mararison Island", "cat": "stay", "barangay": "Culasi", "desc": "Rolling green hills and white sandbars off the town of Culasi.", "points": 20, "lat": 11.414, "lng": 121.962, "maps_url": "https://www.google.com/maps/search/?api=1&query=Mararison+Island+Culasi+Antique"},
  {"id": "tibiao-kawa", "province": "antique", "name": "Kawa Hot Bath in Tibiao", "cat": "nature", "barangay": "Tibiao", "desc": "Soak in a giant cauldron (kawa) of warm water and herbs beside the river.", "points": 15, "lat": 11.29, "lng": 122.035, "maps_url": "https://www.google.com/maps/search/?api=1&query=Kawa+Hot+Bath+Tibiao+Antique"},
  {"id": "binirayan", "province": "antique", "name": "Binirayan Festival", "cat": "festival", "barangay": "San Jose de Buenavista", "desc": "Antique's festival recalling the landing of the ten Bornean datus.", "points": 25, "lat": 10.744, "lng": 121.941, "maps_url": "https://www.google.com/maps/search/?api=1&query=Binirayan+Festival+San+Jose+de+Buenavista+Antique"},
  {"id": "bagtason-patadyong", "province": "antique", "name": "Patadyong Weavers of Bagtason", "cat": "heritage", "barangay": "Bagtason, Bugasong", "desc": "See the hand-woven checkered patadyong cloth, Antique's pride, made on wooden looms.", "points": 10, "lat": 11.045, "lng": 122.065, "maps_url": "https://www.google.com/maps/search/?api=1&query=Bagtason+Loom+Weavers+Bugasong+Antique"},
  {"id": "panay-church", "province": "capiz", "name": "Santa Monica Church, Panay", "cat": "landmark", "barangay": "Panay", "desc": "Coral-stone church that houses one of the largest church bells in Asia.", "points": 15, "lat": 11.556, "lng": 122.794, "maps_url": "https://www.google.com/maps/search/?api=1&query=Santa+Monica+Parish+Church+Panay+Capiz"},
  {"id": "roxas-seafood", "province": "capiz", "name": "Seafood at Baybay, Roxas City", "cat": "food", "barangay": "Baybay, Roxas City", "desc": "Fresh scallops, oysters and crabs by the beach in the Seafood Capital of the Philippines.", "points": 5, "lat": 11.606, "lng": 122.738, "maps_url": "https://www.google.com/maps/search/?api=1&query=Baybay+Beach+seafood+Roxas+City"},
  {"id": "sinadya", "province": "capiz", "name": "Sinadya sa Halaran Festival", "cat": "festival", "barangay": "Roxas City", "desc": "Roxas City's December thanksgiving festival with river and street parades.", "points": 25, "lat": 11.5853, "lng": 122.7511, "maps_url": "https://www.google.com/maps/search/?api=1&query=Sinadya+sa+Halaran+Roxas+City"},
  {"id": "guimaras-mango-pizza", "province": "guimaras", "name": "Mango Pizza at The Pitstop", "cat": "food", "barangay": "San Miguel, Jordan", "desc": "Guimaras' famous pizza topped with sweet Guimaras mangoes.", "points": 5, "lat": 10.587, "lng": 122.596, "maps_url": "https://www.google.com/maps/search/?api=1&query=The+Pitstop+Guimaras+mango+pizza"},
  {"id": "trappist-monastery", "province": "guimaras", "name": "Trappist Monastery", "cat": "landmark", "barangay": "Jordan", "desc": "Peaceful abbey of Trappist monks. Their shop sells mango jams and other pasalubong.", "points": 10, "lat": 10.629, "lng": 122.607, "maps_url": "https://www.google.com/maps/search/?api=1&query=Trappist+Monastery+Guimaras"},
  {"id": "manggahan", "province": "guimaras", "name": "Manggahan Festival", "cat": "festival", "barangay": "Jordan", "desc": "Guimaras celebrates its famous sweet mangoes every May.", "points": 25, "lat": 10.658, "lng": 122.596, "maps_url": "https://www.google.com/maps/search/?api=1&query=Manggahan+Festival+Guimaras"},
  {"id": "guisi-lighthouse", "province": "guimaras", "name": "Guisi Lighthouse", "cat": "heritage", "barangay": "Dolores, Nueva Valencia", "desc": "Ruins of a Spanish-era lighthouse above a quiet beach.", "points": 15, "lat": 10.445, "lng": 122.62, "maps_url": "https://www.google.com/maps/search/?api=1&query=Guisi+Lighthouse+Guimaras"},
  {"id": "alubihod-beach", "province": "guimaras", "name": "Alubihod Beach", "cat": "stay", "barangay": "Nueva Valencia", "desc": "White-sand cove for swimming and island hopping.", "points": 15, "lat": 10.495, "lng": 122.58, "maps_url": "https://www.google.com/maps/search/?api=1&query=Alubihod+Beach+Guimaras"},
  {"id": "the-ruins", "province": "negros-occidental", "name": "The Ruins", "cat": "heritage", "barangay": "Talisay City", "desc": "Mansion ruins of a sugar baron, glowing at sunset: the Taj Mahal of Negros.", "points": 15, "lat": 10.679, "lng": 122.96, "maps_url": "https://www.google.com/maps/search/?api=1&query=The+Ruins+Talisay+Negros+Occidental"},
  {"id": "masskara", "province": "negros-occidental", "name": "MassKara Festival", "cat": "festival", "barangay": "Bacolod City", "desc": "Bacolod's smiling masks and street dancing every October.", "points": 25, "lat": 10.6765, "lng": 122.9509, "maps_url": "https://www.google.com/maps/search/?api=1&query=MassKara+Festival+Bacolod"},
  {"id": "san-sebastian-cathedral", "province": "negros-occidental", "name": "San Sebastian Cathedral", "cat": "landmark", "barangay": "Bacolod City", "desc": "Coral-stone cathedral facing the Bacolod public plaza.", "points": 10, "lat": 10.67, "lng": 122.947, "maps_url": "https://www.google.com/maps/search/?api=1&query=San+Sebastian+Cathedral+Bacolod"},
  {"id": "bacolod-inasal", "province": "negros-occidental", "name": "Bacolod Chicken Inasal", "cat": "food", "barangay": "Bacolod City", "desc": "Bacolod's own charcoal-grilled inasal with chicken oil and garlic rice.", "points": 5, "lat": 10.67, "lng": 122.95, "maps_url": "https://www.google.com/maps/search/?api=1&query=chicken+inasal+Bacolod+City"},
  {"id": "calea", "province": "negros-occidental", "name": "Cakes at Calea", "cat": "food", "barangay": "Bacolod City", "desc": "Bacolod's famous cake and coffee shop. Come for a slice, leave with a box.", "points": 5, "lat": 10.68, "lng": 122.955, "maps_url": "https://www.google.com/maps/search/?api=1&query=Calea+Pastries+and+Coffee+Bacolod"},
  {"id": "balay-negrense", "province": "negros-occidental", "name": "Balay Negrense, Silay", "cat": "heritage", "barangay": "Silay City", "desc": "Sugar-era ancestral house museum in Silay's heritage district.", "points": 10, "lat": 10.797, "lng": 122.974, "maps_url": "https://www.google.com/maps/search/?api=1&query=Balay+Negrense+Silay+City"},
  {"id": "mambukal", "province": "negros-occidental", "name": "Mambukal Resort", "cat": "nature", "barangay": "Murcia", "desc": "Mountain resort with hot springs, waterfalls and forest trails.", "points": 15, "lat": 10.517, "lng": 123.105, "maps_url": "https://www.google.com/maps/search/?api=1&query=Mambukal+Mountain+Resort+Murcia"},
  {"id": "rizal-boulevard", "province": "negros-oriental", "name": "Rizal Boulevard, Dumaguete", "cat": "nature", "barangay": "Dumaguete City", "desc": "Seaside promenade lined with acacia trees. Best for an evening walk and street food.", "points": 10, "lat": 9.309, "lng": 123.309, "maps_url": "https://www.google.com/maps/search/?api=1&query=Rizal+Boulevard+Dumaguete"},
  {"id": "silliman-hall", "province": "negros-oriental", "name": "Silliman Hall", "cat": "heritage", "barangay": "Silliman University, Dumaguete City", "desc": "American-era Victorian building, the oldest on the Silliman University campus.", "points": 10, "lat": 9.311, "lng": 123.308, "maps_url": "https://www.google.com/maps/search/?api=1&query=Silliman+Hall+Dumaguete"},
  {"id": "apo-island", "province": "negros-oriental", "name": "Apo Island", "cat": "stay", "barangay": "Dauin", "desc": "Marine sanctuary famous for snorkeling with sea turtles.", "points": 20, "lat": 9.075, "lng": 123.269, "maps_url": "https://www.google.com/maps/search/?api=1&query=Apo+Island+Negros+Oriental"},
  {"id": "manjuyod-sandbar", "province": "negros-oriental", "name": "Manjuyod Sandbar", "cat": "nature", "barangay": "Manjuyod", "desc": "White sandbar that appears at low tide, with cottages on stilts and dolphin watching in Tañon Strait.", "points": 15, "lat": 9.715, "lng": 123.219, "maps_url": "https://www.google.com/maps/search/?api=1&query=Manjuyod+Sandbar"},
  {"id": "budbud-kabog", "province": "negros-oriental", "name": "Budbud Kabog of Tanjay", "cat": "food", "barangay": "Tanjay City", "desc": "Sticky millet rice cake wrapped in banana leaves, a Tanjay specialty. Best with hot chocolate.", "points": 5, "lat": 9.515, "lng": 123.158, "maps_url": "https://www.google.com/maps/search/?api=1&query=budbud+kabog+Tanjay+City"},
  {"id": "buglasan", "province": "negros-oriental", "name": "Buglasan Festival", "cat": "festival", "barangay": "Dumaguete City", "desc": "Negros Oriental's festival of festivals every October, with every town's dancers on one stage.", "points": 25, "lat": 9.307, "lng": 123.305, "maps_url": "https://www.google.com/maps/search/?api=1&query=Buglasan+Festival+Dumaguete"},
  {"id": "cambugahay-falls", "province": "siquijor", "name": "Cambugahay Falls", "cat": "nature", "barangay": "Lazi", "desc": "Turquoise tiered falls with rope swings into the pools.", "points": 15, "lat": 9.139, "lng": 123.626, "maps_url": "https://www.google.com/maps/search/?api=1&query=Cambugahay+Falls+Siquijor"},
  {"id": "lazi-church", "province": "siquijor", "name": "Lazi Church and Convent", "cat": "landmark", "barangay": "Lazi", "desc": "Coral-stone church with one of the largest old convents in Asia.", "points": 15, "lat": 9.129, "lng": 123.636, "maps_url": "https://www.google.com/maps/search/?api=1&query=Lazi+Church+Siquijor"},
  {"id": "salagdoong-beach", "province": "siquijor", "name": "Salagdoong Beach", "cat": "stay", "barangay": "Maria", "desc": "White-sand beach with cliff-jumping platforms.", "points": 15, "lat": 9.204, "lng": 123.67, "maps_url": "https://www.google.com/maps/search/?api=1&query=Salagdoong+Beach+Siquijor"},
  {"id": "century-old-balete", "province": "siquijor", "name": "Century-Old Balete Tree", "cat": "nature", "barangay": "Lena, San Juan", "desc": "Giant balete tree with a fish-spa spring at its roots.", "points": 10, "lat": 9.164, "lng": 123.522, "maps_url": "https://www.google.com/maps/search/?api=1&query=Century+Old+Balete+Tree+Siquijor"},
  {"id": "healing-festival", "province": "siquijor", "name": "Healing Festival", "cat": "festival", "barangay": "San Antonio", "desc": "Holy Week gathering of Siquijor's folk healers and their herbal oils.", "points": 25, "lat": 9.17, "lng": 123.58, "maps_url": "https://www.google.com/maps/search/?api=1&query=Siquijor+Healing+Festival+San+Antonio"},
  {"id": "mt-kanlaon", "province": "negros-oriental", "name": "Mt. Kanlaon", "cat": "nature", "barangay": "Canlaon City", "desc": "Negros' highest peak and an active volcano. Enjoy the view from Canlaon City; climbing is closed during volcanic activity, so check PHIVOLCS advisories first.", "points": 10, "lat": 10.412, "lng": 123.132, "maps_url": "https://www.google.com/maps/search/?api=1&query=Canlaon+City+Negros+Oriental"},
  {"id": "paraw-regatta", "province": "iloilo", "name": "Paraw Regatta", "cat": "festival", "barangay": "Villa Arevalo shoreline, Iloilo City", "desc": "Asia's oldest traditional sailing event: colorful paraw sailboats race across the Iloilo Strait between Iloilo and Guimaras.", "points": 25, "lat": 10.6877, "lng": 122.5135, "maps_url": "https://www.google.com/maps/search/?api=1&query=Villa+Arevalo+beach+Iloilo+City"},
  {"id": "panaad", "province": "negros-occidental", "name": "Panaad sa Negros Festival", "cat": "festival", "barangay": "Panaad Park, Bacolod City", "desc": "Negros Occidental's festival of festivals: every town brings its dances, food and products to Panaad Park.", "points": 25, "lat": 10.6265, "lng": 122.9555, "maps_url": "https://www.google.com/maps/search/?api=1&query=Panaad+Park+and+Stadium+Bacolod"},
  {"id": "kalibo-cathedral", "province": "aklan", "name": "Kalibo Cathedral", "cat": "landmark", "barangay": "Kalibo", "desc": "St. John the Baptist Cathedral, the heart of Kalibo and the Ati-Atihan devotion to the Santo Niño.", "points": 10, "lat": 11.706, "lng": 122.365, "maps_url": "https://www.google.com/maps/search/?api=1&query=Kalibo+Cathedral+Aklan"},
  {"id": "mt-luho", "province": "aklan", "name": "Mt. Luho Viewpoint", "cat": "nature", "barangay": "Balabag, Boracay", "desc": "Boracay's highest point, with a 360° view of the island and its beaches.", "points": 10, "lat": 11.976, "lng": 121.933, "maps_url": "https://www.google.com/maps/search/?api=1&query=Mount+Luho+View+Park+Boracay"},
  {"id": "jawili-falls", "province": "aklan", "name": "Jawili Falls", "cat": "nature", "barangay": "Tangalan", "desc": "Seven tiers of cool pools in the forest, a short trip from Kalibo.", "points": 15, "lat": 11.76, "lng": 122.27, "maps_url": "https://www.google.com/maps/search/?api=1&query=Jawili+Falls+Tangalan+Aklan"},
  {"id": "anini-y-church", "province": "antique", "name": "Anini-y Church", "cat": "landmark", "barangay": "Anini-y", "desc": "Coral-stone church of Santa Monica facing the sea at the southern tip of Panay.", "points": 15, "lat": 10.431, "lng": 121.926, "maps_url": "https://www.google.com/maps/search/?api=1&query=Anini-y+Church+Antique"},
  {"id": "malumpati-spring", "province": "antique", "name": "Malumpati Cold Spring", "cat": "nature", "barangay": "Pandan", "desc": "Clear, ice-cold spring-fed river for swimming and bamboo rafting.", "points": 15, "lat": 11.702, "lng": 122.116, "maps_url": "https://www.google.com/maps/search/?api=1&query=Malumpati+Cold+Spring+Pandan+Antique"},
  {"id": "seco-island", "province": "antique", "name": "Seco Island", "cat": "stay", "barangay": "Tibiao", "desc": "Remote white sandbar island far off Antique's coast; book a boat in advance.", "points": 20, "lat": 11.68, "lng": 121.78, "maps_url": "https://www.google.com/maps/search/?api=1&query=Seco+Island+Antique"},
  {"id": "roxas-cathedral", "province": "capiz", "name": "Roxas City Cathedral", "cat": "landmark", "barangay": "Roxas City", "desc": "Immaculate Conception Metropolitan Cathedral beside the Panay River in the city center.", "points": 10, "lat": 11.585, "lng": 122.752, "maps_url": "https://www.google.com/maps/search/?api=1&query=Immaculate+Conception+Metropolitan+Cathedral+Roxas+City"},
  {"id": "suhot-cave", "province": "capiz", "name": "Suhot Cave and Spring", "cat": "nature", "barangay": "Dumalag", "desc": "A cave with a cool natural spring pool at its mouth.", "points": 15, "lat": 11.306, "lng": 122.617, "maps_url": "https://www.google.com/maps/search/?api=1&query=Suhot+Cave+Dumalag+Capiz"},
  {"id": "olotayan-island", "province": "capiz", "name": "Olotayan Island", "cat": "stay", "barangay": "Roxas City", "desc": "Fishing island off Roxas City with quiet beaches and island life.", "points": 20, "lat": 11.667, "lng": 122.808, "maps_url": "https://www.google.com/maps/search/?api=1&query=Olotayan+Island+Roxas+City"},
  {"id": "navalas-church", "province": "guimaras", "name": "Navalas Church", "cat": "landmark", "barangay": "Buenavista", "desc": "The oldest church in Guimaras, built of coral stone in the 1880s.", "points": 15, "lat": 10.7, "lng": 122.634, "maps_url": "https://www.google.com/maps/search/?api=1&query=Navalas+Church+Buenavista+Guimaras"},
  {"id": "roca-encantada", "province": "guimaras", "name": "Roca Encantada", "cat": "heritage", "barangay": "Buenavista", "desc": "A family summer house perched on a rock above the sea, facing Iloilo.", "points": 10, "lat": 10.644, "lng": 122.635, "maps_url": "https://www.google.com/maps/search/?api=1&query=Roca+Encantada+Guimaras"},
  {"id": "ave-maria-islet", "province": "guimaras", "name": "Ave Maria Islet", "cat": "stay", "barangay": "Nueva Valencia", "desc": "Tiny island with white sand and clear water for island hopping.", "points": 15, "lat": 10.487, "lng": 122.565, "maps_url": "https://www.google.com/maps/search/?api=1&query=Ave+Maria+Islet+Guimaras"},
  {"id": "sugar-beach", "province": "negros-occidental", "name": "Sugar Beach, Sipalay", "cat": "stay", "barangay": "Sipalay City", "desc": "Long golden-sand beach with sunset views in southern Negros.", "points": 20, "lat": 9.771, "lng": 122.428, "maps_url": "https://www.google.com/maps/search/?api=1&query=Sugar+Beach+Sipalay"},
  {"id": "lakawon-island", "province": "negros-occidental", "name": "Lakawon Island", "cat": "stay", "barangay": "Cadiz City", "desc": "Banana-shaped white-sand island off Cadiz.", "points": 20, "lat": 11.044, "lng": 123.203, "maps_url": "https://www.google.com/maps/search/?api=1&query=Lakawon+Island+Cadiz"},
  {"id": "gaston-ancestral-house", "province": "negros-occidental", "name": "Gaston Ancestral House", "cat": "heritage", "barangay": "Manapla", "desc": "Sugar-era hacienda house in Manapla, next to the famous Chapel of the Cartwheels.", "points": 10, "lat": 10.953, "lng": 123.11, "maps_url": "https://www.google.com/maps/search/?api=1&query=Gaston+Ancestral+House+Manapla"},
  {"id": "dumaguete-belfry", "province": "negros-oriental", "name": "Dumaguete Belfry", "cat": "landmark", "barangay": "Dumaguete City", "desc": "Old coral-stone bell tower beside St. Catherine Cathedral, once a watchtower against raiders.", "points": 10, "lat": 9.306, "lng": 123.307, "maps_url": "https://www.google.com/maps/search/?api=1&query=Dumaguete+Belfry"},
  {"id": "casaroro-falls", "province": "negros-oriental", "name": "Casaroro Falls", "cat": "nature", "barangay": "Valencia", "desc": "A tall, slender waterfall reached by a forest trail and steps.", "points": 15, "lat": 9.285, "lng": 123.219, "maps_url": "https://www.google.com/maps/search/?api=1&query=Casaroro+Falls+Valencia"},
  {"id": "twin-lakes", "province": "negros-oriental", "name": "Twin Lakes Balinsasayao", "cat": "nature", "barangay": "Sibulan", "desc": "Two crater lakes in the forest, with kayaking and a view deck.", "points": 15, "lat": 9.36, "lng": 123.18, "maps_url": "https://www.google.com/maps/search/?api=1&query=Twin+Lakes+Balinsasayao+Sibulan"},
  {"id": "siquijor-church", "province": "siquijor", "name": "St. Francis of Assisi Church", "cat": "landmark", "barangay": "Siquijor town", "desc": "Coral-stone church and bell tower in the island's capital town.", "points": 10, "lat": 9.214, "lng": 123.515, "maps_url": "https://www.google.com/maps/search/?api=1&query=St.+Francis+of+Assisi+Church+Siquijor"},
  {"id": "paliton-beach", "province": "siquijor", "name": "Paliton Beach", "cat": "stay", "barangay": "San Juan", "desc": "Small white-sand beach with one of the island's best sunsets.", "points": 15, "lat": 9.182, "lng": 123.488, "maps_url": "https://www.google.com/maps/search/?api=1&query=Paliton+Beach+Siquijor"},
  {"id": "capilay-spring", "province": "siquijor", "name": "Capilay Spring Park", "cat": "nature", "barangay": "San Juan", "desc": "Spring-fed swimming pool park in the San Juan town plaza.", "points": 10, "lat": 9.167, "lng": 123.496, "maps_url": "https://www.google.com/maps/search/?api=1&query=Capilay+Spring+Park+San+Juan+Siquijor"}
];

// ============ SHOP (Merchandise tab): pasalubong stores + nano entrepreneurs ============
// Shops and items appear in the app only when their "status" column says "approved".
// New sign-ups from the app arrive as "pending": change status to "approved" in the sheet to publish
// (or "rejected" to hide). Types: pasalubong, souvenir, clothing, crafts, food, other.
var SHOP_TYPES = ["pasalubong","souvenir","clothing","crafts","food","other"];
// Approximate shop locations (town / district level) for Isidro's "near me". Merchants can pin the exact spot
// with GPS when they sign up; you can also type lat and lng in the Shops sheet (columns N and O).
var SHOP_COORDS = {
  "biscocho-haus":[10.7225,122.5583], "bongbongs-piaya":[10.6730,122.9530], "trappist-gift-shop":[10.6290,122.6070],
  "sans-rival-dumaguete":[9.3080,123.3080], "dela-cruz-pina":[11.7070,122.3660], "dtalipapa":[11.9600,121.9260],
  "bagtason-weavers":[11.0450,122.0650], "roxas-market":[11.5870,122.7510], "jordan-wharf-stalls":[10.6580,122.5930],
  "panaderia-de-molo":[10.6970,122.5450], "deocampo-barquillos":[10.7200,122.5600], "pendys":[10.6760,122.9560],
  "merci-pasalubong":[10.6740,122.9500], "siquijor-market":[9.2140,123.5150]
};
var SHOPS_SEED = [
  {province:"iloilo", shop_id:"biscocho-haus", name:"Original Biscocho Haus", type:"pasalubong", barangay:"Lopez Jaena St, Jaro",
   desc:"Iloilo's classic pasalubong bakery, famous for biscocho and butterscotch.", contact:"",
   maps_url:"https://www.google.com/maps/search/?api=1&query=Original+Biscocho+Haus+Jaro+Iloilo+City",
   items:[
     {item_id:"bh-biscocho", name:"Biscocho", price:"", desc:"Twice-baked bread toasted with butter and sugar. The Iloilo classic.", category:"pasalubong"},
     {item_id:"bh-butterscotch", name:"Butterscotch", price:"", desc:"Chewy, buttery bars: the original flavor, plus versions with dried fruits.", category:"pasalubong"},
     {item_id:"bh-barquillos", name:"Barquillos", price:"", desc:"Crisp rolled wafers, an Ilonggo favorite.", category:"pasalubong"}
   ]},
  {"shop_id": "bongbongs-piaya", "province": "negros-occidental", "name": "Bongbong's Piaya & Barquillos", "type": "pasalubong", "barangay": "Bacolod City", "desc": "Bacolod's pasalubong favorite for piaya, barquillos and other Negrense treats.", "contact": "", "items": [{"item_id": "bb-piaya", "name": "Piaya", "price": "", "desc": "Flat, flaky bread filled with muscovado sugar. Also in ube and other flavors.", "category": "pasalubong"}, {"item_id": "bb-barquillos", "name": "Barquillos", "price": "", "desc": "Crisp rolled wafers, a Negrense classic.", "category": "pasalubong"}], "maps_url": "https://www.google.com/maps/search/?api=1&query=Bongbong%27s+Piaya+Bacolod"},
  {"shop_id": "trappist-gift-shop", "province": "guimaras", "name": "Trappist Monastery Gift Shop", "type": "pasalubong", "barangay": "Jordan", "desc": "The monks' shop for Guimaras mango jams and preserves.", "contact": "", "items": [{"item_id": "tm-mango-jam", "name": "Mango jams and preserves", "price": "", "desc": "Made with Guimaras mangoes by the Trappist community.", "category": "pasalubong"}], "maps_url": "https://www.google.com/maps/search/?api=1&query=Trappist+Monastery+Guimaras"},
  {"shop_id": "sans-rival-dumaguete", "province": "negros-oriental", "name": "Sans Rival Cakes & Pastries", "type": "pasalubong", "barangay": "Dumaguete City", "desc": "Dumaguete's famous bakery for silvanas and sans rival, packed for travel.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Sans+Rival+Cakes+and+Pastries+Dumaguete", "items": [{"item_id": "sr-silvanas", "name": "Silvanas", "price": "", "desc": "Frozen cashew-meringue wafers with buttercream, coated in cookie crumbs.", "category": "pasalubong"}, {"item_id": "sr-sans-rival", "name": "Sans Rival", "price": "", "desc": "Layered cashew meringue and buttercream cake.", "category": "pasalubong"}]},
  {"shop_id": "dela-cruz-pina", "province": "aklan", "name": "Dela Cruz House of Piña", "type": "crafts", "barangay": "Kalibo", "desc": "Piña weaving house where you can watch pineapple-fiber cloth being made by hand.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Dela+Cruz+House+of+Pina+Kalibo", "items": [{"item_id": "dc-pina-cloth", "name": "Piña cloth", "price": "", "desc": "Fine, sheer fabric hand-woven from pineapple leaf fiber.", "category": "crafts"}, {"item_id": "dc-pina-scarf", "name": "Piña scarves and table runners", "price": "", "desc": "Light souvenirs that are easy to pack.", "category": "crafts"}]},
  {"shop_id": "dtalipapa", "province": "aklan", "name": "D'Talipapa Boracay", "type": "souvenir", "barangay": "Balabag, Boracay", "desc": "Boracay's market lane for fresh seafood (cooked for you at nearby paluto stalls), shirts and beach souvenirs.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=D+Talipapa+Boracay", "items": [{"item_id": "dt-seafood", "name": "Fresh seafood", "price": "", "desc": "Pick your catch and have it cooked nearby.", "category": "souvenir"}, {"item_id": "dt-shirts", "name": "Boracay shirts and souvenirs", "price": "", "desc": "Bargaining is normal.", "category": "souvenir"}]},
  {"shop_id": "bagtason-weavers", "province": "antique", "name": "Bagtason Loom Weavers", "type": "crafts", "barangay": "Bagtason, Bugasong", "desc": "Community weavers of Antique's checkered patadyong cloth.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Bagtason+Loom+Weavers+Bugasong", "items": [{"item_id": "bw-patadyong", "name": "Patadyong", "price": "", "desc": "Hand-woven checkered cloth, worn as a wrap or used as a throw.", "category": "crafts"}, {"item_id": "bw-bags", "name": "Patadyong bags and pouches", "price": "", "desc": "Made from the same hand-woven fabric.", "category": "crafts"}]},
  {"shop_id": "roxas-market", "province": "capiz", "name": "Roxas City Public Market", "type": "pasalubong", "barangay": "Roxas City", "desc": "Where Capiz's seafood and pasalubong meet: dried fish and squid, plus Capiz shell crafts.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Roxas+City+Public+Market", "items": [{"item_id": "rm-dried", "name": "Dried fish and squid", "price": "", "desc": "Pack well for travel.", "category": "pasalubong"}, {"item_id": "rm-capiz-shell", "name": "Capiz shell crafts", "price": "", "desc": "Lamps, windows and trinkets made from translucent Capiz shell.", "category": "pasalubong"}]},
  {"shop_id": "jordan-wharf-stalls", "province": "guimaras", "name": "Jordan Wharf Pasalubong Stalls", "type": "pasalubong", "barangay": "Jordan", "desc": "Stalls at the Guimaras port selling the island's mango treats before you sail back.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Jordan+Wharf+Guimaras", "items": [{"item_id": "jw-dried-mango", "name": "Dried mangoes", "price": "", "desc": "Made from sweet Guimaras mangoes.", "category": "pasalubong"}, {"item_id": "jw-fresh-mango", "name": "Fresh Guimaras mangoes", "price": "", "desc": "In season, mostly around April to June.", "category": "pasalubong"}]},
  {"shop_id": "panaderia-de-molo", "province": "iloilo", "name": "Panaderia de Molo", "type": "pasalubong", "barangay": "Molo, Iloilo City", "desc": "Heritage bakery in Molo, a classic stop for Ilonggo baked pasalubong.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Panaderia+de+Molo+Iloilo", "items": [{"item_id": "pm-biscocho", "name": "Biscocho", "price": "", "desc": "Toasted buttered bread, an Iloilo favorite.", "category": "pasalubong"}, {"item_id": "pm-galletas", "name": "Galletas", "price": "", "desc": "Crisp traditional cookies.", "category": "pasalubong"}]},
  {"shop_id": "deocampo-barquillos", "province": "iloilo", "name": "Deocampo Barquillos", "type": "pasalubong", "barangay": "Iloilo City", "desc": "Family maker of crisp barquillos and barquiron, an Iloilo tradition.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Deocampo+Barquillos+Iloilo", "items": [{"item_id": "db-barquillos", "name": "Barquillos", "price": "", "desc": "Thin rolled wafers.", "category": "pasalubong"}, {"item_id": "db-barquiron", "name": "Barquiron", "price": "", "desc": "Barquillos filled with sweet polvoron.", "category": "pasalubong"}]},
  {"shop_id": "pendys", "province": "negros-occidental", "name": "Pendy's", "type": "pasalubong", "barangay": "Bacolod City", "desc": "Bacolod bakeshop famous for its napoleones.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Pendy%27s+Bacolod", "items": [{"item_id": "pd-napoleones", "name": "Napoleones", "price": "", "desc": "Flaky puff pastry with custard, glazed on top.", "category": "pasalubong"}]},
  {"shop_id": "merci-pasalubong", "province": "negros-occidental", "name": "Merci Pasalubong", "type": "pasalubong", "barangay": "Bacolod City", "desc": "One-stop Bacolod shop for napoleones, piaya and other Negrense treats.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Merci+Pasalubong+Bacolod", "items": [{"item_id": "mp-napoleones", "name": "Napoleones", "price": "", "desc": "A Bacolod classic.", "category": "pasalubong"}, {"item_id": "mp-piaya", "name": "Piaya", "price": "", "desc": "Muscovado-filled flatbread.", "category": "pasalubong"}]},
  {"shop_id": "siquijor-market", "province": "siquijor", "name": "Siquijor Public Market", "type": "pasalubong", "barangay": "Siquijor town", "desc": "Small-town market for Siquijor torta, local snacks and island souvenirs.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Siquijor+Public+Market", "items": [{"item_id": "sm-torta", "name": "Siquijor torta", "price": "", "desc": "Soft, sweet local cake, an island favorite.", "category": "pasalubong"}, {"item_id": "sm-oils", "name": "Herbal oils", "price": "", "desc": "Bottled oils from the island's healing tradition.", "category": "pasalubong"}]}
];

var PLACE_HEADERS = ["id","name","cat","barangay","desc","points","lat","lng","maps_url","province"];

var RANDOM_DESTINATIONS = [
  {place:"Boracay Island", province:"Aklan"}, {place:"El Nido", province:"Palawan"},
  {place:"Coron", province:"Palawan"}, {place:"Magellan's Cross", province:"Cebu City"},
  {place:"Kawasan Falls", province:"Cebu"}, {place:"Chocolate Hills", province:"Bohol"},
  {place:"Cloud 9, Siargao", province:"Surigao del Norte"}, {place:"Session Road", province:"Baguio City"},
  {place:"Calle Crisologo, Vigan", province:"Ilocos Sur"}, {place:"Mayon Volcano", province:"Albay"},
  {place:"Samal Island", province:"Davao del Norte"}, {place:"Basco Lighthouse", province:"Batanes"},
  {place:"Enchanted River", province:"Surigao del Sur"}, {place:"Hundred Islands", province:"Pangasinan"},
  {place:"Camiguin White Island", province:"Camiguin"}, {place:"Cagsawa Ruins", province:"Albay"}
];

var OUTFIT_SUGGESTIONS = {
  landmark: ["Elegant Filipiniana gown","Barong Tagalog formal","Spanish colonial era dress","Modest church Sunday best outfit"],
  heritage: ["1920s Calle Real vintage outfit","Barong Tagalog","Filipiniana dress","Heritage explorer outfit"],
  festival: ["Dinagyang Ati warrior costume with tall red-yellow feather headdress","Colorful Dinagyang festival dancer outfit","Ati tribe inspired festival costume"],
  food: ["Fun chef outfit holding a Batchoy bowl","Casual Ilonggo food trip shirt and apron","Pancit Molo chef outfit","Inasal grill master apron outfit"],
  nature: ["Elegant summer dress sunset outfit","Resort casual outfit","Tasteful beach resort outfit"],
  stay: ["Elegant two-piece bikini resort outfit","Tasteful summer swimsuit with beach cover-up","Island hopping rash guard outfit","Summer beach dress"],
  _default: ["SMILE Western Visayas tourist t-shirt","Filipiniana outfit","Dinagyang festival outfit"]
};

var SHEET_HEADERS = {
  Users:["name","email","stamps","rank","created"],
  Places:PLACE_HEADERS,
  Checkins:["time","user","place_id","postcard","place_name","merchant","source","vision_status"],
  Postcards:["code","batch_id","printer","merchant","merchant_buy_date","used","used_by","used_date","place_id","created"],
  Batches:["batch_id","place_id","qty","created","printer","merchant_price","tourist_price","status"],
  Merchants:["name","contact","stock_left","total_bought","created"],
  Products:["time","merchant","raw","listing"],
  Challenges:["time","user","place_id","place_name","status","postcard_code","completed_time"],
  Journey:["code","sender","from_place_id","to_place","to_province","status","mailed_date","adopted_by","adopted_date","chain_no"],
  Photobooth:["time","user","place_id","place_name","mode","outfit_raw","prompt_used"],
  Shops:["shop_id","name","type","barangay","desc","contact","maps_url","status","created","owner","province","featured","manage_code","lat","lng"],
  ShopStats:["date","shop_id","views","gallery","directions","contact","share"],
  Accounts:["user_id","name","email","pass_hash","salt","created","province","bio","nationality","hometown","photo_id"],
  Hotlines:["province","type","name","phone","notes","status","lat","lng","address","contact_person","created"],
  Sessions:["token_hash","user_id","created","expires"],
  Journal:["post_id","user_id","name","place_id","place_name","province","text","caption","lang","photo_id","video_id","visibility","status","created","likes"],
  ShopItems:["item_id","shop_id","name","price","desc","category","status","created"],
  Media:["media_id","owner_type","owner_id","kind","file_id","title","sam_phrase","sam_result","status","created","uploaded_by"]
};

// ============ CORE HELPERS ============
function getSS(){ return SpreadsheetApp.openById(SS_ID); }
function getProps(){ return PropertiesService.getScriptProperties(); }
function out(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function normCode(s){ return String(s||"").trim().toUpperCase(); }
function genCode(){ return "SMILE-"+Math.floor(1000+Math.random()*9000)+"-"+Utilities.getUuid().substring(0,4).toUpperCase(); }
function getRank(n){ n=parseInt(n)||0; if(n>=45)return"SSS"; if(n>=30)return"SS"; if(n>=20)return"S"; if(n>=15)return"A"; if(n>=10)return"B"; if(n>=6)return"C"; if(n>=3)return"D"; return"E"; }
/** A place's own maps_url (search link) wins; otherwise directions to its lat/lng. */
function mapsUrl(p){
  if(p && /^https:\/\//.test(String(p.maps_url||""))) return String(p.maps_url);
  return "https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng;
}
function outfitSuggestionsFor(cat){ return OUTFIT_SUGGESTIONS[cat] || OUTFIT_SUGGESTIONS._default; }
function withMaps(p){ var c={}; for(var k in p) c[k]=p[k]; c.maps_url=mapsUrl(p); return c; }
/** Waits up to 15 s for the script lock; returns null when busy. */
function takeLock(){ var l=LockService.getScriptLock(); try{ l.waitLock(15000); return l; }catch(e){ return null; } }
var BUSY = {ok:false, error:"SMILE is busy right now. Please try again in a few seconds."};

function getPlacesData(){
  try{
    var sh = getSS().getSheetByName("Places");
    var v = sh.getDataRange().getValues(); v.shift();
    v = v.filter(function(r){ return r[0]; });
    if(!v.length) return PLACES_FALLBACK.map(withMaps);
    return v.map(function(r){
      var p = {id:String(r[0]).trim(), name:r[1], cat:r[2], barangay:r[3], desc:r[4], points:Number(r[5])||10, lat:Number(r[6])||10.69, lng:Number(r[7])||122.56, maps_url:r[8]||"", province:provinceId(r[9])};
      p.maps_url = mapsUrl(p);
      return p;
    });
  }catch(e){ return PLACES_FALLBACK.map(withMaps); }
}
function findPlace(id){ var p=getPlacesData(); for(var i=0;i<p.length;i++) if(p[i].id==id) return p[i]; return null; }

function updateUserStamps(user, add){
  user = user || "Guest";
  var sh = getSS().getSheetByName("Users");
  var v = sh.getDataRange().getValues();
  for(var i=1;i<v.length;i++){
    if(String(v[i][0]).toLowerCase()==String(user).toLowerCase()){
      var ns=(parseInt(v[i][2])||0)+add;
      sh.getRange(i+1,3).setValue(ns);
      sh.getRange(i+1,4).setValue(getRank(ns));
      return ns;
    }
  }
  sh.appendRow([user,"",add,getRank(add),new Date()]);
  return add;
}
function getUser(user){
  var v=getSS().getSheetByName("Users").getDataRange().getValues();
  for(var i=1;i<v.length;i++) if(String(v[i][0]).toLowerCase()==String(user||"").toLowerCase()) return {name:v[i][0],stamps:parseInt(v[i][2])||0,rank:getRank(v[i][2])};
  return {name:user||"Guest",stamps:0,rank:"E"};
}

// ============ SETUP (safe to run again) ============
/**
 * Creates missing sheets and header rows, adds the "maps_url" column to Places,
 * and adds/updates the built-in places by id. It NEVER deletes users, postcards,
 * check-ins or journeys. Places you added yourself (other ids) are kept as they are.
 */
function setup(){
  var ss = getSS();
  for(var name in SHEET_HEADERS){
    var s = ss.getSheetByName(name) || ss.insertSheet(name);
    var hdr = SHEET_HEADERS[name];
    if(s.getLastRow()===0){ s.appendRow(hdr); continue; }
    // add any missing header cells at the end (e.g. maps_url on an old Places sheet)
    var cur = s.getRange(1,1,1,Math.max(s.getLastColumn(),1)).getValues()[0];
    for(var h=0;h<hdr.length;h++) if(!cur[h]) s.getRange(1,h+1).setValue(hdr[h]);
  }
  var n = upsertPlaces_();
  upsertShopsSeed_();
  Logger.log(VERSION+" setup complete. Places added/updated: "+n+", shops: "+SHOPS_SEED.length+". SS_ID="+SS_ID);
  setupDrive();
}

/**
 * Creates (or finds) the two Google Drive folders SMILE saves files in, and logs their links:
 *   "SMILE Media"   → shop and place photos and promo videos
 *   "SMILE Journal" → travel journal photos and clips
 * The first run asks you to allow Google Drive access: choose your account, then Advanced → Go to (project) → Allow.
 */
function setupDrive(){
  var media = mediaRoot_(), journal = journalRoot_();
  Logger.log("✅ Drive folder SMILE Media: "+media.getUrl());
  Logger.log("✅ Drive folder SMILE Journal: "+journal.getUrl());
}

function upsertShopsSeed_(){
  var ss=getSS(), sh=ss.getSheetByName("Shops"), it=ss.getSheetByName("ShopItems");
  var sv=sh.getDataRange().getValues(), iv=it.getDataRange().getValues(), srow={}, irow={};
  for(var i=1;i<sv.length;i++) if(sv[i][0]) srow[sv[i][0]]=i+1;
  for(var j=1;j<iv.length;j++) if(iv[j][0]) irow[iv[j][0]]=j+1;
  SHOPS_SEED.forEach(function(s){
    var r=[s.shop_id,s.name,s.type,s.barangay,s.desc,s.contact,s.maps_url,"approved",new Date(),"SMILE",provinceId(s.province)];
    var ll = SHOP_COORDS[s.shop_id];
    if(srow[s.shop_id]){
      var old = sv[srow[s.shop_id]-1];
      r[7]=old[7]||"approved"; r[8]=old[8]||r[8]; sh.getRange(srow[s.shop_id],1,1,r.length).setValues([r]);
      if(ll && !old[13] && !old[14]) sh.getRange(srow[s.shop_id],14,1,2).setValues([ll]);
    } else {
      sh.appendRow(r.concat(["","",ll?ll[0]:"",ll?ll[1]:""]));
    }
    s.items.forEach(function(x){
      var ir=[x.item_id,s.shop_id,x.name,x.price,x.desc,x.category,"approved",new Date()];
      if(irow[x.item_id]){ ir[6]=iv[irow[x.item_id]-1][6]||"approved"; it.getRange(irow[x.item_id],1,1,ir.length).setValues([ir]); }
      else it.appendRow(ir);
    });
  });
}

function clean_(v, max){ return String(v==null?"":v).replace(/[\u0000-\u001f]/g," ").trim().slice(0, max||200); }

function getShopsData(){
  var shops=[], byId={};
  try{
    var sv=getSS().getSheetByName("Shops").getDataRange().getValues(); sv.shift();
    sv.forEach(function(r){
      if(!r[0] || String(r[7]).toLowerCase()!="approved") return;
      var s={shop_id:String(r[0]), name:r[1], type:r[2]||"other", barangay:r[3], desc:r[4], contact:r[5],
        maps_url:/^https:\/\//.test(String(r[6]||"")) ? r[6] : "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(r[1]+" "+(r[3]||"")+" "+provinceName(r[10])), items:[], province:provinceId(r[10]), featured:/^(true|yes|y|1|featured)$/i.test(String(r[11]||"").trim())};
      var la=Number(r[13]), ln=Number(r[14]), ll=SHOP_COORDS[s.shop_id];
      if(validLatLng_(la,ln)){ s.lat=la; s.lng=ln; } else if(ll){ s.lat=ll[0]; s.lng=ll[1]; }
      byId[s.shop_id]=s; shops.push(s);
    });
    var iv=getSS().getSheetByName("ShopItems").getDataRange().getValues(); iv.shift();
    iv.forEach(function(r){
      if(!r[0] || String(r[6]).toLowerCase()!="approved" || !byId[r[1]]) return;
      byId[r[1]].items.push({item_id:String(r[0]), name:r[2], price:r[3], desc:r[4], category:r[5]});
    });
  }catch(e){
    shops = SHOPS_SEED.map(function(s){ var ll=SHOP_COORDS[s.shop_id]||[]; return {shop_id:s.shop_id,name:s.name,type:s.type,barangay:s.barangay,desc:s.desc,contact:s.contact,maps_url:s.maps_url,items:s.items,province:provinceId(s.province),lat:ll[0],lng:ll[1]}; });
  }
  return shops;
}

function upsertPlaces_(){
  var ps = getSS().getSheetByName("Places");
  var v = ps.getDataRange().getValues(), rowOf = {};
  for(var i=1;i<v.length;i++) if(v[i][0]) rowOf[String(v[i][0]).trim()] = i+1;
  var count = 0;
  PLACES_FALLBACK.forEach(function(p){
    var row = [p.id,p.name,p.cat,p.barangay,p.desc,p.points,p.lat,p.lng,p.maps_url||"",provinceId(p.province)];
    if(rowOf[p.id]) ps.getRange(rowOf[p.id],1,1,row.length).setValues([row]);
    else ps.appendRow(row);
    count++;
  });
  return count;
}

/** DANGER: wipes every SMILE sheet and starts fresh. Only for a brand-new test sheet. */
function resetAllData_DANGER(){
  var ss = getSS();
  for(var name in SHEET_HEADERS){ var s = ss.getSheetByName(name) || ss.insertSheet(name); s.clear(); s.appendRow(SHEET_HEADERS[name]); }
  upsertPlaces_();
  Logger.log("All SMILE sheets were reset.");
}

// ============ AI TEXT + VISION: Meta Muse Spark (Meta Model API) ============
// Every AI feature in SMILE runs on Meta's models, through one key from dev.meta.ai:
//   META_API_KEY → https://api.meta.ai/v1/chat/completions (Muse Spark, text and vision)
//   Optional Script Properties: MUSE_TEXT_MODEL, MUSE_VISION_MODEL (default muse-spark-1.3).
// If a Muse Spark version is unavailable, the next one is tried (1.3 → 1.2 → 1.1).
// "-contributor" Muse models (Meta may train on prompts, i.e. tourists' photos) are never picked.
// Run diagnoseAI() to see exactly what works.
var MUSE_URL = "https://api.meta.ai/v1/chat/completions";
var MUSE_TEXT_MODELS   = ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.1"];
var MUSE_VISION_MODELS = ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.1"];

function museKey_(){ var p=getProps(); return p.getProperty("META_API_KEY") || p.getProperty("MODEL_API_KEY"); }

/** The Meta Model API connection, or [] when no key is set. Kept as a list for diagnoseAI and ai_status. */
function aiProviders_(){
  var p = getProps(), mk = museKey_();
  if(!mk) return [];
  return [{name:"muse", url:MUSE_URL, key:mk,
    text:[p.getProperty("MUSE_TEXT_MODEL")].concat(MUSE_TEXT_MODELS), vision:[p.getProperty("MUSE_VISION_MODEL")].concat(MUSE_VISION_MODELS)}];
}

/** Model ids this key can use (cached 6 h). Empty array = unknown. */
function availableModels_(prov){
  var cache = CacheService.getScriptCache(), ck = "ai_models_" + prov.name, hit = cache.get(ck);
  if(hit) return JSON.parse(hit);
  try{
    var r = UrlFetchApp.fetch(prov.url.replace(/\/chat\/completions$/, "/models"), {headers:{Authorization:"Bearer "+prov.key}, muteHttpExceptions:true});
    if(r.getResponseCode()!=200) return [];
    var j = JSON.parse(r.getContentText());
    var ids = (j.data || j.models || []).map(function(m){ return m.id || m.name; }).filter(String);
    cache.put(ck, JSON.stringify(ids), 21600);
    return ids;
  }catch(e){ return []; }
}
function markModelBad_(prov, id){ CacheService.getScriptCache().put("ai_bad_"+prov.name+"_"+id, "1", 21600); }
function isModelBad_(prov, id){ return !!CacheService.getScriptCache().get("ai_bad_"+prov.name+"_"+id); }

/** Ordered Muse Spark models to try for "text" or "vision". */
function modelCandidates_(prov, kind){
  var seen = {}, out = [];
  (kind=="vision" ? prov.vision : prov.text).forEach(function(m){ if(m && !seen[m] && !/contributor/i.test(m)){ seen[m]=1; out.push(m); } });
  var avail = availableModels_(prov);
  if(avail.length){
    var ok = out.filter(function(m){ return avail.indexOf(m) > -1; });
    // None of our names exist on this account: use the newest Muse Spark model it offers.
    if(!ok.length) ok = avail.filter(function(m){ return /muse-spark/i.test(m) && !/contributor/i.test(m); }).sort().reverse();
    out = ok;
  }
  return out.filter(function(m){ return !isModelBad_(prov, m); });
}

function cleanAIText_(t){ return String(t||"").replace(/<think>[\s\S]*?<\/think>/gi, "").trim(); }

/**
 * callMuse(messages, modelOverride, max_tokens, temp, kind)
 * kind: "text" (default) or "vision". Returns {text, demo, model, provider}.
 */
function callMuse(messages, modelOverride, max_tokens, temp, kind){
  kind = kind || "text";
  var provs = aiProviders_();
  if(!provs.length) return {text:"[DEMO] Maayong adlaw! Ako si Isidro. Add META_API_KEY (Muse, dev.meta.ai) in Script Properties to enable live AI. Kadto ta sa Molo Church, kaon Batchoy sa La Paz! #SMILEPH", demo:true};
  var prov = provs[0], errors = [];
  var models = modelCandidates_(prov, kind);
  if(modelOverride) models = [modelOverride].concat(models);
  if(!models.length) throw new Error("AI unavailable: no Muse Spark "+kind+" model available on this key");
  for(var i=0; i<Math.min(models.length, 4); i++){
    var model = models[i];
    var body = {model:model, messages:messages, max_tokens:Math.max(1200, (max_tokens||800)*3), temperature:(temp==null?0.7:temp)};   // Muse Spark thinks first, so allow room
    var res = postAI_(prov, body);
    if(res.code==429){ Utilities.sleep(1500); res = postAI_(prov, body); }
    if(res.ok) return {text: cleanAIText_(res.text), demo:false, model:model, provider:prov.name};
    errors.push(model+": "+res.msg);
    if(res.code==404 || /decommission|deprecat|not found|does not exist|not supported|model_not_found|unknown model|invalid model|image/i.test(res.msg)){ markModelBad_(prov, model); continue; }
    break;   // key, quota or network problem: stop
  }
  throw new Error("AI unavailable: " + errors.slice(-2).join(" | "));
}

function postAI_(prov, body){
  var resp;
  try{
    resp = UrlFetchApp.fetch(prov.url, {method:"post", contentType:"application/json", headers:{Authorization:"Bearer "+prov.key}, payload:JSON.stringify(body), muteHttpExceptions:true});
  }catch(e){ return {ok:false, code:0, msg:"network: "+e.message}; }
  var code = resp.getResponseCode(), txt = resp.getContentText(), j = null;
  try{ j = JSON.parse(txt); }catch(e){ return {ok:false, code:code, msg:"HTTP "+code+" (not JSON): "+txt.slice(0,120)}; }
  if(j.error){ var er = typeof j.error=="string" ? {message:j.error} : j.error; return {ok:false, code:code, msg:(er.code ? er.code+": " : "")+(er.message||txt.slice(0,200))}; }
  if(code>=400) return {ok:false, code:code, msg:"HTTP "+code+": "+(j.detail||j.message||txt.slice(0,160))};
  var content = null, fin = "";
  if(j.choices && j.choices[0] && j.choices[0].message){ content = j.choices[0].message.content; fin = j.choices[0].finish_reason; }
  if(Array.isArray(content)) content = content.map(function(c){ return c.text || ""; }).join("");
  if(!content && fin=="length") return {ok:false, code:code, msg:"reply cut off (max_tokens too low)"};
  if(content==null) return {ok:false, code:code, msg:"empty reply: "+txt.slice(0,160)};
  return {ok:true, code:code, text:String(content)};
}

/** Run this from the editor (Run ▶ diagnoseAI) and read the Execution log. */
function diagnoseAI(){
  var provs = aiProviders_();
  if(!provs.length){ Logger.log("❌ No AI key. Script Properties → add META_API_KEY (Meta Model API, from dev.meta.ai)."); return; }
  var c = CacheService.getScriptCache(), prov = provs[0];
  Logger.log("── Meta Model API → "+prov.url);
  Logger.log("   key: "+prov.key.slice(0,4)+"…"+prov.key.slice(-4)+" ("+prov.key.length+" chars)");
  c.remove("ai_models_"+prov.name);
  prov.text.concat(prov.vision).forEach(function(m){ if(m) c.remove("ai_bad_"+prov.name+"_"+m); });
  var avail = availableModels_(prov);
  Logger.log(avail.length ? "   ✅ models on this account ("+avail.length+"): "+avail.join(", ") : "   ⚠️ could not list models (key wrong or no Model API access yet)");
  Logger.log("   text models to try: "+(modelCandidates_(prov,"text").join(", ")||"(none)"));
  Logger.log("   vision models to try: "+(modelCandidates_(prov,"vision").join(", ")||"(none)"));
  try{ var r = callMuse([{role:"user",content:"Say Maayong adlaw in one short sentence."}]); Logger.log("✅ Text OK via "+r.provider+" / "+r.model+": "+r.text); }
  catch(e){ Logger.log("❌ Text FAILED: "+e.message); }
  try{
    var px = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    var v = callMuse([{role:"user",content:[{type:"text",text:"What colour is this image? One word."},{type:"image_url",image_url:{url:px}}]}], null, 50, 0.2, "vision");
    Logger.log("✅ Vision OK via "+v.provider+" / "+v.model+": "+v.text);
  }catch(e2){ Logger.log("⚠️ Vision FAILED (photo check will ask staff to review instead): "+e2.message); }
}

// ============ PHOTOBOOTH IMAGE EDIT: Meta Muse Image ============
// Muse Image: POST https://api.meta.ai/v1/images/edits (JSON), key = META_API_KEY (dev.meta.ai).
// Optional Script Properties: MUSE_IMAGE_MODEL (default muse-image-1.0),
//   MUSE_IMAGE_REASONING ("low" = faster, default; "high" = more careful planning, slower).
function callMuseImage(base64Data, mimeType, promptText){
  var KEY = museKey_();
  if(!KEY) throw new Error("META_API_KEY is not set");
  var p = getProps();
  var body = {
    model: p.getProperty("MUSE_IMAGE_MODEL") || "muse-image-1.0",
    prompt: promptText,
    images: [{image_url: "data:"+(mimeType||"image/jpeg")+";base64,"+base64Data}],
    n: 1,
    size: "1024x1280",                 // 4:5, same shape as the CONQUERED postcard
    response_format: "b64_json",
    output_format: "jpeg",
    reasoning_strength: p.getProperty("MUSE_IMAGE_REASONING") || "low"
  };
  var resp = UrlFetchApp.fetch("https://api.meta.ai/v1/images/edits", {method:"post", contentType:"application/json",
    headers:{Authorization:"Bearer "+KEY}, payload:JSON.stringify(body), muteHttpExceptions:true});
  var code = resp.getResponseCode(), txt = resp.getContentText(), j;
  try{ j = JSON.parse(txt); }catch(e){ throw new Error("Muse Image HTTP "+code+" (not JSON): "+txt.slice(0,120)); }
  if(j.error){ var er = typeof j.error=="string" ? {message:j.error} : j.error; throw new Error("Muse Image: "+(er.code?er.code+": ":"")+(er.message||txt.slice(0,160))); }
  if(code>=400) throw new Error("Muse Image HTTP "+code+": "+txt.slice(0,160));
  var d = j.data && j.data[0];
  if(!d) throw new Error("Muse Image returned no image (it may have refused this edit).");
  var fmt = (j.output_format || "jpeg").replace("jpg","jpeg");
  if(d.b64_json) return {data:d.b64_json, mime:"image/"+fmt};
  if(d.url){ var blob = UrlFetchApp.fetch(d.url).getBlob(); return {data:Utilities.base64Encode(blob.getBytes()), mime:blob.getContentType()||"image/"+fmt}; }
  throw new Error("Muse Image reply had no image data.");
}

/** Edits the selfie with Muse Image. Returns {dataUrl, provider}. */
function editPhoto_(base64Data, mimeType, promptText){
  if(!museKey_()) throw new Error("No image AI key. Add META_API_KEY in Script Properties.");
  var m = callMuseImage(base64Data, mimeType, promptText);
  return {dataUrl:"data:"+m.mime+";base64,"+m.data, provider:"muse-image"};
}

/** Run from the editor: edits a sample photo with Muse Image and logs the result. */
function testPhotoboothAI(){
  var img = UrlFetchApp.fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Avocado_Hass_-_single_and_halved.jpg/640px-Avocado_Hass_-_single_and_halved.jpg").getBlob();
  var b64 = Utilities.base64Encode(img.getBytes()), prompt = "Put a small Filipino salakot hat on the avocado, keep everything else the same.";
  if(!museKey_()){ Logger.log("⚠️ META_API_KEY not set, Muse Image skipped."); return; }
  try{ var m = callMuseImage(b64, "image/jpeg", prompt); Logger.log("✅ Muse Image OK ("+m.mime+", "+Math.round(m.data.length*0.75/1024)+" KB)"); }
  catch(e){ Logger.log("❌ Muse Image FAILED: "+e.message); }
}

// ============ ISIDRO CHAT (Muse Spark): remembers the conversation, picks real places ============
// ============ NEAR ME: distances from the traveler's phone GPS (never stored) ============
function validLatLng_(la, ln){ return isFinite(la) && isFinite(ln) && Math.abs(la)<=90 && Math.abs(ln)<=180 && !(la===0 && ln===0); }
function distKm_(a, b){
  var R=6371, t=Math.PI/180, dLa=(b.lat-a.lat)*t, dLn=(b.lng-a.lng)*t;
  var h=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dLn/2)*Math.sin(dLn/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function kmText_(km){ return km<1 ? Math.max(50, Math.round(km*1000/50)*50)+" m" : (km<10 ? km.toFixed(1) : String(Math.round(km)))+" km"; }
var NEAR_MAX_KM = 30;   // "near" means within this distance
var NEAR_CATS = {food:["food"], landmark:["landmark","heritage","nature"], event:["festival"], inn:["stay"], shop:[], postoffice:[], all:null};
var NEAR_LABEL = {food:"places to eat", landmark:"landmarks", event:"festivals and events", inn:"places to stay", shop:"shops and pasalubong", postoffice:"post offices", all:"places"};

function isidroChat_(p){
  var langName = p.lang=="tl" ? "Tagalog" : (p.lang=="en" ? "English" : "Hiligaynon mixed with English, malambing Ilonggo style");
  var wantProv = PROVINCES[String(p.province||"").toLowerCase()] ? String(p.province).toLowerCase() : "";
  var all = getPlacesData(), byId = {};
  all.forEach(function(x){ byId[x.id] = x; });
  var list = all.map(function(x){ return [x.id, x.name, provinceName(x.province), x.cat, x.barangay, String(x.desc||"").slice(0,90)].join(" | "); }).join("\n");
  // Near me: the phone's GPS position (sent only with this question, never saved).
  var here = null, nearTxt = "", nearShops = [], nearIds = [], dist = {}, near = NEAR_CATS.hasOwnProperty(p.near) ? p.near : "";
  var la = p.loc ? Number(p.loc.lat) : NaN, ln = p.loc ? Number(p.loc.lng) : NaN;
  if(validLatLng_(la, ln)){
    here = {lat:la, lng:ln};
    all.forEach(function(x){ if(validLatLng_(Number(x.lat), Number(x.lng))) dist[x.id] = distKm_(here, {lat:Number(x.lat), lng:Number(x.lng)}); });
    var cats = near ? NEAR_CATS[near] : null;
    var pool = all.filter(function(x){ return dist.hasOwnProperty(x.id) && (!cats || cats.indexOf(x.cat)>-1); }).sort(function(a,b){ return dist[a.id]-dist[b.id]; });
    if(near=="shop" || near=="postoffice") pool = [];
    var nearestKm = pool.length ? dist[pool[0].id] : 9999;
    var close = pool.filter(function(x){ return dist[x.id] <= NEAR_MAX_KM; });
    nearIds = (close.length ? close : pool.slice(0, 3)).slice(0, 10).map(function(x){ return x.id; });
    if(!wantProv && pool.length) wantProv = pool[0].province;
    else if(!wantProv){ var any = all.filter(function(x){ return dist.hasOwnProperty(x.id); }).sort(function(a,b){ return dist[a.id]-dist[b.id]; })[0]; if(any) wantProv = any.province; }
    if(!near || near=="shop" || near=="all"){
      nearShops = getShopsData().filter(function(sh){ return validLatLng_(Number(sh.lat), Number(sh.lng)); })
        .map(function(sh){ return {shop_id:sh.shop_id, name:sh.name, type:sh.type, barangay:sh.barangay, province:sh.province, maps_url:sh.maps_url, featured:!!sh.featured, km:distKm_(here, {lat:Number(sh.lat), lng:Number(sh.lng)})}; })
        .filter(function(sh){ return sh.km <= NEAR_MAX_KM; })
        .sort(function(a,b){ return (a.km-b.km) || (b.featured-a.featured); }).slice(0, near=="shop" ? 5 : 3);
    }
    nearTxt = "\nThe tourist shared their phone GPS location. Nearest "+(NEAR_LABEL[near]||"places")+", closest first (id | name | category | distance):\n"+
      nearIds.map(function(id){ var x = byId[id]; return [id, x.name, x.cat, kmText_(dist[id])].join(" | "); }).join("\n")+
      (nearShops.length ? "\nNearest SMILE shops (name | type | area | distance): "+nearShops.map(function(sh){ return [sh.name, sh.type, sh.barangay, kmText_(sh.km)].join(" | "); }).join("; ") : "")+
      "\nWhen they ask what is near or around them, recommend the closest options first, say how far each one is and the easiest way to get there (walk if under 1 km, tricycle, jeepney, taxi or boat). "+
      (near=="event" ? "For festivals, also say when the next one is from the festival calendar. " : "")+
      (near=="inn" ? "SMILE has no hotel list yet: suggest the nearest stay spots above and say the app also shows a Google Maps search for inns near them. " : "")+
      (near=="postoffice" ? "They want to mail their SMILE postcard. The app shows a Google Maps search for the post offices nearest to them: tell them to tap it, that their postcard already has its stamp, to drop it at the post office counter or mailbox and tap Mail in the app, and that the post office has a SMILE box of random postcards from other travelers they can pick, adopt and follow. Do not invent post office addresses or hours. " : "")+
      (nearestKm > NEAR_MAX_KM && near!="shop" && near!="postoffice" ? "The closest one is "+kmText_(nearestKm)+" away, so they are probably outside or far from the SMILE area (Western Visayas and the Negros Island Region): say so kindly and suggest how to get there. " : "")+
      (near=="shop" && !nearShops.length ? "No SMILE shop is within "+NEAR_MAX_KM+" km: say so and suggest the nearest town with SMILE shops. " : "")+
      "Never tell them their coordinates.";
  }
  var sys = "You are Isidro, a warm, witty tour guide for SMILE (See More of Islands' Landmarks and Events) in Western Visayas and the Negros Island Region, Philippines. "+
    "Speak "+langName+". Today is "+manilaToday_()+". "+(wantProv ? "The tourist is exploring "+PROVINCES[wantProv]+"; favor places there. " : "")+
    "Recommend ONLY places from this list (id | name | province | category | area | note); never invent places, prices you are unsure of, or opening hours:\n"+list+
    "\nFestival calendar: "+eventsText_()+
    "\nRules: answer in under 150 words; give an order of stops, how to get around (jeepney, tricycle, boat), food to try and a rough budget in PHP; "+
    "answer follow-up questions using the conversation so far. Remind tourists to scan their SMILE postcard at each stop. "+
    "How SMILE postcards work: travelers buy official SMILE postcards, stamp already included, from authorized SMILE merchants; they mail them at the nearest post office; and at the post office they can pick a random postcard from the SMILE box, adopt it and follow that traveler's journey. "+
    "If you mention places, end with one last line exactly like: PLACES: id1, id2 (up to 5 ids from the list). If none, leave that line out."+nearTxt;
  var hist = Array.isArray(p.history) ? p.history.slice(-10) : [];
  var msgs = [{role:"system", content:sys}];
  hist.forEach(function(h){ if(h && (h.role=="user"||h.role=="assistant") && h.content) msgs.push({role:h.role, content:clean_(h.content, 1200)}); });
  msgs.push({role:"user", content:clean_(p.q||(here ? "What is near me?" : "I have 4 hours and love food"), 600)});
  var rc = callMuse(msgs, null, 700);
  var text = String(rc.text||""), ids = [];
  var m = text.match(/\n?\s*PLACES:\s*([^\n]*)\s*$/i);
  if(m){ ids = m[1].split(/[,\s]+/).map(function(t){ return t.trim().replace(/[^\w-]/g,""); }).filter(function(t){ return byId[t]; }); text = text.slice(0, m.index).trim(); }
  var seen = {}, places = [];
  if(here && !ids.length) ids = nearIds.slice(0, 3);
  ids.forEach(function(id){ if(!seen[id] && places.length<5){ seen[id]=1; var c = withMaps(byId[id]); c.outfit_suggestions = outfitSuggestionsFor(c.cat); if(dist.hasOwnProperty(id)) c.distance_km = Math.round(dist[id]*100)/100; places.push(c); } });
  var res = {ok:true, reply:text, places:places, demo:!!rc.demo, model:rc.model||""};
  if(here){
    res.shops = nearShops.map(function(sh){ sh.distance_km = Math.round(sh.km*100)/100; delete sh.km; return sh; });
    if(near=="inn" || near=="all") res.inn_search_url = "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("inns hotels near "+la.toFixed(4)+","+ln.toFixed(4));
    if(near=="postoffice" || near=="all") res.post_office_search_url = "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("post office near "+la.toFixed(4)+","+ln.toFixed(4));
  }
  return res;
}

// ============ MUSE VOICE TRANSCRIBE: speech to text (Isidro's mic, the travel journal) ============
// POST https://api.meta.ai/v1/asr/transcribe, multipart: "request" (JSON settings) + "audio" (WAV, mono 16-bit PCM,
// 16 or 24 kHz). The app records and builds the WAV itself. Same META_API_KEY. Optional: VOICE_MODEL.
// Muse Voice Transcribe understands English and Tagalog (and 23 other languages) but not Hiligaynon;
// Hiligaynon speakers get the closest transcript, which Muse Spark can then tidy or translate.
var ASR_URL = "https://api.meta.ai/v1/asr/transcribe";
var VOICE_MAX_B64 = 6000000;   // about 3 minutes of 16 kHz WAV

function transcribe_(dataUrl, lang){
  var KEY = museKey_();
  if(!KEY) return {ok:false, error:"Voice needs META_API_KEY on the server."};
  var m = String(dataUrl||"").match(/^data:audio\/(wav|x-wav|wave);base64,([A-Za-z0-9+\/=]+)$/);
  if(!m) return {ok:false, error:"Please record again (the app sends WAV audio)."};
  if(m[2].length > VOICE_MAX_B64) return {ok:false, error:"That recording is too long. Please keep it under 3 minutes."};
  var bias = lang=="en" ? ["English"] : ["Tagalog","English"];
  var bytes = Utilities.base64Decode(m[2]);
  var send = function(withBias){
    var settings = {model:getProps().getProperty("VOICE_MODEL") || "muse-voice-transcribe-1.0", audioEncoding:"WAV", mode:"PUSH_TO_TALK"};
    if(withBias) settings.languageBias = bias;
    var r = UrlFetchApp.fetch(ASR_URL, {method:"post", headers:{Authorization:"Bearer "+KEY, Accept:"application/json"}, muteHttpExceptions:true,
      payload:{request:Utilities.newBlob(JSON.stringify(settings), "application/json", "request.json"), audio:Utilities.newBlob(bytes, "audio/wav", "recording.wav")}});
    return {code:r.getResponseCode(), txt:r.getContentText()};
  };
  var res = send(true);
  if(res.code==400 && /languageBias|bias/i.test(res.txt)) res = send(false);
  if(res.code==429){ Utilities.sleep(1500); res = send(true); }
  var j = null; try{ j = JSON.parse(res.txt); }catch(e){}
  if(res.code>=400 || !j){
    var msg = j && j.error ? (j.error.message || j.error) : res.txt.slice(0,160);
    return {ok:false, error:"Muse Voice could not transcribe this ("+res.code+"): "+msg};
  }
  var text = String(j.transcript || (j.turns||[]).map(function(t){ return t.transcript; }).join(" ") || "").trim();
  return {ok:true, text:text, duration_ms:j.audioDurationMs||null};
}

/** Run from the editor: transcribes one second of silence (checks the key and the endpoint). */
function testVoice(){
  var n = 16000, buf = [], i;
  var u32 = function(v){ return [v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255]; }, u16 = function(v){ return [v&255,(v>>8)&255]; };
  var head = [].concat([82,73,70,70], u32(36+n*2), [87,65,86,69,102,109,116,32], u32(16), u16(1), u16(1), u32(16000), u32(32000), u16(2), u16(16), [100,97,116,97], u32(n*2));
  for(i=0;i<n*2;i++) buf.push(0);
  var bytes = head.concat(buf).map(function(b){ return b>127 ? b-256 : b; });
  var r = transcribe_("data:audio/wav;base64,"+Utilities.base64Encode(bytes), "en");
  Logger.log(r.ok ? "✅ Muse Voice Transcribe OK (silence → \""+r.text+"\")" : "❌ Muse Voice FAILED: "+r.error);
}

function translate_(p){
  var to = {en:"English", tl:"Tagalog", hil:"Hiligaynon (Ilonggo)"}[p.to] || "English";
  var text = clean_(p.text, 3000);
  if(!text) return {ok:false, error:"Nothing to translate yet."};
  var rc = callMuse([{role:"system", content:"You turn a traveler's spoken notes into a short travel journal entry in "+to+
    ". Keep their meaning, feelings and first-person voice; fix grammar and remove filler words; do not add facts. Plain text, no title, under 220 words."},
    {role:"user", content:text}], null, 700, 0.4);
  return {ok:true, text:rc.text, demo:!!rc.demo};
}

// ============ ACCOUNTS: sign up / sign in (Accounts + Sessions sheets) ============
// Passwords are stored only as salted SHA-256 hashes. A session token (kept on the phone) lasts 60 days;
// the sheet stores only its hash. The account name is also the leaderboard name (Users sheet).
var SESSION_DAYS = 60;
function hex_(bytes){ return bytes.map(function(b){ return ("0"+(b & 255).toString(16)).slice(-2); }).join(""); }
function sha256_(s){ return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function passHash_(salt, pw){ var h = salt+"|"+pw; for(var i=0;i<300;i++) h = sha256_(salt+h); return h; }

function findAccount_(field, value){
  var v = getSS().getSheetByName("Accounts").getDataRange().getValues(), col = {user_id:0, name:1, email:2}[field];
  value = String(value||"").trim().toLowerCase();
  for(var i=1;i<v.length;i++) if(v[i][0] && String(v[i][col]).trim().toLowerCase()==value) return {row:i+1, r:v[i]};
  return null;
}
function publicUser_(r){ return {user_id:String(r[0]), name:String(r[1]), province:provinceId(r[6]), bio:String(r[7]||""), nationality:String(r[8]||""), hometown:String(r[9]||""), photo_id:String(r[10]||"")}; }
function newSession_(userId){
  var token = Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"");
  getSS().getSheetByName("Sessions").appendRow([sha256_(token), userId, new Date(), new Date(Date.now()+SESSION_DAYS*86400000)]);
  CacheService.getScriptCache().put("ses_"+sha256_(token), userId, 21600);
  return token;
}
/** The signed-in account for a session token, or null. */
function userFromToken_(token){
  token = String(token||""); if(token.length<20) return null;
  var h = sha256_(token), cache = CacheService.getScriptCache(), uid = cache.get("ses_"+h);
  if(!uid){
    var v = getSS().getSheetByName("Sessions").getDataRange().getValues();
    for(var i=1;i<v.length;i++) if(String(v[i][0])==h && new Date(v[i][3]) > new Date()){ uid = String(v[i][1]); break; }
    if(!uid) return null;
    cache.put("ses_"+h, uid, 21600);
  }
  var a = findAccount_("user_id", uid);
  return a ? publicUser_(a.r) : null;
}

function signup_(p){
  var name = clean_(p.name, 40), email = clean_(p.email, 120).toLowerCase(), pw = String(p.password||"");
  if(name.length < 2) return {ok:false, error:"Please type a display name (2 to 40 characters)."};
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return {ok:false, error:"Please type a valid email address."};
  if(pw.length < 8) return {ok:false, error:"Use a password with at least 8 characters."};
  var nationality = clean_(p.nationality, 40), hometown = clean_(p.hometown, 60);
  if(nationality.length < 2) return {ok:false, error:"Please type your nationality, e.g. Filipino, Korean, American."};
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    if(findAccount_("email", email)) return {ok:false, error:"That email already has an account. Please sign in."};
    if(findAccount_("name", name)) return {ok:false, error:"That display name is taken. Try adding your town, e.g. \""+name+" of Jaro\"."};
    var uid = "u-"+Utilities.getUuid().slice(0,8), salt = Utilities.getUuid();
    var row = [uid, name, email, passHash_(salt, pw), salt, new Date(), provinceId(p.province), "", nationality, hometown];
    getSS().getSheetByName("Accounts").appendRow(row);
    var user = publicUser_(row);
    return {ok:true, token:newSession_(uid), user:user, points:getUser(name).stamps};
  } finally { lock.releaseLock(); }
}

function signin_(p){
  var a = findAccount_("email", p.email);
  if(!a || passHash_(String(a.r[4]), String(p.password||"")) !== String(a.r[3])) { Utilities.sleep(600); return {ok:false, error:"Wrong email or password."}; }
  var user = publicUser_(a.r);
  return {ok:true, token:newSession_(user.user_id), user:user, points:getUser(user.name).stamps};
}

function signout_(p){
  var h = sha256_(String(p.token||""));
  CacheService.getScriptCache().remove("ses_"+h);
  var sh = getSS().getSheetByName("Sessions"), v = sh.getDataRange().getValues();
  for(var i=v.length-1;i>=1;i--) if(String(v[i][0])==h) sh.getRange(i+1, 4).setValue(new Date());
  return {ok:true};
}

// ============ HOTLINES: emergency numbers per province ============
// The app always shows the national numbers (911 and Philippine Red Cross 143) and "find the nearest" map
// searches. Local numbers come from the Hotlines sheet: add only numbers you have verified with the office,
// then set status to "approved". type: police, tanod (barangay tanod outpost), fire, drrmo (disaster risk reduction and
// management office), healthoffice (municipal or city health office), hospital, clinic, vet, drugstore, coastguard, tourism, other.
// Police stations, barangay tanod outposts, fire stations, DRRMOs, municipal health offices, hospitals, clinics,
// veterinary clinics and drugstores can enroll themselves from the app (Hotline → "List your hotline"): they arrive
// as "pending" with their GPS pin. Call the number to verify it, then change status to "approved".
// Coast guard and tourism numbers are added by the SMILE team.
// province: aklan, antique, capiz, guimaras, iloilo, negros-occidental, negros-oriental, siquijor (blank = all).
var HOTLINE_TYPES = ["police","tanod","fire","drrmo","healthoffice","hospital","clinic","vet","drugstore","coastguard","tourism","other"];
function hotlines_(p){
  var prov = PROVINCES[String(p.province||"").toLowerCase()] ? String(p.province).toLowerCase() : "";
  var list = [];
  try{
    getSS().getSheetByName("Hotlines").getDataRange().getValues().slice(1).forEach(function(r){
      if(!r[2] || !r[3] || String(r[5]).toLowerCase()!="approved") return;
      var pv = String(r[0]||"").trim() ? provinceId(r[0]) : "";
      if(prov && pv && pv!=prov) return;
      var t = HOTLINE_TYPES.indexOf(String(r[1]).toLowerCase().trim())>-1 ? String(r[1]).toLowerCase().trim() : "other";
      var h = {province:pv, type:t, name:String(r[2]).slice(0,80), phone:String(r[3]).replace(/^'/,"").slice(0,40), notes:String(r[4]||"").slice(0,120), address:String(r[8]||"").slice(0,120)};
      var la = Number(r[6]), ln = Number(r[7]);
      if(String(r[6]).trim()!=="" && validLatLng_(la, ln)){ h.lat = la; h.lng = ln; }
      list.push(h);
    });
  }catch(e){}
  return {ok:true, hotlines:list};
}

var PARTNER_TYPES = ["police","tanod","fire","drrmo","healthoffice","hospital","clinic","vet","drugstore"];
/** A police station, tanod outpost, fire station, DRRMO, health office, hospital, clinic, vet or drugstore lists its hotline (pending until verified). */
function hotlineSubmit_(p){
  if(String(p.website||"")) return {ok:true, status:"pending"};   // honeypot: bots fill hidden fields
  var name = clean_(p.name, 80), type = String(p.type||"").toLowerCase();
  var phone = clean_(p.phone, 40), address = clean_(p.address, 120), person = clean_(p.contact_person, 60);
  if(PARTNER_TYPES.indexOf(type) < 0) return {ok:false, error:"Please choose what kind of office or business you are."};
  if(name.length < 3) return {ok:false, error:"Please type the name of your office or business."};
  var digits = phone.replace(/[^\d]/g, "");
  if(!/^[\d+()\-\s\/]{7,40}$/.test(phone) || digits.length < 7) return {ok:false, error:"Please type a phone number we can call, e.g. (033) 123 4567 or 0917 123 4567."};
  if(address.length < 5) return {ok:false, error:"Please type your street address or barangay."};
  if(!p.confirm) return {ok:false, error:"Please confirm that you represent this office or business and the number is correct."};
  var la = Number(p.lat), ln = Number(p.lng), pin = String(p.lat||"")!=="" && validLatLng_(la, ln);
  var cache = CacheService.getScriptCache(), key = "hl_"+sha256_(digits).slice(0,16);
  if(cache.get(key)) return {ok:false, error:"This number was just sent. The SMILE team will call to verify it soon."};
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    getSS().getSheetByName("Hotlines").appendRow([provinceId(p.province), type, name, "'"+phone, clean_(p.notes, 120), "pending",
      pin ? Math.round(la*1e5)/1e5 : "", pin ? Math.round(ln*1e5)/1e5 : "", address, person, new Date()]);
    cache.put(key, "1", 3600);
  } finally { lock.releaseLock(); }
  return {ok:true, status:"pending", message:"Salamat! The SMILE team will call "+phone+" to verify it. Your hotline appears in the app once approved."};
}

// ============ PROFILE PHOTO ============
/** Profile photo (selfie or upload): checked by Muse Spark, saved in the traveler's Drive folder. */
function profilePhoto_(p){
  var u = userFromToken_(p.token);
  if(!u) return {ok:false, error:"Please sign in again.", code:"SIGNED_OUT"};
  if(!/^data:image\/(jpeg|png|webp);base64,/.test(String(p.photo||""))) return {ok:false, error:"Please choose a photo (JPG or PNG)."};
  var mod = moderate_("Profile picture for a traveler's public SMILE profile.", p.photo);
  if(mod.safe===false) return {ok:false, error:"Please choose another photo. Our safety check could not approve this one for a public profile."};
  var f;
  try{ f = saveDataUrl_(journalFolder_(u.user_id), p.photo, "profile-"+Date.now()); }catch(fe){ return {ok:false, error:fe.message}; }
  if(!f) return {ok:false, error:"Please choose a photo (JPG or PNG)."};
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    var a = findAccount_("user_id", u.user_id);
    if(a) getSS().getSheetByName("Accounts").getRange(a.row, 11).setValue(f.id);
  } finally { lock.releaseLock(); }
  return {ok:true, photo_id:f.id};
}

// ============ TRAVEL JOURNAL + SMILE HUB ============
// Journal sheet: one row per post. Public posts that pass Muse Spark's safety check go live on the SMILE Hub
// right away; anything flagged (or when the AI is down) waits as "review" until the team sets status to "live".
// Photos and clips go to the Drive folder "SMILE Journal" (one subfolder per traveler), shared by link.
function journalRoot_(){
  var p = getProps(), id = p.getProperty("JOURNAL_FOLDER_ID");
  if(id){ try{ return DriveApp.getFolderById(id); }catch(e){} }
  var root = DriveApp.createFolder("SMILE Journal");
  p.setProperty("JOURNAL_FOLDER_ID", root.getId());
  return root;
}
function journalFolder_(userId){
  var root = journalRoot_();
  var it = root.getFoldersByName(userId);
  return it.hasNext() ? it.next() : root.createFolder(userId);
}
function saveDataUrl_(folder, dataUrl, name){
  var m = String(dataUrl||"").match(/^data:([\w.+\/-]+);base64,([A-Za-z0-9+\/=]+)$/);
  if(!m || !MEDIA_MIMES[m[1]]) return null;
  if(m[2].length > MEDIA_MAX_B64) throw new Error("That file is too large (max about 10 MB).");
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name+"."+MEDIA_MIMES[m[1]]));
  try{ f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return {id:f.getId(), kind:m[1].indexOf("video/")===0 ? "video" : "image", mime:m[1]};
}

/** Muse Spark safety check for public posts: {safe:true|false|null, reason}. null = could not check. */
function moderate_(text, photoDataUrl){
  try{
    var content = [{type:"text", text:"You review posts for a family-friendly Philippine travel app. Is this post safe to show publicly (no nudity, violence, hate, harassment, personal data like phone numbers or addresses of others, or spam)? Reply ONLY JSON {\"safe\":true/false,\"reason\":\"short\"}.\nPost text: "+clean_(text, 2000)}];
    if(photoDataUrl && /^data:image\//.test(photoDataUrl)) content.push({type:"image_url", image_url:{url:photoDataUrl}});
    var r = callMuse([{role:"user", content:content}], null, 200, 0.1, photoDataUrl ? "vision" : "text");
    if(r.demo) return {safe:null, reason:"demo"};
    var j = JSON.parse(String(r.text).match(/\{[\s\S]*\}/)[0]);
    return {safe:!!j.safe, reason:String(j.reason||"")};
  }catch(e){ return {safe:null, reason:"check unavailable"}; }
}

function journalSave_(p){
  var u = userFromToken_(p.token);
  if(!u) return {ok:false, error:"Please sign in to save your travel journal."};
  var text = clean_(p.text, 3000), caption = clean_(p.caption, 400);
  if(!text && !p.photo && !p.video) return {ok:false, error:"Write or say something about your trip first."};
  var place = p.place_id ? findPlace(p.place_id) : null;
  var visibility = p.visibility=="private" ? "private" : "public";
  var postId = "j-"+Utilities.getUuid().slice(0,8), folder = journalFolder_(u.user_id), photo = null, video = null;
  try{
    if(p.photo) photo = saveDataUrl_(folder, p.photo, postId+"-photo");
    if(p.video) video = saveDataUrl_(folder, p.video, postId+"-video");
  }catch(fe){ return {ok:false, error:fe.message}; }
  var status = "live", note = "";
  if(visibility=="public"){
    var mod = moderate_(text+"\n"+caption, p.photo);
    if(mod.safe===false){ status = "review"; note = "Our safety check wants a person to look at this post first. It stays in your journal meanwhile."; }
    else if(mod.safe===null){ status = "review"; note = "We could not run the safety check right now, so the SMILE team will review your post before it shows on the Hub."; }
  }
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    getSS().getSheetByName("Journal").appendRow([postId, u.user_id, u.name, place?place.id:"", place?place.name:clean_(p.location,80),
      place?place.province:provinceId(p.province), text, caption, clean_(p.lang,8), photo?photo.id:"", video?video.id:"", visibility, status, new Date(), 0]);
  } finally { lock.releaseLock(); }
  return {ok:true, post_id:postId, status:status, visibility:visibility, note:note};
}

function rowToPost_(r, ranks){
  var pts = ranks ? (ranks[String(r[2]).toLowerCase()]||0) : null;
  return {post_id:String(r[0]), user_id:String(r[1]), name:String(r[2]), place_id:String(r[3]||""), place_name:String(r[4]||""),
    province:String(r[5]||""), text:String(r[6]||""), caption:String(r[7]||""), lang:String(r[8]||""), photo_id:String(r[9]||""), video_id:String(r[10]||""),
    visibility:String(r[11]), status:String(r[12]), created:r[13] instanceof Date ? r[13].toISOString() : String(r[13]), likes:Number(r[14])||0,
    points:pts, rank:(pts==null ? null : getRank(pts))};
}
function pointsByName_(){
  var m = {};
  try{ getSS().getSheetByName("Users").getDataRange().getValues().slice(1).forEach(function(r){ if(r[0]) m[String(r[0]).toLowerCase()] = parseInt(r[2])||0; }); }catch(e){}
  return m;
}

function hub_(p){
  var v = getSS().getSheetByName("Journal").getDataRange().getValues().slice(1), ranks = pointsByName_();
  var prov = PROVINCES[String(p.province||"").toLowerCase()] ? String(p.province).toLowerCase() : "";
  var posts = v.filter(function(r){ return r[0] && String(r[11])=="public" && String(r[12])=="live" && (!prov || String(r[5])==prov); })
    .map(function(r){ return rowToPost_(r, ranks); }).reverse().slice(0, Math.min(60, Number(p.limit)||40));
  var photos = {};
  try{ getSS().getSheetByName("Accounts").getDataRange().getValues().slice(1).forEach(function(r){ if(r[0] && r[10]) photos[String(r[0])] = String(r[10]); }); }catch(e){}
  posts.forEach(function(x){ x.avatar_id = photos[x.user_id] || ""; delete x.user_id; });
  return {ok:true, posts:posts};
}

function me_(p){
  var u = userFromToken_(p.token);
  if(!u) return {ok:false, error:"Please sign in again.", code:"SIGNED_OUT"};
  var ranks = pointsByName_(), v = getSS().getSheetByName("Journal").getDataRange().getValues().slice(1);
  var posts = v.filter(function(r){ return String(r[1])==u.user_id && String(r[12])!="deleted"; }).map(function(r){ return rowToPost_(r, ranks); }).reverse();
  var pts = ranks[u.name.toLowerCase()]||0;
  if(p.bio!=null || p.province){
    var a = findAccount_("user_id", u.user_id);
    if(a){ if(p.bio!=null) getSS().getSheetByName("Accounts").getRange(a.row, 8).setValue(clean_(p.bio,200)); if(p.province) getSS().getSheetByName("Accounts").getRange(a.row, 7).setValue(provinceId(p.province)); }
    u = userFromToken_(p.token);
  }
  return {ok:true, user:u, points:pts, rank:getRank(pts), posts:posts};
}

function journalDelete_(p){
  var u = userFromToken_(p.token);
  if(!u) return {ok:false, error:"Please sign in again."};
  var sh = getSS().getSheetByName("Journal"), v = sh.getDataRange().getValues();
  for(var i=1;i<v.length;i++) if(String(v[i][0])==String(p.post_id) && String(v[i][1])==u.user_id){ sh.getRange(i+1, 13).setValue("deleted"); return {ok:true}; }
  return {ok:false, error:"Post not found."};
}

function hubLike_(p){
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    var sh = getSS().getSheetByName("Journal"), v = sh.getDataRange().getValues();
    for(var i=1;i<v.length;i++) if(String(v[i][0])==String(p.post_id) && String(v[i][12])=="live"){
      var n = (Number(v[i][14])||0) + (p.undo ? -1 : 1); n = Math.max(0, n);
      sh.getRange(i+1, 15).setValue(n); return {ok:true, likes:n};
    }
    return {ok:false, error:"Post not found."};
  } finally { lock.releaseLock(); }
}

function journalCaption_(p){
  var place = p.place_id ? findPlace(p.place_id) : null;
  var where = place ? place.name+", "+provinceName(place.province) : (clean_(p.location,80) || "Western Visayas");
  var content = [{type:"text", text:"Write ONE short, warm social caption (max 30 words) for this traveler's post at "+where+
    ". Mix English with a little Hiligaynon, 1-2 emojis, end with #SMILEPH. Base it on their words: "+clean_(p.text, 1500)}];
  var kind = "text";
  if(p.photo && /^data:image\//.test(p.photo) && String(p.photo).length < MEDIA_MAX_B64){ content.push({type:"image_url", image_url:{url:p.photo}}); kind = "vision"; }
  var rc = callMuse([{role:"user", content:content}], null, 200, 0.8, kind);
  return {ok:true, caption:String(rc.text||"").replace(/^["']|["']$/g,"").trim(), demo:!!rc.demo};
}

// ============ MERCHANT DASHBOARD: anonymous shop stats, postcard sales, Muse Spark tips ============
// Each shop gets a manage code (Shops column M) when it signs up; for older shops, type any code there.
// The app counts views, gallery opens, directions, contact taps and shares per shop per day (ShopStats sheet).
var STAT_TYPES = ["views","gallery","directions","contact","share"];
function newManageCode_(){ return "SM-"+Utilities.getUuid().replace(/-/g,"").slice(0,6).toUpperCase(); }

function shopIds_(){
  var ids = {};
  try{ getSS().getSheetByName("Shops").getDataRange().getValues().slice(1).forEach(function(r){ if(r[0]) ids[String(r[0])] = true; }); }catch(e){}
  SHOPS_SEED.forEach(function(s){ ids[s.shop_id] = true; });
  return ids;
}

function trackShops_(p){
  var evs = Array.isArray(p.events) ? p.events.slice(0,60) : [];
  var ids = shopIds_(), add = {};
  evs.forEach(function(e){
    if(!e || !ids[String(e.shop_id)] || STAT_TYPES.indexOf(String(e.type))<0) return;
    var k = String(e.shop_id); add[k] = add[k] || {}; add[k][e.type] = (add[k][e.type]||0) + 1;
  });
  if(!Object.keys(add).length) return {ok:true, saved:0};
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    var day = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd");
    var sh = getSS().getSheetByName("ShopStats"), v = sh.getDataRange().getValues(), rowOf = {};
    for(var i=1;i<v.length;i++){ var d = v[i][0] instanceof Date ? Utilities.formatDate(v[i][0], "Asia/Manila", "yyyy-MM-dd") : String(v[i][0]).replace(/^'/,""); if(d==day) rowOf[String(v[i][1])] = i; }
    Object.keys(add).forEach(function(id){
      var r = rowOf[id] != null ? v[rowOf[id]].slice(0,7) : ["'"+day, id, 0, 0, 0, 0, 0];
      STAT_TYPES.forEach(function(t, j){ r[2+j] = (Number(r[2+j])||0) + (add[id][t]||0); });
      if(rowOf[id] != null) sh.getRange(rowOf[id]+1, 1, 1, 7).setValues([r]); else sh.appendRow(r);
    });
    return {ok:true, saved:Object.keys(add).length};
  } finally { lock.releaseLock(); }
}

function shopByCode_(code){
  code = String(code||"").trim().toUpperCase();
  if(code.length < 4) return null;
  var v = getSS().getSheetByName("Shops").getDataRange().getValues();
  for(var i=1;i<v.length;i++) if(String(v[i][12]||"").trim().toUpperCase()==code && v[i][0]) return {row:i+1, r:v[i]};
  return null;
}

function shopStats_(shopId, days){
  var since = new Date(Date.now() - days*86400000), byDay = {}, totals = {};
  STAT_TYPES.forEach(function(t){ totals[t] = 0; });
  try{
    getSS().getSheetByName("ShopStats").getDataRange().getValues().slice(1).forEach(function(r){
      if(String(r[1])!=shopId) return;
      var d = r[0] instanceof Date ? r[0] : new Date(String(r[0]).replace(/^'/,"")+"T00:00:00+08:00");
      if(isNaN(d) || d < since) return;
      var k = Utilities.formatDate(d, "Asia/Manila", "yyyy-MM-dd");
      byDay[k] = byDay[k] || {};
      STAT_TYPES.forEach(function(t, j){ var n = Number(r[2+j])||0; byDay[k][t] = (byDay[k][t]||0) + n; totals[t] += n; });
    });
  }catch(e){}
  var daysList = [];
  for(var i=days-1;i>=0;i--){ var k2 = Utilities.formatDate(new Date(Date.now()-i*86400000), "Asia/Manila", "yyyy-MM-dd"); daysList.push({date:k2, views:(byDay[k2]&&byDay[k2].views)||0}); }
  return {totals:totals, days:daysList};
}

function dashboard_(p){
  var hit = shopByCode_(p.code);
  if(!hit) return {ok:false, error:"Shop code not found. Check the code you got when you signed up (it starts with SM-)."};
  var r = hit.r, shopId = String(r[0]), name = String(r[1]);
  var items = [];
  try{ getSS().getSheetByName("ShopItems").getDataRange().getValues().slice(1).forEach(function(x){ if(String(x[1])==shopId) items.push({name:x[2], price:x[3], status:String(x[6]||"pending")}); }); }catch(e){}
  var media = {approved:0, pending:0, rejected:0};
  try{ getSS().getSheetByName("Media").getDataRange().getValues().slice(1).forEach(function(x){ if(String(x[1])=="shop" && String(x[2])==shopId){ var st = String(x[8]||"pending").toLowerCase(); media[st] = (media[st]||0)+1; } }); }catch(e){}
  var pc = {bought:0, used:0, left:0};
  try{ getSS().getSheetByName("Postcards").getDataRange().getValues().slice(1).forEach(function(x){ if(String(x[3]).toLowerCase()==name.toLowerCase()){ pc.bought++; if(x[5]===true || String(x[5]).toUpperCase()=="TRUE") pc.used++; else pc.left++; } }); }catch(e){}
  var token = Utilities.getUuid().replace(/-/g,"");
  CacheService.getScriptCache().put("upl_"+shopId, token, 21600);   // lets the shop add photos and its video from the dashboard
  return {ok:true, shop:{shop_id:shopId, name:name, type:String(r[2]||""), province:provinceId(r[10]), status:String(r[7]||"pending"),
    featured:/^(true|yes|y|1|featured)$/i.test(String(r[11]||"").trim())}, items:items, media:media, postcards:pc,
    stats:shopStats_(shopId, 30), upload_token:token};
}

function merchantTips_(p){
  var d = dashboard_(p);
  if(!d.ok) return d;
  var langName = p.lang=="tl" ? "Tagalog" : (p.lang=="en" ? "English" : "Hiligaynon mixed with English");
  var facts = "Shop: "+d.shop.name+" ("+d.shop.type+", "+provinceName(d.shop.province)+"), status "+d.shop.status+(d.shop.featured?", featured":"")+
    ". Products: "+d.items.map(function(i){ return i.name+(i.price?" "+i.price:""); }).join(", ")+
    ". Last 30 days: "+JSON.stringify(d.stats.totals)+". Photos/videos approved "+d.media.approved+", pending "+d.media.pending+
    ". SMILE postcards bought "+d.postcards.bought+", used by tourists "+d.postcards.used+".";
  var rc = callMuse([{role:"system", content:"You coach Filipino nano entrepreneurs and pasalubong shops that sell to tourists through the SMILE app. Speak "+langName+
    ". Give exactly 3 short, practical tips (numbered) based only on the facts given, e.g. better photos, a promo video, price display, postcard bundles, the ₱500/₱2,000 featured listing when views are low. Under 120 words. Do not invent numbers."},
    {role:"user", content:facts}], null, 500);
  return {ok:true, tips:rc.text, demo:!!rc.demo};
}

// ============ SAM 3.1 (Meta Model API): find products in merchants' photos and promo videos ============
// POST https://api.meta.ai/v1/responses, model "sam-3.1", same META_API_KEY. A short phrase ("piaya box")
// plus one photo or one video; SAM 3.1 returns one line per image / video frame with a box (and a mask)
// for every match. SMILE reads the boxes only:
//   photos → "found / not found", where the product is, and a close-up crop the merchant can use;
//   video  → in how many frames (≈ seconds) the product is on screen.
// Optional Script Property: SAM_MODEL (default sam-3.1).
var SAM_URL = "https://api.meta.ai/v1/responses";
function samModel_(){ return getProps().getProperty("SAM_MODEL") || "sam-3.1"; }

/** The output text of a Responses API reply (plain JSON or a server-sent-event stream). */
function samOutputText_(txt){
  var j = null;
  try{ j = JSON.parse(txt); }catch(e){}
  if(j){
    if(j.error){ var er = typeof j.error=="string" ? {message:j.error} : j.error; throw new Error("SAM 3.1: "+(er.code?er.code+": ":"")+(er.message||String(txt).slice(0,160))); }
    if(typeof j.output_text=="string") return j.output_text;
    var parts = [];
    (j.output||[]).forEach(function(o){ (o.content||[]).forEach(function(c){ if(typeof c.text=="string") parts.push(c.text); }); });
    return parts.join("");
  }
  var acc = [];   // event stream: concatenate output_text deltas
  String(txt).split(/\r?\n/).forEach(function(line){
    if(line.indexOf("data:")!==0) return;
    var d = line.slice(5).trim(); if(!d || d=="[DONE]") return;
    try{
      var ev = JSON.parse(d);
      if(ev.type=="response.output_text.delta" && typeof ev.delta=="string") acc.push(ev.delta);
      if(ev.type=="error" || ev.type=="response.failed") throw new Error("SAM 3.1: "+((ev.error&&ev.error.message)||ev.message||"request failed"));
    }catch(pe){ if(/^SAM 3\.1/.test(pe.message)) throw pe; }
  });
  return acc.join("");
}

/** Reads every box in SAM's output: [{frame, id, x1, y1, x2, y2, w, h, c}]. Masks are skipped. */
function parseSamBoxes_(text){
  var boxes = [], frames = {};
  String(text||"").split(/\n/).forEach(function(line){
    var fm = line.match(/^<(\d+)f>/); if(!fm) return;
    var frame = Number(fm[1]); frames[frame] = true;
    var re = /(\d+)<\|box;x1=(-?\d+);y1=(-?\d+);x2=(-?\d+);y2=(-?\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g, m;
    while((m = re.exec(line))){
      boxes.push({frame:frame, id:m[1], x1:+m[2], y1:+m[3], x2:+m[4], y2:+m[5], w:+m[6], h:+m[7], c:(m[8]!=null ? +m[8] : null)});
    }
  });
  return {boxes:boxes, frames:Object.keys(frames).map(Number)};
}

function callSam_(phrase, mediaPart){
  var KEY = museKey_();
  if(!KEY) throw new Error("META_API_KEY is not set");
  var send = function(meta){
    var body = {model:samModel_(), stream:false, metadata:meta,
      input:[{type:"message", role:"user", content:[{type:"input_text", text:phrase}, mediaPart]}]};
    var r = UrlFetchApp.fetch(SAM_URL, {method:"post", contentType:"application/json", headers:{Authorization:"Bearer "+KEY},
      payload:JSON.stringify(body), muteHttpExceptions:true});
    return {code:r.getResponseCode(), txt:r.getContentText()};
  };
  var res = send({mask_encoding:"one_bit", include_confidence:"true"});
  if(res.code==400 && /metadata|confidence/i.test(res.txt)) res = send({mask_encoding:"one_bit"});
  if(res.code>=400){
    var msg = res.txt.slice(0,200); try{ var ej = JSON.parse(res.txt); msg = (ej.error&&(ej.error.message||ej.error))||msg; }catch(x){}
    throw new Error("SAM 3.1 HTTP "+res.code+": "+msg);
  }
  return parseSamBoxes_(samOutputText_(res.txt));
}

/** Photo: is the product there, and where? Returns the best box (highest confidence, else largest). */
function samImage_(phrase, dataUrl){
  var r = callSam_(phrase, {type:"input_image", image_url:dataUrl});
  var best = null;
  r.boxes.forEach(function(b){
    var area = (b.x2-b.x1)*(b.y2-b.y1), bestArea = best ? (best.x2-best.x1)*(best.y2-best.y1) : -1;
    if(!best || (b.c!=null && best.c!=null ? b.c>best.c : area>bestArea)) best = b;
  });
  return {found:!!best, count:r.boxes.length, best:best, boxes:r.boxes.slice(0,16)};
}

/** Video: in how many frames is the product visible? total_frames comes from the app (duration × fps). */
function samVideo_(phrase, dataUrl, totalFrames){
  var r = callSam_(phrase, {type:"input_video", video_url:dataUrl});
  var seen = {}, area = {};
  r.boxes.forEach(function(b){ seen[b.frame] = true; area[b.frame] = Math.max(area[b.frame]||0, ((b.x2-b.x1)*(b.y2-b.y1))/Math.max(1,b.w*b.h)); });
  var withObj = Object.keys(seen).length;
  var maxFrame = r.frames.length ? Math.max.apply(null, r.frames) : -1;
  // If SAM listed frames without the product too, it reports every frame it processed: count those lines.
  // Otherwise use the clip's frame count from the app (duration × fps).
  var listsEmptyFrames = r.frames.length > withObj;
  var total = listsEmptyFrames ? r.frames.length : Math.max(withObj, maxFrame+1, Number(totalFrames)||0);
  var bestFrame = null, bestArea = 0;
  Object.keys(area).forEach(function(f){ if(area[f]>bestArea){ bestArea=area[f]; bestFrame=Number(f); } });
  return {found:withObj>0, frames_with_product:withObj, total_frames:total, share:(total ? withObj/total : 0), best_frame:bestFrame};
}

/** Run from the editor: SAM 3.1 on a sample photo. */
function testSAM(){
  var img = UrlFetchApp.fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Avocado_Hass_-_single_and_halved.jpg/640px-Avocado_Hass_-_single_and_halved.jpg").getBlob();
  try{
    var r = samImage_("avocado", "data:image/jpeg;base64,"+Utilities.base64Encode(img.getBytes()));
    Logger.log((r.found ? "✅ SAM 3.1 OK: found "+r.count+" avocado(s). Best box: "+JSON.stringify(r.best) : "⚠️ SAM 3.1 answered but found no avocado."));
  }catch(e){ Logger.log("❌ SAM 3.1 FAILED: "+e.message); }
}

// ============ MEDIA: merchants' photos (up to 5) and a 15-second promo video, saved in Google Drive ============
// Files go to the Drive folder "SMILE Media" (one subfolder per shop or place) and are shared
// "anyone with the link can view" so the app can show them. The Media sheet lists every file;
// only rows with status "approved" appear in the app. Merchant uploads arrive as "pending".
// Script Property ADMIN_CODE (your own passcode) lets the SMILE team upload approved media for
// places and shops from the app's #/media page.
var MEDIA_LIMITS = {image:5, video:1};
var MEDIA_MIMES = {"image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "video/mp4":"mp4", "video/quicktime":"mov", "video/webm":"webm"};
var MEDIA_MAX_B64 = 14000000;   // ≈ 10 MB file

function mediaRoot_(){
  var p = getProps(), id = p.getProperty("MEDIA_FOLDER_ID");
  if(id){ try{ return DriveApp.getFolderById(id); }catch(e){} }
  var f = DriveApp.createFolder("SMILE Media");
  p.setProperty("MEDIA_FOLDER_ID", f.getId());
  return f;
}
function ownerFolder_(type, id){
  var root = mediaRoot_(), name = type+"-"+id, it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function isAdmin_(code){ var c = getProps().getProperty("ADMIN_CODE"); return !!c && String(code||"")===c; }
function uploadTokenOk_(ownerType, ownerId, token){
  if(ownerType!="shop" || !token) return false;
  return CacheService.getScriptCache().get("upl_"+ownerId) === String(token);
}
/** Who may use SAM 3.1 or upload for this owner: the SMILE team (ADMIN_CODE) or the shop that just signed up. */
function mediaAuth_(p){
  if(isAdmin_(p.code)) return "admin";
  if(uploadTokenOk_(p.owner_type, p.owner_id, p.token)) return "merchant";
  return null;
}

function getMediaData(){
  var list = [];
  try{
    var v = getSS().getSheetByName("Media").getDataRange().getValues(); v.shift();
    v.forEach(function(r){
      if(!r[0] || String(r[8]).toLowerCase()!="approved") return;
      var sam = null; try{ sam = r[7] ? JSON.parse(r[7]) : null; }catch(e){}
      list.push({media_id:String(r[0]), owner_type:String(r[1]), owner_id:String(r[2]), kind:String(r[3]), file_id:String(r[4]), title:String(r[5]||""), sam_phrase:String(r[6]||""), sam:sam});
    });
  }catch(e){}
  return list;
}

function mediaUpload_(p){
  var who = mediaAuth_(p);
  if(!who) return {ok:false, error:"Upload not allowed. Send your shop first, then add photos within 6 hours, or ask the SMILE team."};
  var ownerType = p.owner_type=="place" ? "place" : (p.owner_type=="shop" ? "shop" : "");
  var ownerId = clean_(p.owner_id, 60), kind = p.kind=="video" ? "video" : "image";
  if(!ownerType || !ownerId) return {ok:false, error:"Missing shop or place."};
  var m = String(p.data||"").match(/^data:([\w.+\/-]+);base64,([A-Za-z0-9+\/=]+)$/);
  if(!m || !MEDIA_MIMES[m[1]] || (kind=="video") !== (m[1].indexOf("video/")===0)) return {ok:false, error:"Please use a JPG/PNG photo or an MP4/MOV video."};
  if(m[2].length > MEDIA_MAX_B64) return {ok:false, error:"That file is too large (max about 10 MB)."};
  var lock = takeLock(); if(!lock) return BUSY;
  try{
    var sh = getSS().getSheetByName("Media"), v = sh.getDataRange().getValues(), used = 0;
    for(var i=1;i<v.length;i++) if(String(v[i][1])==ownerType && String(v[i][2])==ownerId && String(v[i][3])==kind && String(v[i][8]).toLowerCase()!="rejected") used++;
    if(used >= MEDIA_LIMITS[kind]) return {ok:false, error:(kind=="video" ? "This shop already has its promo video." : "This shop already has 5 photos.")};
    var mediaId = "m-"+Utilities.getUuid().slice(0,8);
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], mediaId+"."+MEDIA_MIMES[m[1]]);
    var file = ownerFolder_(ownerType, ownerId).createFile(blob);
    file.setDescription(clean_(p.title, 120));
    try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(se){}
    var sam = p.sam && typeof p.sam=="object" ? JSON.stringify(p.sam).slice(0,1000) : "";
    var status = who=="admin" ? "approved" : "pending";
    sh.appendRow([mediaId, ownerType, ownerId, kind, file.getId(), clean_(p.title,120), clean_(p.sam_phrase,80), sam, status, new Date(), who]);
    return {ok:true, media_id:mediaId, file_id:file.getId(), status:status};
  } finally { lock.releaseLock(); }
}

// ============ WEB ENTRY ============
function doGet(e){
  var p = (e && e.parameter) || {};
  if(!p.action){
    var html = "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    + "<body style='font-family:system-ui;background:#FFF8EC;text-align:center;padding:30px'>"
    + "<h1>"+VERSION+" Backend Online</h1>"
    + "<p>Isidro -> Challenge -> Maps -> Postcard -> Mail -> Adopt | AI Photobooth</p>"
    + "<p><a href='?action=ping'>ping</a> | <a href='?action=places'>places</a> | <a href='?action=philpost_inventory'>inventory</a> | <a href='?action=leaderboard'>leaderboard</a></p></body>";
    return HtmlService.createHtmlOutput(html).setTitle("SMILE Backend");
  }
  return handle(p);
}
function doPost(e){
  var b={}; try{ b=JSON.parse(e.postData.contents); }catch(x){}
  var m={}; if(e.parameter) for(var k in e.parameter) m[k]=e.parameter[k];
  for(var k2 in b) m[k2]=b[k2];
  return handle(m);
}

// ============ MAIN ROUTER ============
function handle(p){
  var a = p.action || "ping";
  try{
    if(a=="ping") return out({ok:true, service:VERSION, time:new Date(), flow:"Isidro>Challenge>Maps>Postcard>Mail>Adopt>Photobooth"});
    if(a=="places") return out({ok:true, places:getPlacesData()});
    if(a=="shops") return out({ok:true, shops:getShopsData()});
    if(a=="media") return out({ok:true, media:getMediaData()});
    if(a=="track") return out(trackShops_(p));
    if(a=="transcribe") return out(transcribe_(p.audio, p.lang));
    if(a=="translate") return out(translate_(p));
    if(a=="signup") return out(signup_(p));
    if(a=="signin") return out(signin_(p));
    if(a=="signout") return out(signout_(p));
    if(a=="me") return out(me_(p));
    if(a=="hotlines") return out(hotlines_(p));
    if(a=="hotline_submit") return out(hotlineSubmit_(p));
    if(a=="profile_photo") return out(profilePhoto_(p));
    if(a=="journal_save") return out(journalSave_(p));
    if(a=="journal_delete") return out(journalDelete_(p));
    if(a=="journal_caption") return out(journalCaption_(p));
    if(a=="hub") return out(hub_(p));
    if(a=="hub_like") return out(hubLike_(p));
    if(a=="dashboard") return out(dashboard_(p));
    if(a=="merchant_tips") return out(merchantTips_(p));
    if(a=="media_upload") return out(mediaUpload_(p));
    if(a=="sam_image" || a=="sam_video"){
      if(!mediaAuth_(p)) return out({ok:false, error:"SAM 3.1 is for shops adding their photos (or the SMILE team)."});
      var phrase = clean_(p.phrase, 60);
      if(!phrase) return out({ok:false, error:"Type what SAM should look for, e.g. piaya box."});
      var du = String(p.data||"");
      if(a=="sam_image"){
        if(!/^data:image\/(jpeg|png|webp);base64,/.test(du) || du.length>MEDIA_MAX_B64) return out({ok:false, error:"Please choose a photo (JPG or PNG, max about 10 MB)."});
        return out({ok:true, result:samImage_(phrase, du)});
      }
      if(!/^data:video\/(mp4|quicktime);base64,/.test(du) || du.length>MEDIA_MAX_B64) return out({ok:false, error:"SAM 3.1 needs an MP4 or MOV video (max about 10 MB)."});
      return out({ok:true, result:samVideo_(phrase, du, p.total_frames)});
    }

    // ---------- SHOP SIGN-UP (nano entrepreneurs / pasalubong stores) ----------
    if(a=="shop_submit"){
      var sp = p.shop || {}, items = Array.isArray(p.items) ? p.items.slice(0,12) : [];
      var nm = clean_(sp.name, 80), tp = SHOP_TYPES.indexOf(String(sp.type))>-1 ? String(sp.type) : "other";
      if(!nm) return out({ok:false, error:"Please type your shop name."});
      if(!clean_(sp.contact, 120)) return out({ok:false, error:"Please add a contact (Facebook page, mobile number or email) so tourists can reach you."});
      items = items.map(function(x){ return {name:clean_(x.name,80), price:clean_(x.price,30), desc:clean_(x.desc,400), category:SHOP_TYPES.indexOf(String(x.category))>-1?String(x.category):tp}; }).filter(function(x){ return x.name; });
      if(!items.length) return out({ok:false, error:"Add at least one product."});
      var lockS=takeLock(); if(!lockS) return out(BUSY);
      try{
        var shopId = "shop-"+Utilities.getUuid().slice(0,8);
        var manageCode = newManageCode_();
        var pinLat = Number(sp.lat), pinLng = Number(sp.lng), pinOk = validLatLng_(pinLat, pinLng);
        getSS().getSheetByName("Shops").appendRow([shopId, nm, tp, clean_(sp.barangay,80), clean_(sp.desc,400), clean_(sp.contact,120), "", "pending", new Date(), clean_(p.user||"",40), provinceId(sp.province), "", manageCode, pinOk?Math.round(pinLat*1e5)/1e5:"", pinOk?Math.round(pinLng*1e5)/1e5:""]);
        var ish=getSS().getSheetByName("ShopItems");
        var rowsI = items.map(function(x,i){ return [shopId+"-"+(i+1), shopId, x.name, x.price, x.desc, x.category, "pending", new Date()]; });
        ish.getRange(ish.getLastRow()+1,1,rowsI.length,rowsI[0].length).setValues(rowsI);
        var token = Utilities.getUuid().replace(/-/g,"");
        CacheService.getScriptCache().put("upl_"+shopId, token, 21600);   // 6 h to add photos and the promo video
        return out({ok:true, shop_id:shopId, status:"pending", items:rowsI.length, upload_token:token, manage_code:manageCode, message:"Salamat! Your shop was sent to the SMILE team. It appears in the Shop tab once approved."});
      } finally { lockS.releaseLock(); }
    }
    if(a=="ai_status"){
      return out({ok:true, providers: aiProviders_().map(function(pv){ return {name:pv.name, text_models:modelCandidates_(pv,"text").slice(0,3), vision_models:modelCandidates_(pv,"vision").slice(0,3)}; })});
    }
    if(a=="my_profile") return out({ok:true, user:getUser(p.user||"Guest")});
    if(a=="outfit_suggestions"){
      var plS = findPlace(p.place_id);
      return out({ok:true, place:plS, suggestions: plS ? outfitSuggestionsFor(plS.cat) : OUTFIT_SUGGESTIONS._default});
    }

    // ---------- PHILPOST PRINTS BATCH ----------
    if(a=="philpost_print"){
      var lock=takeLock(); if(!lock) return out(BUSY);
      try{
        var ss=getSS(), qty=Math.min(parseInt(p.qty)||50,500), place_id=p.place_id||"molo-church";
        var batch_id="PHLPOST-"+Utilities.formatDate(new Date(),"Asia/Manila","yyyyMMdd-HHmmss");
        ss.getSheetByName("Batches").appendRow([batch_id,place_id,qty,new Date(),"PhilPost VI",15,30,"printed"]);
        var pc=ss.getSheetByName("Postcards"), codes=[], rows=[];
        for(var i=0;i<qty;i++){ var c=genCode(); rows.push([c,batch_id,"PhilPost VI","","",false,"","",place_id,new Date()]); codes.push(c); }
        if(rows.length) pc.getRange(pc.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
        return out({ok:true,batch_id:batch_id,place_id:place_id,qty:qty,codes:codes,note:"PhilPost sells to merchant @P15, tourist SRP P30"});
      } finally { lock.releaseLock(); }
    }
    if(a=="philpost_inventory"){
      var vals=getSS().getSheetByName("Postcards").getDataRange().getValues(), total=0,unsold=0,assigned=0,used=0;
      for(var i2=1;i2<vals.length;i2++){ if(!vals[i2][0]) continue; total++; if(vals[i2][5]===true) used++; else if(!vals[i2][3]) unsold++; else assigned++; }
      return out({ok:true,printer:"PhilPost VI",total:total,unsold_at_philpost:unsold,with_merchants_unsold:assigned,used_by_tourists:used});
    }

    // ---------- MERCHANT BUYS FROM PHILPOST ----------
    if(a=="merchant_buy"){
      var lock2=takeLock(); if(!lock2) return out(BUSY);
      try{
        var ss3=getSS(), merchant=p.merchant||"Unnamed Shop", count=Math.min(parseInt(p.count)||20,200);
        var sh=ss3.getSheetByName("Postcards"), v=sh.getDataRange().getValues(), assigned=[];
        for(var r=1;r<v.length && assigned.length<count;r++){
          if(!v[r][3] && v[r][5]!==true && (!p.place_id || v[r][8]==p.place_id)){
            sh.getRange(r+1,4).setValue(merchant); sh.getRange(r+1,5).setValue(new Date());
            assigned.push({code:v[r][0],place_id:v[r][8],batch_id:v[r][1]});
          }
        }
        if(!assigned.length) return out({ok:false,error:"No PhilPost stock left. Ask PhilPost VI to print new batch."});
        var msh=ss3.getSheetByName("Merchants"), mv=msh.getDataRange().getValues(), found=false;
        for(var m=1;m<mv.length;m++){
          if(mv[m][0]==merchant){
            msh.getRange(m+1,3).setValue((parseInt(mv[m][2])||0)+assigned.length);   // stock_left
            msh.getRange(m+1,4).setValue((parseInt(mv[m][3])||0)+assigned.length);   // total_bought
            found=true; break;
          }
        }
        if(!found) msh.appendRow([merchant,p.contact||"",assigned.length,assigned.length,new Date()]);
        return out({ok:true,merchant:merchant,codes:assigned,note:"Bought from PhilPost VI @P15, sell to tourist @P30"});
      } finally { lock2.releaseLock(); }
    }
    if(a=="merchant_stock"){
      var vv=getSS().getSheetByName("Postcards").getDataRange().getValues(), left=0,sold=0;
      for(var q=1;q<vv.length;q++) if(String(vv[q][3])==String(p.merchant||"")){ if(vv[q][5]===true) sold++; else left++; }
      return out({ok:true,merchant:p.merchant,stock_left:left,sold_used:sold});
    }

    // ---------- 1. ISIDRO CHAT ----------
    if(a=="chat") return out(isidroChat_(p));

    // ---------- 1B. ISIDRO RECOMMENDS (Challenge Cards) ----------
    if(a=="recommend"){
      var allPls = getPlacesData();
      var wantProv = PROVINCES[String(p.province||"").toLowerCase()] ? String(p.province).toLowerCase() : "";
      var pls = wantProv ? allPls.filter(function(x){ return x.province==wantProv; }) : allPls;
      if(!pls.length) pls = allPls;
      var sysPick = "Pick 4-5 best place IDs from this list ONLY based on user request. Return ONLY JSON array like [\"molo-church\",\"lapaz-batchoy\"]. List: "+JSON.stringify(pls);
      var ids=[];
      try{
        var rr = callMuse([{role:"system",content:sysPick},{role:"user",content:p.q||"4 hours landmarks and food"}],null,200,0.3);
        var match=rr.text.match(/\[[\s\S]*\]/); ids=JSON.parse(match[0]);
      }catch(e){ ids=pls.slice(0,4).map(function(x){ return x.id; }); }
      var chosen = pls.filter(function(x){ return ids.indexOf(x.id)>-1; });
      if(!chosen.length) chosen = pls.slice(0,4);
      chosen = chosen.map(function(x){ var c=withMaps(x); c.outfit_suggestions=outfitSuggestionsFor(x.cat); return c; });
      var langName2 = p.lang=="tl" ? "Tagalog" : (p.lang=="en" ? "English" : "Hiligaynon mix");
      var expl;
      try{
        expl = callMuse([{role:"system",content:"You are Isidro, a friendly Western Visayas tour guide"+(wantProv?" in "+PROVINCES[wantProv]:"")+". Speak "+langName2+". Briefly & excitedly explain why you picked these places, itinerary order, food to try, est. budget in PHP. End #SMILEPH. Places: "+JSON.stringify(chosen)},{role:"user",content:p.q||"Recommend"}],null,500);
      }catch(aiErr){
        // AI down: still give the visitor useful challenge cards.
        expl = {text:"Maayong adlaw! Isidro is resting right now, but here are great picks for you: "+chosen.map(function(x){return x.name;}).join(", ")+". Accept a challenge below! #SMILEPH", demo:false, model:"", error:aiErr.message};
      }
      return out({ok:true, reply:expl.text, places:chosen, demo:expl.demo, model:expl.model||"", ai_error:expl.error||""});
    }

    // ---------- 2. ACCEPT CHALLENGE ----------
    if(a=="accept_challenge"){
      var place = findPlace(p.place_id);
      if(!place) return out({ok:false,error:"Place not found"});
      getSS().getSheetByName("Challenges").appendRow([new Date(), p.user||"Guest", place.id, place.name, "accepted", "", ""]);
      return out({ok:true, place:place, maps_url:mapsUrl(place), message:"Challenge accepted! Go to "+place.name});
    }
    if(a=="my_challenges"){
      var cv=getSS().getSheetByName("Challenges").getDataRange().getValues(), mine=[];
      for(var ci2=1;ci2<cv.length;ci2++) if(String(cv[ci2][1]).toLowerCase()==String(p.user||"").toLowerCase()) mine.push({time:cv[ci2][0],place_id:cv[ci2][2],place_name:cv[ci2][3],status:cv[ci2][4],postcard:cv[ci2][5],completed_time:cv[ci2][6]});
      return out({ok:true,challenges:mine});
    }

    // ---------- 3. TOURIST CHECKIN (One-Use QR) ----------
    if(a=="checkin"){
      var lock3=takeLock(); if(!lock3) return out(BUSY);
      try{
        var code=normCode(p.postcard), ssc=getSS(), csh=ssc.getSheetByName("Postcards"), cvals=csh.getDataRange().getValues(), row=-1;
        if(!code) return out({ok:false,error:"Type the code printed on your SMILE postcard."});
        for(var cix=1;cix<cvals.length;cix++) if(normCode(cvals[cix][0])==code){ row=cix+1; break; }
        if(row==-1) return out({ok:false,error:"Invalid QR. Buy official PhilPost postcard from accredited merchant at the location."});
        if(cvals[row-1][5]===true) return out({ok:false,error:"Postcard already used (one-use only). Buy a new one to continue."});
        var merchName = cvals[row-1][3] || "PhilPost Direct";
        csh.getRange(row,6,1,3).setValues([[true, p.user||"Guest", new Date()]]);
        var pl = findPlace(p.place_id) || {name:p.place_id,points:10,id:p.place_id};
        ssc.getSheetByName("Checkins").appendRow([new Date(),p.user||"Guest",p.place_id,code,pl.name,merchName,"online",String(p.vision_status||"skipped").slice(0,500)]);
        var chSh=ssc.getSheetByName("Challenges"), chV=chSh.getDataRange().getValues();
        for(var ch=chV.length-1;ch>=1;ch--){
          if(String(chV[ch][1]).toLowerCase()==String(p.user||"Guest").toLowerCase() && chV[ch][2]==p.place_id && chV[ch][4]=="accepted"){
            chSh.getRange(ch+1,5,1,3).setValues([["completed", code, new Date()]]); break;
          }
        }
        var total = updateUserStamps(p.user||"Guest", pl.points||10);
        return out({ok:true, stamp:pl, total:total, rank:getRank(total), merchant:merchName, message:"Challenge Completed! Now buy 2 PhilPost stamps and mail your postcard, or try the AI Photobooth!"});
      } finally { lock3.releaseLock(); }
    }

    // ---------- 4. MAIL POSTCARD ----------
    if(a=="mail_postcard"){
      if(!p.postcard) return out({ok:false,error:"Postcard code required"});
      var lock4=takeLock(); if(!lock4) return out(BUSY);
      try{
        var pcode=normCode(p.postcard);
        var pcv=getSS().getSheetByName("Postcards").getDataRange().getValues(), isUsed=false;
        for(var u=1;u<pcv.length;u++) if(normCode(pcv[u][0])==pcode && pcv[u][5]===true) isUsed=true;
        if(!isUsed) return out({ok:false,error:"Scan/check-in your postcard first before mailing."});
        var jsh=getSS().getSheetByName("Journey"), jv=jsh.getDataRange().getValues(), chain=1;
        for(var j=1;j<jv.length;j++){
          if(normCode(jv[j][0])!=pcode) continue;
          if(jv[j][5]=="mailed") return out({ok:false,error:"This postcard is already on its way to "+jv[j][3]+". It can be mailed again after someone adopts it."});
          chain++;
        }
        var dest = RANDOM_DESTINATIONS[Math.floor(Math.random()*RANDOM_DESTINATIONS.length)];
        jsh.appendRow([pcode, p.user||"Guest", p.place_id||"", dest.place, dest.province, "mailed", new Date(), "", "", chain]);
        return out({ok:true, destination:dest, chain_no:chain, stamps_used:2, message:"Postcard mailed to "+dest.place+", "+dest.province+"! A tourist there can adopt it."});
      } finally { lock4.releaseLock(); }
    }

    // ---------- 5. ADOPT POSTCARD ----------
    if(a=="adopt_postcard"){
      var lock5=takeLock(); if(!lock5) return out(BUSY);
      try{
        var jsh2=getSS().getSheetByName("Journey"), jv2=jsh2.getDataRange().getValues(), k=-1;
        for(var kk=1;kk<jv2.length;kk++) if(normCode(jv2[kk][0])==normCode(p.postcard) && jv2[kk][5]=="mailed"){ k=kk; break; }
        if(k==-1) return out({ok:false,error:"Postcard not found, not mailed yet, or already adopted."});
        var sender = jv2[k][1], fromPlace = jv2[k][2];          // v9 fix: was reading the row above
        var adopter = p.user||"New Tourist";
        if(String(sender).toLowerCase()==String(adopter).toLowerCase()) return out({ok:false,error:"You can't adopt your own postcard. Share it with a friend!"});
        jsh2.getRange(k+1,6).setValue("adopted"); jsh2.getRange(k+1,8,1,2).setValues([[adopter, new Date()]]);
        var senderNewTotal = updateUserStamps(sender, 5);
        var adopterTotal = updateUserStamps(adopter, 10);
        return out({ok:true, sender:sender, sender_new_total:senderNewTotal, from_place_id:fromPlace, adopter_total:adopterTotal, rank:getRank(adopterTotal), message:"Welcome to SMILE! You adopted "+sender+"'s postcard. Ask Isidro for your own challenge now!"});
      } finally { lock5.releaseLock(); }
    }
    if(a=="track_postcard"){
      var jv3=getSS().getSheetByName("Journey").getDataRange().getValues(), history=[];
      var fmt=function(d){ return d instanceof Date ? Utilities.formatDate(d,"Asia/Manila","MMM d, yyyy h:mm a") : d; };
      for(var t=1;t<jv3.length;t++) if(normCode(jv3[t][0])==normCode(p.postcard)) history.push({chain_no:jv3[t][9],sender:jv3[t][1],from:jv3[t][2],to_place:jv3[t][3],to_province:jv3[t][4],status:jv3[t][5],mailed:fmt(jv3[t][6]),adopted_by:jv3[t][7],adopted_date:fmt(jv3[t][8])});
      return out({ok:true, code:normCode(p.postcard), history:history});
    }

    // ---------- 6. AI PHOTOBOOTH (Actual or AI Outfit, Moderated) ----------
    if(a=="photobooth"){
      var placePB = findPlace(p.place_id) || {name:p.place_id||"Western Visayas", id:p.place_id, cat:"nature", barangay:"", province:"iloilo"};
      if(!p.image) return out({ok:false, error:"Photo is required. Please take/upload a selfie first."});
      var finalImage = p.image;
      var usedPrompt = "Actual outfit - no AI edit";
      var modePB = p.mode || "actual";
      var imageProvider = "none";

      if(modePB=="ai"){
        var outfitRaw = String(p.outfit||"").trim().slice(0,300);
        if(!outfitRaw) return out({ok:false, error:"Please type or choose an AI outfit first."});

        // HARD BLOCKLIST
        var blockedWords = ["naked","nude","topless","transparent","see-through","see through","lingerie","erotic","porn","fetish","sex toy","minor bikini","child bikini","sexy schoolgirl","only underwear","remove clothes","undress"];
        var lowerOutfit = outfitRaw.toLowerCase();
        for(var b=0;b<blockedWords.length;b++){
          if(lowerOutfit.indexOf(blockedWords[b])>-1) return out({ok:false, error:"That outfit is not allowed. Please choose a tasteful, family-friendly outfit.", suggestions:outfitSuggestionsFor(placePB.cat)});
        }

        // PLACE-BASED RULE: Church/Heritage/Food stalls = No Swimwear
        var noSwim = ["landmark","heritage","food","festival"].indexOf(placePB.cat)>-1;
        var wantsSwimwear = /bikini|swimsuit|swimwear|two.?piece|beach outfit|swim\s?trunk/i.test(outfitRaw);
        if(wantsSwimwear && noSwim){
          return out({ok:false, error:"Swimwear is not appropriate for "+placePB.name+". Please try Filipiniana, Barong Tagalog, or a festival outfit instead.", suggestions:outfitSuggestionsFor(placePB.cat)});
        }

        // STEP 1: Muse moderates + rewrites to a SAFE prompt
        try{
          var museMod = callMuse([
            {role:"system",content:"You are a safety moderator and prompt engineer for a family tourism app in the Philippines. Rewrite the user outfit request into ONE safe, tasteful, photorealistic image edit prompt. Rules: Keep the exact same face, same person, same identity and smile. Only change outfit and background. If swimwear/beachwear is requested AND the place category is stay/nature/beach, rewrite it as 'elegant, tasteful resort beachwear, fully covered, non-erotic, natural daylight, family-friendly travel photo'. Never use words: sexy, erotic, revealing, seductive, hot body. No nudity. Output ONLY the final prompt, no explanation."},
            {role:"user",content:"User outfit request: "+outfitRaw+". Place: "+placePB.name+" ("+placePB.cat+"), "+placePB.barangay+", "+provinceName(placePB.province)+", Philippines. Description: "+placePB.desc+". Background must be that landmark, golden hour, vibrant tourist photo."}
          ], null, 300, 0.3);
          usedPrompt = museMod.text;
        }catch(modErr){ usedPrompt = ""; }
        if(!usedPrompt || usedPrompt.indexOf("[DEMO]")===0){
          usedPrompt = "Photorealistic tourist photo, keep the exact same face and same person, wearing "+outfitRaw+" (tasteful, family-friendly), background is "+placePB.name+", "+provinceName(placePB.province)+", Philippines at golden hour, vibrant, natural daylight.";
        }

        // STEP 2: Muse Image edits the photo (face preserved)
        try{
          var rawBase64 = String(p.image||"").split(",").pop();
          var mimePB = p.mime || "image/jpeg";
          var edited = editPhoto_(rawBase64, mimePB, usedPrompt);
          finalImage = edited.dataUrl;
          imageProvider = edited.provider;
        }catch(editErr){
          return out({ok:false, error:"The AI could not create that outfit (it may have been refused as too revealing). Please try a more modest description like 'elegant summer beach dress' or 'tasteful resort outfit', or use Actual Outfit mode. Detail: "+editErr.message, suggestions:outfitSuggestionsFor(placePB.cat)});
        }
      }

      try{ getSS().getSheetByName("Photobooth").appendRow([new Date(), p.user||"Guest", placePB.id, placePB.name, modePB+(imageProvider!="none"?" ("+imageProvider+")":""), p.outfit||"", usedPrompt]); }catch(logErr){}
      return out({ok:true, image:finalImage, place:placePB, prompt_used:usedPrompt, mode:modePB, image_provider:imageProvider, suggestions:outfitSuggestionsFor(placePB.cat), note:"Digital CONQUERED postcard - save to phone, no printing."});
    }

    // ---------- OFFLINE SYNC ----------
    if(a=="sync_batch"){
      var lock6=takeLock(); if(!lock6) return out(BUSY);
      try{
        var items=[]; try{ items=typeof p.items=="string" ? JSON.parse(p.items||"[]") : (p.items||[]); }catch(e){}
        var sss=getSS(), pcSh=sss.getSheetByName("Postcards"), pvals=pcSh.getDataRange().getValues(), res=[];
        for(var si=0;si<items.length;si++){
          var it=items[si], cc=normCode(it.postcard), f=-1;
          for(var fi=1;fi<pvals.length;fi++) if(normCode(pvals[fi][0])==cc){ f=fi+1; break; }
          if(f==-1){ res.push({code:cc,ok:false}); continue; }
          if(pvals[f-1][5]===true){ res.push({code:cc,ok:false,dup:true}); continue; }
          pcSh.getRange(f,6,1,3).setValues([[true, it.user||"Guest", new Date()]]);
          pvals[f-1][5]=true;
          var ip = findPlace(it.place_id) || {name:it.place_id, points:10};
          sss.getSheetByName("Checkins").appendRow([new Date(it.ts||Date.now()),it.user||"Guest",it.place_id,cc,ip.name,pvals[f-1][3],"offline","skipped"]);
          updateUserStamps(it.user||"Guest", ip.points||10);
          res.push({code:cc,ok:true});
        }
        return out({ok:true, results:res});
      } finally { lock6.releaseLock(); }
    }

    if(a=="leaderboard"){
      var uv=getSS().getSheetByName("Users").getDataRange().getValues(); uv.shift();
      var board=uv.filter(function(r){return r[0];}).map(function(r){ return {name:r[0],stamps:parseInt(r[2])||0,rank:getRank(r[2])}; }).sort(function(x,y){return y.stamps-x.stamps;});
      return out({ok:true, board:board.slice(0,20)});
    }

    // ---------- AI VISION: Muse Spark (Flag, Never Auto-Reject) ----------
    if(a=="vision"){
      var vPlace = findPlace(p.place_id) || {name:p.place_id||"a landmark", barangay:"", province:"iloilo"};
      var img = String(p.image||"");
      if(!/^data:image\//.test(img)) return out({ok:false, error:"Please choose a photo first."});
      if(img.length > 3800000) return out({ok:false, error:"That photo is too large. Please try again with a smaller photo."});
      var fallback = {match:false, confidence:0, reason:"Vision unavailable, human review needed"};
      try{
        var rv=callMuse([{role:"user",content:[
          {type:"text",text:"Does this photo show "+vPlace.name+" ("+vPlace.barangay+", "+provinceName(vPlace.province)+", Philippines)? Reply ONLY JSON {\"match\":true/false,\"confidence\":0-100,\"reason\":\"short\"}. If unsure, match=false."},
          {type:"image_url",image_url:{url:img}}   // v9 fix: full photo (was cut in half before)
        ]}],null,300,0.2,"vision");
        var parsed = fallback;
        try{ parsed = JSON.parse(rv.text.match(/\{[\s\S]*\}/)[0]); }catch(pe){ parsed = {match:false, confidence:0, reason:String(rv.text).slice(0,160)}; }
        return out({ok:true, review:true, result:JSON.stringify(parsed), match:!!parsed.match, confidence:Number(parsed.confidence)||0, reason:String(parsed.reason||""), note:"Flagged for human review if mismatch"});
      }catch(ex){ return out({ok:true, review:true, result:JSON.stringify(fallback), match:false, confidence:0, reason:fallback.reason}); }
    }

    // ---------- AI CAPTION (Muse) ----------
    if(a=="caption"){
      var rc2=callMuse([{role:"system",content:"Write viral FB/TikTok caption, English+Hiligaynon mix, emojis, place name, #SMILEPH #WesternVisayas #Conquered. Under 40 words. Give 2 options."},{role:"user",content:"Souvenir photo at "+(p.place||"Western Visayas")+" mood "+(p.mood||"happy")}],null,250);
      return out({ok:true, caption:rc2.text});
    }

    // ---------- AI MERCHANT ASSISTANT (Muse) ----------
    if(a=="merchant"){
      var rm=callMuse([{role:"system",content:"Help Filipino nano-entrepreneurs. Turn shorthand into listing: Title, Price PHP, Description EN, Deskripsyon Hiligaynon, 3 hashtags."},{role:"user",content:(p.merchant?"Shop: "+p.merchant+". ":"")+(p.raw||"white shirt Dinagyang print 350")}],null,400);
      try{ getSS().getSheetByName("Products").appendRow([new Date(),p.merchant||"",p.raw||"",rm.text]); }catch(e){}
      return out({ok:true, listing:rm.text});
    }

    // ---------- AI LGU INSIGHTS (Muse) ----------
    if(a=="insights"){
      var data="No data"; try{ data=JSON.stringify(getSS().getSheetByName("Checkins").getDataRange().getValues().slice(-80)); }catch(x){}
      var journeyData=""; try{ journeyData=JSON.stringify(getSS().getSheetByName("Journey").getDataRange().getValues().slice(-30)); }catch(y){}
      var photoData=""; try{ photoData=JSON.stringify(getSS().getSheetByName("Photobooth").getDataRange().getValues().slice(-20)); }catch(z){}
      var ri=callMuse([{role:"system",content:"Tourism analyst for LGUs and PhilPost in Western Visayas. Plain language. Top places, peak times, postcard journey spread across PH, photobooth usage, and 2 concrete actions. Only use data given."},{role:"user",content:"Question: "+(p.q||"Which places got most visitors?")+"\nCheckins:"+data+"\nJourney:"+journeyData+"\nPhotobooth:"+photoData}],null,600);
      return out({ok:true, insights:ri.text});
    }

  }catch(err){ return out({ok:false, error:String(err && err.message ? err.message : err)}); }
  return out({ok:false, error:"unknown action: "+a});
}

// ============ TEST FUNCTIONS (Run manually in editor to test) ============
function testPing(){ Logger.log(JSON.stringify(getPlacesData())); }
function testMuse(){ Logger.log(callMuse([{role:"user",content:"Say Maayong adlaw in one sentence"}]).text); }
/** Prints the 3 food places so you can check their Directions links. */
function testFoodPlaces(){
  ["pancit-molo","chicken-inasal","seafoods"].forEach(function(id){ var p=findPlace(id); Logger.log(id+" -> "+(p ? p.name+" | "+p.maps_url : "MISSING (run setup)")); });
}
/** Makes 5 test postcard codes for a place so you can try check-in. */
function testMakeCodes(){
  var r = JSON.parse(handle({action:"philpost_print", qty:5, place_id:"chicken-inasal"}).getContent());
  Logger.log(r.codes ? r.codes.join("\n") : JSON.stringify(r));
}
