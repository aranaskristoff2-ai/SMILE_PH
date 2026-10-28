/*
 * SMILE (See More of Islands' Landmarks and Events): frontend application (vanilla JS, GitHub Pages).
 *
 * Files: config.js (API URL) → api.js (window.SmileApi, the only backend client) → app.js (this file).
 *
 * Built on the same structure as Journalism Writer:
 *  - Safe DOM construction only. Server and AI text (Isidro replies, captions, place names) is always
 *    inserted with textContent / createTextNode, never innerHTML.
 *  - A small hash router (#/, #/explore, #/isidro, #/checkin, #/postcards, #/tools, #/ranks) with a
 *    render token so a slow reply never paints over a newer page.
 *  - Install banner on first opening with steps for Android, iPhone and desktop.
 *  - Accessible modals (focus kept inside, Esc closes, focus returns), toasts in an aria-live region,
 *    scroll-reveal motion that switches off for "reduce motion".
 *  - localStorage keeps only small things: display name, points, accepted challenges, install choice.
 *    Every read and write is wrapped, so private windows still work.
 *  - Old links keep working: #isidro, #checkin and ?place=…&code=… (postcard QR codes).
 */
(function () {
  'use strict';

  var Api = window.SmileApi;
  var TZ = 'Asia/Manila';
  var LOGO_SRC = 'assets/logo-512.webp';
  var POSTER_SRC = 'assets/poster.webp';

  // ---------------------------------------------------------------------------
  // Data: fallback places (demo mode / offline), categories, outfit suggestions, ranks
  // ---------------------------------------------------------------------------

  var FALLBACK = [
    { province: 'iloilo', id: 'molo-church', name: 'Molo Church', cat: 'landmark', barangay: 'Molo', desc: 'Gothic church, all-female saints.', points: 10, lat: 10.6974, lng: 122.5441 },
    { province: 'iloilo', id: 'jaro-cathedral', name: 'Jaro Cathedral', cat: 'landmark', barangay: 'Jaro', desc: 'Our Lady of Candles shrine.', points: 10, lat: 10.724, lng: 122.5563 },
    { province: 'iloilo', id: 'miagao-church', name: 'Miagao Church UNESCO', cat: 'landmark', barangay: 'Miagao', desc: 'World Heritage fortress church.', points: 20, lat: 10.642, lng: 122.2358 },
    { province: 'iloilo', id: 'calle-real', name: 'Calle Real', cat: 'heritage', barangay: 'City Proper', desc: 'Heritage walk + coffee.', points: 10, lat: 10.6938, lng: 122.5742 },
    { province: 'iloilo', id: 'esplanade', name: 'Iloilo Esplanade', cat: 'nature', barangay: 'Mandurriao', desc: 'Sunset riverside.', points: 5, lat: 10.7085, lng: 122.5488 },
    { province: 'iloilo', id: 'lapaz-batchoy', name: "Netong's Batchoy", cat: 'food', barangay: 'La Paz', desc: 'Original La Paz Batchoy.', points: 5, lat: 10.7118, lng: 122.569 },
    { province: 'iloilo', id: 'pancit-molo', name: "Pancit Molo at Kap Esing's", cat: 'food', barangay: 'Iloilo Central Market', desc: "Kap Esing's classic Ilonggo pancit molo: pork dumplings in garlicky chicken broth.", points: 5, lat: 10.6965, lng: 122.5684, maps_url: 'https://www.google.com/maps/search/?api=1&query=Kap+Esing%27s+Pancit+Molo+Iloilo+Central+Market' },
    { province: 'iloilo', id: 'dinagyang', name: 'Dinagyang Festival', cat: 'festival', barangay: 'City Proper', desc: 'Ati warriors, Jan.', points: 25, lat: 10.693, lng: 122.572 },
    { province: 'iloilo', id: 'iloilo-capitol', name: 'Iloilo Provincial Capitol', cat: 'heritage', barangay: 'City Proper', desc: 'Iconic capitol.', points: 10, lat: 10.702, lng: 122.5685 },
    { province: 'iloilo', id: 'gigantes', name: 'Islas de Gigantes', cat: 'stay', barangay: 'Carles', desc: 'Island hopping & scallops.', points: 20, lat: 11.5867, lng: 123.1767 },
    { province: 'iloilo', id: 'garin-farm', name: 'Garin Farm', cat: 'nature', barangay: 'San Joaquin', desc: 'White cross pilgrimage.', points: 15, lat: 10.5978, lng: 122.0983 },
    { province: 'iloilo', id: 'chicken-inasal', name: 'Chicken Inasal at Fort in the City', cat: 'food', barangay: 'Iloilo Central Market', desc: 'Charcoal-grilled Ilonggo inasal with garlic rice and chicken oil at Fort in the City.', points: 5, lat: 10.6965, lng: 122.5684, maps_url: 'https://www.google.com/maps/search/?api=1&query=Fort+in+the+City+Iloilo+Central+Market' },
    { province: 'iloilo', id: 'seafoods', name: 'Seafood Feast in Arevalo', cat: 'food', barangay: 'Villa Arevalo', desc: 'Fresh crabs, prawns, scallops and mussels by the sea.', points: 5, lat: 10.6877, lng: 122.5135, maps_url: 'https://www.google.com/maps/search/?api=1&query=Seafood+restaurant+Villa+Arevalo+Iloilo' },
    { province: 'iloilo', id: 'robertos-siopao', name: "Queen Siopao at Roberto's", cat: 'food', barangay: 'J.M. Basa St, City Proper', desc: "Roberto's famous giant Queen siopao, stuffed with chicken and pork adobo. Go late morning before it sells out.", points: 5, lat: 10.6935, lng: 122.5718, maps_url: 'https://www.google.com/maps/search/?api=1&query=Roberto%27s+Siopao+J.M.+Basa+Street+Iloilo+City' },
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
    {"id": "mt-kanlaon", "province": "negros-oriental", "name": "Mt. Kanlaon", "cat": "nature", "barangay": "Canlaon City", "desc": "Negros' highest peak and an active volcano. Enjoy the view from Canlaon City; climbing is closed during volcanic activity, so check PHIVOLCS advisories first.", "points": 10, "lat": 10.412, "lng": 123.132, "maps_url": "https://www.google.com/maps/search/?api=1&query=Canlaon+City+Negros+Oriental"}
  ];

  var CATS = {
    landmark: { label: 'Landmarks', icon: 'church', color: '#0057D9' },
    heritage: { label: 'Heritage', icon: 'heritage', color: '#7B2CBF' },
    nature: { label: 'Nature', icon: 'palm', color: '#00A651' },
    food: { label: 'Food', icon: 'food', color: '#FF6B00' },
    festival: { label: 'Festivals', icon: 'festival', color: '#ED0460' },
    stay: { label: 'Islands & stays', icon: 'island', color: '#0096C7' }
  };

  // Provinces: the tourist picks one on the home page; its places and shops show first,
  // and every other province stays listed below it (never hidden).
  var PROVINCES = [ { "id": "aklan", "name": "Aklan", "sub": "Boracay · Kalibo", "color": "#0096C7", "icon": "island" }, { "id": "antique", "name": "Antique", "sub": "San Jose · Tibiao · Culasi", "color": "#00A651", "icon": "palm" }, { "id": "capiz", "name": "Capiz", "sub": "Roxas City · Panay", "color": "#7B2CBF", "icon": "food" }, { "id": "guimaras", "name": "Guimaras", "sub": "Jordan · Nueva Valencia", "color": "#E09A00", "icon": "heart" }, { "id": "iloilo", "name": "Iloilo", "sub": "Iloilo City · Miagao · Gigantes", "color": "#FF6B00", "icon": "church" }, { "id": "negros-occidental", "name": "Negros Occidental", "sub": "Bacolod · Silay · Talisay", "color": "#ED0460", "icon": "festival" }, { "id":  "negros-oriental", "name":  "Negros Oriental", "sub":  "Dumaguete · Apo Island · Manjuyod", "color":  "#0057D9", "icon":  "globe" }, { "id":  "siquijor", "name":  "Siquijor", "sub":  "Lazi · San Juan · Maria", "color":  "#5B2A86", "icon":  "sparkle" } ];
  var DEFAULT_PROVINCE = 'iloilo';
  function provinceOf(x) { var id = String((x && x.province) || DEFAULT_PROVINCE).toLowerCase().trim(); return PROVINCES.some(function (p) { return p.id === id; }) ? id : DEFAULT_PROVINCE; }
  function provinceInfo(id) { return PROVINCES.filter(function (p) { return p.id === id; })[0] || null; }
  function provinceName(id) { var p = provinceInfo(id); return p ? p.name : 'Western Visayas'; }

  var SUGGESTIONS = {
    landmark: ['Elegant Filipiniana gown', 'Barong Tagalog formal', 'Modest church Sunday best outfit'],
    heritage: ['1920s Calle Real vintage outfit', 'Barong Tagalog', 'Filipiniana dress'],
    festival: ['Dinagyang Ati warrior costume with tall feather headdress', 'Colorful Dinagyang dancer outfit'],
    food: ['Fun chef outfit holding Batchoy bowl', 'Ilonggo food trip apron outfit'],
    nature: ['Elegant summer dress sunset outfit', 'Tasteful beach resort outfit'],
    stay: ['Elegant two-piece bikini resort outfit', 'Tasteful swimsuit with beach cover-up', 'Island hopping rash guard outfit', 'Summer beach dress'],
    _default: ['SMILE Western Visayas tourist t-shirt', 'Filipiniana outfit']
  };

  var RANKS = [['E', 0], ['D', 3], ['C', 6], ['B', 10], ['A', 15], ['S', 20], ['SS', 30], ['SSS', 45]];

  // Poster hotspots, in % of the poster image (1024 × 1536).
  var HOTSPOTS = [
    { id: 'dinagyang', label: 'Dinagyang', icon: 'festival', x: 22, y: 13 },
    { id: 'iloilo-capitol', label: 'Iloilo Capitol', icon: 'heritage', x: 78, y: 18 },
    { id: 'miagao-church', label: 'Miag-ao Church', icon: 'church', x: 12, y: 41 },
    { id: 'gigantes', label: 'Carles Islands', icon: 'island', x: 84, y: 38 },
    { id: 'mt-kanlaon', label: 'Mt. Kanlaon', icon: 'palm', x: 88, y: 51 },
    { id: 'jaro-cathedral', label: 'Jaro Cathedral', icon: 'church', x: 13, y: 58 },
    { id: 'balay-negrense', label: 'Silay Heritage', icon: 'heritage', x: 45, y: 59 },
    { id: 'masskara', label: 'MassKara', icon: 'festival', x: 72, y: 61 },
    { id: 'lapaz-batchoy', label: 'Batchoy', icon: 'food', x: 12, y: 75 },
    { id: 'bacolod-inasal', label: 'Chicken Inasal', icon: 'food', x: 37, y: 75 },
    { id: 'roxas-seafood', label: 'Seafoods', icon: 'food', x: 62, y: 75 },
    { id: 'pancit-molo', label: 'Pancit Molo', icon: 'food', x: 87, y: 75 }
  ];

  var ROTATING = ['landmarks.', 'beaches.', 'festivals.', 'food trips.', 'islands.', 'heritage streets.'];

  var State = {
    places: FALLBACK.slice(),
    placesLoaded: false,
    demo: !Api.isConfigured(),
    visionStatus: 'skipped',
    stampsBought: false,
    lastCheckin: null,
    province: ''
  };

  /** The province the tourist picked ('' until they pick one). Remembered on this device. */
  function currentProvince() {
    if (!State.province) { var saved = storageGet('smile.province'); State.province = provinceInfo(saved) ? saved : ''; }
    return State.province;
  }
  function setProvince(id) {
    if (!provinceInfo(id)) return;
    State.province = id;
    storageSet('smile.province', id);
  }

  var renderToken = 0;

  // ---------------------------------------------------------------------------
  // DOM helpers (safe construction only)
  // ---------------------------------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'value') node.value = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, String(v));
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) appendChildren(node, c);
      else node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function storageGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* optional */ } }
  function readJson(key, fallback) { try { var v = JSON.parse(storageGet(key) || 'null'); return v === null ? fallback : v; } catch (e) { return fallback; } }
  function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function manilaDate() {
    try { return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()); }
    catch (e) { return new Date().toDateString(); }
  }

  var toastTimer = null;
  function toast(message) {
    var t = $('#toast');
    t.textContent = message;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 3400);
  }

  function friendlyError(err) { return Api.friendly(err); }

  // ---------------------------------------------------------------------------
  // Icons (static SVG paths, built with createElementNS)
  // ---------------------------------------------------------------------------

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    pin: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
    church: 'M11 2h2v3h3v2h-3v2h-2V7H8V5h3V2ZM12 10l7 5v7h-5v-5h-4v5H5v-7l7-5Z',
    heritage: 'M12 2 2 7v2h20V7L12 2ZM4 10v7H2v3h20v-3h-2v-7h-3v7h-3v-7h-4v7H7v-7H4Z',
    palm: 'M13 22h-2c0-5 1-9 3-12-3 0-6-1-8-3 3-1 6 0 8 1C13 5 14 3 16 1c1 2 1 5 0 7 2-1 4-1 6 0-2 2-5 3-7 3-1 3-2 7-2 11Z',
    food: 'M3 13h18a9 9 0 0 1-18 0ZM4 20h16v2H4v-2ZM7 4h2v6H7V4Zm4-2h2v8h-2V2Zm4 2h2v6h-2V4Z',
    festival: 'M12 2l2 4 4-2-1 4 4 1-3 3 3 3-4 1 1 4-4-2-2 4-2-4-4 2 1-4-4-1 3-3-3-3 4-1-1-4 4 2 2-4Z',
    island: 'M11 20c0-4 1-7 3-9-2 0-4-1-5-2 2-1 4 0 5 1 0-2 1-3 2-4 1 1 1 3 0 5 1-1 3-1 4 0-1 1-3 2-4 2-1 2-2 4-2 7h-3ZM2 21c2-1 4-1 6 0 2-1 4-1 6 0 2-1 4-1 6 0v2c-2-1-4-1-6 0-2-1-4-1-6 0-2-1-4-1-6 0v-2Z',
    map: 'M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Zm0 2.2 6 2v11.6l-6-2V5.2Z',
    postcard: 'M3 5h18v14H3V5Zm9 1H4v12h8V6Zm2 2h6v2h-6V8Zm0 4h6v1h-6v-1Z',
    compass: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm4 4-2.5 6.5L7 15l2.5-6.5L16 6Z',
    trophy: 'M5 3h14v2h3v4a5 5 0 0 1-5 5h-.4A6 6 0 0 1 13 17.9V20h4v2H7v-2h4V18A6 6 0 0 1 7.4 14H7a5 5 0 0 1-5-5V5h3V3Zm0 4H4v2a3 3 0 0 0 1.2 2.4L5 7Zm14 0v4.4A3 3 0 0 0 20 9V7h-1Z',
    check: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-1 15 7-7-1.4-1.4L11 14.2l-2.6-2.6L7 13l4 4Z',
    install: 'M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6V3ZM5 19h14v2H5v-2Z',
    camera: 'M9 3h6l1 2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l1-2Zm3 15a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z',
    shop: 'M4 4h16l1 5a3 3 0 0 1-5 2 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-2l1-5Zm0 9h2v5h12v-5h2v7H4v-7Z',
    chart: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z',
    guide: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5Z',
    star: 'm12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.8L12 2Z',
    mailbox: 'M4 11V8a8 8 0 0 1 16 0v3H4Zm-2 2h20v7H2v-7ZM19 4h3v5h-3V4Z',
    stamp: 'M4 2h16v20H4V2Zm2 2v16h12V4H6Zm6 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
    heart: 'M12 21S2.5 16.4 2.5 9.6A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.5 3.6C21.5 16.4 12 21 12 21Z',
    route: 'M6 3a3 3 0 0 1 3 3c0 2.4-3 6-3 6S3 8.4 3 6a3 3 0 0 1 3-3Zm12 9a3 3 0 0 1 3 3c0 2.4-3 6-3 6s-3-3.6-3-6a3 3 0 0 1 3-3ZM6 14h2v2a2 2 0 0 0 2 2h3v2h-3a4 4 0 0 1-4-4v-2Z',
    save: 'M5 3h12l4 4v14H5V3Zm2 2v14h12V8.5L16.5 5H15v4H8V5H7Z',
    caption: 'M4 3h16v13H9l-5 4V3Zm3 4v2h10V7H7Zm0 4v2h7v-2H7Z',
    close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z',
    search: 'M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
    share: 'M12 2 7 7l1.4 1.4L11 5.8V15h2V5.8l2.6 2.6L17 7l-5-5ZM5 11h3v2H7v7h10v-7h-1v-2h3v11H5V11Z',
    plusSquare: 'M4 4h16v16H4V4Zm2 2v12h12V6H6Zm5 2h2v3h3v2h-3v3h-2v-3H8v-2h3V8Z',
    sparkle: 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z',
    send: 'M2 21 23 12 2 3v7l15 2-15 2v7Z',
    home: 'M12 3 2 11h3v10h5v-6h4v6h5V11h3L12 3Z',
    globe: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-1.6 2.2A8 8 0 0 0 4.1 11H8c.1-2.6.9-5 2.4-6.8ZM12 4.3C10.9 5.8 10.1 8.2 10 11h4c-.1-2.8-.9-5.2-2-6.7Zm1.6-.1C15.1 6 15.9 8.4 16 11h3.9a8 8 0 0 0-6.3-6.8ZM4.1 13a8 8 0 0 0 6.3 6.8C8.9 18 8.1 15.6 8 13H4.1Zm5.9 0c.1 2.8.9 5.2 2 6.7 1.1-1.5 1.9-3.9 2-6.7h-4Zm6 0c-.1 2.6-.9 5-2.4 6.8a8 8 0 0 0 6.3-6.8H16Z',
    alert: 'M12 2 1 21h22L12 2Zm-1 7h2v6h-2V9Zm0 8h2v2h-2v-2Z',
    user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z',
    refresh: 'M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 1 0 22 13h-2a8 8 0 1 1-8-9Z',
    chevronDown: 'M12 16.5 3.5 8 5 6.5l7 7 7-7L20.5 8 12 16.5Z',
    qr: 'M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h4v2h-2v2h-2v-4Zm-4 4h2v4h-2v-4Zm4 2h4v2h-4v-2Zm2-2h2v2h-2v-2Z'
  };

  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name] || ICONS.pin);
    path.setAttribute('fill-rule', 'evenodd');
    svg.appendChild(path);
    return svg;
  }

  function decorateStaticIcons() {
    document.querySelectorAll('[data-icon]').forEach(function (n) {
      if (n.querySelector('svg')) return;
      n.insertBefore(icon(n.getAttribute('data-icon')), n.firstChild);
    });
  }

  // ---------------------------------------------------------------------------
  // Passport: name, points, rank, accepted challenges (device only)
  // ---------------------------------------------------------------------------

  var Passport = {
    name: function () { return storageGet('smile_user') || ''; },
    setName: function (n) { storageSet('smile_user', String(n || '').trim().slice(0, 40)); Passport.paint(); },
    points: function () { var n = parseInt(storageGet('smile_pts') || '0', 10); return isNaN(n) ? 0 : n; },
    setPoints: function (n) { n = parseInt(n, 10); if (!isNaN(n)) { storageSet('smile_pts', String(n)); Passport.paint(); } },
    challenges: function () { var l = readJson('smile_challenges', []); return Array.isArray(l) ? l : []; },
    accept: function (place) {
      var list = Passport.challenges();
      if (!list.some(function (x) { return x && x.id === place.id; })) list.push({ id: place.id, name: place.name, lat: place.lat, lng: place.lng, cat: place.cat, barangay: place.barangay, points: place.points });
      storageSet('smile_challenges', JSON.stringify(list));
    },
    hasAccepted: function (id) { return Passport.challenges().some(function (x) { return x && x.id === id; }); },
    /** Places this explorer has checked in at (their stamp album), kept on this device. */
    stamps: function () { var l = readJson('smile_stamps', []); return Array.isArray(l) ? l.filter(function (x) { return x && x.id; }) : []; },
    hasStamp: function (id) { return Passport.stamps().some(function (x) { return x.id === id; }); },
    addStamp: function (id) {
      var list = Passport.stamps();
      if (!list.some(function (x) { return x.id === id; })) list.push({ id: id, at: new Date().toISOString() });
      storageSet('smile_stamps', JSON.stringify(list));
    },
    paint: function () {
      var pts = Passport.points();
      var r = $('#pill-rank'), p = $('#pill-pts');
      if (r) r.textContent = rankOf(pts);
      if (p) p.textContent = String(pts);
    }
  };

  function rankOf(n) {
    var out = 'E';
    RANKS.forEach(function (r) { if (n >= r[1]) out = r[0]; });
    return out;
  }
  function nextRank(n) {
    for (var i = 0; i < RANKS.length; i++) if (n < RANKS[i][1]) return { rank: RANKS[i][0], need: RANKS[i][1] - n };
    return null;
  }

  /** Ask for a display name once (modal), then continue. */
  function ensureName(then) {
    var current = Passport.name();
    if (current) { then(current); return; }
    var input = el('input', { id: 'name-input', type: 'text', maxlength: '40', autocomplete: 'nickname', placeholder: 'e.g. Juan from Jaro', required: true });
    var form = el('form', { class: 'stack', onsubmit: function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      Passport.setName(v);
      Modal.close();
      then(v);
    } }, [
      el('p', { class: 'muted', text: 'This name shows on your stamps, postcards and the leaderboard.' }),
      formField('name-input', 'Your display name', input),
      el('button', { type: 'submit', class: 'btn btn--block' }, [icon('check'), 'Save and continue'])
    ]);
    Modal.open({ title: 'What should we call you, explorer?', body: form, name: 'name', initialFocus: input });
  }

  // ---------------------------------------------------------------------------
  // Motion: page-enter animation and scroll reveal (both switched off for "reduce motion")
  // ---------------------------------------------------------------------------

  var Motion = {
    observer: null,
    enter: function (node) {
      if (!node || prefersReducedMotion()) return;
      node.classList.remove('view--enter');
      void node.offsetWidth;
      node.classList.add('view--enter');
    },
    reveal: function (root) {
      var items = Array.prototype.slice.call((root || document).querySelectorAll('.reveal:not(.is-visible)'));
      if (prefersReducedMotion() || typeof window.IntersectionObserver !== 'function') {
        items.forEach(function (n) { n.classList.add('is-visible'); });
        return;
      }
      if (!Motion.observer) Motion.observer = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); Motion.observer.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      items.forEach(function (n) { Motion.observer.observe(n); });
    }
  };

  // ---------------------------------------------------------------------------
  // Modal dialogs (focus kept inside, Esc closes, focus returns to the opener)
  // ---------------------------------------------------------------------------

  var Modal = {
    current: null,
    seq: 0,
    open: function (opts) {
      Modal.close(true);
      var prev = document.activeElement;
      var titleId = 'modal-title-' + (++Modal.seq);
      var closeBtn = el('button', { type: 'button', class: 'modal__close', 'aria-label': 'Close', onclick: function () { Modal.close(); } }, icon('close'));
      var dialog = el('div', { class: 'modal__dialog' + (opts.wide ? ' modal__dialog--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' }, [
        el('div', { class: 'modal__head' }, [el('h2', { id: titleId, class: 'modal__title', text: opts.title }), closeBtn]),
        el('div', { class: 'modal__body' }, opts.body)
      ]);
      var root = el('div', { class: 'modal' }, [
        el('div', { class: 'modal__backdrop', onclick: function () { Modal.close(); } }),
        dialog
      ]);
      var onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); Modal.close(); return; }
        if (e.key !== 'Tab') return;
        var f = Modal.focusables(dialog);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      };
      document.addEventListener('keydown', onKey);
      document.body.appendChild(root);
      document.body.classList.add('has-modal');
      Modal.current = { root: root, dialog: dialog, prev: prev, onKey: onKey, onClose: opts.onClose, name: opts.name || '' };
      if (prefersReducedMotion()) root.classList.add('is-open');
      else window.requestAnimationFrame(function () { root.classList.add('is-open'); });
      (opts.initialFocus || dialog).focus({ preventScroll: true });
      return dialog;
    },
    focusables: function (root) {
      return Array.prototype.slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'))
        .filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
    },
    close: function (silent) {
      var m = Modal.current;
      if (!m) return;
      Modal.current = null;
      document.removeEventListener('keydown', m.onKey);
      document.body.classList.remove('has-modal');
      m.root.classList.remove('is-open');
      setTimeout(function () { if (m.root.parentNode) m.root.parentNode.removeChild(m.root); }, silent || prefersReducedMotion() ? 0 : 260);
      if (typeof m.onClose === 'function') m.onClose();
      if (!silent && m.prev && typeof m.prev.focus === 'function') m.prev.focus({ preventScroll: true });
    }
  };

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function formField(id, label, input, hint) {
    return el('div', { class: 'field' }, [
      el('label', { for: id, class: 'field__label', text: label }),
      input,
      hint ? el('p', { class: 'field__hint', text: hint }) : null
    ]);
  }

  function setBusy(btn, busy, text) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.dataset.label || btn.textContent;
      btn.disabled = true;
      btn.classList.add('is-busy');
      btn.setAttribute('aria-busy', 'true');
      if (text) { var s = btn.querySelector('.btn__text'); if (s) s.textContent = text; }
    } else {
      btn.disabled = false;
      btn.classList.remove('is-busy');
      btn.removeAttribute('aria-busy');
      var t = btn.querySelector('.btn__text');
      if (t && btn.dataset.orig) t.textContent = btn.dataset.orig;
    }
  }

  function button(text, ic, opts) {
    opts = opts || {};
    var b = el(opts.href ? 'a' : 'button', {
      type: opts.href ? null : (opts.type || 'button'),
      href: opts.href || null,
      target: opts.target || null,
      rel: opts.target ? 'noopener' : null,
      class: 'btn' + (opts.variant ? ' btn--' + opts.variant : '') + (opts.block ? ' btn--block' : '') + (opts.small ? ' btn--small' : ''),
      onclick: opts.onclick || null,
      disabled: opts.disabled || null,
      'aria-label': opts.label || null
    }, [ic ? icon(ic) : null, el('span', { class: 'btn__text', text: text })]);
    b.dataset.orig = text;
    return b;
  }

  /** A box that shows status / AI text safely (textContent only). */
  function outputBox() {
    var box = el('div', { class: 'output', role: 'status', 'aria-live': 'polite', hidden: true });
    box.show = function (text, kind) {
      box.hidden = false;
      box.className = 'output' + (kind ? ' output--' + kind : '');
      box.textContent = text;
    };
    box.loading = function (text) {
      box.hidden = false;
      box.className = 'output output--loading';
      box.textContent = '';
      appendChildren(box, [el('span', { class: 'spinner spinner--small', 'aria-hidden': 'true' }), el('span', { text: text })]);
    };
    return box;
  }

  function mapsUrl(p) {
    if (p.maps_url && /^https:\/\//.test(p.maps_url)) return p.maps_url;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(p.lat + ',' + p.lng);
  }

  function findPlace(id) { return State.places.filter(function (p) { return p.id === id; })[0] || FALLBACK.filter(function (p) { return p.id === id; })[0] || null; }
  function catOf(p) { return CATS[p && p.cat] || { label: 'Place', icon: 'pin', color: '#0057D9' }; }

  /**
   * An older backend (before v10) sends no "province" field and only Iloilo places. Until the new
   * Code.gs is deployed, add the built-in places/shops of the other provinces so no province is empty.
   */
  function withBuiltIns(list, builtIns, key) {
    if (list.some(function (x) { return x.province; })) return list;
    var have = {};
    list.forEach(function (x) { have[x[key]] = true; });
    return list.concat(builtIns.filter(function (x) { return !have[x[key]]; }));
  }

  function loadPlaces() {
    if (State.placesLoaded || State.demo) return Promise.resolve(State.places);
    return Api.places().then(function (r) {
      if (r && Array.isArray(r.places) && r.places.length) State.places = withBuiltIns(r.places.filter(function (p) { return p && p.id && p.name; }), FALLBACK, 'id');
      State.placesLoaded = true;
      return State.places;
    }, function () { return State.places; });
  }

  /** Shrink a photo before upload (phones make 4000 px photos; Apps Script prefers small payloads). */
  function shrinkImage(file, maxSide, quality) {
    maxSide = maxSide || 1280; quality = quality || 0.85;
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var raw = reader.result;
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, maxSide / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { resolve({ dataUrl: c.toDataURL('image/jpeg', quality), mime: 'image/jpeg' }); }
          catch (e) { resolve({ dataUrl: raw, mime: file.type || 'image/jpeg' }); }
        };
        img.onerror = function () { resolve({ dataUrl: raw, mime: file.type || 'image/jpeg' }); };
        img.src = raw;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Shared actions: accept challenge, place sheet
  // ---------------------------------------------------------------------------

  function acceptChallenge(id, after) {
    var p = findPlace(id);
    if (!p) return;
    ensureName(function (user) {
      // Open directions straight away (inside the tap, so pop-up blockers allow it).
      window.open(mapsUrl(p), '_blank', 'noopener');
      Passport.accept(p);
      toast('Challenge accepted: ' + p.name);
      Api.acceptChallenge(user, p.id).catch(function () { /* saved on this device; the server copy is optional */ });
      if (typeof after === 'function') after();
    });
  }

  function placeActions(p, opts) {
    opts = opts || {};
    var accepted = Passport.hasAccepted(p.id);
    return el('div', { class: 'card__actions' }, [
      button(accepted ? 'Go now' : 'Accept Challenge', accepted ? 'route' : 'trophy', { block: true, onclick: function () { acceptChallenge(p.id, opts.onChange); } }),
      button('Directions', 'map', { variant: 'blue', href: mapsUrl(p), target: '_blank' }),
      button('Check-In', 'qr', { variant: 'green', href: '#/checkin?place=' + encodeURIComponent(p.id) }),
      button('Photobooth', 'camera', { variant: 'orange', onclick: function () { openPhotobooth(p.id); } })
    ]);
  }

  function placeCard(p, i, opts) {
    var c = catOf(p);
    return el('article', { class: 'card place-card reveal', style: '--d:' + Math.min(i, 10) * 60 + 'ms' }, [
      el('div', { class: 'place-card__top' }, [
        el('span', { class: 'card-icon', style: 'background:' + c.color }, icon(c.icon)),
        el('div', null, [
          el('h3', { class: 'place-card__name', text: p.name }),
          el('p', { class: 'place-card__meta' }, [
            el('span', { text: (p.barangay ? p.barangay + ', ' : '') + provinceName(provinceOf(p)) }),
            el('span', { class: 'dot', 'aria-hidden': 'true', text: '•' }),
            el('span', { class: 'pts', text: '+' + (p.points || 0) + ' pts' })
          ])
        ]),
        Passport.hasStamp(p.id) ? el('span', { class: 'badge badge--stamp' }, [icon('stamp'), 'Stamped'])
          : Passport.hasAccepted(p.id) ? el('span', { class: 'badge', text: 'Accepted' }) : null
      ]),
      p.desc ? el('p', { class: 'place-card__desc', text: p.desc }) : null,
      placeActions(p, opts)
    ]);
  }

  function openPlace(id) {
    var p = findPlace(id);
    if (!p) return;
    var c = catOf(p);
    Modal.open({
      title: p.name,
      name: 'place',
      body: [
        el('p', { class: 'place-sheet__meta' }, [
          el('span', { class: 'chip', style: '--c:' + c.color }, [icon(c.icon), c.label]),
          el('span', { class: 'chip chip--plain', text: (p.barangay ? p.barangay + ', ' : '') + provinceName(provinceOf(p)) + ' • +' + (p.points || 0) + ' pts' })
        ]),
        p.desc ? el('p', { text: p.desc }) : null,
        placeActions(p, { onChange: function () { Modal.close(); } })
      ]
    });
  }

  /**
   * Province picker. Big cards on the home page; a compact chip row on Explore and Shop.
   * onPick(id) runs after the choice is saved on this device.
   */
  function provincePicker(onPick, compact) {
    var sel = currentProvince();
    var counts = {};
    State.places.forEach(function (p) { var k = provinceOf(p); counts[k] = (counts[k] || 0) + 1; });
    var wrap = el('div', { class: compact ? 'prov-chips' : 'prov-grid', role: 'group', 'aria-label': 'Choose a province' });
    PROVINCES.forEach(function (pv, i) {
      var b = el('button', {
        type: 'button', class: compact ? 'prov-chip' : 'prov-card reveal', 'aria-pressed': String(sel === pv.id),
        style: '--c:' + pv.color + (compact ? '' : ';--d:' + (i * 60) + 'ms'),
        onclick: function () {
          setProvince(pv.id);
          wrap.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          if (typeof onPick === 'function') onPick(pv.id);
        }
      }, compact ? [icon(pv.icon), pv.name] : [
        el('span', { class: 'prov-card__icon' }, icon(pv.icon)),
        el('span', { class: 'prov-card__name', text: pv.name }),
        el('span', { class: 'prov-card__sub', text: pv.sub }),
        el('span', { class: 'prov-card__count', text: (counts[pv.id] || 0) + ' places to explore' })
      ]);
      wrap.appendChild(b);
    });
    return wrap;
  }

  /** Stamp album: one page per province, one stamp per place. Collected stamps light up. */
  function stampAlbum() {
    var got = {};
    Passport.stamps().forEach(function (x) { got[x.id] = true; });
    var have = State.places.filter(function (p) { return got[p.id]; }).length;
    var sel = currentProvince();
    var order = PROVINCES.slice().sort(function (a, b) { return (b.id === sel) - (a.id === sel); });
    return el('section', { class: 'card album reveal', 'aria-labelledby': 'album-h' }, [
      el('div', { class: 'album__head' }, [
        el('h2', { id: 'album-h', class: 'section__title' }, [icon('stamp'), ' My stamp album']),
        el('p', { class: 'album__total', text: have + ' of ' + State.places.length + ' stamps' })
      ]),
      el('p', { class: 'muted small', text: have ? 'Keep exploring! Every check-in lights up a stamp.' : 'Your album is empty. Check in at any place with your SMILE postcard to collect your first stamp.' }),
      el('div', { class: 'album__pages' }, order.map(function (pv) {
        var ps = State.places.filter(function (p) { return provinceOf(p) === pv.id; });
        var n = ps.filter(function (p) { return got[p.id]; }).length;
        var pct = ps.length ? Math.round(n / ps.length * 100) : 0;
        return el('div', { class: 'album-page', style: '--c:' + pv.color }, [
          el('div', { class: 'album-page__head' }, [
            el('b', null, [icon(pv.icon), ' ' + pv.name]),
            el('span', { text: n === ps.length && n ? 'Conquered!' : n + '/' + ps.length })
          ]),
          el('div', { class: 'album-page__bar', role: 'progressbar', 'aria-label': pv.name + ' stamps', 'aria-valuemin': '0', 'aria-valuemax': String(ps.length), 'aria-valuenow': String(n) }, el('span', { style: 'width:' + pct + '%' })),
          el('div', { class: 'album-page__stamps' }, ps.map(function (p) {
            var c = catOf(p);
            return el('button', { type: 'button', class: 'album-stamp' + (got[p.id] ? ' is-got' : ''), style: '--s:' + c.color, title: p.name,
              'aria-label': p.name + (got[p.id] ? ': collected' : ': not collected yet'), onclick: function () { openPlace(p.id); } }, icon(c.icon));
          }))
        ]);
      }))
    ]);
  }

  /** "You have 2 of 5 stamps in Aklan" bar for a province. */
  function provinceProgress(pv) {
    var ps = State.places.filter(function (p) { return provinceOf(p) === pv.id; });
    var n = ps.filter(function (p) { return Passport.hasStamp(p.id); }).length;
    return el('div', { class: 'prov-progress' }, [
      el('p', { class: 'small', text: n ? 'You have ' + n + ' of ' + ps.length + ' stamps in ' + pv.name + '. ' + (n === ps.length ? 'Province conquered!' : 'Keep going!') : 'Collect all ' + ps.length + ' stamps in ' + pv.name + ' to conquer the province.' }),
      el('div', { class: 'album-page__bar' }, el('span', { style: 'width:' + (ps.length ? Math.round(n / ps.length * 100) : 0) + '%' }))
    ]);
  }

  function isFeatured(s) { var f = s && s.featured; return f === true || /^(true|yes|y|1|featured)$/i.test(String(f || '').trim()); }
  /** Featured merchants (paid SMILE subscription) are listed first; the rest keep their order. */
  function sortShops(list) {
    return list.map(function (s, i) { return { s: s, i: i }; })
      .sort(function (a, b) { return (isFeatured(b.s) - isFeatured(a.s)) || (a.i - b.i); })
      .map(function (x) { return x.s; });
  }

  /** Splits a list into [items in the chosen province, items elsewhere grouped by province]. */
  function splitByProvince(list, sel) {
    var here = [], others = {};
    list.forEach(function (x) {
      var k = provinceOf(x);
      if (sel && k === sel) here.push(x);
      else (others[k] = others[k] || []).push(x);
    });
    var groups = PROVINCES.filter(function (p) { return others[p.id] && others[p.id].length; })
      .map(function (p) { return { province: p, items: others[p.id] }; });
    return { here: here, others: groups };
  }

  // ---------------------------------------------------------------------------
  // Navigation (top on wide screens, tab bar on phones)
  // ---------------------------------------------------------------------------

  var NAV = [
    { key: 'explore', href: '#/explore', text: 'Explore', icon: 'map' },
    { key: 'checkin', href: '#/checkin', text: 'Check-In', icon: 'postcard' },
    { key: 'isidro', href: '#/isidro', text: 'Isidro', icon: 'compass', main: true },
    { key: 'shop', href: '#/shop', text: 'Shop', icon: 'shop' },
    { key: 'ranks', href: '#/ranks', text: 'Ranks', icon: 'trophy' }
  ];

  function renderNav() {
    var section = parseHash().parts[0] || '';
    ['#mainnav', '#tabbar'].forEach(function (sel) {
      var nav = $(sel);
      if (!nav) return;
      nav.textContent = '';
      NAV.forEach(function (n) {
        nav.appendChild(el('a', { href: n.href, class: n.main ? 'is-main' : null, 'aria-current': section === n.key ? 'page' : null }, [
          el('span', { class: 'nav-icon' }, icon(n.icon)), el('span', { class: 'nav-text', text: n.text })
        ]));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // "Install the app" banner (first opening) + service worker
  // ---------------------------------------------------------------------------

  var Install = {
    deferred: null,
    node: null,
    SEEN_KEY: 'smile.installSeen',
    isStandalone: function () {
      return !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true);
    },
    platform: function () {
      var ua = String(window.navigator.userAgent || '');
      if (/iphone|ipad|ipod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)) return 'ios';
      if (/android/i.test(ua)) return 'android';
      return 'desktop';
    },
    init: function () {
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        Install.deferred = e;
        if (Install.node) Install.paint();
      });
      window.addEventListener('appinstalled', function () {
        Install.deferred = null;
        storageSet(Install.SEEN_KEY, 'installed');
        Install.hide();
        toast('SMILE was added to your device.');
      });
      Install.registerWorker();
      var link = $('#install-link');
      if (link) link.addEventListener('click', function (e) { e.preventDefault(); Install.show(true); });
      if (!Install.isStandalone() && !storageGet(Install.SEEN_KEY)) {
        setTimeout(function () { if (!Install.isStandalone()) Install.show(false); }, prefersReducedMotion() ? 600 : 2600);
      }
    },
    registerWorker: function () {
      if (!('serviceWorker' in window.navigator) || !$('link[rel="manifest"]')) return;
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
      try { window.navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ }); } catch (e) { /* ignore */ }
    },
    show: function (manual) {
      if (Install.isStandalone()) { if (manual) toast('SMILE is already installed on this device.'); return; }
      if (!Install.node) {
        Install.node = el('section', { class: 'install-banner', role: 'region', 'aria-label': 'Install SMILE', tabindex: '-1' });
        document.body.appendChild(Install.node);
      }
      Install.paint();
      if (prefersReducedMotion()) Install.node.classList.add('is-open');
      else window.requestAnimationFrame(function () { if (Install.node) Install.node.classList.add('is-open'); });
      if (manual) Install.node.focus();
    },
    paint: function () {
      var n = Install.node;
      if (!n) return;
      n.textContent = '';
      var p = Install.platform();
      var steps;
      if (Install.deferred) steps = el('p', { class: 'install-banner__text', text: 'Open SMILE from your home screen like an app. It opens fast and works offline for places you have already seen.' });
      else if (p === 'ios') steps = el('ol', { class: 'install-banner__steps' }, [
        el('li', null, ['Tap the Share button ', icon('share', 'icon--inline'), ' in Safari.']),
        el('li', null, ['Choose ', el('strong', { text: 'Add to Home Screen' }), ' ', icon('plusSquare', 'icon--inline'), '.'])
      ]);
      else steps = el('ol', { class: 'install-banner__steps' }, [
        el('li', null, ['Open your browser menu (', el('strong', { text: '⋮' }), ' or ', el('strong', { text: '☰' }), ').']),
        el('li', null, ['Choose ', el('strong', { text: p === 'android' ? 'Add to Home screen' : 'Install SMILE' }), ' (or "Install app").'])
      ]);
      appendChildren(n, [
        el('img', { class: 'install-banner__icon', src: 'assets/icon-192.png', alt: '', width: 56, height: 56 }),
        el('div', { class: 'install-banner__body' }, [
          el('p', { class: 'install-banner__title', text: 'Install the SMILE app' }),
          steps
        ]),
        el('div', { class: 'install-banner__actions' }, [
          Install.deferred ? button('Install', 'install', { small: true, onclick: Install.prompt }) : null,
          button('Later', null, { small: true, variant: 'light', onclick: function () { storageSet(Install.SEEN_KEY, 'dismissed'); Install.hide(); } })
        ])
      ]);
    },
    prompt: function () {
      var e = Install.deferred;
      if (!e) return;
      Install.deferred = null;
      try {
        e.prompt();
        Promise.resolve(e.userChoice).then(function (choice) {
          storageSet(Install.SEEN_KEY, choice && choice.outcome === 'accepted' ? 'installed' : 'dismissed');
          Install.hide();
        });
      } catch (err) { Install.paint(); }
    },
    hide: function () {
      var n = Install.node;
      if (!n) return;
      Install.node = null;
      n.classList.remove('is-open');
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, prefersReducedMotion() ? 0 : 320);
    }
  };

  // ---------------------------------------------------------------------------
  // View helpers
  // ---------------------------------------------------------------------------

  function view() { return $('#view'); }
  function setView(nodes) { var v = view(); v.textContent = ''; appendChildren(v, nodes); Motion.enter(v); Motion.reveal(v); }

  function pageHead(ic, color, title, lead) {
    return el('header', { class: 'page-head' }, [
      el('span', { class: 'page-head__icon', style: 'background:' + color }, icon(ic)),
      el('div', null, [
        el('h1', { class: 'page-head__title', text: title }),
        lead ? el('p', { class: 'page-head__lead', text: lead }) : null
      ])
    ]);
  }

  function focusHeading() {
    var h = view().querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function passportCard(big) {
    var pts = Passport.points();
    var rank = rankOf(pts);
    var nx = nextRank(pts);
    var pct = Math.min(100, Math.max(4, pts / 45 * 100));
    return el('section', { class: 'card passport' + (big ? ' passport--big' : '') + ' reveal', 'aria-labelledby': 'passport-h' }, [
      el('div', { class: 'passport__head' }, [
        el('div', { class: 'passport__rank', 'aria-label': 'Rank ' + rank }, [el('span', { text: rank })]),
        el('div', null, [
          el('p', { class: 'eyebrow', text: 'Your Tourism Passport' }),
          el('h2', { id: 'passport-h', class: 'passport__name', text: Passport.name() || 'Guest Explorer' }),
          el('p', { class: 'passport__pts' }, [el('b', { text: String(pts) }), ' points • ', String(Passport.challenges().length), ' challenges accepted'])
        ])
      ]),
      el('div', { class: 'rank-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '45', 'aria-valuenow': String(Math.min(pts, 45)), 'aria-label': 'Progress to SSS' }, [
        el('div', { class: 'rank-fill', style: 'width:' + pct + '%' })
      ]),
      el('ol', { class: 'rank-ladder', 'aria-label': 'Ranks' }, RANKS.map(function (r) {
        return el('li', { class: r[0] === rank ? 'is-current' : (pts >= r[1] ? 'is-done' : null) }, [el('b', { text: r[0] }), el('span', { text: String(r[1]) })]);
      })),
      el('p', { class: 'muted small', text: nx ? nx.need + ' more point' + (nx.need === 1 ? '' : 's') + ' to rank ' + nx.rank + '.' : 'You reached SSS. Maayo gid! Western Visayas is proud of you.' }),
      big ? null : el('div', { class: 'passport__actions' }, [
        Passport.name() ? null : button('Set my name', 'user', { small: true, variant: 'light', onclick: function () { ensureName(function () { route(); }); } }),
        button('Leaderboard', 'trophy', { small: true, variant: 'light', href: '#/ranks' })
      ])
    ]);
  }

  // ---------------------------------------------------------------------------
  // Home: poster hero with hotspots, passport, features, how it works
  // ---------------------------------------------------------------------------

  function startTypewriter(node, token) {
    if (prefersReducedMotion()) { node.textContent = 'landmarks and events.'; return; }
    var w = 0, i = 0, deleting = false;
    var tick = function () {
      if (token !== renderToken || !node.isConnected) return;
      var word = ROTATING[w];
      i += deleting ? -1 : 1;
      node.textContent = word.slice(0, i);
      var wait = deleting ? 45 : 85;
      if (!deleting && i === word.length) { deleting = true; wait = 1600; }
      else if (deleting && i === 0) { deleting = false; w = (w + 1) % ROTATING.length; wait = 350; }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 900);
  }

  function renderHome(token) {
    var rotator = el('span', { class: 'rotator', 'aria-hidden': 'true' });
    var feature = function (ic, color, title, text, href, i) {
      return el('li', { class: 'feature reveal', style: '--d:' + (i * 80) + 'ms' }, [
        el('a', { href: href, class: 'feature__link' }, [
          el('span', { class: 'feature__icon', style: 'background:' + color }, icon(ic)),
          el('h3', { text: title }),
          el('p', { text: text })
        ])
      ]);
    };
    var hotspots = HOTSPOTS.map(function (h, i) {
      return el('button', {
        type: 'button', class: 'hotspot', style: 'left:' + h.x + '%;top:' + h.y + '%;--d:' + (i * 0.25) + 's',
        'aria-label': h.label + ': open place', onclick: function () { openPlace(h.id); }
      }, [icon(h.icon), el('span', { class: 'hotspot__label', text: h.label })]);
    });

    setView([
      el('section', { class: 'hero', 'aria-labelledby': 'hero-h' }, [
        el('div', { class: 'hero__bg', 'aria-hidden': 'true' }),
        el('div', { class: 'hero__grid' }, [
          el('div', { class: 'hero__art anim-pop', style: '--d:120ms' }, [
            el('div', { class: 'poster-frame' }, [
              el('picture', null, [
                el('source', { srcset: POSTER_SRC, type: 'image/webp' }),
                el('img', { class: 'poster-frame__img', src: 'assets/poster.jpg', alt: 'SMILE poster, See More of Islands’ Landmarks and Events, Western Visayas and Negros Island Region: Dinagyang Festival, Iloilo Provincial Capitol, Miag-ao Church, Carles Islands, Mt. Kanlaon, Jaro Cathedral, Silay heritage houses, MassKara Festival, Batchoy, Chicken Inasal, Capiz seafood and Pancit Molo.', width: 1024, height: 1536 })
              ]),
              el('span', { class: 'poster-frame__shine', 'aria-hidden': 'true' }),
              hotspots
            ]),
            el('p', { class: 'hero__hint' }, [icon('pin', 'icon--inline'), 'Tap the glowing pins to open a place'])
          ]),
          el('div', { class: 'hero__copy' }, [
            el('img', { class: 'hero__logo anim-rise', src: LOGO_SRC, alt: '', width: 512, height: 512 }),
            el('h1', { id: 'hero-h', class: 'hero__title anim-rise', style: '--d:120ms' }, [
              el('span', { class: 'sr-only', text: 'SMILE: See More of Islands’ Landmarks and Events.' }),
              el('span', { 'aria-hidden': 'true' }, ['See more of the Islands’ ', el('br'), rotator, el('span', { class: 'caret' })])
            ]),
            el('p', { class: 'hero__lead anim-rise', style: '--d:220ms', text: 'Boracay, Iloilo, Guimaras, Bacolod, Dumaguete, Siquijor and more. Pick a province, ask Isidro, accept a challenge, scan your postcard, collect stamps and rank up from E to SSS.' }),
            el('div', { class: 'hero__cta anim-rise', style: '--d:320ms' }, [
              button('Pick your province', 'pin', { variant: 'glow', onclick: function () { var t = $('#home-provinces'); if (t) t.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); } }),
              button('Ask Isidro', 'compass', { href: '#/isidro', variant: 'yellow' }),
              button('Check-In', 'postcard', { href: '#/checkin', variant: 'green' })
            ])
          ])
        ]),
        el('a', { class: 'scroll-down', href: '#/', 'aria-label': 'Scroll to the provinces', onclick: function (e) { e.preventDefault(); var t = $('#home-provinces'); if (t) t.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); } }, icon('chevronDown'))
      ]),

      el('section', { class: 'section', id: 'home-provinces', 'aria-labelledby': 'prov-h' }, [
        el('h2', { id: 'prov-h', class: 'section__title reveal', text: 'Where are you exploring?' }),
        el('p', { class: 'muted reveal', text: 'Pick a province to see its landmarks, festivals, food trips and shops. You can switch any time.' }),
        provincePicker(function () { location.hash = '#/explore'; })
      ]),

      el('div', { class: 'section stack-lg', id: 'home-passport' }, [passportCard(false), stampAlbum()]),

      el('section', { class: 'section', 'aria-labelledby': 'what-h' }, [
        el('h2', { id: 'what-h', class: 'section__title reveal', text: 'Everything you can do with SMILE' }),
        el('ul', { class: 'feature-grid' }, [
          feature('guide', '#FF6B00', 'Ask Isidro', 'Your AI guide plans your day in any province, in Hiligaynon, English or Tagalog.', '#/isidro', 0),
          feature('trophy', '#ED0460', 'Accept challenges', 'Pick a landmark, festival or food stop, and get directions in Google Maps.', '#/explore', 1),
          feature('qr', '#00A651', 'One-use QR check-in', 'Scan your SMILE postcard at the place to collect a stamp and points.', '#/checkin', 2),
          feature('camera', '#7B2CBF', 'AI Photobooth', 'Turn a selfie into a "CONQUERED" postcard, with your outfit or an AI one.', '#/explore', 3),
          feature('mailbox', '#0057D9', 'Mail across PH', 'Paste a PhilPost stamp and mail it. It travels to a surprise destination.', '#/postcards', 4),
          feature('star', '#FDB603', 'Rank E to SSS', 'Every stamp counts. Climb the leaderboard with fellow explorers.', '#/ranks', 5),
          feature('shop', '#02A04F', 'Pasalubong & souvenirs', 'Biscocho, butterscotch, shirts and crafts from local stores and nano entrepreneurs.', '#/shop', 6)
        ])
      ]),

      el('section', { class: 'section section--tint', 'aria-labelledby': 'how-h' }, [
        el('p', { class: 'eyebrow reveal', text: 'The post office is back, and it is an adventure' }),
        el('h2', { id: 'how-h', class: 'section__title reveal', text: 'Your postal adventure' }),
        el('p', { class: 'muted reveal', text: 'Every postcard is a quest. Every mailbox is a finish line.' }),
        el('ol', { class: 'how-steps' }, [
          ['postcard', 'Grab your postcard', 'Get an official SMILE postcard from a partner shop. It is your game piece.'],
          ['trophy', 'Take the challenge', 'Pick a landmark, festival or food stop and follow the map.'],
          ['qr', 'Scan and collect', 'Scan your postcard at the place to earn its stamp and points.'],
          ['mailbox', 'Stamp it and mail it', 'Paste a PhilPost stamp and drop it in the mailbox: quest complete!'],
          ['heart', 'Pass it on', 'It lands somewhere new in the Philippines, where someone adopts it and plays.'],
          ['star', 'Rank up', 'Fill your stamp album and climb from E to SSS.']
        ].map(function (s, i) {
          return el('li', { class: 'how-step reveal', style: '--d:' + (i * 100) + 'ms' }, [
            el('span', { class: 'how-step__num', text: String(i + 1) }),
            el('span', { class: 'how-step__icon' }, icon(s[0])),
            el('h3', { text: s[1] }),
            el('p', { text: s[2] })
          ]);
        }))
      ]),

      el('section', { class: 'section split' }, [
        el('a', { class: 'card promo promo--pink reveal', href: '#/postcards' }, [
          el('span', { class: 'promo__icon' }, icon('heart')),
          el('h3', { text: 'Found a SMILE postcard?' }),
          el('p', { text: 'Adopt it, join SMILE and see where it has travelled.' })
        ]),
        el('a', { class: 'card promo promo--blue reveal', style: '--d:100ms', href: '#/tools' }, [
          el('span', { class: 'promo__icon' }, icon('shop')),
          el('h3', { text: 'For merchants and LGUs' }),
          el('p', { text: 'Write product listings, captions and visitor insights.' })
        ])
      ])
    ]);
    startTypewriter(rotator, token);
    focusHeading();
  }

  // ---------------------------------------------------------------------------
  // Explore: search, category filter, place cards, my challenges
  // ---------------------------------------------------------------------------

  var EXPLORE_GROUPS = [
    { key: 'landmarks', title: 'Landmarks & heritage', icon: 'church', cats: ['landmark', 'heritage'] },
    { key: 'events', title: 'Festivals & events', icon: 'festival', cats: ['festival'] },
    { key: 'food', title: 'Food trips', icon: 'food', cats: ['food'] },
    { key: 'nature', title: 'Beaches, islands & nature', icon: 'palm', cats: ['nature', 'stay'] }
  ];

  function renderExplore(token, query) {
    if (query.province && provinceInfo(query.province)) setProvince(query.province);
    var filter = { cat: query.cat || 'all', q: '' };
    var body = el('div', { class: 'stack-lg' });
    var mine = el('div', { class: 'grid' });
    var count = el('p', { class: 'muted small', role: 'status' });
    var head = el('div');

    var matches = function (p) {
      var q = filter.q.toLowerCase();
      return (filter.cat === 'all' || p.cat === filter.cat) &&
        (!q || (p.name + ' ' + (p.barangay || '') + ' ' + (p.desc || '') + ' ' + provinceName(provinceOf(p))).toLowerCase().indexOf(q) !== -1);
    };
    var shopMatches = function (s) {
      var q = filter.q.toLowerCase();
      if (filter.cat !== 'all' && filter.cat !== 'food') return false;
      var hay = (s.name + ' ' + (s.barangay || '') + ' ' + (s.desc || '') + ' ' + (s.items || []).map(function (x) { return x.name; }).join(' ')).toLowerCase();
      return !q || hay.indexOf(q) !== -1;
    };
    var gridOf = function (items, start) {
      return el('div', { class: 'grid' }, items.map(function (p, i) { return placeCard(p, start + i, { onChange: paint }); }));
    };
    var shopsBlock = function (shops, provName) {
      return el('div', { class: 'explore-group' }, [
        el('h3', { class: 'explore-group__title' }, [icon('shop'), ' Shops & pasalubong']),
        shops.length ? el('div', { class: 'grid' }, shops.map(shopCard))
          : el('p', { class: 'empty empty--sm' }, ['No shops in ' + provName + ' yet. ', el('a', { href: '#/shop', text: 'Sell on SMILE' }), '.'])
      ]);
    };

    var paint = function () {
      var sel = currentProvince();
      var pv = provinceInfo(sel);
      var places = State.places.filter(matches);
      var shops = (State.shops || []).filter(shopMatches);
      var sp = splitByProvince(places, sel);
      var ss = splitByProvince(shops, sel);
      head.textContent = '';
      appendChildren(head, pageHead(pv ? pv.icon : 'map', pv ? pv.color : '#0057D9', pv ? 'Discover ' + pv.name : 'Discover Western Visayas',
        pv ? pv.sub + '. Accept a challenge, get directions, then check in to collect your stamp.' : 'Pick a province above to see its places first. Everything else stays listed below.'));
      body.textContent = '';
      var n = 0;
      if (pv) {
        var sec = el('section', { class: 'prov-section', 'aria-labelledby': 'here-h', style: '--c:' + pv.color }, [
          el('h2', { id: 'here-h', class: 'section__title' }, [icon(pv.icon), ' In ' + pv.name]),
          provinceProgress(pv)
        ]);
        if (filter.cat === 'all') {
          EXPLORE_GROUPS.forEach(function (g) {
            var items = sp.here.filter(function (p) { return g.cats.indexOf(p.cat) !== -1; });
            if (!items.length) return;
            sec.appendChild(el('div', { class: 'explore-group' }, [el('h3', { class: 'explore-group__title' }, [icon(g.icon), ' ' + g.title]), gridOf(items, n)]));
            n += items.length;
          });
        } else if (sp.here.length) { sec.appendChild(gridOf(sp.here, 0)); n += sp.here.length; }
        if (!sp.here.length) sec.appendChild(el('p', { class: 'empty', text: 'No places in ' + pv.name + ' match. Try another word or category.' }));
        if (filter.cat === 'all' || filter.cat === 'food') sec.appendChild(shopsBlock(ss.here, pv.name));
        body.appendChild(sec);
      }
      if (sp.others.length || ss.others.length) {
        var other = el('section', { class: 'prov-section prov-section--others', 'aria-labelledby': 'else-h' }, [
          el('h2', { id: 'else-h', class: 'section__title' }, [icon('map'), pv ? ' Elsewhere in Western Visayas' : ' All provinces']),
          pv ? el('p', { class: 'muted small', text: 'Planning a side trip? Every province\'s places and shops stay here for you.' }) : null
        ]);
        PROVINCES.forEach(function (prov) {
          if (prov.id === sel) return;
          var ps = (sp.others.filter(function (g) { return g.province.id === prov.id; })[0] || { items: [] }).items;
          var sh = (ss.others.filter(function (g) { return g.province.id === prov.id; })[0] || { items: [] }).items;
          if (!ps.length && !sh.length) return;
          other.appendChild(el('div', { class: 'explore-group', style: '--c:' + prov.color }, [
            el('div', { class: 'explore-group__bar' }, [
              el('h3', { class: 'explore-group__title' }, [icon(prov.icon), ' ' + prov.name]),
              button('Make this my province', 'pin', { small: true, variant: 'light', onclick: function () { setProvince(prov.id); paint(); window.scrollTo(0, 0); } })
            ]),
            ps.length ? gridOf(ps, n) : null,
            sh.length ? el('div', { class: 'grid' }, sh.map(shopCard)) : null
          ]));
          n += ps.length;
        });
        body.appendChild(other);
      }
      count.textContent = places.length + ' place' + (places.length === 1 ? '' : 's') + ' across ' + PROVINCES.length + ' provinces';
      var ch = Passport.challenges().map(function (c) { return findPlace(c.id) || c; });
      mine.textContent = '';
      appendChildren(mine, ch.length ? ch.map(function (p, i) { return placeCard(p, i, { onChange: paint }); })
        : el('p', { class: 'empty', text: 'No challenges yet. Ask Isidro, or accept one above!' }));
      Motion.reveal(view());
    };

    var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Category' },
      [['all', { label: 'All', icon: 'pin', color: '#14213d' }]].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k]]; })).map(function (pair) {
        return el('button', {
          type: 'button', class: 'chip-btn', 'aria-pressed': String(filter.cat === pair[0]), style: '--c:' + pair[1].color,
          onclick: function (e) {
            filter.cat = pair[0];
            chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
            e.currentTarget.setAttribute('aria-pressed', 'true');
            paint();
          }
        }, [icon(pair[1].icon), pair[1].label]);
      }));

    var search = el('input', { type: 'search', id: 'place-search', placeholder: 'Search beaches, churches, inasal, piaya…', autocomplete: 'off' });
    search.addEventListener('input', function () { filter.q = search.value.trim(); paint(); });

    setView([
      el('section', { class: 'section' }, [
        head,
        provincePicker(function () { paint(); }, true),
        el('div', { class: 'toolbar' }, [
          el('label', { class: 'searchbox' }, [icon('search'), el('span', { class: 'sr-only', text: 'Search places' }), search]),
          chips
        ]),
        count,
        body
      ]),
      el('section', { class: 'section', 'aria-labelledby': 'mine-h' }, [
        el('h2', { id: 'mine-h', class: 'section__title' }, [icon('trophy'), ' My Challenges']),
        mine
      ])
    ]);
    paint();
    focusHeading();
    Promise.all([loadPlaces(), loadShops()]).then(function () { if (token === renderToken) paint(); });
  }

  // ---------------------------------------------------------------------------
  // Isidro: Ilonggo AI guide
  // ---------------------------------------------------------------------------

  function renderIsidro(token) {
    var lang = el('select', { id: 'isidro-lang' }, [
      el('option', { value: 'hil', text: 'Hiligaynon' }), el('option', { value: 'en', text: 'English' }), el('option', { value: 'tl', text: 'Tagalog' })
    ]);
    lang.value = storageGet('smile.lang') || 'hil';
    lang.addEventListener('change', function () { storageSet('smile.lang', lang.value); });
    var q = el('textarea', { id: 'isidro-q', rows: '3', maxlength: '500', placeholder: 'I have 4 hours and love food. Where should I go?' });
    var prov = el('select', { id: 'isidro-province' }, [el('option', { value: '', text: 'Anywhere in Western Visayas' })].concat(PROVINCES.map(function (p) { return el('option', { value: p.id, text: p.name }); })));
    prov.value = currentProvince();
    prov.addEventListener('change', function () { if (prov.value) setProvince(prov.value); });
    var out = outputBox();
    var recs = el('div', { class: 'grid' });
    var ask = button('Ask Isidro', 'compass', { type: 'submit', block: true, variant: 'glow' });

    var showRecs = function (list) {
      recs.textContent = '';
      appendChildren(recs, (list || []).map(function (p, i) { return placeCard(p, i, { onChange: function () { showRecs(list); } }); }));
      Motion.reveal(recs);
    };

    var submit = function (e) {
      if (e) e.preventDefault();
      var question = q.value.trim();
      if (!question) { q.focus(); toast('Type a question for Isidro first.'); return; }
      setBusy(ask, true, 'Isidro is planning…');
      out.loading('Isidro is planning your trip…');
      recs.textContent = '';
      Api.recommend(question, lang.value, prov.value).then(function (r) {
        if (token !== renderToken) return;
        out.show((r.reply || 'Here are my picks for you.') + (r.demo ? '\n\n(Isidro is in demo mode: the AI key is not set on the server yet.)' : ''), r.demo ? 'warn' : null);
        showRecs(Array.isArray(r.places) ? r.places : []);
      }, function (err) {
        if (token !== renderToken) return;
        // Demo fallback (same as before): a sample answer with the first four places.
        var pool = State.places.filter(function (p) { return !prov.value || provinceOf(p) === prov.value; });
        var picks = pool.slice(0, 4);
        out.show((State.demo ? 'Demo answer: ' : friendlyError(err) + '\n\nMeanwhile, here is a classic route: ') +
          picks.map(function (p) { return p.name; }).join(', then ') + '. #SMILEPH', State.demo ? null : 'warn');
        showRecs(picks);
      }).then(function () { setBusy(ask, false); });
    };

    var prompts = ['I have 4 hours and love food', 'Heritage walk in the city', 'Beach weekend in Boracay', 'Mango trip to Guimaras', 'When is MassKara and what should I wear?'];

    setView(el('section', { class: 'section section--narrow' }, [
      el('div', { class: 'isidro-hero' }, [
        el('div', { class: 'isidro-avatar' }, icon('guide')),
        el('h1', { class: 'page-head__title', text: 'Isidro, your Western Visayas AI guide' }),
        el('p', { class: 'muted', text: 'Maayong adlaw! Tell me where you are, how much time you have and what you love. I will plan your SMILE route.' })
      ]),
      el('form', { class: 'card stack', onsubmit: submit }, [
        formField('isidro-province', 'Province', prov),
        formField('isidro-lang', 'Language', lang),
        formField('isidro-q', 'Your question', q),
        el('div', { class: 'chips chips--wrap', 'aria-label': 'Ideas' }, prompts.map(function (p) {
          return el('button', { type: 'button', class: 'chip-btn chip-btn--soft', onclick: function () { q.value = p; q.focus(); } }, p);
        })),
        ask,
        out
      ]),
      recs
    ]));
    focusHeading();
    loadPlaces();
  }

  // ---------------------------------------------------------------------------
  // Check-in (one-use QR postcard) + mail your postcard
  // ---------------------------------------------------------------------------

  function renderCheckin(token, query) {
    State.visionStatus = 'skipped';
    var user = el('input', { id: 'ci-user', type: 'text', maxlength: '40', autocomplete: 'nickname', placeholder: 'Your display name', value: Passport.name() });
    var select = el('select', { id: 'ci-place' });
    var fillSelect = function () {
      var cur = select.value || query.place || '';
      select.textContent = '';
      State.places.forEach(function (p) { select.appendChild(el('option', { value: p.id, text: p.name + ' (+' + (p.points || 0) + ')' })); });
      if (cur && findPlace(cur)) select.value = cur;
    };
    fillSelect();
    var code = el('input', { id: 'ci-code', type: 'text', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'SMILE-1234-ABCD', value: (query.code || '').toUpperCase() });
    code.addEventListener('input', function () { var s = code.selectionStart; code.value = code.value.toUpperCase(); try { code.setSelectionRange(s, s); } catch (e) { /* ignore */ } });
    var preview = el('img', { class: 'proof-preview', alt: 'Your proof photo', hidden: true });
    var proofData = null;
    var proof = photoPicker({ id: 'ci-proof', facing: 'environment', variant: 'orange', cameraLabel: 'Take photo', max: 1280,
      title: 'Proof photo', hint: 'Show the place (and you, if you like) in the photo.',
      onPhoto: function (r) { proofData = r.dataUrl; State.visionStatus = 'skipped'; visionOut.hidden = true; preview.src = r.dataUrl; preview.hidden = false; } });
    var scanBtn = scanButton(code, function (pid) { if (findPlace(pid)) select.value = pid; });
    var visionOut = outputBox();
    var result = outputBox();
    var verifyBtn = button('Verify Photo', 'camera', { variant: 'blue' });
    var collectBtn = button('Collect Stamp', 'stamp', { variant: 'green', type: 'submit' });

    verifyBtn.addEventListener('click', function () {
      if (!proofData) { toast('Take or choose a proof photo first.'); proof.querySelector('button').focus(); return; }
      setBusy(verifyBtn, true, 'Checking…');
      visionOut.loading('Checking your photo…');
      Api.vision(select.value, proofData).then(function (r) {
        State.visionStatus = r.result || 'review';
        if (typeof r.match === 'boolean') {
          visionOut.show((r.match ? 'Looks like ' + ((findPlace(select.value) || {}).name || 'the place') + '!' : 'We could not confirm the place from this photo. Staff will review it, and you can still collect your stamp.') +
            (r.confidence ? '\nConfidence: ' + r.confidence + '%' : '') + (r.reason ? '\n' + r.reason : ''), r.match ? 'ok' : 'warn');
        } else visionOut.show('Photo check (reviewed by staff too):\n' + (r.result || 'Sent for review.'));
      }, function (err) {
        State.visionStatus = 'review';
        visionOut.show(friendlyError(err), 'warn');
      }).then(function () { setBusy(verifyBtn, false); });
    });

    var mailCard = mailSection(function () { return { user: user.value.trim() || Passport.name() || 'Guest', postcard: code.value.trim(), placeId: select.value }; });

    var submit = function (e) {
      e.preventDefault();
      var name = user.value.trim();
      if (!name) { toast('Type your display name first.'); user.focus(); return; }
      if (!code.value.trim()) { toast('Type the code printed on your SMILE postcard.'); code.focus(); return; }
      Passport.setName(name);
      setBusy(collectBtn, true, 'Saving…');
      result.loading('Collecting your stamp…');
      Api.checkin({ user: name, placeId: select.value, postcard: code.value.trim(), visionStatus: State.visionStatus }).then(function (r) {
        if (token !== renderToken) return;
        if (r.total !== undefined) Passport.setPoints(r.total);
        var pts = r.stamp && r.stamp.points !== undefined ? r.stamp.points : (findPlace(select.value) || {}).points || 0;
        State.lastCheckin = { placeId: select.value, postcard: code.value.trim() };
        Passport.addStamp(select.value);
        result.show('Completed! +' + pts + ' pts\nTotal: ' + (r.total !== undefined ? r.total : Passport.points()) + '   Rank: ' + (r.rank || rankOf(Passport.points())), 'ok');
        toast('Stamp collected! Now mail your postcard.');
        mailCard.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }, function (err) {
        if (token !== renderToken) return;
        result.show(friendlyError(err), 'error');
      }).then(function () { setBusy(collectBtn, false); });
    };

    setView([
      el('section', { class: 'section section--narrow' }, [
        pageHead('postcard', '#ED0460', 'Check-In', 'Each SMILE postcard code works once. Scan it at the place, add a proof photo and collect your stamp.'),
        el('form', { class: 'card stack', onsubmit: submit }, [
          formField('ci-user', 'Your name', user),
          formField('ci-place', 'Place', select),
          formField('ci-code', 'Postcard code', el('div', { class: 'input-with-btn' }, [code, scanBtn]), 'Scan the QR on the back of your SMILE postcard, or type the code under it.'),
          el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'Proof photo (optional, checked by AI and staff)' }), proof]),
          preview,
          visionOut,
          el('div', { class: 'btn-row' }, [verifyBtn, collectBtn]),
          result
        ])
      ]),
      mailCard
    ]);
    focusHeading();
    loadPlaces().then(function () { if (token === renderToken) fillSelect(); });
    // From the "Scan postcard" app shortcut: open the scanner straight away.
    if (query.scan === '1' && !query.code && Camera.supported()) scanBtn.click();
  }

  function mailSection(getInfo) {
    var out = outputBox();
    var mailBtn = button('Drop in Mailbox', 'send', { variant: 'blue', disabled: !State.stampsBought });
    var buyBtn = button(State.stampsBought ? 'Stamp pasted' : 'Buy ₱20 Stamp', 'stamp', { variant: 'yellow', disabled: State.stampsBought });
    buyBtn.addEventListener('click', function () {
      State.stampsBought = true;
      mailBtn.disabled = false;
      buyBtn.disabled = true;
      buyBtn.querySelector('.btn__text').textContent = 'Stamp pasted';
      toast('PhilPost stamp pasted! Your postcard is ready for its journey.');
    });
    mailBtn.addEventListener('click', function () {
      var info = getInfo();
      if (!info.postcard) { toast('Type your postcard code in the check-in form first.'); return; }
      setBusy(mailBtn, true, 'Mailing…');
      out.loading('Sending your postcard on its journey…');
      Api.mailPostcard(info).then(function (r) {
        var d = r.destination || {};
        out.show('Mailed to ' + (d.place || 'a surprise destination') + (d.province ? ', ' + d.province : '') + '!' + (r.chain_no !== undefined ? '\nChain #' + r.chain_no : ''), 'ok');
      }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(mailBtn, false); });
    });
    return el('section', { class: 'section section--narrow', id: 'mail' }, [
      el('div', { class: 'card mail-card reveal' }, [
        el('h2', { class: 'section__title' }, [icon('mailbox'), ' Mail your postcard']),
        el('p', { text: 'The mailbox is your finish line! Paste a ₱20 PhilPost stamp and drop your postcard in any PhilPost mailbox or post office. SMILE sends it to a surprise destination in the Philippines, where someone adopts it and starts their own adventure.' }),
        el('div', { class: 'stamps', 'aria-hidden': 'true' }, [el('span', { class: 'stamp stamp--a' }, icon('stamp'))]),
        el('div', { class: 'btn-row' }, [buyBtn, mailBtn]),
        button('Find a post office near me', 'map', { variant: 'light', small: true, href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('PhilPost post office'), target: '_blank' }),
        out
      ])
    ]);
  }

  // ---------------------------------------------------------------------------
  // Postcards: adopt a found postcard, track a postcard's journey
  // ---------------------------------------------------------------------------

  function renderPostcards(token, query) {
    var aUser = el('input', { id: 'ad-user', type: 'text', maxlength: '40', placeholder: 'Your name', value: Passport.name() });
    var aCode = el('input', { id: 'ad-code', type: 'text', autocapitalize: 'characters', placeholder: 'SMILE-1234-ABCD', value: (query.code || '').toUpperCase() });
    var aOut = outputBox();
    var aBtn = button('Adopt and join SMILE', 'heart', { type: 'submit', block: true });
    var tCode = el('input', { id: 'tr-code', type: 'text', autocapitalize: 'characters', placeholder: 'SMILE-1234-ABCD', value: (query.code || '').toUpperCase() });
    var tBtn = button('Track Journey', 'route', { type: 'submit', block: true, variant: 'blue' });
    var tOut = outputBox();
    var timeline = el('ol', { class: 'timeline' });

    var adopt = function (e) {
      e.preventDefault();
      if (!aUser.value.trim() || !aCode.value.trim()) { toast('Type your name and the postcard code.'); return; }
      Passport.setName(aUser.value.trim());
      setBusy(aBtn, true, 'Adopting…');
      aOut.loading('Adopting your postcard…');
      Api.adoptPostcard(aUser.value.trim(), aCode.value.trim().toUpperCase()).then(function (r) {
        if (r.adopter_total !== undefined) Passport.setPoints(r.adopter_total);
        aOut.show('Welcome to SMILE! You adopted a postcard from ' + (r.sender || 'a fellow explorer') + '.\nRank: ' + (r.rank || rankOf(Passport.points())), 'ok');
      }, function (err) { aOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(aBtn, false); });
    };

    var track = function (e) {
      e.preventDefault();
      if (!tCode.value.trim()) { toast('Type a postcard code.'); tCode.focus(); return; }
      setBusy(tBtn, true, 'Tracking…');
      tOut.loading('Finding the journey…');
      timeline.textContent = '';
      Api.trackPostcard(tCode.value.trim().toUpperCase()).then(function (r) {
        var h = Array.isArray(r.history) ? r.history : [];
        if (!h.length) { tOut.show('No journey yet for this postcard.'); return; }
        tOut.hidden = true;
        h.forEach(function (step, i) {
          var lines = typeof step === 'object' && step
            ? Object.keys(step).filter(function (k) { return step[k] !== '' && step[k] !== null && typeof step[k] !== 'object'; }).map(function (k) { return el('div', null, [el('b', { text: k.replace(/_/g, ' ') + ': ' }), String(step[k])]); })
            : [el('div', { text: String(step) })];
          timeline.appendChild(el('li', { class: 'timeline__item reveal', style: '--d:' + i * 80 + 'ms' }, [el('span', { class: 'timeline__dot', text: String(i + 1) }), el('div', { class: 'timeline__body' }, lines)]));
        });
        Motion.reveal(timeline);
      }, function (err) { tOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(tBtn, false); });
    };

    setView(el('section', { class: 'section section--narrow' }, [
      pageHead('heart', '#ED0460', 'SMILE Postcards', 'Found a SMILE postcard in your mailbox? Adopt it to join, or track where a postcard has been.'),
      el('form', { class: 'card stack', onsubmit: adopt }, [
        el('h2', { class: 'card__title', text: 'Adopt a postcard' }),
        formField('ad-user', 'Your name', aUser),
        formField('ad-code', 'Postcard code', el('div', { class: 'input-with-btn' }, [aCode, scanButton(aCode)])),
        aBtn, aOut
      ]),
      el('form', { class: 'card stack', onsubmit: track }, [
        el('h2', { class: 'card__title', text: 'Track a journey' }),
        formField('tr-code', 'Postcard code', el('div', { class: 'input-with-btn' }, [tCode, scanButton(tCode)])),
        tBtn, tOut, timeline
      ])
    ]));
    focusHeading();
  }

  // ---------------------------------------------------------------------------
  // Tools: caption generator, merchant assistant, LGU insights
  // ---------------------------------------------------------------------------

  function copyable(box) {
    var b = button('Copy', 'save', { small: true, variant: 'light' });
    b.hidden = true;
    b.addEventListener('click', function () {
      var t = box.textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Copied!'); }, function () { toast('Select the text to copy it.'); });
    });
    return b;
  }

  function aiTool(o) {
    var out = outputBox();
    var copy = copyable(out);
    var btn = button(o.button, o.icon, { type: 'submit', block: true, variant: o.variant });
    var form = el('form', { class: 'card stack reveal', id: o.id, onsubmit: function (e) {
      e.preventDefault();
      var args = o.args();
      if (!args) return;
      setBusy(btn, true, 'Writing…');
      out.loading(o.loading);
      copy.hidden = true;
      o.call.apply(null, args).then(function (r) { out.show(o.pick(r) || 'Done.'); copy.hidden = false; },
        function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(btn, false); });
    } }, [
      el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:' + o.color }, icon(o.icon)), o.title]),
      el('p', { class: 'muted', text: o.lead }),
      o.fields, btn, out, copy
    ]);
    return form;
  }

  // ---------------------------------------------------------------------------
  // Shop: pasalubong stores + nano entrepreneurs (souvenirs, clothing, crafts)
  //  - Shops come from the backend "Shops" + "ShopItems" sheets (only "approved" rows).
  //  - "Sell on SMILE" sends a new shop as "pending"; the SMILE team approves it in the sheet.
  // ---------------------------------------------------------------------------

  var SHOP_TYPES = {
    pasalubong: { label: 'Pasalubong', icon: 'food', color: '#FF6A03' },
    souvenir: { label: 'Souvenirs', icon: 'star', color: '#7B2CBF' },
    clothing: { label: 'Clothing', icon: 'shop', color: '#0057D9' },
    crafts: { label: 'Crafts', icon: 'heart', color: '#ED0460' },
    food: { label: 'Food', icon: 'food', color: '#02A04F' },
    other: { label: 'Other', icon: 'shop', color: '#5B6478' }
  };

  var SHOPS_FALLBACK = [
    { province: 'iloilo', shop_id: 'biscocho-haus', name: 'Original Biscocho Haus', type: 'pasalubong', barangay: 'Lopez Jaena St, Jaro',
      desc: 'Iloilo’s classic pasalubong bakery, famous for biscocho and butterscotch.', contact: '',
      maps_url: 'https://www.google.com/maps/search/?api=1&query=Original+Biscocho+Haus+Jaro+Iloilo+City',
      items: [
        { item_id: 'bh-biscocho', name: 'Biscocho', price: '', desc: 'Twice-baked bread toasted with butter and sugar. The Iloilo classic.' },
        { item_id: 'bh-butterscotch', name: 'Butterscotch', price: '', desc: 'Chewy, buttery bars: the original flavor, plus versions with dried fruits.' },
        { item_id: 'bh-barquillos', name: 'Barquillos', price: '', desc: 'Crisp rolled wafers, an Ilonggo favorite.' }
      ] },
    {"shop_id": "bongbongs-piaya", "province": "negros-occidental", "name": "Bongbong's Piaya & Barquillos", "type": "pasalubong", "barangay": "Bacolod City", "desc": "Bacolod's pasalubong favorite for piaya, barquillos and other Negrense treats.", "contact": "", "items": [{"item_id": "bb-piaya", "name": "Piaya", "price": "", "desc": "Flat, flaky bread filled with muscovado sugar. Also in ube and other flavors."}, {"item_id": "bb-barquillos", "name": "Barquillos", "price": "", "desc": "Crisp rolled wafers, a Negrense classic."}], "maps_url": "https://www.google.com/maps/search/?api=1&query=Bongbong%27s+Piaya+Bacolod"},
    {"shop_id": "trappist-gift-shop", "province": "guimaras", "name": "Trappist Monastery Gift Shop", "type": "pasalubong", "barangay": "Jordan", "desc": "The monks' shop for Guimaras mango jams and preserves.", "contact": "", "items": [{"item_id": "tm-mango-jam", "name": "Mango jams and preserves", "price": "", "desc": "Made with Guimaras mangoes by the Trappist community."}], "maps_url": "https://www.google.com/maps/search/?api=1&query=Trappist+Monastery+Guimaras"},
    {"shop_id": "sans-rival-dumaguete", "province": "negros-oriental", "name": "Sans Rival Cakes & Pastries", "type": "pasalubong", "barangay": "Dumaguete City", "desc": "Dumaguete's famous bakery for silvanas and sans rival, packed for travel.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Sans+Rival+Cakes+and+Pastries+Dumaguete", "items": [{"item_id": "sr-silvanas", "name": "Silvanas", "price": "", "desc": "Frozen cashew-meringue wafers with buttercream, coated in cookie crumbs."}, {"item_id": "sr-sans-rival", "name": "Sans Rival", "price": "", "desc": "Layered cashew meringue and buttercream cake."}]}
  ];
  State.shops = sortShops(SHOPS_FALLBACK.slice());
  State.shopsLoaded = false;

  function loadShops() {
    if (State.shopsLoaded || State.demo) return Promise.resolve(State.shops);
    return Api.shops().then(function (r) {
      if (r && Array.isArray(r.shops) && r.shops.length) State.shops = sortShops(withBuiltIns(r.shops.filter(function (s) { return s && s.name; }), SHOPS_FALLBACK, 'shop_id'));
      State.shopsLoaded = true;
      return State.shops;
    }, function () { return State.shops; });
  }

  /** Safe contact link: only https links, phone numbers or emails become links. */
  function contactNode(contact) {
    var c = String(contact || '').trim();
    if (!c) return null;
    var href = null, label = c, ic = 'send';
    if (/^https:\/\/\S+$/i.test(c)) { href = c; label = c.replace(/^https:\/\/(www\.)?/i, '').slice(0, 40); ic = 'globe'; }
    else if (/^(www\.|fb\.com\/|facebook\.com\/)\S+$/i.test(c)) { href = 'https://' + c; label = c.slice(0, 40); ic = 'globe'; }
    else if (/^[+0-9][0-9 ()-]{6,}$/.test(c)) { href = 'tel:' + c.replace(/[^+0-9]/g, ''); ic = 'send'; }
    else if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c)) { href = 'mailto:' + c; ic = 'send'; }
    return href ? button(label, ic, { variant: 'light', small: true, href: href, target: /^https/.test(href) ? '_blank' : null })
      : el('p', { class: 'muted small', text: 'Contact: ' + c });
  }

  function shopCard(s, i) {
    var t = SHOP_TYPES[s.type] || SHOP_TYPES.other;
    var items = Array.isArray(s.items) ? s.items : [];
    return el('article', { class: 'card shop-card reveal' + (isFeatured(s) ? ' shop-card--featured' : ''), style: '--d:' + Math.min(i, 10) * 60 + 'ms' }, [
      el('div', { class: 'place-card__top' }, [
        el('span', { class: 'card-icon', style: 'background:' + t.color }, icon(t.icon)),
        el('div', null, [
          el('h3', { class: 'place-card__name', text: s.name }),
          el('p', { class: 'place-card__meta' }, [isFeatured(s) ? el('span', { class: 'chip chip--sm chip--featured' }, [icon('star'), 'Featured']) : null, el('span', { class: 'chip chip--sm', style: '--c:' + t.color, text: t.label }), el('span', { text: (s.barangay ? s.barangay + ', ' : '') + provinceName(provinceOf(s)) })])
        ])
      ]),
      s.desc ? el('p', { class: 'place-card__desc', text: s.desc }) : null,
      items.length ? el('ul', { class: 'shop-items' }, items.map(function (x) {
        return el('li', { class: 'shop-item' }, [
          el('div', { class: 'shop-item__head' }, [el('b', { text: x.name }), el('span', { class: 'shop-item__price', text: x.price ? String(x.price) : 'Price in store' })]),
          x.desc ? el('p', { class: 'muted small', text: x.desc }) : null
        ]);
      })) : null,
      el('div', { class: 'btn-row shop-card__actions' }, [
        button('Directions', 'map', { variant: 'blue', small: true, href: s.maps_url || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + provinceName(provinceOf(s)))), target: '_blank' }),
        contactNode(s.contact),
        button('Share', 'share', { variant: 'light', small: true, onclick: function () {
          var text = s.name + ' (' + t.label + ', ' + provinceName(provinceOf(s)) + '): ' + items.map(function (x) { return x.name; }).join(', ') + ' #SMILEPH';
          if (navigator.share) navigator.share({ title: s.name, text: text, url: location.origin + location.pathname + '#/shop' }).catch(function () { /* cancelled */ });
          else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied!'); });
        } })
      ])
    ]);
  }

  function renderShop(token, query) {
    var filter = { type: query.type || 'all', q: '' };
    var grid = el('div', { class: 'stack-lg' });
    var count = el('p', { class: 'muted small', role: 'status' });
    var paint = function () {
      var q = filter.q.toLowerCase();
      var list = State.shops.filter(function (s) {
        var hay = (s.name + ' ' + (s.barangay || '') + ' ' + (s.desc || '') + ' ' + (s.items || []).map(function (x) { return x.name + ' ' + (x.desc || ''); }).join(' ')).toLowerCase();
        return (filter.type === 'all' || s.type === filter.type) && (!q || hay.indexOf(q) !== -1);
      });
      var sel = currentProvince(), pv = provinceInfo(sel), sp = splitByProvince(list, sel);
      grid.textContent = '';
      if (pv) {
        appendChildren(grid, el('section', { class: 'prov-section', style: '--c:' + pv.color }, [
          el('h2', { class: 'section__title' }, [icon(pv.icon), ' In ' + pv.name]),
          sp.here.length ? el('div', { class: 'grid' }, sp.here.map(shopCard))
            : el('p', { class: 'empty' }, ['No shops in ' + pv.name + ' yet. ', el('a', { href: '#sell', text: 'Be the first to sell here' }), '!'])
        ]));
      }
      if (sp.others.length) {
        appendChildren(grid, el('section', { class: 'prov-section prov-section--others' }, [
          el('h2', { class: 'section__title' }, [icon('map'), pv ? ' Elsewhere in Western Visayas' : ' All provinces'])
        ].concat(sp.others.map(function (g) {
          return el('div', { class: 'explore-group', style: '--c:' + g.province.color }, [
            el('h3', { class: 'explore-group__title' }, [icon(g.province.icon), ' ' + g.province.name]),
            el('div', { class: 'grid' }, g.items.map(shopCard))
          ]);
        }))));
      }
      if (!list.length) appendChildren(grid, el('p', { class: 'empty', text: 'No shops match yet. Be the first to sell here!' }));
      count.textContent = list.length + ' shop' + (list.length === 1 ? '' : 's') + ' across Western Visayas';
      Motion.reveal(view());
    };
    var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Shop type' },
      [['all', { label: 'All', icon: 'shop', color: '#14213d' }]].concat(Object.keys(SHOP_TYPES).map(function (k) { return [k, SHOP_TYPES[k]]; })).map(function (pair) {
        return el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(filter.type === pair[0]), style: '--c:' + pair[1].color, onclick: function (e) {
          filter.type = pair[0];
          chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          e.currentTarget.setAttribute('aria-pressed', 'true');
          paint();
        } }, [icon(pair[1].icon), pair[1].label]);
      }));
    var search = el('input', { type: 'search', id: 'shop-search', placeholder: 'Search biscocho, piaya, shirts…', autocomplete: 'off' });
    search.addEventListener('input', function () { filter.q = search.value.trim(); paint(); });

    setView([
      el('section', { class: 'section' }, [
        pageHead('shop', '#FF6A03', 'Pasalubong & Souvenirs', 'Take home a taste of the islands. Buy from pasalubong stores and nano entrepreneurs in every province.'),
        provincePicker(function () { paint(); }, true),
        el('div', { class: 'toolbar' }, [el('label', { class: 'searchbox' }, [icon('search'), el('span', { class: 'sr-only', text: 'Search shops' }), search]), chips]),
        count,
        grid
      ]),
      sellForm(token)
    ]);
    paint();
    focusHeading();
    loadShops().then(function () { if (token === renderToken) paint(); });
  }

  /** "Sell on SMILE" sign-up for nano entrepreneurs and pasalubong stores. */
  function sellForm(token) {
    var name = el('input', { id: 'sell-name', type: 'text', maxlength: '80', placeholder: 'e.g. Lola’s Piaya House' });
    var type = el('select', { id: 'sell-type' }, Object.keys(SHOP_TYPES).map(function (k) { return el('option', { value: k, text: SHOP_TYPES[k].label }); }));
    var prov = el('select', { id: 'sell-province' }, PROVINCES.map(function (p) { return el('option', { value: p.id, text: p.name }); }));
    prov.value = currentProvince() || DEFAULT_PROVINCE;
    var area = el('input', { id: 'sell-area', type: 'text', maxlength: '80', placeholder: 'Barangay / street, e.g. Molo Plaza' });
    var desc = el('textarea', { id: 'sell-desc', rows: '2', maxlength: '400', placeholder: 'What makes your shop special?' });
    var contact = el('input', { id: 'sell-contact', type: 'text', maxlength: '120', placeholder: 'Facebook page link, mobile number or email' });
    var itemsBox = el('div', { class: 'stack' });
    var rows = [];
    var addItem = function () {
      if (rows.length >= 12) { toast('Up to 12 products per sign-up.'); return; }
      var n = rows.length + 1;
      var iName = el('input', { type: 'text', maxlength: '80', placeholder: 'Product name', 'aria-label': 'Product ' + n + ' name' });
      var iPrice = el('input', { type: 'text', maxlength: '30', placeholder: 'Price, e.g. ₱150', 'aria-label': 'Product ' + n + ' price' });
      var iDesc = el('textarea', { rows: '2', maxlength: '400', placeholder: 'Short description', 'aria-label': 'Product ' + n + ' description' });
      var aiBtn = button('Write with AI', 'sparkle', { small: true, variant: 'light', onclick: function () {
        if (!iName.value.trim()) { toast('Type the product name first.'); iName.focus(); return; }
        setBusy(aiBtn, true, 'Writing…');
        Api.merchant(name.value.trim(), iName.value.trim() + ' ' + iPrice.value.trim() + ' ' + iDesc.value.trim()).then(function (r) {
          iDesc.value = String(r.listing || '').slice(0, 400);
        }, function (err) { toast(friendlyError(err)); }).then(function () { setBusy(aiBtn, false); });
      } });
      var row = el('fieldset', { class: 'sell-item' }, [
        el('legend', { class: 'field__label', text: 'Product ' + n }),
        el('div', { class: 'sell-item__grid' }, [iName, iPrice]),
        iDesc,
        el('div', { class: 'btn-row' }, [aiBtn, n > 1 ? button('Remove', 'close', { small: true, variant: 'light', onclick: function () { row.remove(); rows = rows.filter(function (r) { return r.row !== row; }); } }) : null])
      ]);
      rows.push({ row: row, name: iName, price: iPrice, desc: iDesc });
      itemsBox.appendChild(row);
    };
    addItem();
    var out = outputBox();
    var submit = button('Send my shop for review', 'send', { type: 'submit', block: true, variant: 'green' });
    var form = el('form', { class: 'card stack', onsubmit: function (e) {
      e.preventDefault();
      if (!name.value.trim()) { toast('Type your shop name.'); name.focus(); return; }
      if (!contact.value.trim()) { toast('Add a contact so tourists can reach you.'); contact.focus(); return; }
      var items = rows.map(function (r) { return { name: r.name.value.trim(), price: r.price.value.trim(), desc: r.desc.value.trim(), category: type.value }; }).filter(function (x) { return x.name; });
      if (!items.length) { toast('Add at least one product.'); return; }
      setBusy(submit, true, 'Sending…');
      out.loading('Sending your shop…');
      Api.shopSubmit(Passport.name() || name.value.trim(), { name: name.value.trim(), type: type.value, province: prov.value, barangay: area.value.trim(), desc: desc.value.trim(), contact: contact.value.trim() }, items).then(function (r) {
        out.show(r.message || 'Salamat! Your shop was sent for review.', 'ok');
        form.reset(); itemsBox.textContent = ''; rows = []; addItem();
      }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(submit, false); });
    } }, [
      el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('shop')), 'Sell on SMILE']),
      el('p', { class: 'muted', text: 'For nano entrepreneurs and pasalubong stores in every province of Western Visayas and the Negros Island Region. Free to join. The SMILE team checks each shop before it appears here.' }),
      formField('sell-name', 'Shop name', name),
      formField('sell-type', 'What do you sell?', type),
      formField('sell-province', 'Province', prov),
      formField('sell-area', 'Town, barangay or street', area),
      formField('sell-desc', 'About your shop', desc),
      formField('sell-contact', 'Contact for buyers', contact, 'Shown publicly so tourists can order or visit.'),
      el('h3', { class: 'sell-items__title', text: 'Products' }),
      itemsBox,
      button('Add another product', 'plusSquare', { variant: 'light', onclick: addItem }),
      submit, out,
      el('p', { class: 'muted small' }, ['Need captions or listings for social media? ', el('a', { href: '#/tools', text: 'Open merchant tools' }), '.'])
    ]);
    return el('section', { class: 'section section--narrow', id: 'sell' }, form);
  }


  function renderTools() {
    var capPlace = el('select', { id: 'cap-place' }, State.places.map(function (p) { return el('option', { text: p.name }); }));
    var mood = el('select', { id: 'cap-mood' }, ['happy', 'proud Ilonggo', 'food trip', 'proud, conquered challenge'].map(function (m) { return el('option', { text: m }); }));
    var mName = el('input', { id: 'm-name', type: 'text', placeholder: 'Shop name' });
    var mRaw = el('input', { id: 'm-raw', type: 'text', placeholder: 'e.g. white shirt Dinagyang print 350' });
    var lguQ = el('input', { id: 'lgu-q', type: 'text', placeholder: 'Which places got the most visitors?' });

    setView(el('section', { class: 'section' }, [
      pageHead('shop', '#00A651', 'SMILE Tools', 'AI helpers for travellers, local merchants and LGU tourism offices.'),
      el('div', { class: 'tools-grid' }, [
        aiTool({ id: 'tool-caption', title: 'Caption generator', icon: 'caption', color: '#FDB603', variant: 'yellow', button: 'Create caption', loading: 'Writing your caption…',
          lead: 'A ready-to-post caption for your photo.',
          fields: [formField('cap-place', 'Place', capPlace), formField('cap-mood', 'Mood', mood)],
          args: function () { return [capPlace.value, mood.value]; }, call: Api.caption, pick: function (r) { return r.caption; } }),
        aiTool({ id: 'tool-merchant', title: 'Merchant assistant', icon: 'shop', color: '#00A651', variant: 'green', button: 'Write my listing', loading: 'Writing your listing…',
          lead: 'Type your product quickly; get a clean listing for your shop.',
          fields: [formField('m-name', 'Shop name', mName), formField('m-raw', 'Product, notes and price', mRaw)],
          args: function () { if (!mRaw.value.trim()) { toast('Describe your product first.'); mRaw.focus(); return null; } return [mName.value.trim(), mRaw.value.trim()]; },
          call: Api.merchant, pick: function (r) { return r.listing; } }),
        aiTool({ id: 'tool-lgu', title: 'LGU insights', icon: 'chart', color: '#0057D9', variant: 'blue', button: 'Analyze', loading: 'Analyzing check-ins…',
          lead: 'Ask about visitor trends from SMILE check-ins.',
          fields: [formField('lgu-q', 'Your question', lguQ)],
          args: function () { if (!lguQ.value.trim()) { toast('Type a question first.'); lguQ.focus(); return null; } return [lguQ.value.trim()]; },
          call: Api.insights, pick: function (r) { return r.insights; } })
      ])
    ]));
    focusHeading();
  }

  // ---------------------------------------------------------------------------
  // Ranks: passport + leaderboard
  // ---------------------------------------------------------------------------

  function renderRanks(token) {
    var list = el('ol', { class: 'board', 'aria-live': 'polite' });
    var refresh = button('Refresh', 'refresh', { small: true, variant: 'light' });
    var load = function () {
      list.textContent = '';
      list.appendChild(el('li', { class: 'board__loading' }, [el('span', { class: 'spinner spinner--small', 'aria-hidden': 'true' }), 'Loading leaderboard…']));
      Api.leaderboard().then(function (r) { return Array.isArray(r.board) ? r.board : []; }, function () { return []; }).then(function (b) {
        if (token !== renderToken) return;
        if (!b.length) b = [{ name: Passport.name() || 'You', stamps: Passport.points(), rank: rankOf(Passport.points()) }];
        list.textContent = '';
        var me = (Passport.name() || '').toLowerCase();
        b.forEach(function (x, i) {
          list.appendChild(el('li', { class: 'board__row reveal' + (i < 3 ? ' board__row--top' + (i + 1) : '') + (me && String(x.name).toLowerCase() === me ? ' is-me' : ''), style: '--d:' + Math.min(i, 12) * 50 + 'ms' }, [
            el('span', { class: 'board__pos', text: '#' + (i + 1) }),
            el('span', { class: 'board__name', text: String(x.name || 'Explorer') }),
            el('span', { class: 'board__pts', text: String(x.stamps || 0) + ' pts' }),
            el('span', { class: 'board__rank', text: String(x.rank || rankOf(+x.stamps || 0)) })
          ]));
        });
        Motion.reveal(list);
      });
    };
    refresh.addEventListener('click', load);
    setView(el('section', { class: 'section section--narrow' }, [
      pageHead('trophy', '#FDB603', 'Ranks and Leaderboard', '3 pts = D • 6 = C • 10 = B • 15 = A • 20 = S • 30 = SS • 45 = SSS'),
      passportCard(true),
      stampAlbum(),
      el('div', { class: 'row-between' }, [el('h2', { class: 'section__title', text: 'Top explorers' }), refresh]),
      list
    ]));
    load();
    focusHeading();
  }

  // ---------------------------------------------------------------------------
  // AI Photobooth: selfie → (actual or AI outfit) → "CONQUERED" postcard canvas
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Camera: QR scanner (postcard codes) + photo camera (selfies, proof photos)
  //  - Uses the phone camera through getUserMedia (needs https: GitHub Pages is fine).
  //  - QR: the browser's own BarcodeDetector when it has one (Android Chrome), otherwise
  //    jsQR (assets/vendor/jsQR.min.js, loaded only when needed; iPhone Safari uses this).
  //  - Always offers a fallback: type the code, scan a QR from a saved photo, or pick a photo.
  // ---------------------------------------------------------------------------

  var JSQR_SRC = 'assets/vendor/jsQR.min.js';
  var jsqrLoading = null;
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (jsqrLoading) return jsqrLoading;
    jsqrLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = JSQR_SRC; s.async = true;
      s.onload = function () { window.jsQR ? resolve(window.jsQR) : reject(new Error('jsQR')); };
      s.onerror = function () { jsqrLoading = null; reject(new Error('jsQR')); };
      document.head.appendChild(s);
    });
    return jsqrLoading;
  }

  /** Returns a promise of decode(source) → Promise<string|null>. source: video, image or canvas. */
  var qrDecoder = null;
  function getQrDecoder() {
    if (qrDecoder) return Promise.resolve(qrDecoder);
    var useJsQR = function () {
      return loadJsQR().then(function (jsQR) {
        var c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
        qrDecoder = function (src) {
          var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
          if (!w || !h) return Promise.resolve(null);
          var s = Math.min(1, 800 / Math.max(w, h));
          c.width = Math.round(w * s); c.height = Math.round(h * s);
          x.drawImage(src, 0, 0, c.width, c.height);
          var d = x.getImageData(0, 0, c.width, c.height);
          var r = jsQR(d.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
          return Promise.resolve(r && r.data ? r.data : null);
        };
        return qrDecoder;
      });
    };
    if ('BarcodeDetector' in window && window.BarcodeDetector.getSupportedFormats) {
      return window.BarcodeDetector.getSupportedFormats().then(function (f) {
        if (f.indexOf('qr_code') === -1) return useJsQR();
        var det = new window.BarcodeDetector({ formats: ['qr_code'] });
        qrDecoder = function (src) { return det.detect(src).then(function (r) { return r && r[0] ? r[0].rawValue : null; }); };
        return qrDecoder;
      }, useJsQR);
    }
    return useJsQR();
  }

  /** Reads a SMILE postcard QR: a link (…?place=…&code=…) or the code itself. */
  function parsePostcardQR(text) {
    text = String(text || '').trim();
    var out = { code: '', place: '', raw: text };
    try {
      var u = new URL(text);
      var q = new URLSearchParams(u.search);
      var hq = u.hash.indexOf('?') > -1 ? new URLSearchParams(u.hash.slice(u.hash.indexOf('?') + 1)) : null;
      out.code = q.get('code') || (hq && hq.get('code')) || '';
      out.place = q.get('place') || (hq && hq.get('place')) || '';
    } catch (e) { /* not a link */ }
    if (!out.code) { var m = text.match(/SMILE-[A-Z0-9]{3,8}-[A-Z0-9]{3,8}/i); if (m) out.code = m[0]; }
    if (!out.code && /^[A-Z0-9-]{6,40}$/i.test(text)) out.code = text;
    out.code = out.code.toUpperCase();
    return out;
  }

  var Camera = {
    node: null, stream: null, facing: 'environment', opts: null, timer: null, busy: false, prev: null, onKey: null, lastMsg: 0,
    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false; },

    /**
     * opts: { mode: 'qr' | 'photo', facing: 'user' | 'environment', title, hint, onResult(data), onType() }
     * qr → onResult({code, place, raw});  photo → onResult({dataUrl, mime})
     */
    open: function (opts) {
      Camera.close(true);
      Camera.opts = opts;
      Camera.facing = opts.facing || (opts.mode === 'qr' ? 'environment' : 'user');
      Camera.prev = document.activeElement;
      var o = opts, isQR = o.mode === 'qr';

      var video = el('video', { class: 'cam__video', playsinline: true, autoplay: true, muted: true, 'aria-hidden': 'true' });
      video.muted = true;
      var msg = el('p', { class: 'cam__msg', role: 'status', 'aria-live': 'polite', text: o.hint || '' });
      var count = el('div', { class: 'cam__count', 'aria-live': 'assertive' });
      var flash = el('div', { class: 'cam__flash' });
      var still = el('img', { class: 'cam__still', alt: 'Your photo', hidden: true });

      var galleryInput = el('input', { type: 'file', accept: 'image/*', hidden: true });
      galleryInput.addEventListener('change', function () {
        var f = galleryInput.files && galleryInput.files[0];
        if (!f) return;
        if (isQR) Camera.decodeFile(f);
        else shrinkImage(f, 1600, 0.9).then(function (r) { if (r) Camera.finish(r); });
      });

      var closeBtn = el('button', { type: 'button', class: 'cam__icon-btn', 'aria-label': 'Close camera', onclick: function () { Camera.close(); } }, icon('close'));
      var switchBtn = el('button', { type: 'button', class: 'cam__icon-btn', 'aria-label': 'Switch camera', onclick: function () { Camera.facing = Camera.facing === 'user' ? 'environment' : 'user'; Camera.start(); } }, icon('refresh'));
      var torchBtn = el('button', { type: 'button', class: 'cam__icon-btn', 'aria-label': 'Flashlight', 'aria-pressed': 'false', hidden: true, onclick: function () { Camera.toggleTorch(torchBtn); } }, icon('sparkle'));
      var timerOn = false;
      var timerBtn = el('button', { type: 'button', class: 'cam__chip', 'aria-pressed': 'false', onclick: function () { timerOn = !timerOn; timerBtn.setAttribute('aria-pressed', String(timerOn)); timerBtn.textContent = timerOn ? '3s timer: on' : '3s timer: off'; } }, '3s timer: off');
      var shutter = el('button', { type: 'button', class: 'cam__shutter', 'aria-label': 'Take photo', onclick: function () {
        if (timerOn) Camera.countdown(3, count, function () { Camera.snap(video, still, flash); });
        else Camera.snap(video, still, flash);
      } });

      var review = el('div', { class: 'cam__review', hidden: true }, [
        button('Retake', 'refresh', { variant: 'light', onclick: function () { still.hidden = true; review.hidden = true; controls.hidden = false; Camera.shot = null; } }),
        button('Use photo', 'check', { variant: 'green', onclick: function () { if (Camera.shot) Camera.finish(Camera.shot); } })
      ]);

      var controls = isQR
        ? el('div', { class: 'cam__bar' }, [
            el('button', { type: 'button', class: 'cam__chip', onclick: function () { galleryInput.click(); } }, [icon('postcard'), 'Scan from photo']),
            o.onType ? el('button', { type: 'button', class: 'cam__chip', onclick: function () { Camera.close(); o.onType(); } }, [icon('caption'), 'Type code']) : null,
            switchBtn, torchBtn
          ])
        : el('div', { class: 'cam__bar cam__bar--photo' }, [
            el('button', { type: 'button', class: 'cam__icon-btn', 'aria-label': 'Choose from gallery', onclick: function () { galleryInput.click(); } }, icon('save')),
            shutter,
            switchBtn
          ]);

      Camera.node = el('div', { class: 'cam' + (isQR ? ' cam--qr' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Camera', tabindex: '-1' }, [
        video,
        isQR ? el('div', { class: 'cam__frame', 'aria-hidden': 'true' }, [el('span', { class: 'cam__laser' })]) : null,
        still, flash, count,
        el('div', { class: 'cam__top' }, [el('h2', { class: 'cam__title', text: o.title || 'Camera' }), closeBtn]),
        el('div', { class: 'cam__bottom' }, [msg, isQR ? null : timerBtn, controls, review, galleryInput])
      ]);
      Camera.refs = { video: video, msg: msg, still: still, review: review, controls: controls, torch: torchBtn, switchBtn: switchBtn, shutter: shutter };
      document.body.appendChild(Camera.node);
      document.body.classList.add('has-cam');

      Camera.onKey = function (e) {
        if (!Camera.node) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); Camera.close(); return; }
        if (e.key === 'Tab') {
          e.stopImmediatePropagation();
          var f = Array.prototype.slice.call(Camera.node.querySelectorAll('button:not([disabled]):not([hidden])')).filter(function (n) { return n.offsetParent !== null; });
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      };
      document.addEventListener('keydown', Camera.onKey, true);
      Camera.node.focus({ preventScroll: true });
      Camera.start();
    },

    start: function () {
      var r = Camera.refs, o = Camera.opts;
      Camera.stopStream();
      Camera.node.classList.toggle('cam--mirror', Camera.facing === 'user');
      if (!Camera.supported()) { Camera.fail('This browser cannot open the camera here.'); return; }
      Camera.say(o.mode === 'qr' ? 'Starting camera…' : 'Starting camera…');
      navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: Camera.facing }, width: { ideal: 1920 }, height: { ideal: 1080 } } }).then(function (stream) {
        if (!Camera.node || Camera.opts !== o) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        Camera.stream = stream;
        r.video.srcObject = stream;
        var p = r.video.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: user can tap */ });
        var track = stream.getVideoTracks()[0];
        var caps = track && track.getCapabilities ? track.getCapabilities() : {};
        r.torch.hidden = !caps.torch;
        Camera.say(o.hint || '');
        if (o.mode === 'qr') Camera.scanLoop(o);
      }, function (err) {
        var n = err && err.name;
        Camera.fail(n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera permission is blocked. Allow the camera for this site in your browser settings, then try again.'
          : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera was found on this device.'
          : n === 'NotReadableError' ? 'The camera is being used by another app. Close it and try again.'
          : 'The camera could not start.');
      });
    },

    fail: function (text) {
      var r = Camera.refs;
      Camera.node.classList.add('cam--error');
      Camera.say(text + (Camera.opts.mode === 'qr' ? ' You can scan from a photo or type the code instead.' : ' You can choose a photo from your gallery instead.'));
      if (r.shutter) r.shutter.disabled = true;
      r.switchBtn.hidden = true;
    },

    say: function (text) { if (Camera.refs) Camera.refs.msg.textContent = text; },

    scanLoop: function (o) {
      getQrDecoder().then(function (decode) {
        var video = Camera.refs.video;
        var tick = function () {
          if (!Camera.node || Camera.opts !== o) return;
          if (!Camera.busy && video.readyState >= 2) {
            Camera.busy = true;
            decode(video).then(function (val) { Camera.busy = false; if (val) Camera.gotQR(val); }, function () { Camera.busy = false; });
          }
          Camera.timer = setTimeout(tick, 180);
        };
        tick();
      }, function () { Camera.say('The QR reader could not load. Check your internet once, or type the code instead.'); });
    },

    gotQR: function (val) {
      var parsed = parsePostcardQR(val);
      if (!parsed.code) {
        if (Date.now() - Camera.lastMsg > 2500) { Camera.lastMsg = Date.now(); Camera.say('That QR is not a SMILE postcard. Try the QR on the back of your postcard.'); }
        return;
      }
      try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) { /* ignore */ }
      Camera.finish(parsed);
    },

    decodeFile: function (file) {
      Camera.say('Reading the QR in your photo…');
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        getQrDecoder().then(function (decode) { return decode(img); }).then(function (val) {
          URL.revokeObjectURL(url);
          if (val && parsePostcardQR(val).code) Camera.gotQR(val);
          else Camera.say('No SMILE QR found in that photo. Try a sharper, closer photo.');
        }, function () { URL.revokeObjectURL(url); Camera.say('Could not read that photo.'); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); Camera.say('Could not open that photo.'); };
      img.src = url;
    },

    countdown: function (n, node, done) {
      if (n <= 0) { node.textContent = ''; done(); return; }
      node.textContent = String(n);
      node.classList.remove('is-tick'); void node.offsetWidth; node.classList.add('is-tick');
      setTimeout(function () { if (Camera.node) Camera.countdown(n - 1, node, done); }, 1000);
    },

    snap: function (video, still, flash) {
      if (!video.videoWidth) { toast('The camera is still starting. Try again.'); return; }
      var w = video.videoWidth, h = video.videoHeight, s = Math.min(1, 1600 / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);   // saved the right way round, so signs stay readable
      Camera.shot = { dataUrl: c.toDataURL('image/jpeg', 0.9), mime: 'image/jpeg' };
      flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
      still.src = Camera.shot.dataUrl; still.hidden = false;
      Camera.refs.controls.hidden = true; Camera.refs.review.hidden = false;
    },

    toggleTorch: function (btn) {
      var t = Camera.stream && Camera.stream.getVideoTracks()[0];
      if (!t) return;
      var on = btn.getAttribute('aria-pressed') !== 'true';
      t.applyConstraints({ advanced: [{ torch: on }] }).then(function () { btn.setAttribute('aria-pressed', String(on)); }, function () { btn.hidden = true; });
    },

    finish: function (data) {
      var cb = Camera.opts && Camera.opts.onResult;
      Camera.close();
      if (cb) cb(data);
    },

    stopStream: function () {
      clearTimeout(Camera.timer); Camera.busy = false;
      if (Camera.stream) { Camera.stream.getTracks().forEach(function (t) { t.stop(); }); Camera.stream = null; }
    },

    close: function (silent) {
      Camera.stopStream();
      if (Camera.onKey) document.removeEventListener('keydown', Camera.onKey, true);
      Camera.onKey = null;
      if (Camera.node && Camera.node.parentNode) Camera.node.parentNode.removeChild(Camera.node);
      Camera.node = null; Camera.refs = null; Camera.shot = null;
      document.body.classList.remove('has-cam');
      if (!silent && Camera.prev && typeof Camera.prev.focus === 'function') Camera.prev.focus({ preventScroll: true });
      Camera.opts = null;
    }
  };

  // Release the camera when the app goes to the background.
  document.addEventListener('visibilitychange', function () { if (document.hidden && Camera.node) Camera.close(true); });

  /** A "Scan QR" button that fills a code input (and optionally the place). */
  function scanButton(codeInput, onPlace) {
    return button('Scan QR', 'qr', { variant: 'blue', label: 'Scan the QR code on your postcard', onclick: function () {
      Camera.open({
        mode: 'qr', title: 'Scan your SMILE postcard', hint: 'Point the camera at the QR code on the back of your postcard.',
        onType: function () { codeInput.focus(); },
        onResult: function (r) {
          codeInput.value = r.code;
          codeInput.dispatchEvent(new Event('input'));
          if (r.place && onPlace) onPlace(r.place);
          toast('Postcard scanned: ' + r.code);
        }
      });
    } });
  }

  /** "Open camera" + "Choose photo" buttons for a photo, with a hidden file input. */
  function photoPicker(o) {
    var file = el('input', { id: o.id, type: 'file', accept: 'image/*', hidden: true });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (f) shrinkImage(f, o.max || 1600, 0.9).then(function (r) { if (r) o.onPhoto(r); });
      file.value = '';
    });
    var cam = button(o.cameraLabel || 'Open camera', 'camera', { variant: o.variant || 'glow', onclick: function () {
      if (!Camera.supported()) { file.click(); return; }
      Camera.open({ mode: 'photo', facing: o.facing, title: o.title, hint: o.hint, onResult: o.onPhoto });
    } });
    var pick = button('Choose photo', 'save', { variant: 'light', onclick: function () { file.click(); } });
    return el('div', { class: 'btn-row photo-picker' }, [cam, pick, file]);
  }


  var logoImg = null;
  function getLogo() {
    if (logoImg) return Promise.resolve(logoImg);
    return new Promise(function (resolve) {
      var i = new Image();
      i.onload = function () { logoImg = i; resolve(i); };
      i.onerror = function () { resolve(null); };
      i.src = LOGO_SRC;
    });
  }

  function openPhotobooth(id) {
    var place = findPlace(id);
    if (!place) return;
    var mode = 'actual', photo = null;
    var preview = el('img', { class: 'proof-preview proof-preview--selfie', alt: 'Your selfie', hidden: true });
    var file = photoPicker({ id: 'pb-file', facing: 'user', cameraLabel: 'Open selfie camera', title: 'Selfie at ' + place.name,
      hint: 'Smile! Tap the round button, or turn on the 3-second timer.',
      onPhoto: function (r) { photo = r; preview.src = r.dataUrl; preview.hidden = false; resultBox.hidden = true; } });
    var outfit = el('textarea', { id: 'pb-outfit', rows: '2', maxlength: '200', placeholder: 'e.g. Dinagyang warrior, Filipiniana, elegant beach outfit…' });
    var outfitBox = el('div', { class: 'stack', hidden: true }, [
      formField('pb-outfit', 'Describe the outfit', outfit, 'Isidro moderates: beach = swimwear OK, church = modest only.'),
      el('div', { class: 'chips chips--wrap' }, (SUGGESTIONS[place.cat] || SUGGESTIONS._default).map(function (s) {
        return el('button', { type: 'button', class: 'chip-btn chip-btn--soft', onclick: function () { outfit.value = s; } }, s);
      }))
    ]);
    var radio = function (value, label, sub) {
      var input = el('input', { type: 'radio', name: 'pb-mode', value: value, checked: value === 'actual' });
      input.addEventListener('change', function () { mode = value; outfitBox.hidden = value !== 'ai'; });
      return el('label', { class: 'radio-card' }, [input, el('span', null, [el('b', { text: label }), el('small', { text: sub })])]);
    };
    var status = el('p', { class: 'muted small center', role: 'status' });
    var canvas = el('canvas', { class: 'postcard-canvas', width: 1080, height: 1350, 'aria-label': 'Your SMILE postcard' });
    var capOut = outputBox();
    var resultBox = el('div', { class: 'stack', hidden: true }, [
      canvas,
      el('div', { class: 'btn-row' }, [
        button('Save to Phone', 'save', { variant: 'green', onclick: function () { savePostcard(canvas, place); } }),
        button('Share', 'share', { variant: 'yellow', onclick: function () { sharePostcard(canvas, place); } })
      ]),
      button('Generate Caption', 'caption', { block: true, variant: 'blue', onclick: function (e) {
        var b = e.currentTarget;
        setBusy(b, true, 'Writing…');
        capOut.loading('Writing your caption…');
        Api.caption(place.name, 'proud, conquered challenge').then(function (r) { capOut.show(r.caption || ''); }, function (err) { capOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(b, false); });
      } }),
      capOut
    ]);
    var ok = button('OK, create postcard', 'sparkle', { block: true, variant: 'glow' });
    ok.addEventListener('click', function () {
      if (!photo) { toast('Take or choose a selfie first.'); file.querySelector('button').focus(); return; }
      if (mode === 'actual') { drawPostcard(canvas, photo.dataUrl, place).then(function () { resultBox.hidden = false; resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); return; }
      var o = outfit.value.trim();
      if (!o) { toast('Choose or type an outfit.'); outfit.focus(); return; }
      setBusy(ok, true, 'Creating…');
      status.textContent = 'Isidro is checking the outfit, then Meta AI is editing your photo. This can take up to a minute…';
      Api.photobooth({ user: Passport.name() || 'Guest', placeId: place.id, outfit: o, image: photo.dataUrl, mime: photo.mime }).then(function (r) {
        status.textContent = '';
        return drawPostcard(canvas, r.image, r.place || place).then(function () { resultBox.hidden = false; resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      }, function (err) { status.textContent = friendlyError(err); }).then(function () { setBusy(ok, false); });
    });

    Modal.open({
      title: 'AI Photobooth',
      name: 'photobooth',
      wide: true,
      body: el('div', { class: 'stack' }, [
        el('p', { class: 'pb-place' }, [icon('pin', 'icon--inline'), place.name + ' • ' + (place.barangay ? place.barangay + ', ' : '') + provinceName(provinceOf(place))]),
        el('div', { class: 'field' }, [el('span', { class: 'field__label', text: '1. Your selfie' }), file]),
        preview,
        el('fieldset', { class: 'stack' }, [el('legend', { class: 'field__label', text: '2. Outfit' }),
          radio('actual', 'Actual outfit', 'Use my photo as it is'),
          radio('ai', 'AI-generated outfit', 'Dress me up for this place')]),
        outfitBox,
        ok, status, resultBox
      ])
    });
  }

  function drawPostcard(canvas, src, place) {
    return Promise.all([getLogo(), new Promise(function (resolve, reject) {
      var img = new Image();
      if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image')); };
      img.src = src;
    })]).then(function (res) {
      var logo = res[0], img = res[1];
      var x = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
      var s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
      x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      var g = x.createLinearGradient(0, H - 420, 0, H);
      g.addColorStop(0, 'rgba(0,40,120,0)'); g.addColorStop(1, 'rgba(0,40,120,.94)');
      x.fillStyle = g; x.fillRect(0, H - 420, W, 420);
      // rainbow ribbon, like the poster
      ['#005BC1', '#FDB603', '#02A04F', '#FF6A03', '#ED0460'].forEach(function (c, i) { x.fillStyle = c; x.fillRect(i * W / 5, H - 14, W / 5, 14); });
      if (logo) {
        var lw = 230, lh = lw * logo.height / logo.width;
        x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 22; x.drawImage(logo, 36, 34, lw, lh); x.restore();
      }
      var f = '"Baloo 2", "Nunito", system-ui, sans-serif';
      x.fillStyle = '#FDB603'; x.font = '800 84px ' + f; x.fillText('SMILE ILOILO', 44, H - 220);
      x.fillStyle = '#fff'; x.font = '800 54px ' + f; x.fillText(String(place.name || 'Western Visayas').toUpperCase().slice(0, 28), 44, H - 150);
      x.font = '600 36px "Nunito", system-ui, sans-serif'; x.fillText(((place.barangay ? place.barangay + ', ' : '') + provinceName(provinceOf(place)) + ', Philippines').slice(0, 48), 44, H - 95);
      x.font = '700 28px "Nunito", system-ui, sans-serif'; x.fillText(new Date().toLocaleDateString('en-PH') + ' • #SMILEPH', 44, H - 46);
      x.save(); x.translate(W - 240, 230); x.rotate(-0.22);
      x.strokeStyle = '#ED0460'; x.lineWidth = 10; x.strokeRect(-190, -70, 380, 140);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(-190, -70, 380, 140);
      x.fillStyle = '#ED0460'; x.font = '800 60px ' + f; x.textAlign = 'center'; x.fillText('CONQUERED', 0, 22);
      x.restore();
    }, function () { toast('That photo could not be opened. Try another one.'); throw new Error('draw'); });
  }

  function savePostcard(canvas, place) {
    try {
      var a = document.createElement('a');
      a.download = 'SMILE-' + place.id + '-CONQUERED.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      toast('Saved!');
    } catch (e) { toast('Could not save this image. Long-press it to save instead.'); }
  }

  function sharePostcard(canvas, place) {
    try {
      canvas.toBlob(function (b) {
        if (!b) return savePostcard(canvas, place);
        var f = new File([b], 'SMILE-' + place.id + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f], text: 'I conquered ' + place.name + '! #SMILEPH' }).catch(function () { /* cancelled */ });
        } else savePostcard(canvas, place);
      }, 'image/png');
    } catch (e) { savePostcard(canvas, place); }
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------

  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, '');
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var query = {};
    if (qi >= 0) new URLSearchParams(raw.slice(qi + 1)).forEach(function (v, k) { query[k] = v; });
    var parts = path.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { parts: parts, query: query };
  }

  // Old one-page anchors (#isidro, #checkin, #board…) → new pages.
  var LEGACY = { home: '', passport: 'ranks', isidro: 'isidro', places: 'explore', myChallenges: 'explore', checkin: 'checkin', mailSec: 'checkin', adoptSec: 'postcards', captionSec: 'tools', merchantSec: 'shop', shop: 'shop', merchandise: 'shop', lguSec: 'tools', board: 'ranks' };

  var ROUTES = {
    '': renderHome,
    explore: renderExplore,
    isidro: renderIsidro,
    checkin: renderCheckin,
    postcards: renderPostcards,
    tools: renderTools,
    shop: renderShop,
    ranks: renderRanks
  };

  function route() {
    var legacy = location.hash.replace(/^#/, '');
    if (legacy && legacy.charAt(0) !== '/' && Object.prototype.hasOwnProperty.call(LEGACY, legacy)) {
      location.replace('#/' + LEGACY[legacy]);
      return;
    }
    var r = parseHash();
    var section = r.parts[0] || '';
    var token = ++renderToken;
    if (Camera.node) Camera.close(true);
    if (Modal.current) Modal.close(true);
    window.scrollTo(0, 0);
    renderNav();
    document.body.setAttribute('data-page', section || 'home');
    var fn = ROUTES[section];
    if (!fn) {
      setView(el('div', { class: 'state' }, [
        el('div', { class: 'state__icon' }, icon('compass')),
        el('h1', { class: 'state__title', text: 'Page not found' }),
        el('p', { text: 'That page is not on our map.' }),
        button('Go home', 'home', { href: '#/' })
      ]));
      return;
    }
    fn(token, r.query);
  }

  function hideSplash() {
    var s = $('#splash');
    if (!s) return;
    s.classList.add('is-gone');
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 500);
  }

  function init() {
    var d = $('#dateline');
    if (d) d.textContent = 'Western Visayas, Philippines · ' + manilaDate();
    if (State.demo) $('#demo-strip').hidden = false;
    decorateStaticIcons();
    Passport.paint();
    Install.init();

    // Postcard QR codes open ?place=…&code=… → send them to the check-in page.
    var u = new URLSearchParams(location.search);
    if (u.get('code') || u.get('place')) {
      var q = new URLSearchParams();
      if (u.get('place')) q.set('place', u.get('place'));
      if (u.get('code')) q.set('code', u.get('code'));
      history.replaceState(null, '', location.pathname + '#/checkin?' + q.toString());
    }

    window.addEventListener('hashchange', route);
    route();
    setTimeout(hideSplash, prefersReducedMotion() ? 0 : 1300);
    loadPlaces();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Exposed for automated tests only (no secrets here).
  window.SmileApp = { Camera: Camera, parsePostcardQR: parsePostcardQR, State: State, Passport: Passport, Install: Install, Modal: Modal, route: route, rankOf: rankOf };
})();
