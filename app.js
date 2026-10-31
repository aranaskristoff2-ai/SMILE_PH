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
  var PROVINCES = [ { "id": "aklan", "name": "Aklan", "sub": "Boracay · Kalibo", "color": "#0096C7", "icon": "drum" }, { "id": "antique", "name": "Antique", "sub": "San Jose · Tibiao · Culasi", "color": "#00A651", "icon": "boat" }, { "id": "capiz", "name": "Capiz", "sub": "Roxas City · Panay", "color": "#7B2CBF", "icon": "shell" }, { "id": "guimaras", "name": "Guimaras", "sub": "Jordan · Nueva Valencia", "color": "#E09A00", "icon": "mango" }, { "id": "iloilo", "name": "Iloilo", "sub": "Iloilo City · Miagao · Gigantes", "color": "#FF6B00", "icon": "headdress" }, { "id": "negros-occidental", "name": "Negros Occidental", "sub": "Bacolod · Silay · Talisay", "color": "#ED0460", "icon": "mask" }, { "id":  "negros-oriental", "name":  "Negros Oriental", "sub":  "Dumaguete · Apo Island · Manjuyod", "color":  "#0057D9", "icon":  "bunting" }, { "id":  "siquijor", "name":  "Siquijor", "sub":  "Lazi · San Juan · Maria", "color":  "#5B2A86", "icon":  "potion" } ];
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

  var ROTATING = ['landmarks.', 'beaches.', 'festivals.', 'food trips.', 'culture.', 'heritage streets.'];

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
    phone: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.12.37 2.32.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z',
    shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 5h2v4h4v2h-4v4h-2v-4H7v-2h4V7Z',
    hospital: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 4v3H7v4h3v3h4v-3h3v-4h-3V7h-4Z',
    clinic: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-1.5 5v3.5H7v3h3.5V17h3v-3.5H17v-3h-3.5V7h-3Z',
    paw: 'M7 8.5a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Zm10 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM4.2 13.4a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Zm15.6 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM12 11c3 0 6.2 4.6 6.2 7.2a2.6 2.6 0 0 1-3.1 2.5c-1.1-.2-2-.6-3.1-.6s-2 .4-3.1.6a2.6 2.6 0 0 1-3.1-2.5C5.8 15.6 9 11 12 11Z',
    pill: 'M4.6 12.4 12.4 4.6a5 5 0 0 1 7 7l-7.8 7.8a5 5 0 0 1-7-7Zm1.4 1.4a3 3 0 0 0 4.2 4.2l3.5-3.5-4.2-4.2L6 13.8Z',
    minus: 'M5 11h14v2H5v-2Z',
    plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
    bulb: 'M12 2a7 7 0 0 1 4 12.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3A7 7 0 0 1 12 2Zm-3 17h6v1.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5V19Z',
    calendar: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2ZM5 9v10h14V9H5Zm2 2h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-8 4h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Z',
    cutlery: 'M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22ZM7.5 5v5.2c0 .9.6 1.6 1.4 1.8V19h1.6v-7c.8-.2 1.4-.9 1.4-1.8V5h-1.2v4.5h-.8V5h-1.2v4.5h-.8V5H7.5Zm7.7 0c-1.3.4-2.2 2.2-2.2 4.6V14h1.6v5h1.6V5h-1Z',
    bag: 'M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm4.2 7V8a2.8 2.8 0 0 1 5.6 0v1h-1.4V8a1.4 1.4 0 0 0-2.8 0v1H9.2ZM6.5 10l-.8 8.5h12.6l-.8-8.5H6.5Z',
    rstamp: 'M10 2h4a2 2 0 0 1 2 2c0 2.2-1.6 3.6-1.6 6H17a3 3 0 0 1 3 3v2H4v-2a3 3 0 0 1 3-3h2.6C9.6 7.6 8 6.2 8 4a2 2 0 0 1 2-2ZM4 17h16v4H4v-4Z',
    people: 'M12 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm-7 2.5a2.6 2.6 0 1 1 0 5.2A2.6 2.6 0 0 1 5 6Zm14 0a2.6 2.6 0 1 1 0 5.2A2.6 2.6 0 0 1 19 6ZM12 12c3.6 0 6.2 2.1 6.2 4.8V21H5.8v-4.2C5.8 14.1 8.4 12 12 12Zm-7 .4c.6 0 1.1.1 1.6.2a5.5 5.5 0 0 0-2.3 4.2V21H0v-4.4c0-2.4 2.2-4.2 5-4.2Zm14 0c2.8 0 5 1.8 5 4.2V21h-4.3v-4.2a5.5 5.5 0 0 0-2.3-4.2c.5-.1 1-.2 1.6-.2Z',
    badge: 'M12 2l2.4 1.6 2.9-.1.9 2.7 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.7-2.9-.1L12 20l-2.4-1.6-2.9.1-.9-2.7-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.7 2.9.1L12 2Zm0 4.5 1.6 3.2 3.5.5-2.6 2.5.6 3.5L12 14.5l-3.1 1.7.6-3.5-2.6-2.5 3.5-.5L12 6.5Z',
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
    drum: 'M4 8.2c0-1.8 3.6-3.2 8-3.2s8 1.4 8 3.2v8.6c0 1.8-3.6 3.2-8 3.2s-8-1.4-8-3.2V8.2Zm2 0c0 .8 2.7 1.5 6 1.5s6-.7 6-1.5-2.7-1.5-6-1.5-6 .7-6 1.5Zm1.2 4.3 2 4.8h1.5l2-4.8h-1.6l-1.2 3-1.1-3H7.2Zm7.4 0 2 4.8 2-4.8h-1.5l-.5 1.4-.5-1.4h-1.5Z M2.6 1.6l4.9 2.6-.5.9-4.9-2.6.5-.9Zm18.8 0 .5.9-4.9 2.6-.5-.9 4.9-2.6Z',
    boat: 'M2.5 15.5h19l-2.6 4.5H5.1l-2.6-4.5Z M11 2.5h1.5v12H11v-12Z M13.2 4.2l6.6 9.3h-6.6V4.2Z M10.3 6.3 5 13.5h5.3V6.3Z',
    fireworks: 'M12 1.5 13.38 8.67 19.42 4.58 15.33 10.62 22.5 12 15.33 13.38 19.42 19.42 13.38 15.33 12 22.5 10.62 15.33 4.58 19.42 8.67 13.38 1.5 12 8.67 10.62 4.58 4.58 10.62 8.67Z M12 10.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z',
    mango: 'M12.3 7.4c4.5 0 8.2 3.3 8.2 7.5 0 3.8-3 6.6-6.9 6.6-4.8 0-9.6-3.6-9.6-8.2 0-3.5 3.6-5.9 8.3-5.9Z M11.8 6.6c.3-1.9 1.3-3.3 3.1-4.1l.6 1c-1.4.7-2.2 1.8-2.4 3.2l-1.3-.1Z M16.1 3.6c2-.9 4.1-.6 5.3.5-1 1.8-3.1 2.5-5.1 2-.4-.8-.5-1.7-.2-2.5Z',
    headdress: 'M7.59 16.44 3.89 12.66 -1.14 10.99 2.56 14.78Z M9.48 14.65 8.08 9.54 4.49 5.64 5.89 10.75Z M12 14 13.25 8.85 12 3.7 10.75 8.85Z M14.52 14.65 18.11 10.75 19.51 5.64 15.92 9.54Z M16.41 16.44 21.44 14.78 25.14 10.99 20.11 12.66Z M5.5 17.6h13a1.2 1.2 0 0 1 1.2 1.2v1.6a1.2 1.2 0 0 1-1.2 1.2h-13a1.2 1.2 0 0 1-1.2-1.2v-1.6a1.2 1.2 0 0 1 1.2-1.2Z',
    mask: 'M12 3c5.2 0 9 3.1 9 8.6C21 17 16.9 21 12 21s-9-4-9-9.4C3 6.1 6.8 3 12 3Zm-5.6 7.3 3.8-1.3 1 2.3-3.9.8-.9-1.8Zm11.2 0-3.8-1.3-1 2.3 3.9.8.9-1.8ZM7.6 14.2h8.8c-.6 2.5-2.3 3.9-4.4 3.9s-3.8-1.4-4.4-3.9Z',
    bunting: 'M2 4.5h20V6H2V4.5Z M3 7h4.2L5.1 12.4 3 7Z M8.6 7h4.2l-2.1 5.4L8.6 7Z M14.2 7h4.2l-2.1 5.4L14.2 7Z M19.8 7H22v1.2l-1.2 3.1-1-4.3Z M5 13.5h4.2l-2.1 5.4L5 13.5Z M10.9 13.5h4.2L13 18.9l-2.1-5.4Z M16.8 13.5H21l-2.1 5.4-2.1-5.4Z',
    potion: 'M9.5 2h5v2h-1.2v3.1c3 .9 5.2 3.7 5.2 7 0 4.1-3.1 7.4-6.5 7.4S5.5 18.2 5.5 14.1c0-3.3 2.2-6.1 5.2-7V4H9.5V2Zm2.3 8.6c-.5 2.4.4 4.3 2.6 5.1.6-2.4-.4-4.3-2.6-5.1Zm-1.6 3c-1.8.5-2.6 1.9-2.2 3.6 1.7-.3 2.6-1.6 2.2-3.6Z',
    shell: 'M12 19.4 1.54 14.98 1.84 14.59 2.13 14.22 2.39 13.84 2.6 13.44 2.77 13.02 2.89 12.56 2.97 12.07 3.04 11.54 3.1 10.99 3.48 10.75 3.84 10.5 4.18 10.25 4.48 9.96 4.74 9.62 4.96 9.23 5.16 8.8 5.34 8.32 5.53 7.83 5.95 7.75 6.36 7.66 6.74 7.55 7.09 7.4 7.42 7.18 7.72 6.9 8.01 6.57 8.3 6.19 8.6 5.8 9.02 5.89 9.42 5.97 9.81 6.02 10.18 6.01 10.54 5.94 10.9 5.79 11.26 5.59 11.62 5.35 12 5.1 12.38 5.35 12.74 5.59 13.1 5.79 13.46 5.94 13.82 6.01 14.19 6.02 14.58 5.97 14.98 5.89 15.4 5.8 15.7 6.19 15.99 6.57 16.28 6.9 16.58 7.18 16.91 7.4 17.26 7.55 17.64 7.66 18.05 7.75 18.47 7.83 18.66 8.32 18.84 8.8 19.04 9.23 19.26 9.62 19.52 9.96 19.82 10.25 20.16 10.5 20.52 10.75 20.9 10.99 20.96 11.54 21.03 12.07 21.11 12.56 21.23 13.02 21.4 13.44 21.61 13.84 21.87 14.22 22.16 14.59 22.46 14.98Z M9.41 16.95 4.21 12.57 4.59 11.88Z M10.12 16.03 6.21 9.77 6.74 9.27Z M11.01 15.44 8.79 7.92 9.41 7.65Z M12 15.24 11.67 7.19 12.33 7.19Z M12.99 15.44 14.59 7.65 15.21 7.92Z M13.88 16.03 17.26 9.27 17.79 9.77Z M14.59 16.95 19.41 11.88 19.79 12.57Z M8.4 19.9h7.2l1.3 2.6H7.1l1.3-2.6Z',
    mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z',
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
      el('button', { type: 'submit', class: 'btn btn--block' }, [icon('check'), 'Save and continue']),
      el('p', { class: 'muted small center' }, ['Want to keep a travel journal? ', el('a', { href: '#', text: 'Sign in or create an account', onclick: function (e) { e.preventDefault(); Auth.open('signup', function (u) { then(u.name); }); } })])
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

  // Directions open Google Maps with the blue route already drawn (phone and desktop). The destination is the
  // place's name from its maps link (more exact than our pin), or its pin. When the app already knows where the
  // traveler is (Near me), that becomes the start, so desktop browsers draw the route too.
  function routeDest(p) {
    var u = String((p && p.maps_url) || '');
    var m = u.match(/[?&](?:query|destination)=([^&]+)/);
    if (m) { try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { /* use the pin */ } }
    if (p && hasLatLng(p)) return Number(p.lat) + ',' + Number(p.lng);
    return p && p.name ? p.name + ', ' + provinceName(provinceOf(p)) + ', Philippines' : '';
  }
  function routeUrl(dest) {
    var url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest);
    var h = typeof Geo !== 'undefined' && Geo.here && Date.now() - Geo.here.t < 15 * 60000 ? Geo.here : null;
    if (h) url += '&origin=' + encodeURIComponent(h.lat.toFixed(5) + ',' + h.lng.toFixed(5));
    return url;
  }
  function mapsUrl(p) { return routeUrl(routeDest(p)); }
  /** Turns a link-button into a route button (blue line in Google Maps). */
  function routeButton(btn, dest) { btn.setAttribute('href', routeUrl(dest)); btn.setAttribute('data-route', dest); btn.setAttribute('rel', 'noopener'); return btn; }
  // Links marked data-route get the freshest start point at the moment they are tapped.
  // If the app does not know where the traveler is yet, it asks first (desktop browsers often do not tell
  // Google Maps), then opens the route with that start point, so the blue line is always drawn.
  function openRoute(dest) {
    var fresh = typeof Geo !== 'undefined' && Geo.here && Date.now() - Geo.here.t < 15 * 60000;
    if (fresh || typeof Geo === 'undefined' || !Geo.supported()) { window.open(routeUrl(dest), '_blank', 'noopener'); return; }
    var win = null;
    try { win = window.open('', '_blank'); } catch (err) { win = null; }
    if (win) { try { win.document.title = 'Opening the route…'; win.document.body.textContent = 'Finding your location for the route…'; } catch (err) { /* ignore */ } }
    var go = function () { var u = routeUrl(dest); if (win && !win.closed) win.location.href = u; else window.location.href = u; };
    Geo.get().then(go, go);
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-route]') : null;
    if (!a || e.defaultPrevented) return;
    e.preventDefault();
    openRoute(a.getAttribute('data-route'));
  }, true);

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
      openRoute(routeDest(p));
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
      routeButton(button('Directions', 'map', { variant: 'blue', href: '#', target: '_blank' }), routeDest(p)),
      button('Check-In', 'qr', { variant: 'green', href: '#/checkin?place=' + encodeURIComponent(p.id) }),
      button('Photobooth', 'camera', { variant: 'orange', onclick: function () { openPhotobooth(p.id); } }),
      mediaButton('place', p.id, p.name, false)
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
      mediaStrip('place', p.id, p.name),
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
    { key: 'hub', href: '#/hub', text: 'Hub', icon: 'heart' },
    { key: 'shop', href: '#/shop', text: 'Shop', icon: 'shop' }
  ];

  // Phone tab bar, as in the SMILE app design.
  var TABS = [
    { key: '', href: '#/', text: 'Home', icon: 'home' },
    { key: 'explore', href: '#/explore', text: 'Map', icon: 'map' },
    { key: 'checkin', href: '#/checkin', text: 'Camera', icon: 'camera' },
    { key: 'isidro', href: '#/isidro', text: 'Isidro', icon: 'compass', main: true },
    { key: 'hub', href: '#/hub', text: 'Hub', icon: 'heart' },
    { key: 'ranks', href: '#/ranks', text: 'Badges', icon: 'badge' },
    { key: 'me', href: '#/me', text: 'Profile', icon: 'user' }
  ];

  function renderNav() {
    var section = parseHash().parts[0] || '';
    ['#mainnav', '#tabbar'].forEach(function (sel) {
      var nav = $(sel);
      if (!nav) return;
      nav.textContent = '';
      (sel === '#tabbar' ? TABS : NAV).forEach(function (n) {
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
    var h = Array.prototype.filter.call(view().querySelectorAll('h1'), function (x) { return x.getClientRects().length > 0; })[0];
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
    var pv = provinceInfo(currentProvince());
    var tile = function (ic, color, label, sub, href, i) {
      return el('li', { class: 'home-tile reveal', style: '--c:' + color + ';--d:' + (i * 50) + 'ms' }, [
        el('a', { href: href, class: 'home-tile__link' }, [
          el('span', { class: 'home-tile__icon' }, icon(ic)),
          el('span', { class: 'home-tile__label' }, [label, el('br'), sub])
        ])
      ]);
    };
    var dest = function (id, img, label, i) {
      return el('li', { class: 'dest reveal', style: '--d:' + (i * 70) + 'ms' }, [
        el('button', { type: 'button', class: 'dest__btn', onclick: function () { openPlace(id); } }, [
          el('img', { class: 'dest__img', src: 'assets/dest-' + img + '.webp', alt: '', width: 150, height: 164, loading: 'lazy' }),
          el('span', { class: 'dest__name', text: label })
        ])
      ]);
    };

    setView([
      // Desktop: the poster hero with pins and the rotating word (as before).
      el('section', { class: 'hero home-desktop', 'aria-labelledby': 'hero-h' }, [
        el('div', { class: 'hero__bg', 'aria-hidden': 'true' }),
        el('div', { class: 'hero__grid' }, [
          el('div', { class: 'hero__art anim-pop', style: '--d:120ms' }, [
            el('div', { class: 'poster-frame poster-frame--isidro' }, [
              el('picture', null, [
                el('source', { srcset: 'assets/home-hero.webp', type: 'image/webp' }),
                el('img', { class: 'poster-frame__img', src: 'assets/home-hero.jpg', alt: 'SMILE, See More of Islands’ Landmarks and Events, Western Visayas and Negros Island Region. Meet Isidro, your AI tour guide: talk to me and plan your day in English, Tagalog or Hiligaynon.', width: 714, height: 697, loading: 'lazy' })
              ]),
              el('span', { class: 'poster-frame__shine', 'aria-hidden': 'true' }),
              el('a', { class: 'home-hero__isidro', href: '#/isidro', 'aria-label': 'Talk to Isidro, your AI tour guide' }, [
                el('span', { class: 'home-hero__mic', 'aria-hidden': 'true' }, icon('mic'))
              ])
            ]),
            el('p', { class: 'hero__hint' }, [icon('mic', 'icon--inline'), 'Tap Isidro to plan your day'])
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

      // Phones: the app-style hero, tiles and featured destinations.
      el('section', { class: 'home-hero home-mobile', 'aria-labelledby': 'hero-h-m' }, [
        el('button', { type: 'button', class: 'hero-sos', 'aria-label': 'Emergency hotlines', onclick: function () { Hotline.open(); } }, [icon('phone'), el('span', { text: 'Hotline' })]),
        el('h1', { id: 'hero-h-m', class: 'sr-only', text: 'SMILE: See More of Islands’ Landmarks and Events. Western Visayas and the Negros Island Region.' }),
        el('div', { class: 'home-hero__art anim-pop' }, [
          el('picture', null, [
            el('source', { srcset: 'assets/home-hero.webp', type: 'image/webp' }),
            el('img', { class: 'home-hero__img', src: 'assets/home-hero.jpg', alt: 'SMILE, See More of Islands’ Landmarks and Events, Western Visayas and Negros Island Region. Meet Isidro, your AI tour guide: talk to me and plan your day in English, Tagalog or Hiligaynon.', width: 714, height: 697 })
          ]),
          el('a', { class: 'home-hero__isidro', href: '#/isidro', 'aria-label': 'Talk to Isidro, your AI tour guide' }, [
            el('span', { class: 'home-hero__mic', 'aria-hidden': 'true' }, icon('mic'))
          ])
        ])
      ]),

      el('div', { class: 'home-sheet home-mobile' }, [
        el('nav', { 'aria-label': 'What do you want to do?' }, [
          el('ul', { class: 'home-tiles' }, [
            tile('pin', '#02A04F', 'Explore', 'Landmarks', '#/explore?cat=landmark', 0),
            tile('calendar', '#E2141E', 'Events &', 'Festivals', '#/events', 1),
            tile('cutlery', '#FF6A03', 'Eats &', 'Food Trips', '#/explore?cat=food', 2),
            tile('bag', '#1F5FE0', 'Shops &', 'Pasalubong', '#/shop', 3),
            tile('camera', '#7B2CBF', 'Visit & Earn', '(Camera)', '#/checkin', 4),
            tile('rstamp', '#E2141E', 'Postcards', '& Stamps', '#/postcards', 5),
            tile('trophy', '#8A2BE2', 'My Badges', 'E to SSS', '#/ranks', 6),
            tile('people', '#ED0460', 'Leaderboard', pv ? pv.name : 'Western Visayas', '#/ranks', 7)
          ])
        ]),
        el('section', { class: 'home-dest', 'aria-labelledby': 'dest-h' }, [
          el('div', { class: 'row-between' }, [
            el('h2', { id: 'dest-h', class: 'home-dest__title', text: 'Featured Destinations' }),
            el('a', { class: 'home-dest__all', href: '#/explore', text: 'See All' })
          ]),
          el('ul', { class: 'dest-row' }, [
            dest('miagao-church', 'miagao', 'Miag-ao Church', 0),
            dest('gigantes', 'carles', 'Carles Islands', 1),
            dest('balay-negrense', 'silay', 'Silay Heritage Houses', 2),
            dest('mt-kanlaon', 'kanlaon', 'Mt. Kanlaon', 3)
          ])
        ])
      ]),

      el('section', { class: 'section', id: 'home-provinces', 'aria-labelledby': 'prov-h' }, [
        el('h2', { id: 'prov-h', class: 'section__title reveal', text: 'Where are you exploring?' }),
        el('p', { class: 'muted reveal', text: 'Pick a province to see its landmarks, festivals, food trips and shops. You can switch any time.' }),
        provincePicker(function () { location.hash = '#/explore'; })
      ]),

      el('section', { class: 'section', 'aria-labelledby': 'fest-h' }, [
        el('div', { class: 'row-between' }, [
          el('h2', { id: 'fest-h', class: 'section__title reveal' }, [icon('festival'), ' Festivals coming up']),
          button('Full calendar', 'festival', { small: true, variant: 'light', href: '#/events' })
        ]),
        el('div', { class: 'fest-strip' }, upcomingEvents(3).map(function (ev, i) {
          var p = findPlace(ev.place);
          if (!p) return null;
          var pv = provinceInfo(provinceOf(p)) || { color: '#ED0460', name: '' };
          var d = nextEventDate(ev);
          return el('a', { class: 'fest-chip reveal', href: '#/events?month=' + (d ? d.getUTCMonth() + 1 : ev.months[0]), style: '--c:' + pv.color + ';--d:' + (i * 80) + 'ms' }, [
            el('b', { text: p.name }),
            el('span', { text: (d ? (ev.approx ? 'About ' : '') + fmtDay(d) : ev.when) + ' • ' + pv.name })
          ]);
        }))
      ]),

      el('div', { class: 'section stack-lg', id: 'home-passport' }, [passportCard(false), stampAlbum()]),

      el('section', { class: 'section home-desktop', 'aria-labelledby': 'what-h' }, [
        el('h2', { id: 'what-h', class: 'section__title reveal', text: 'Everything you can do with SMILE' }),
        el('ul', { class: 'feature-grid' }, [
          feature('guide', '#FF6B00', 'Ask Isidro', 'Your AI guide plans your day in any province, in Hiligaynon, English or Tagalog.', '#/isidro', 0),
          feature('trophy', '#ED0460', 'Accept challenges', 'Pick a landmark, festival or food stop, and get directions in Google Maps.', '#/explore', 1),
          feature('qr', '#00A651', 'One-use QR check-in', 'Scan your SMILE postcard at the place to collect a stamp and points.', '#/checkin', 2),
          feature('camera', '#7B2CBF', 'AI Photobooth', 'Turn a selfie into a "CONQUERED" postcard, with your outfit or an AI one.', '#/explore', 3),
          feature('mailbox', '#0057D9', 'Mail across PH', 'Paste a PhilPost stamp and mail it. It travels to a surprise destination.', '#/postcards', 4),
          feature('star', '#FDB603', 'Rank E to SSS', 'Every stamp counts. Climb the leaderboard with fellow explorers.', '#/ranks', 5),
          feature('mic', '#ED0460', 'Travel journal & SMILE Hub', 'Say your story out loud, add a selfie and a clip, and share it with your rank on the SMILE Hub.', '#/hub', 7),
          feature('shop', '#02A04F', 'Pasalubong & souvenirs', 'Biscocho, butterscotch, shirts and crafts from local stores and nano entrepreneurs.', '#/shop', 6)
        ])
      ]),

      el('section', { class: 'section section--tint', 'aria-labelledby': 'how-h' }, [
        el('p', { class: 'eyebrow reveal', text: 'The post office is back, and it is an adventure' }),
        el('h2', { id: 'how-h', class: 'section__title reveal', text: 'Your postal adventure' }),
        el('p', { class: 'muted reveal', text: 'Every postcard is a quest. Every mailbox is a finish line.' }),
        el('ol', { class: 'how-steps' }, [
          ['postcard', 'Grab your postcard', 'Buy an official SMILE postcard, stamp included, from an authorized SMILE merchant. It is your game piece.'],
          ['trophy', 'Take the challenge', 'Pick a landmark, festival or food stop and follow the map.'],
          ['qr', 'Scan and collect', 'Scan your postcard at the place to earn its stamp and points.'],
          ['mailbox', 'Mail it at the post office', 'Isidro shows you the nearest post office. Drop your postcard there: quest complete!'],
          ['heart', 'Adopt one', 'Pick a random postcard from the SMILE box at the post office, adopt it and follow that traveler\'s journey.'],
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
        ]),
        el('a', { class: 'card promo promo--pink reveal', style: '--d:200ms', href: '#/hub' }, [
          el('span', { class: 'promo__icon' }, icon('mic')),
          el('h3', { text: 'Travel journal & SMILE Hub' }),
          el('p', { text: 'Say your story out loud and share it with your rank.' })
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
        el('div', { class: 'btn-row' }, [button('Festival calendar', 'festival', { small: true, variant: 'light', href: '#/events' }), button('Ask Isidro', 'compass', { small: true, variant: 'light', href: '#/isidro' })]),
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
    Promise.all([loadPlaces(), loadShops(), loadMedia()]).then(function () { if (token === renderToken) paint(); });
  }

  // ---------------------------------------------------------------------------
  // Isidro: chat with memory (Muse Spark). Follow-ups work; picks become place cards.
  // The conversation is kept for this browser tab only (sessionStorage).
  // ---------------------------------------------------------------------------

  var ISIDRO_KEY = 'smile.isidro.chat';
  function loadChat() {
    try { var v = JSON.parse(window.sessionStorage.getItem(ISIDRO_KEY) || '[]'); return Array.isArray(v) ? v.slice(-30) : []; }
    catch (e) { return []; }
  }
  function saveChat(list) { try { window.sessionStorage.setItem(ISIDRO_KEY, JSON.stringify(list.slice(-30))); } catch (e) { /* optional */ } }

  /** Small place card inside a chat reply. */
  function miniPlaceCard(p, km) {
    var c = catOf(p);
    return el('article', { class: 'mini-place' }, [
      el('button', { type: 'button', class: 'mini-place__main', onclick: function () { openPlace(p.id); } }, [
        el('span', { class: 'card-icon card-icon--sm', style: 'background:' + c.color }, icon(c.icon)),
        el('span', { class: 'mini-place__text' }, [
          el('b', { text: p.name }),
          el('small', { text: (p.barangay ? p.barangay + ', ' : '') + provinceName(provinceOf(p)) + ' • +' + (p.points || 0) + ' pts' })
        ]),
        isFinite(km) ? el('span', { class: 'dist-badge', text: kmText(km) }) : null
      ]),
      el('div', { class: 'btn-row' }, [
        button(Passport.hasAccepted(p.id) ? 'Go now' : 'Accept', Passport.hasAccepted(p.id) ? 'route' : 'trophy', { small: true, onclick: function () { acceptChallenge(p.id); } }),
        mediaButton('place', p.id, p.name)
      ])
    ]);
  }

  // ---------------------------------------------------------------------------
  // GPS "near me": the phone's location, asked only when the traveler taps the pin. Never saved.
  // ---------------------------------------------------------------------------
  var Geo = {
    here: null,
    supported: function () { return !!(window.navigator && window.navigator.geolocation); },
    get: function () {
      return new Promise(function (resolve, reject) {
        if (!Geo.supported()) { reject(new Error('This browser cannot share your location.')); return; }
        window.navigator.geolocation.getCurrentPosition(function (pos) {
          Geo.here = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy || 0), t: Date.now() };
          resolve(Geo.here);
        }, function (e) {
          reject(new Error(e && e.code === 1 ? 'Location is blocked. Allow location for this site in your browser settings, then tap the pin again.' : 'We could not find you. Turn on GPS or location, step outside if you can, and try again.'));
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
      });
    },
    /** A location from the last 2 minutes, or a new one. */
    fresh: function () { return Geo.here && Date.now() - Geo.here.t < 120000 ? Promise.resolve(Geo.here) : Geo.get(); }
  };
  function distKm(a, b) {
    var t = Math.PI / 180, dLa = (b.lat - a.lat) * t, dLn = (b.lng - a.lng) * t;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function kmText(km) { return km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : (km < 10 ? km.toFixed(1) : String(Math.round(km))) + ' km'; }
  function hasLatLng(x) { return x && isFinite(Number(x.lat)) && isFinite(Number(x.lng)) && !(Number(x.lat) === 0 && Number(x.lng) === 0) && x.lat !== '' && x.lat != null; }
  // Approximate locations of the built-in shops (the server sends exact pins when merchants add them).
  var SHOP_COORDS = {
    'biscocho-haus': [10.7225, 122.5583], 'bongbongs-piaya': [10.6730, 122.9530], 'trappist-gift-shop': [10.6290, 122.6070],
    'sans-rival-dumaguete': [9.3080, 123.3080], 'dela-cruz-pina': [11.7070, 122.3660], 'dtalipapa': [11.9600, 121.9260],
    'bagtason-weavers': [11.0450, 122.0650], 'roxas-market': [11.5870, 122.7510], 'jordan-wharf-stalls': [10.6580, 122.5930],
    'panaderia-de-molo': [10.6970, 122.5450], 'deocampo-barquillos': [10.7200, 122.5600], 'pendys': [10.6760, 122.9560],
    'merci-pasalubong': [10.6740, 122.9500], 'siquijor-market': [9.2140, 123.5150]
  };
  function shopLatLng(s) {
    if (hasLatLng(s)) return { lat: Number(s.lat), lng: Number(s.lng) };
    var c = SHOP_COORDS[s.shop_id];
    return c ? { lat: c[0], lng: c[1] } : null;
  }
  var NEAR_KINDS = [
    { key: 'all', label: 'Everything', icon: 'compass', ask: 'What is good near me right now?', cats: null },
    { key: 'food', label: 'Eats', icon: 'cutlery', ask: 'Where can I eat near me?', cats: ['food'] },
    { key: 'landmark', label: 'Landmarks', icon: 'church', ask: 'What landmarks are near me?', cats: ['landmark', 'heritage', 'nature'] },
    { key: 'event', label: 'Events', icon: 'festival', ask: 'What festivals and events are near me?', cats: ['festival'] },
    { key: 'shop', label: 'Shops', icon: 'bag', ask: 'Where can I buy pasalubong near me?', cats: [] },
    { key: 'inn', label: 'Inns', icon: 'home', ask: 'Where can I stay near me?', cats: ['stay'] },
    { key: 'postoffice', label: 'Post office', icon: 'mailbox', ask: 'Where is the nearest post office to mail my SMILE postcard?', cats: [] }
  ];
  /** Nearest places and shops worked out on the phone (used when the AI is busy or offline). */
  function localNearest(here, kind) {
    var k = NEAR_KINDS.filter(function (n) { return n.key === kind; })[0] || NEAR_KINDS[0];
    var dist = {};
    var places = (k.key === 'shop' || k.key === 'postoffice') ? [] : State.places.filter(function (p) { return hasLatLng(p) && (!k.cats || k.cats.indexOf(p.cat) !== -1); })
      .map(function (p) { dist[p.id] = distKm(here, { lat: Number(p.lat), lng: Number(p.lng) }); return p; })
      .sort(function (a, b) { return dist[a.id] - dist[b.id]; }).slice(0, 3);
    var shops = (k.key === 'all' || k.key === 'shop') ? (State.shops || []).map(function (s) { var ll = shopLatLng(s); return ll ? { shop_id: s.shop_id, name: s.name, type: s.type, barangay: s.barangay, maps_url: s.maps_url, distance_km: distKm(here, ll) } : null; })
      .filter(function (s) { return s && s.distance_km <= 30; }).sort(function (a, b) { return a.distance_km - b.distance_km; }).slice(0, k.key === 'shop' ? 5 : 3) : [];
    return { places: places, dist: dist, shops: shops };
  }
  /** Registered SMILE post offices (Hotlines sheet, type postoffice), loaded once. */
  var postOfficesCache = null;
  function loadPostOffices() {
    if (postOfficesCache) return Promise.resolve(postOfficesCache);
    return Api.hotlines('').then(function (r) {
      postOfficesCache = (r.hotlines || []).filter(function (h) { return h.type === 'postoffice' && hasLatLng(h); });
      return postOfficesCache;
    }, function () { return []; });
  }
  function nearestPostOffices(here, list) {
    return (list || []).map(function (o) { var c = Object.assign({}, o); c.distance_km = distKm(here, { lat: Number(o.lat), lng: Number(o.lng) }); return c; })
      .filter(function (o) { return o.distance_km <= 30; }).sort(function (x, y) { return x.distance_km - y.distance_km; }).slice(0, 3);
  }
  /** A post office card in Isidro's answer: name, address, distance and the blue route. */
  function miniPostOfficeCard(o) {
    return el('article', { class: 'mini-place' }, [
      el('div', { class: 'mini-place__main' }, [
        el('span', { class: 'card-icon card-icon--sm', style: 'background:#0057D9' }, icon('mailbox')),
        el('span', { class: 'mini-place__text' }, [el('b', { text: o.name }), el('small', { text: [o.address, o.notes].filter(Boolean).join(' • ') })]),
        isFinite(o.distance_km) ? el('span', { class: 'dist-badge', text: kmText(o.distance_km) }) : null
      ]),
      el('div', { class: 'btn-row' }, [routeButton(button('Directions', 'route', { small: true, variant: 'blue', href: '#', target: '_blank' }), Number(o.lat) + ',' + Number(o.lng))])
    ]);
  }
  function postOfficeUrl(here) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('post office near ' + here.lat.toFixed(4) + ',' + here.lng.toFixed(4)); }
  function innSearchUrl(here) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('inns hotels near ' + here.lat.toFixed(4) + ',' + here.lng.toFixed(4)); }

  /** A nearby shop in Isidro's answer: name, distance and directions. */
  function miniShopCard(s) {
    var t = SHOP_TYPES[s.type] || SHOP_TYPES.other || { label: 'Shop' };
    return el('article', { class: 'mini-place' }, [
      el('a', { class: 'mini-place__main', href: '#/shop' }, [
        el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('shop')),
        el('span', { class: 'mini-place__text' }, [
          el('b', { text: s.name }),
          el('small', { text: (t.label || 'Shop') + (s.barangay ? ' • ' + s.barangay : '') })
        ]),
        isFinite(s.distance_km) ? el('span', { class: 'dist-badge', text: kmText(s.distance_km) }) : null
      ]),
      el('div', { class: 'btn-row' }, [
        routeButton(button('Directions', 'route', { small: true, variant: 'light', href: '#', target: '_blank' }), routeDest(s))
      ])
    ]);
  }

  /** Offline answer: places whose words match the question (used in demo mode or when the AI is down). */
  function localPicks(text, pool) {
    var words = String(text || '').toLowerCase().split(/[^a-zñ]+/).filter(function (w) { return w.length > 3; });
    var scored = pool.map(function (p) {
      var hay = (p.name + ' ' + p.cat + ' ' + (p.desc || '') + ' ' + (p.barangay || '')).toLowerCase();
      return { p: p, n: words.filter(function (w) { return hay.indexOf(w) !== -1; }).length };
    }).sort(function (a, b) { return b.n - a.n; });
    return scored.slice(0, 3).map(function (x) { return x.p; });
  }

  function renderIsidro(token, query) {
    var lang = el('select', { id: 'isidro-lang' }, [
      el('option', { value: 'hil', text: 'Hiligaynon' }), el('option', { value: 'en', text: 'English' }), el('option', { value: 'tl', text: 'Tagalog' })
    ]);
    lang.value = storageGet('smile.lang') || 'hil';
    lang.addEventListener('change', function () { storageSet('smile.lang', lang.value); });
    var prov = el('select', { id: 'isidro-province' }, [el('option', { value: '', text: 'Anywhere' })].concat(PROVINCES.map(function (p) { return el('option', { value: p.id, text: p.name }); })));
    prov.value = currentProvince();
    prov.addEventListener('change', function () { if (prov.value) setProvince(prov.value); });

    var msgs = loadChat();
    var log = el('div', { class: 'chat', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with Isidro' });
    var q = el('textarea', { id: 'isidro-q', rows: '2', maxlength: '500', placeholder: 'Ask Isidro anything: a day plan, food, festivals, how to get there…', 'aria-label': 'Your message to Isidro' });
    var send = button('Send', 'send', { type: 'submit', variant: 'glow' });
    var avatar = function () { return el('span', { class: 'chat__avatar', 'aria-hidden': 'true' }, el('img', { src: 'assets/isidro-64.webp', alt: '', width: 64, height: 64 })); };
    var typing = el('div', { class: 'chat__row' }, [avatar(), el('div', { class: 'chat__bubble chat__typing', 'aria-label': 'Isidro is typing' }, [el('span'), el('span'), el('span')])]);

    var bubble = function (m) {
      var mine = m.role === 'user';
      var places = (m.places || []).map(findPlace).filter(Boolean);
      var dist = m.dist || {};
      return el('div', { class: 'chat__row' + (mine ? ' chat__row--me' : '') }, [
        mine ? null : avatar(),
        el('div', { class: 'chat__bubble' + (m.error ? ' chat__bubble--warn' : '') }, [
          m.near && mine ? el('span', { class: 'near-tag' }, [icon('pin', 'icon--inline'), 'Near me']) : null,
          el('p', { class: 'chat__text', text: m.content }),
          places.length ? el('div', { class: 'chat__places' }, places.map(function (p) { return miniPlaceCard(p, dist[p.id]); })) : null,
          m.shops && m.shops.length ? el('div', { class: 'chat__places' }, m.shops.map(miniShopCard)) : null,
          m.inn ? button('Find inns and hotels near me', 'map', { small: true, variant: 'light', href: m.inn, target: '_blank' }) : null,
          m.pos && m.pos.length ? el('div', { class: 'chat__places' }, m.pos.map(miniPostOfficeCard)) : null,
          m.po ? button(m.pos && m.pos.length ? 'More post offices on the map' : 'Nearest post office on the map', 'mailbox', { small: true, variant: m.pos && m.pos.length ? 'light' : 'blue', href: m.po, target: '_blank' }) : null
        ])
      ]);
    };
    var paint = function (busy) {
      log.textContent = '';
      if (!msgs.length) {
        log.appendChild(bubble({ role: 'assistant', content: 'Maayong adlaw! Ako si Isidro. Tell me where you are, how much time you have and what you love, and I will plan your SMILE adventure. You can ask follow-up questions too, like "and where do we eat after?"' }));
      }
      msgs.forEach(function (m) { log.appendChild(bubble(m)); });
      if (busy) log.appendChild(typing);
      log.scrollTop = log.scrollHeight;
    };

    var nearOn = false;
    var ask = function (text, kind) {
      text = String(text || '').trim();
      if (!text) { q.focus(); toast('Type a question for Isidro first.'); return; }
      var history = msgs.filter(function (m) { return !m.error; }).slice(-10).map(function (m) { return { role: m.role, content: m.content }; });
      var useNear = nearOn || !!kind;
      msgs.push({ role: 'user', content: text, near: useNear });
      q.value = '';
      saveChat(msgs);
      paint(true);
      setBusy(send, true, '…');
      var here = null;
      (useNear ? Geo.fresh().then(function (h) { here = h; return h; }, function (err) { toast(err.message); return null; }) : Promise.resolve(null)).then(function (loc) {
        return Api.chat(text, lang.value, loc ? '' : prov.value, history, loc, kind || (loc ? 'all' : ''));
      }).then(function (r) {
        (r.places || []).forEach(function (p) { if (p && p.id && !findPlace(p.id)) State.places.push(p); });
        var dist = {};
        (r.places || []).forEach(function (p) { if (p && isFinite(p.distance_km)) dist[p.id] = p.distance_km; });
        msgs.push({ role: 'assistant', content: (r.reply || 'Here are my picks for you.') + (r.demo ? '\n\n(Isidro is in demo mode: the AI key is not set on the server yet.)' : ''),
          places: (r.places || []).map(function (p) { return p.id; }), dist: dist, shops: r.shops || null, inn: kind === 'postoffice' ? null : (r.inn_search_url || (here && kind === 'inn' ? innSearchUrl(here) : null)),
          po: r.post_office_search_url && (kind === 'postoffice' || !kind) ? r.post_office_search_url : (here && kind === 'postoffice' ? postOfficeUrl(here) : null),
          pos: r.post_offices || null });
      }, function (err) {
        if (here) {
          var n = localNearest(here, kind || 'all');
          var poList = kind === 'postoffice' ? nearestPostOffices(here, postOfficesCache) : null;
          msgs.push({ role: 'assistant', error: true, content: (State.demo ? 'Demo answer: here is what is closest to you.' : friendlyError(err) + '\n\nWhile I reconnect, here is what is closest to you.'),
            places: n.places.map(function (p) { return p.id; }), dist: n.dist, shops: n.shops, inn: (kind === 'inn' || kind === 'all' || !kind) ? innSearchUrl(here) : null, po: kind === 'postoffice' ? postOfficeUrl(here) : null, pos: poList });
          return;
        }
        var pool = State.places.filter(function (p) { return !prov.value || provinceOf(p) === prov.value; });
        var picks = localPicks(text, pool);
        msgs.push({ role: 'assistant', error: true, content: (State.demo ? 'Demo answer: these places match your question.' : friendlyError(err) + '\n\nWhile I reconnect, these places match your question.'), places: picks.map(function (p) { return p.id; }) });
      }).then(function () {
        saveChat(msgs);
        if (token !== renderToken) return;
        paint(false);
        setBusy(send, false);
      });
    };

    var mic = micButton({ label: 'Speak', small: true, maxSec: 60, lang: function () { return lang.value; }, onText: function (t) { ask(t); } });
    var ideas = el('div', { id: 'isidro-ideas', class: 'chips chips--wrap chat-ideas', 'aria-label': 'Suggested plans', hidden: true });
    var bulb = el('button', { type: 'button', class: 'bulb-btn', 'aria-expanded': 'false', 'aria-controls': 'isidro-ideas', 'aria-label': 'Show suggested plans', title: 'Suggested plans' }, icon('bulb'));
    bulb.addEventListener('click', function () {
      var open = ideas.hidden;
      ideas.hidden = !open;
      bulb.setAttribute('aria-expanded', String(open));
      bulb.setAttribute('aria-label', open ? 'Hide suggested plans' : 'Show suggested plans');
      bulb.classList.toggle('is-on', open);
    });
    // Near me: tap the pin, allow location, then pick Eats, Landmarks, Events, Shops or Inns.
    var nearStatus = el('span', { class: 'near-panel__status', role: 'status', 'aria-live': 'polite' });
    var nearPanel = el('div', { id: 'isidro-near', class: 'near-panel', hidden: true }, [
      el('div', { class: 'near-panel__head' }, [icon('pin'), el('b', { text: 'Near me' }), nearStatus]),
      el('div', { class: 'chips chips--wrap' }, NEAR_KINDS.map(function (k) {
        return el('button', { type: 'button', class: 'chip-btn near-chip', onclick: function () { ask(k.ask, k.key); } }, [icon(k.icon, 'icon--inline'), k.label]);
      })),
      el('p', { class: 'muted small', text: 'Your location is used only to find what is close to you. SMILE never saves it.' })
    ]);
    var pin = el('button', { type: 'button', class: 'bulb-btn pin-btn', 'aria-pressed': 'false', 'aria-controls': 'isidro-near', 'aria-label': 'Near me: use my location', title: 'Near me' }, icon('pin'));
    var setNear = function (on) {
      nearOn = on;
      nearPanel.hidden = !on;
      pin.classList.toggle('is-on', on);
      pin.setAttribute('aria-pressed', String(on));
      pin.setAttribute('aria-label', on ? 'Near me is on: tap to stop using my location' : 'Near me: use my location');
    };
    loadPostOffices();
    pin.addEventListener('click', function () {
      if (nearOn) { setNear(false); toast('Near me is off.'); return; }
      pin.classList.add('is-busy');
      nearStatus.textContent = '';
      Geo.get().then(function (h) {
        setNear(true);
        nearStatus.textContent = 'Using your location' + (h.acc ? ' (within about ' + kmText(h.acc / 1000) + ')' : '');
        nearPanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      }, function (err) { toast(err.message); }).then(function () { pin.classList.remove('is-busy'); });
    });
    var form = el('form', { class: 'chat-form', onsubmit: function (e) { e.preventDefault(); ask(q.value); } }, [
      q,
      el('div', { class: 'chat-actions' }, [pin, bulb, mic, el('span', { class: 'chat-actions__gap' }), send])
    ]);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(q.value); } });
    var prompts = ['I have 4 hours and love food', 'What festivals are on this month?', 'Beach weekend in Boracay on a budget', 'Mango trip to Guimaras', 'Heritage walk in Silay and Bacolod'];
    prompts.forEach(function (p) {
      ideas.appendChild(el('button', { type: 'button', class: 'chip-btn chip-btn--soft', onclick: function () { ideas.hidden = true; bulb.setAttribute('aria-expanded', 'false'); bulb.setAttribute('aria-label', 'Show suggested plans'); bulb.classList.remove('is-on'); ask(p); } }, p));
    });

    setView(el('section', { class: 'section section--narrow' }, [
      el('div', { class: 'isidro-hero' }, [
        el('div', { class: 'isidro-avatar' }, el('img', { src: 'assets/isidro-512.webp', alt: 'Isidro, your SMILE tour guide', width: 512, height: 512 })),
        el('h1', { class: 'page-head__title', text: 'Isidro, your AI travel buddy' }),
        el('p', { class: 'muted', text: 'Powered by Meta\'s Muse Spark. Isidro only suggests real places in SMILE, and remembers your chat so you can ask follow-ups.' })
      ]),
      el('div', { class: 'chat-settings' }, [formField('isidro-province', 'Province', prov), formField('isidro-lang', 'Language', lang)]),
      log,
      nearPanel,
      ideas,
      form,
      el('p', { class: 'muted small chat-hint', text: 'Tap the pin to find eats, landmarks, events, shops and inns near you. Tap the bulb for suggested plans. Tap Speak, ask, then tap Stop: Muse Voice writes it down and Isidro answers (English and Tagalog work best).' }),
      el('div', { class: 'btn-row chat-tools' }, [
        button('New chat', 'refresh', { small: true, variant: 'light', onclick: function () { msgs = []; saveChat(msgs); paint(false); q.focus(); } }),
        button('Festival calendar', 'festival', { small: true, variant: 'light', href: '#/events' })
      ])
    ]));
    paint(false);
    if (query && query.q) q.value = String(query.q).slice(0, 500);
    if (query && query.near) {
      var wantKind = NEAR_KINDS.filter(function (k) { return k.key === query.near; })[0];
      setTimeout(function () {
        if (token !== renderToken) return;
        Geo.get().then(function (h) {
          if (token !== renderToken) return;
          setNear(true);
          nearStatus.textContent = 'Using your location' + (h.acc ? ' (within about ' + kmText(h.acc / 1000) + ')' : '');
          if (wantKind) ask(wantKind.ask, wantKind.key);
        }, function (err) { toast(err.message); });
      }, 300);
    }
    focusHeading();
    Promise.all([loadPlaces(), loadMedia()]).then(function () { if (token === renderToken) paint(false); });
  }

  // ---------------------------------------------------------------------------
  // Festival calendar: every province's big festivals by month, with "remind me" (.ics)
  // ---------------------------------------------------------------------------

  // rule: how to work out the date. nth = nth weekday of a month (wd 0 = Sunday); easter = days from Easter Sunday.
  var EVENTS = [
    { id: 'ati-atihan', place: 'ati-atihan', months: [1], rule: { type: 'nth', month: 1, n: 3, wd: 0 }, when: 'Third Sunday of January (week-long)' },
    { id: 'dinagyang', place: 'dinagyang', months: [1], rule: { type: 'nth', month: 1, n: 4, wd: 0 }, when: 'Fourth Sunday of January (festival weekend)' },
    { id: 'paraw-regatta', place: 'paraw-regatta', months: [2], rule: { type: 'nth', month: 2, n: 3, wd: 0 }, approx: true, when: 'Usually the third weekend of February' },
    { id: 'panaad', place: 'panaad', months: [3, 4], when: 'March or April (dates set each year)' },
    { id: 'healing-festival', place: 'healing-festival', months: [3, 4], rule: { type: 'easter', offset: -1 }, when: 'Holy Week, highlight on Black Saturday' },
    { id: 'manggahan', place: 'manggahan', months: [5], when: 'May (activities can start in late April)' },
    { id: 'masskara', place: 'masskara', months: [10], rule: { type: 'nth', month: 10, n: 4, wd: 0 }, when: 'October, climax on the fourth Sunday' },
    { id: 'buglasan', place: 'buglasan', months: [10], when: 'October (dates set each year)' },
    { id: 'sinadya', place: 'sinadya', months: [12], rule: { type: 'fixed', month: 12, day: 8 }, approx: true, when: 'Early December, around December 8' },
    { id: 'binirayan', place: 'binirayan', months: [12], when: 'December (dates set each year)' }
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function manilaToday() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
      return { y: +parts[0], m: +parts[1], d: +parts[2] };
    } catch (e) { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  }
  function utcDay(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
  function nthWeekday(y, m, n, wd) { var first = utcDay(y, m, 1); return utcDay(y, m, 1 + ((wd - first.getUTCDay() + 7) % 7) + (n - 1) * 7); }
  /** Easter Sunday (Gregorian calendar, anonymous algorithm). */
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return utcDay(y, month, day);
  }
  function ruleDate(rule, y) {
    if (!rule) return null;
    if (rule.type === 'nth') return nthWeekday(y, rule.month, rule.n, rule.wd);
    if (rule.type === 'easter') return new Date(easterSunday(y).getTime() + rule.offset * 86400000);
    if (rule.type === 'fixed') return utcDay(y, rule.month, rule.day);
    return null;
  }
  /** Next date (UTC midnight) of an event with a rule, today included. */
  function nextEventDate(ev) {
    var t = manilaToday(), today = utcDay(t.y, t.m, t.d).getTime();
    for (var y = t.y; y <= t.y + 1; y++) { var d = ruleDate(ev.rule, y); if (d && d.getTime() >= today) return d; }
    return null;
  }
  /** Sort key: the next date, or the start of the next month it is held in. */
  function eventSortKey(ev) {
    var d = nextEventDate(ev);
    if (d) return d.getTime();
    var t = manilaToday(), best = Infinity;
    ev.months.forEach(function (m) {
      var y = m < t.m ? t.y + 1 : t.y;
      // In its own month, a festival without a set date counts as "now" only in the first half of the month.
      if (m === t.m && t.d > 15) y = t.y + 1;
      var key = m === t.m && t.d <= 15 ? utcDay(t.y, t.m, t.d).getTime() : utcDay(y, m, 1).getTime();
      if (key < best) best = key;
    });
    return best;
  }
  function fmtDay(d) { try { return d.toLocaleDateString('en-PH', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return d.toDateString(); } }
  function daysFromToday(d) { var t = manilaToday(); return Math.round((d.getTime() - utcDay(t.y, t.m, t.d).getTime()) / 86400000); }
  function upcomingEvents(n) { return EVENTS.slice().sort(function (a, b) { return eventSortKey(a) - eventSortKey(b); }).slice(0, n || EVENTS.length); }

  /** Calendar file for "Remind me": an all-day event with a reminder one week before. */
  function downloadIcs(ev, place, d) {
    var ymd = function (x) { return x.toISOString().slice(0, 10).replace(/-/g, ''); };
    var esc = function (t) { return String(t || '').replace(/[\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
    var end = new Date(d.getTime() + 86400000);
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SMILE//Festival calendar//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + ev.id + '-' + ymd(d) + '@smile-ph', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
      'DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + ymd(end),
      'SUMMARY:' + esc(place.name), 'LOCATION:' + esc((place.barangay ? place.barangay + ', ' : '') + provinceName(provinceOf(place)) + ', Philippines'),
      'DESCRIPTION:' + esc(ev.when + (ev.approx ? ' (check the official schedule).' : '.') + ' ' + (place.desc || '') + ' Open SMILE: ' + location.origin + location.pathname + '#/events'),
      'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(place.name + ' is in one week'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: ev.id + '.ics' });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Calendar reminder saved. Open it to add ' + place.name + '.');
  }

  function eventCard(ev, i) {
    var p = findPlace(ev.place);
    if (!p) return null;
    var pv = provinceInfo(provinceOf(p)) || { color: '#ED0460', name: '' };
    var d = nextEventDate(ev);
    var mine = currentProvince() === provinceOf(p);
    var when = d ? (ev.approx ? 'About ' : 'Next: ') + fmtDay(d) + ' • ' + (daysFromToday(d) === 0 ? 'today!' : 'in ' + daysFromToday(d) + ' day' + (daysFromToday(d) === 1 ? '' : 's')) : ev.when;
    return el('article', { class: 'card event-card reveal', style: '--c:' + pv.color + ';--d:' + Math.min(i || 0, 8) * 60 + 'ms' }, [
      el('div', { class: 'event-card__date' }, [el('b', { text: MONTHS[ev.months[0] - 1].slice(0, 3) + (ev.months.length > 1 ? '–' + MONTHS[ev.months[ev.months.length - 1] - 1].slice(0, 3) : '') }), el('span', { text: d ? String(d.getUTCDate()) : '•' })]),
      el('div', { class: 'event-card__body' }, [
        el('h3', { class: 'place-card__name', text: p.name }),
        el('p', { class: 'place-card__meta' }, [el('span', { class: 'chip chip--sm', style: '--c:' + pv.color, text: pv.name }), mine ? el('span', { class: 'chip chip--sm chip--featured', text: 'Your province' }) : null]),
        el('p', { class: 'event-card__when', text: when }),
        d ? el('p', { class: 'muted small', text: ev.when + (ev.approx ? '. Check the official schedule.' : '.') }) : null,
        p.desc ? el('p', { class: 'place-card__desc', text: p.desc }) : null,
        el('div', { class: 'btn-row' }, [
          button(Passport.hasAccepted(p.id) ? 'Go now' : 'Accept Challenge', 'trophy', { small: true, onclick: function () { acceptChallenge(p.id); } }),
          d ? button('Remind me', 'send', { small: true, variant: 'yellow', onclick: function () { downloadIcs(ev, p, d); } }) : null,
          button('Ask Isidro', 'compass', { small: true, variant: 'light', href: '#/isidro?q=' + encodeURIComponent('Plan my trip for ' + p.name + ' (' + pv.name + ')') }),
          mediaButton('place', p.id, p.name)
        ])
      ])
    ]);
  }

  function renderEvents(token, query) {
    var t = manilaToday();
    var month = Math.min(12, Math.max(1, parseInt(query.month, 10) || t.m));
    var list = el('div', { class: 'stack' });
    var tabs = el('div', { class: 'chips month-tabs', role: 'tablist', 'aria-label': 'Month' });
    var paint = function () {
      tabs.textContent = '';
      MONTHS.forEach(function (name, idx) {
        var m = idx + 1, n = EVENTS.filter(function (e) { return e.months.indexOf(m) !== -1; }).length;
        tabs.appendChild(el('button', { type: 'button', class: 'chip-btn' + (n ? '' : ' chip-btn--empty'), role: 'tab', 'aria-selected': String(m === month), 'aria-pressed': String(m === month),
          onclick: function () { month = m; paint(); } }, [name.slice(0, 3), n ? el('span', { class: 'month-tabs__n', text: String(n) }) : null]));
      });
      var sel = currentProvince();
      var evs = EVENTS.filter(function (e) { return e.months.indexOf(month) !== -1; })
        .sort(function (a, b) { var pa = provinceOf(findPlace(a.place) || {}) === sel, pb = provinceOf(findPlace(b.place) || {}) === sel; return (pb - pa) || (eventSortKey(a) - eventSortKey(b)); });
      list.textContent = '';
      list.appendChild(el('h2', { class: 'section__title', text: MONTHS[month - 1] + (month === t.m ? ' (this month)' : '') }));
      appendChildren(list, evs.length ? evs.map(eventCard) : el('p', { class: 'empty', text: 'No big festival this month, but every province has landmarks and food to enjoy. Ask Isidro!' }));
      Motion.reveal(view());
    };
    var next = upcomingEvents(3);
    setView([
      el('section', { class: 'section' }, [
        pageHead('festival', '#ED0460', 'Festival calendar', 'The big festivals of Western Visayas and the Negros Island Region. Tap "Remind me" to add one to your phone\'s calendar.'),
        el('h2', { class: 'section__title' }, [icon('star'), ' Coming up next']),
        el('div', { class: 'grid' }, next.map(eventCard)),
        el('p', { class: 'muted small', text: 'Festival dates are set by each city or province every year. Dates shown follow the usual schedule; check the official announcement before you travel.' })
      ]),
      el('section', { class: 'section' }, [tabs, list])
    ]);
    paint();
    focusHeading();
    Promise.all([loadPlaces(), loadMedia()]).then(function () { if (token === renderToken) paint(); });
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
    var mailBtn = button('I mailed it', 'send', { variant: 'blue' });
    mailBtn.addEventListener('click', function () {
      var info = getInfo();
      if (!info.postcard) { toast('Type your postcard code in the check-in form first.'); return; }
      setBusy(mailBtn, true, 'Mailing…');
      out.loading('Sending your postcard on its journey…');
      Api.mailPostcard(info).then(function (r) {
        var d = r.destination || {};
        out.show('Mailed to ' + (d.place || 'a surprise destination') + (d.province ? ', ' + d.province : '') + '!' + (r.chain_no !== undefined ? '\nChain #' + r.chain_no : '') + '\nWhile you are at the post office, pick a random postcard from the SMILE box and adopt it.', 'ok');
      }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(mailBtn, false); });
    });
    var poBtn = button('Nearest post office', 'map', { variant: 'light', small: true, onclick: function () {
      setBusy(poBtn, true, 'Finding you…');
      var win = null;
      try { win = window.open('', '_blank'); } catch (e) { win = null; }
      Geo.fresh().then(function (h) {
        return loadPostOffices().then(function (list) {
          var best = nearestPostOffices(h, list)[0];
          return best ? routeUrl(Number(best.lat) + ',' + Number(best.lng)) : postOfficeUrl(h);
        });
      }, function () { var pv = provinceInfo(currentProvince()); return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('post office ' + (pv ? pv.name : 'Western Visayas') + ', Philippines'); })
        .then(function (url) {
          if (win && !win.closed) win.location.href = url; else window.location.href = url;
        }).then(function () { setBusy(poBtn, false); });
    } });
    return el('section', { class: 'section section--narrow', id: 'mail' }, [
      el('div', { class: 'card mail-card reveal' }, [
        el('h2', { class: 'section__title' }, [icon('mailbox'), ' Mail your postcard']),
        el('p', { text: 'The post office is your finish line! Your SMILE postcard already has its stamp. Take it to the nearest post office, drop it at the counter or in the mailbox, then tap "I mailed it". SMILE sends it to a surprise destination, where someone adopts it and starts their own adventure.' }),
        el('div', { class: 'stamps', 'aria-hidden': 'true' }, [el('span', { class: 'stamp stamp--a' }, icon('stamp'))]),
        el('div', { class: 'btn-row' }, [mailBtn, button('Ask Isidro the way', 'compass', { variant: 'yellow', href: '#/isidro?near=postoffice' })]),
        poBtn,
        el('p', { class: 'muted small' }, ['At the post office, pick a random postcard from the SMILE box, ', el('a', { href: '#/postcards', text: 'adopt it' }), ' and follow that traveler\'s journey.']),
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
        aOut.show('Welcome to SMILE! You adopted a postcard from ' + (r.sender || 'a fellow explorer') + '.\nRank: ' + (r.rank || rankOf(Passport.points())) + '\nHere is the journey it has taken so far:', 'ok');
        tCode.value = aCode.value.trim().toUpperCase();
        track({ preventDefault: function () {} });
        var tf = tCode.closest('form'); if (tf) tf.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
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
      pageHead('heart', '#ED0460', 'SMILE Postcards', 'At the post office, pick a random postcard from the SMILE box (or adopt one that reached your mailbox). Scan its QR to adopt it and see the journey of the traveler who sent it.'),
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
    {"shop_id": "sans-rival-dumaguete", "province": "negros-oriental", "name": "Sans Rival Cakes & Pastries", "type": "pasalubong", "barangay": "Dumaguete City", "desc": "Dumaguete's famous bakery for silvanas and sans rival, packed for travel.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Sans+Rival+Cakes+and+Pastries+Dumaguete", "items": [{"item_id": "sr-silvanas", "name": "Silvanas", "price": "", "desc": "Frozen cashew-meringue wafers with buttercream, coated in cookie crumbs."}, {"item_id": "sr-sans-rival", "name": "Sans Rival", "price": "", "desc": "Layered cashew meringue and buttercream cake."}]},
    {"shop_id": "dela-cruz-pina", "province": "aklan", "name": "Dela Cruz House of Piña", "type": "crafts", "barangay": "Kalibo", "desc": "Piña weaving house where you can watch pineapple-fiber cloth being made by hand.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Dela+Cruz+House+of+Pina+Kalibo", "items": [{"item_id": "dc-pina-cloth", "name": "Piña cloth", "price": "", "desc": "Fine, sheer fabric hand-woven from pineapple leaf fiber."}, {"item_id": "dc-pina-scarf", "name": "Piña scarves and table runners", "price": "", "desc": "Light souvenirs that are easy to pack."}]},
    {"shop_id": "dtalipapa", "province": "aklan", "name": "D'Talipapa Boracay", "type": "souvenir", "barangay": "Balabag, Boracay", "desc": "Boracay's market lane for fresh seafood (cooked for you at nearby paluto stalls), shirts and beach souvenirs.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=D+Talipapa+Boracay", "items": [{"item_id": "dt-seafood", "name": "Fresh seafood", "price": "", "desc": "Pick your catch and have it cooked nearby."}, {"item_id": "dt-shirts", "name": "Boracay shirts and souvenirs", "price": "", "desc": "Bargaining is normal."}]},
    {"shop_id": "bagtason-weavers", "province": "antique", "name": "Bagtason Loom Weavers", "type": "crafts", "barangay": "Bagtason, Bugasong", "desc": "Community weavers of Antique's checkered patadyong cloth.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Bagtason+Loom+Weavers+Bugasong", "items": [{"item_id": "bw-patadyong", "name": "Patadyong", "price": "", "desc": "Hand-woven checkered cloth, worn as a wrap or used as a throw."}, {"item_id": "bw-bags", "name": "Patadyong bags and pouches", "price": "", "desc": "Made from the same hand-woven fabric."}]},
    {"shop_id": "roxas-market", "province": "capiz", "name": "Roxas City Public Market", "type": "pasalubong", "barangay": "Roxas City", "desc": "Where Capiz's seafood and pasalubong meet: dried fish and squid, plus Capiz shell crafts.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Roxas+City+Public+Market", "items": [{"item_id": "rm-dried", "name": "Dried fish and squid", "price": "", "desc": "Pack well for travel."}, {"item_id": "rm-capiz-shell", "name": "Capiz shell crafts", "price": "", "desc": "Lamps, windows and trinkets made from translucent Capiz shell."}]},
    {"shop_id": "jordan-wharf-stalls", "province": "guimaras", "name": "Jordan Wharf Pasalubong Stalls", "type": "pasalubong", "barangay": "Jordan", "desc": "Stalls at the Guimaras port selling the island's mango treats before you sail back.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Jordan+Wharf+Guimaras", "items": [{"item_id": "jw-dried-mango", "name": "Dried mangoes", "price": "", "desc": "Made from sweet Guimaras mangoes."}, {"item_id": "jw-fresh-mango", "name": "Fresh Guimaras mangoes", "price": "", "desc": "In season, mostly around April to June."}]},
    {"shop_id": "panaderia-de-molo", "province": "iloilo", "name": "Panaderia de Molo", "type": "pasalubong", "barangay": "Molo, Iloilo City", "desc": "Heritage bakery in Molo, a classic stop for Ilonggo baked pasalubong.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Panaderia+de+Molo+Iloilo", "items": [{"item_id": "pm-biscocho", "name": "Biscocho", "price": "", "desc": "Toasted buttered bread, an Iloilo favorite."}, {"item_id": "pm-galletas", "name": "Galletas", "price": "", "desc": "Crisp traditional cookies."}]},
    {"shop_id": "deocampo-barquillos", "province": "iloilo", "name": "Deocampo Barquillos", "type": "pasalubong", "barangay": "Iloilo City", "desc": "Family maker of crisp barquillos and barquiron, an Iloilo tradition.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Deocampo+Barquillos+Iloilo", "items": [{"item_id": "db-barquillos", "name": "Barquillos", "price": "", "desc": "Thin rolled wafers."}, {"item_id": "db-barquiron", "name": "Barquiron", "price": "", "desc": "Barquillos filled with sweet polvoron."}]},
    {"shop_id": "pendys", "province": "negros-occidental", "name": "Pendy's", "type": "pasalubong", "barangay": "Bacolod City", "desc": "Bacolod bakeshop famous for its napoleones.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Pendy%27s+Bacolod", "items": [{"item_id": "pd-napoleones", "name": "Napoleones", "price": "", "desc": "Flaky puff pastry with custard, glazed on top."}]},
    {"shop_id": "merci-pasalubong", "province": "negros-occidental", "name": "Merci Pasalubong", "type": "pasalubong", "barangay": "Bacolod City", "desc": "One-stop Bacolod shop for napoleones, piaya and other Negrense treats.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Merci+Pasalubong+Bacolod", "items": [{"item_id": "mp-napoleones", "name": "Napoleones", "price": "", "desc": "A Bacolod classic."}, {"item_id": "mp-piaya", "name": "Piaya", "price": "", "desc": "Muscovado-filled flatbread."}]},
    {"shop_id": "siquijor-market", "province": "siquijor", "name": "Siquijor Public Market", "type": "pasalubong", "barangay": "Siquijor town", "desc": "Small-town market for Siquijor torta, local snacks and island souvenirs.", "contact": "", "maps_url": "https://www.google.com/maps/search/?api=1&query=Siquijor+Public+Market", "items": [{"item_id": "sm-torta", "name": "Siquijor torta", "price": "", "desc": "Soft, sweet local cake, an island favorite."}, {"item_id": "sm-oils", "name": "Herbal oils", "price": "", "desc": "Bottled oils from the island's healing tradition."}]}
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
    var card = el('article', { class: 'card shop-card reveal' + (isFeatured(s) ? ' shop-card--featured' : ''), style: '--d:' + Math.min(i, 10) * 60 + 'ms' }, [
      el('div', { class: 'place-card__top' }, [
        el('span', { class: 'card-icon', style: 'background:' + t.color }, icon(t.icon)),
        el('div', null, [
          el('h3', { class: 'place-card__name', text: s.name }),
          el('p', { class: 'place-card__meta' }, [isFeatured(s) ? el('span', { class: 'chip chip--sm chip--featured' }, [icon('star'), 'Featured']) : null, el('span', { class: 'chip chip--sm', style: '--c:' + t.color, text: t.label }), el('span', { text: (s.barangay ? s.barangay + ', ' : '') + provinceName(provinceOf(s)) })])
        ])
      ]),
      s.desc ? el('p', { class: 'place-card__desc', text: s.desc }) : null,
      mediaStrip('shop', s.shop_id, s.name),
      items.length ? el('ul', { class: 'shop-items' }, items.map(function (x) {
        return el('li', { class: 'shop-item' }, [
          el('div', { class: 'shop-item__head' }, [el('b', { text: x.name }), el('span', { class: 'shop-item__price', text: x.price ? String(x.price) : 'Price in store' })]),
          x.desc ? el('p', { class: 'muted small', text: x.desc }) : null
        ]);
      })) : null,
      el('div', { class: 'btn-row shop-card__actions' }, [
        routeButton(button('Directions', 'map', { variant: 'blue', small: true, href: '#', target: '_blank', onclick: function () { Track.add(s.shop_id, 'directions'); } }), routeDest(s)),
        tracked(contactNode(s.contact), s.shop_id, 'contact'),
        mediaButton('shop', s.shop_id, s.name),
        button('Share', 'share', { variant: 'light', small: true, onclick: function () {
          Track.add(s.shop_id, 'share');
          var text = s.name + ' (' + t.label + ', ' + provinceName(provinceOf(s)) + '): ' + items.map(function (x) { return x.name; }).join(', ') + ' #SMILEPH';
          if (navigator.share) navigator.share({ title: s.name, text: text, url: location.origin + location.pathname + '#/shop' }).catch(function () { /* cancelled */ });
          else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied!'); });
        } })
      ])
    ]);
    return Track.watch(card, s.shop_id);
  }

  function tracked(node, shopId, type) {
    if (node && node.tagName === 'A') node.addEventListener('click', function () { Track.add(shopId, type); });
    return node;
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
    Promise.all([loadShops(), loadMedia()]).then(function () { if (token === renderToken) paint(); });
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
    var shopPin = null;
    var pinNote = el('span', { class: 'muted small', role: 'status', 'aria-live': 'polite', text: 'Optional: stand at your shop and tap, so Isidro can send nearby tourists to you.' });
    var pinBtn = button('Pin my shop here (GPS)', 'pin', { small: true, variant: 'light', onclick: function () {
      setBusy(pinBtn, true, 'Finding you…');
      Geo.get().then(function (h) {
        shopPin = { lat: Math.round(h.lat * 1e5) / 1e5, lng: Math.round(h.lng * 1e5) / 1e5 };
        pinNote.textContent = 'Pinned! (within about ' + kmText((h.acc || 20) / 1000) + ')';
      }, function (err) { pinNote.textContent = err.message; }).then(function () { setBusy(pinBtn, false); });
    } });
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
      var shopName = name.value.trim(), firstItem = items[0].name;
      setBusy(submit, true, 'Sending…');
      out.loading('Sending your shop…');
      Api.shopSubmit(Passport.name() || name.value.trim(), { name: name.value.trim(), type: type.value, province: prov.value, barangay: area.value.trim(), desc: desc.value.trim(), contact: contact.value.trim(), lat: shopPin ? shopPin.lat : '', lng: shopPin ? shopPin.lng : '' }, items).then(function (r) {
        out.show((r.message || 'Salamat! Your shop was sent for review.') + (r.manage_code ? '\n\nYour shop code: ' + r.manage_code + '\nSave it! Use it on the Shop dashboard to see your views and postcard sales, and to add photos later.' : '') + (r.upload_token ? '\n\nNext: add your photos and promo video below.' : ''), 'ok');
        if (r.manage_code) storageSet('smile.shopCode', r.manage_code);
        if (r.upload_token && r.shop_id) {
          var step = mediaStep({ auth: { owner_type: 'shop', owner_id: r.shop_id, token: r.upload_token }, ownerName: shopName, phrase: firstItem });
          form.parentNode.appendChild(step);
          step.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }
        form.reset(); itemsBox.textContent = ''; rows = []; addItem(); shopPin = null; pinNote.textContent = 'Optional: stand at your shop and tap, so Isidro can send nearby tourists to you.';
      }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(submit, false); });
    } }, [
      el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('shop')), 'Sell on SMILE']),
      el('p', { class: 'muted', text: 'For nano entrepreneurs and pasalubong stores in every province of Western Visayas and the Negros Island Region. Free to join. The SMILE team checks each shop before it appears here.' }),
      formField('sell-name', 'Shop name', name),
      formField('sell-type', 'What do you sell?', type),
      formField('sell-province', 'Province', prov),
      formField('sell-area', 'Town, barangay or street', area),
      el('div', { class: 'btn-row shop-pin' }, [pinBtn, pinNote]),
      formField('sell-desc', 'About your shop', desc),
      formField('sell-contact', 'Contact for buyers', contact, 'Shown publicly so tourists can order or visit.'),
      el('h3', { class: 'sell-items__title', text: 'Products' }),
      itemsBox,
      button('Add another product', 'plusSquare', { variant: 'light', onclick: addItem }),
      submit, out,
      el('p', { class: 'muted small' }, ['Already selling on SMILE? ', el('a', { href: '#/dashboard', text: 'Open your shop dashboard' }), '. Need captions or listings for social media? ', el('a', { href: '#/tools', text: 'Open merchant tools' }), '.'])
    ]);
    return el('section', { class: 'section section--narrow', id: 'sell' }, form);
  }


  // ---------------------------------------------------------------------------
  // Media: shop and place photos (up to 5) and a 15-second promo video, stored in Google Drive.
  // SAM 3.1 (Meta's Segment Anything Model, via the backend) finds the product in a photo
  // (close-up crop) and counts how many seconds it is on screen in the promo video.
  // ---------------------------------------------------------------------------

  State.media = [];
  State.mediaLoaded = false;
  var MEDIA_MAX_PHOTOS = 5;
  var VIDEO_MAX_SECONDS = 15;

  function loadMedia() {
    if (State.mediaLoaded || State.demo) return Promise.resolve(State.media);
    return Api.media().then(function (r) {
      if (r && Array.isArray(r.media)) State.media = r.media.filter(function (m) { return m && /^[\w-]{10,}$/.test(String(m.file_id)); });
      State.mediaLoaded = true;
      return State.media;
    }, function () { return State.media; });
  }
  function mediaFor(type, id) { return State.media.filter(function (m) { return m.owner_type === type && m.owner_id === id; }); }
  function driveThumb(id, w) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 1000); }
  function driveView(id) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view'; }
  function drivePreview(id) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview'; }
  function driveImg(id, w, alt, cls) {
    var img = el('img', { class: cls || null, src: driveThumb(id, w), alt: alt || '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    var fallback = function () { img.removeEventListener('error', fallback); img.src = 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (w || 1000); };
    img.addEventListener('error', fallback);
    return img;
  }

  function mediaLabel(items) {
    var nI = items.filter(function (m) { return m.kind === 'image'; }).length;
    var nV = items.length - nI;
    return [nI ? nI + ' photo' + (nI === 1 ? '' : 's') : '', nV ? 'video' : ''].filter(String).join(' & ');
  }

  /** Photos and the promo video of one shop or place, in a modal. */
  function openGallery(title, items) {
    var imgs = items.filter(function (m) { return m.kind === 'image'; });
    var vids = items.filter(function (m) { return m.kind === 'video'; });
    Modal.open({
      title: title,
      name: 'gallery',
      wide: true,
      body: [
        vids.map(function (v) {
          return el('div', { class: 'gallery__video' }, el('iframe', { src: drivePreview(v.file_id), title: 'Promo video: ' + title, allow: 'autoplay; fullscreen', allowfullscreen: true, loading: 'lazy' }));
        }),
        imgs.length ? el('div', { class: 'gallery__grid' }, imgs.map(function (m, i) {
          return el('a', { class: 'gallery__item', href: driveView(m.file_id), target: '_blank', rel: 'noopener', 'aria-label': 'Open photo ' + (i + 1) + ' in Google Drive' },
            driveImg(m.file_id, 900, m.title || title));
        })) : null,
        el('p', { class: 'muted small', text: 'Stored in Google Drive. Tap a photo to open it full size. A new video can take a few minutes before it plays.' })
      ]
    });
  }

  /** "2 photos & video" button for a shop or place, or null when it has no media yet. */
  function mediaButton(type, id, title, small) {
    var items = mediaFor(type, id);
    if (!items.length) return null;
    return button(mediaLabel(items), 'camera', { variant: 'light', small: small !== false, onclick: function () { if (type === 'shop') Track.add(id, 'gallery'); openGallery(title, items); } });
  }

  /** Up to 3 thumbnails that open the gallery. */
  function mediaStrip(type, id, title) {
    var items = mediaFor(type, id);
    if (!items.length) return null;
    var shown = items.filter(function (m) { return m.kind === 'image'; }).slice(0, 3);
    var hasVideo = items.some(function (m) { return m.kind === 'video'; });
    return el('button', { type: 'button', class: 'media-strip', 'aria-label': 'Open ' + mediaLabel(items) + ' of ' + title, onclick: function () { if (type === 'shop') Track.add(id, 'gallery'); openGallery(title, items); } },
      shown.map(function (m) { return driveImg(m.file_id, 400, '', 'media-strip__img'); }).concat(
        hasVideo ? [el('span', { class: 'media-strip__play' }, [icon('camera'), ' Video'])] : []));
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read the file.')); };
      r.readAsDataURL(blob);
    });
  }

  function pickRecorderType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    var c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported(c[i])) return c[i];
    return '';
  }

  /**
   * Readies the promo video for upload: keeps an MP4/MOV that is already 15 s or shorter and small;
   * otherwise re-records the first 15 seconds at up to 720 px (about 1.5 Mbps) in the browser.
   * Resolves {dataUrl, blob, mime, duration, fps, reencoded}.
   */
  function prepareVideo(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      v.preload = 'auto';
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.onerror = function () { URL.revokeObjectURL(url); reject(new Error('This video could not be opened. Please use an MP4 or MOV video.')); };
      v.onloadedmetadata = function () {
        var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : VIDEO_MAX_SECONDS;
        var useDur = Math.min(dur, VIDEO_MAX_SECONDS);
        if (/^video\/(mp4|quicktime)$/.test(file.type) && dur <= VIDEO_MAX_SECONDS + 0.5 && file.size <= 8e6) {
          URL.revokeObjectURL(url);
          blobToDataUrl(file).then(function (d) { resolve({ dataUrl: d, blob: file, mime: file.type, duration: dur, fps: 30, reencoded: false }); }, reject);
          return;
        }
        var type = pickRecorderType();
        var c = document.createElement('canvas');
        if (!type || typeof c.captureStream !== 'function' || !v.videoWidth) {
          URL.revokeObjectURL(url);
          reject(new Error('This browser cannot shorten videos. Please trim it to 15 seconds or less (MP4, under 8 MB) and try again.'));
          return;
        }
        var scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
        c.width = Math.round(v.videoWidth * scale / 2) * 2;
        c.height = Math.round(v.videoHeight * scale / 2) * 2;
        var ctx = c.getContext('2d');
        var stream = c.captureStream(30);
        var actx = null;
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          actx = new AC();
          var src = actx.createMediaElementSource(v);
          var dest = actx.createMediaStreamDestination();
          src.connect(dest);   // recorded, not played aloud
          dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
        } catch (e) { v.muted = true; }
        var rec;
        try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1500000, audioBitsPerSecond: 96000 }); }
        catch (e) { URL.revokeObjectURL(url); reject(new Error('This browser cannot prepare the video. Please trim it to 15 seconds (MP4) and try again.')); return; }
        var chunks = [], done = false, safety = null;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          clearTimeout(safety);
          try { if (actx) actx.close(); } catch (e) { /* ignore */ }
          URL.revokeObjectURL(url);
          var mime = type.split(';')[0];
          var blob = new Blob(chunks, { type: mime });
          if (!blob.size) { reject(new Error('The video came out empty. Please try another video.')); return; }
          if (blob.size > 10e6) { reject(new Error('The video is still too large. Please use a shorter or smaller video.')); return; }
          blobToDataUrl(blob).then(function (d) { resolve({ dataUrl: d, blob: blob, mime: mime, duration: useDur, fps: 30, reencoded: true }); }, reject);
        };
        var stop = function () { if (done) return; done = true; try { v.pause(); } catch (e) { /* ignore */ } if (rec.state !== 'inactive') rec.stop(); };
        var draw = function () {
          if (done) return;
          ctx.drawImage(v, 0, 0, c.width, c.height);
          if (typeof onProgress === 'function') onProgress(Math.min(1, v.currentTime / useDur));
          if (v.currentTime >= useDur || v.ended) { stop(); return; }
          window.requestAnimationFrame(draw);
        };
        v.onended = stop;
        safety = setTimeout(stop, useDur * 1000 + 15000);
        rec.start(500);
        var started = function () { window.requestAnimationFrame(draw); };
        var p = v.play();
        if (p && typeof p.then === 'function') {
          p.then(started, function () {
            v.muted = true;
            v.play().then(started, function () { stop(); reject(new Error('Could not play the video to prepare it.')); });
          });
        } else started();
      };
      v.src = url;
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var i = new Image();
      i.onload = function () { resolve(i); };
      i.onerror = function () { reject(new Error('Could not open the photo.')); };
      i.src = src;
    });
  }

  /** Photo preview on a canvas, with SAM 3.1's box drawn on top when there is one. */
  function drawPreview(canvas, ph) {
    loadImage(ph.dataUrl).then(function (img) {
      var s = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * s);
      canvas.height = Math.round(img.naturalHeight * s);
      var x = canvas.getContext('2d');
      x.drawImage(img, 0, 0, canvas.width, canvas.height);
      var b = ph.sam && ph.sam.best;
      if (b && b.w && b.h) {
        var sx = canvas.width / b.w, sy = canvas.height / b.h;
        x.lineWidth = Math.max(3, canvas.width / 120);
        x.strokeStyle = '#FDB603';
        x.setLineDash([12, 8]);
        x.strokeRect(b.x1 * sx, b.y1 * sy, (b.x2 - b.x1) * sx, (b.y2 - b.y1) * sy);
      }
    }, function () { /* preview only */ });
  }

  /** Crops the photo to SAM 3.1's box with some breathing room, as a product close-up. */
  function makeCloseUp(ph) {
    var b = ph.sam && ph.sam.best;
    if (!b) return Promise.resolve();
    return loadImage(ph.dataUrl).then(function (img) {
      var kx = img.naturalWidth / b.w, ky = img.naturalHeight / b.h;
      var bw = (b.x2 - b.x1) * kx, bh = (b.y2 - b.y1) * ky;
      var pad = 0.18 * Math.max(bw, bh);
      var x0 = Math.max(0, b.x1 * kx - pad), y0 = Math.max(0, b.y1 * ky - pad);
      var x1 = Math.min(img.naturalWidth, b.x2 * kx + pad), y1 = Math.min(img.naturalHeight, b.y2 * ky + pad);
      var w = x1 - x0, h = y1 - y0;
      if (w < 40 || h < 40) return;
      var s = Math.min(1, 1280 / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, c.width, c.height);
      ph.original = ph.dataUrl;
      ph.originalSam = ph.sam;
      ph.dataUrl = c.toDataURL('image/jpeg', 0.9);
      ph.sam = { found: true, count: ph.sam.count, closeup: true };
      ph.cropped = true;
      ph.note = 'Close-up made from the box SAM 3.1 found.';
    });
  }

  function compactSam(s) {
    if (!s) return null;
    var o = {};
    ['found', 'count', 'closeup', 'frames_with_product', 'total_frames', 'share'].forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
    if (s.best && s.best.c != null) o.confidence = s.best.c;
    return o;
  }

  /**
   * Upload step for one shop or place: up to 5 photos and one 15-second promo video, with SAM 3.1.
   * o: {auth:{owner_type, owner_id, token|code}, ownerName, phrase, admin}
   */
  function mediaStep(o) {
    var photos = [];
    var video = null;
    var phrase = el('input', { id: 'media-phrase-' + o.auth.owner_id, type: 'text', maxlength: '60', value: o.phrase || '', placeholder: 'e.g. piaya box, butterscotch, souvenir shirt' });
    var grid = el('div', { class: 'media-grid' });
    var fileIn = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    var vidIn = el('input', { type: 'file', accept: 'video/mp4,video/quicktime,video/*', hidden: true });
    var vidBox = el('div', { class: 'stack' });
    var vidOut = outputBox();
    var out = outputBox();
    var needPhrase = function () {
      var w = phrase.value.trim();
      if (!w) { toast('Type what SAM 3.1 should look for, e.g. "piaya box".'); phrase.focus(); }
      return w;
    };

    var paintPhotos = function () {
      grid.textContent = '';
      photos.forEach(function (ph, i) {
        var cv = el('canvas', { class: 'media-tile__img', role: 'img', 'aria-label': 'Photo ' + (i + 1) + (ph.sam && ph.sam.found ? ', product found by SAM 3.1' : '') });
        drawPreview(cv, ph);
        var status = el('p', { class: 'media-tile__note small', text: ph.note || '' });
        var samBtn = button(ph.sam ? 'Check again' : 'Find with SAM 3.1', 'sparkle', { small: true, variant: 'blue', onclick: function () {
          var w = needPhrase(); if (!w) return;
          setBusy(samBtn, true, 'SAM 3.1…');
          status.textContent = 'SAM 3.1 is looking for "' + w + '"…';
          Api.samImage(o.auth, w, ph.dataUrl).then(function (r) {
            var s = r.result || {};
            ph.sam = s; ph.samPhrase = w;
            var conf = s.best && s.best.c != null ? ' (' + Math.round(s.best.c * 100) + '% sure)' : '';
            ph.note = s.found ? 'SAM 3.1 found "' + w + '"' + conf + (s.count > 1 ? ', ' + s.count + ' in this photo' : '') + '. Tap "Use close-up" to zoom in on it.'
              : 'SAM 3.1 could not find "' + w + '" in this photo. Try a different word, or a clearer photo.';
            paintPhotos();
          }, function (err) { status.textContent = friendlyError(err); setBusy(samBtn, false); });
        } });
        var actions = [samBtn];
        if (ph.sam && ph.sam.found && ph.sam.best && !ph.cropped) actions.push(button('Use close-up', 'search', { small: true, variant: 'light', onclick: function () { makeCloseUp(ph).then(paintPhotos); } }));
        if (ph.cropped) actions.push(button('Undo close-up', 'refresh', { small: true, variant: 'light', onclick: function () { ph.dataUrl = ph.original; ph.sam = ph.originalSam; ph.cropped = false; ph.note = ''; paintPhotos(); } }));
        actions.push(button('Remove', 'close', { small: true, variant: 'light', onclick: function () { photos.splice(i, 1); paintPhotos(); } }));
        grid.appendChild(el('figure', { class: 'media-tile' }, [cv, status, el('div', { class: 'btn-row' }, actions)]));
      });
      if (photos.length < MEDIA_MAX_PHOTOS) {
        grid.appendChild(el('button', { type: 'button', class: 'media-add', onclick: function () { fileIn.click(); } },
          [icon('plusSquare'), el('span', { text: 'Add photo (' + photos.length + '/' + MEDIA_MAX_PHOTOS + ')' })]));
      }
    };
    fileIn.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileIn.files || [], 0, MEDIA_MAX_PHOTOS - photos.length);
      fileIn.value = '';
      files.reduce(function (p, f) {
        return p.then(function () { return shrinkImage(f, 1280, 0.85).then(function (r) { if (r) photos.push({ dataUrl: r.dataUrl }); }); });
      }, Promise.resolve()).then(paintPhotos);
    });

    var paintVideo = function () {
      vidBox.textContent = '';
      if (!video) {
        vidBox.appendChild(button('Choose or record a video (up to 15 s)', 'camera', { variant: 'light', onclick: function () { vidIn.click(); } }));
        return;
      }
      var samOk = /^video\/(mp4|quicktime)$/.test(video.mime);
      var player = el('video', { class: 'media-video', controls: true, playsinline: true, preload: 'metadata', src: video.previewUrl });
      var samBtn = button(video.sam ? 'Check again' : 'Check with SAM 3.1', 'sparkle', { small: true, variant: 'blue', disabled: !samOk, onclick: function () {
        var w = needPhrase(); if (!w) return;
        setBusy(samBtn, true, 'SAM 3.1…');
        vidOut.loading('SAM 3.1 is following "' + w + '" through your video. This can take a minute…');
        Api.samVideo(o.auth, w, video.dataUrl, Math.round(video.duration * video.fps)).then(function (r) {
          var s = r.result || {};
          video.sam = s; video.samPhrase = w;
          var secs = Math.round((s.share || 0) * video.duration);
          vidOut.show(s.found ? 'SAM 3.1 saw "' + w + '" in about ' + secs + ' of ' + Math.round(video.duration) + ' seconds (' + Math.round((s.share || 0) * 100) + '%).' +
            ((s.share || 0) < 0.5 ? ' Tip: keep your product on screen for most of the video.' : ' Great, your product is the star!')
            : 'SAM 3.1 did not see "' + w + '" in this video. Show your product clearly, or try a different word.', s.found ? 'ok' : 'warn');
          setBusy(samBtn, false);
        }, function (err) { vidOut.show(friendlyError(err), 'error'); setBusy(samBtn, false); });
      } });
      vidBox.appendChild(player);
      vidBox.appendChild(el('p', { class: 'muted small', text: Math.round(video.duration) + ' s video, ' + (video.blob.size / 1048576).toFixed(1) + ' MB' + (video.reencoded ? ', shortened for upload' : '') + '.' +
        (samOk ? '' : ' SAM 3.1 needs MP4; this browser made a different format, so the check is skipped (it still uploads).') }));
      vidBox.appendChild(el('div', { class: 'btn-row' }, [samBtn, button('Remove video', 'close', { small: true, variant: 'light', onclick: function () { if (video.previewUrl) URL.revokeObjectURL(video.previewUrl); video = null; vidOut.hidden = true; paintVideo(); } })]));
      vidBox.appendChild(vidOut);
    };
    vidIn.addEventListener('change', function () {
      var f = vidIn.files && vidIn.files[0];
      vidIn.value = '';
      if (!f) return;
      vidBox.textContent = '';
      var prog = el('p', { class: 'muted small', role: 'status', text: 'Preparing your video…' });
      vidBox.appendChild(prog);
      prepareVideo(f, function (p) { prog.textContent = 'Preparing your video… ' + Math.round(p * 100) + '%'; }).then(function (r) {
        r.previewUrl = URL.createObjectURL(r.blob);
        video = r;
        paintVideo();
      }, function (err) { video = null; paintVideo(); vidOut.show(err.message, 'error'); vidBox.appendChild(vidOut); });
    });

    var uploadBtn = button(o.admin ? 'Upload (goes live now)' : 'Upload photos & video', 'send', { variant: 'green', block: true, onclick: function () {
      var jobs = photos.map(function (ph, i) { return { kind: 'image', data: ph.dataUrl, title: (o.ownerName || 'SMILE') + ' photo ' + (i + 1), samPhrase: ph.samPhrase, sam: compactSam(ph.sam), ref: ph }; });
      if (video) jobs.push({ kind: 'video', data: video.dataUrl, title: (o.ownerName || 'SMILE') + ' promo video', samPhrase: video.samPhrase, sam: compactSam(video.sam), ref: video });
      if (!jobs.length) { toast('Add at least one photo or the video first.'); return; }
      setBusy(uploadBtn, true, 'Uploading…');
      var done = 0;
      jobs.reduce(function (p, j) {
        return p.then(function () {
          out.loading('Uploading ' + (done + 1) + ' of ' + jobs.length + ' to Google Drive…');
          return Api.mediaUpload({ auth: o.auth, kind: j.kind, data: j.data, title: j.title, samPhrase: j.samPhrase, sam: j.sam }).then(function () {
            done++;
            if (j.kind === 'video') { if (video && video.previewUrl) URL.revokeObjectURL(video.previewUrl); video = null; }
            else photos.splice(photos.indexOf(j.ref), 1);
          });
        });
      }, Promise.resolve()).then(function () {
        out.show('Uploaded ' + done + ' file' + (done === 1 ? '' : 's') + ' to Google Drive. ' + (o.admin ? 'They are live in the app now.' : 'They appear in the app once the SMILE team approves them.'), 'ok');
        State.mediaLoaded = false;
      }, function (err) {
        out.show((done ? done + ' uploaded. ' : '') + friendlyError(err), 'error');
      }).then(function () { paintPhotos(); paintVideo(); setBusy(uploadBtn, false); });
    } });

    paintPhotos();
    paintVideo();
    return el('section', { class: 'card stack media-step' }, [
      el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#0057D9' }, icon('camera')), 'Photos & promo video']),
      el('p', { class: 'muted', text: 'Add up to 5 photos and one promo video of up to 15 seconds. Meta\'s SAM 3.1 finds your product in each photo for a sharp close-up, and checks how long it shows in your video.' }),
      formField(phrase.id, 'What should SAM 3.1 look for?', phrase, 'A short name of the product, like "piaya box" or "woven bag".'),
      el('h3', { class: 'sell-items__title', text: 'Photos' }), grid, fileIn,
      el('h3', { class: 'sell-items__title', text: 'Promo video (15 seconds)' }), vidBox, vidIn,
      uploadBtn, out
    ]);
  }

  /** #/media: the SMILE team adds approved photos and videos to any place or shop (needs ADMIN_CODE). */
  function renderMediaAdmin(token) {
    var code = el('input', { id: 'admin-code', type: 'password', autocomplete: 'off', placeholder: 'SMILE team passcode' });
    var owner = el('select', { id: 'admin-owner' });
    var slot = el('div');
    var fill = function () {
      owner.textContent = '';
      PROVINCES.forEach(function (pv) {
        var ps = State.places.filter(function (p) { return provinceOf(p) === pv.id; });
        if (ps.length) owner.appendChild(el('optgroup', { label: 'Places: ' + pv.name }, ps.map(function (p) { return el('option', { value: 'place|' + p.id, text: p.name }); })));
      });
      owner.appendChild(el('optgroup', { label: 'Shops' }, State.shops.map(function (s) { return el('option', { value: 'shop|' + s.shop_id, text: s.name }); })));
    };
    fill();
    var start = button('Add photos & video', 'camera', { variant: 'blue', onclick: function () {
      if (!code.value.trim()) { toast('Type the SMILE team passcode.'); code.focus(); return; }
      var v = owner.value.split('|');
      var name = v[0] === 'place' ? (findPlace(v[1]) || {}).name : (State.shops.filter(function (s) { return s.shop_id === v[1]; })[0] || {}).name;
      slot.textContent = '';
      slot.appendChild(mediaStep({ auth: { owner_type: v[0], owner_id: v[1], code: code.value.trim() }, ownerName: name, phrase: name, admin: true }));
    } });
    setView(el('section', { class: 'section section--narrow' }, [
      pageHead('camera', '#0057D9', 'Media manager', 'For the SMILE team: add photos and promo videos to places and shops. They are saved in Google Drive and go live right away.'),
      el('div', { class: 'card stack' }, [formField('admin-code', 'Passcode', code, 'The ADMIN_CODE in the backend Script Properties.'), formField('admin-owner', 'Place or shop', owner), start]),
      slot
    ]));
    focusHeading();
    Promise.all([loadPlaces(), loadShops()]).then(function () { if (token === renderToken) fill(); });
  }

  // ---------------------------------------------------------------------------
  // Shop stats (anonymous): views, gallery opens, directions, contact taps, shares.
  // Sent in small batches; nothing about the visitor is stored.
  // ---------------------------------------------------------------------------

  var Track = {
    q: [],
    timer: null,
    observer: null,
    seenKey: 'smile.seenShops',
    seen: function () { try { return JSON.parse(window.sessionStorage.getItem(Track.seenKey) || '{}') || {}; } catch (e) { return {}; } },
    add: function (shopId, type) {
      if (!shopId || State.demo) return;
      if (type === 'views') {
        var s = Track.seen();
        if (s[shopId]) return;
        s[shopId] = 1;
        try { window.sessionStorage.setItem(Track.seenKey, JSON.stringify(s)); } catch (e) { /* optional */ }
      }
      Track.q.push({ shop_id: shopId, type: type });
      if (!Track.timer) Track.timer = setTimeout(function () { Track.flush(false); }, 15000);
    },
    flush: function (closing) {
      clearTimeout(Track.timer); Track.timer = null;
      if (!Track.q.length) return;
      var ev = Track.q.splice(0, 60);
      if (closing && Api.beacon(ev)) return;
      Api.track(ev).catch(function () { /* stats are best-effort */ });
    },
    /** Counts a shop card as viewed once it is half on screen. */
    watch: function (node, shopId) {
      if (State.demo || typeof window.IntersectionObserver !== 'function') return node;
      if (!Track.observer) Track.observer = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { Track.add(en.target.getAttribute('data-shop'), 'views'); Track.observer.unobserve(en.target); } });
      }, { threshold: 0.5 });
      node.setAttribute('data-shop', shopId);
      Track.observer.observe(node);
      return node;
    }
  };
  window.addEventListener('pagehide', function () { Track.flush(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') Track.flush(true); });

  // ---------------------------------------------------------------------------
  // Merchant dashboard (#/dashboard): opened with the shop code given at sign-up (SM-XXXXXX).
  // ---------------------------------------------------------------------------

  var STAT_LABELS = [['views', 'Shop views', 'eye'], ['gallery', 'Photo & video opens', 'camera'], ['directions', 'Directions', 'map'], ['contact', 'Contact taps', 'send'], ['share', 'Shares', 'share']];

  function renderDashboard(token, query) {
    var code = el('input', { id: 'dash-code', type: 'text', autocomplete: 'off', autocapitalize: 'characters', maxlength: '20', placeholder: 'SM-XXXXXX', value: query.code || storageGet('smile.shopCode') || '' });
    var remember = el('input', { id: 'dash-remember', type: 'checkbox', checked: !!storageGet('smile.shopCode') });
    var out = outputBox();
    var body = el('div', { class: 'stack-lg' });
    var openBtn = button('Open my dashboard', 'chart', { type: 'submit', variant: 'blue' });
    var lang = storageGet('smile.lang') || 'hil';

    // Record a sale: feeds the shop's own totals and the LGU / DOT partner portal (totals only).
    var saleCard = function (d) {
      var sumBox = el('div');
      var paintSales = function (sl) {
        sl = sl || { total: 0, count: 0, local: 0, foreign: 0, unknown: 0, recent: [] };
        sumBox.textContent = '';
        appendChildren(sumBox, [
          el('div', { class: 'kpis kpis--3' }, [
            el('div', { class: 'kpi' }, [el('b', { text: peso(sl.total) }), el('span', { text: 'Sales, last 30 days' })]),
            el('div', { class: 'kpi' }, [el('b', { text: String(sl.count) }), el('span', { text: 'Sales recorded' })]),
            el('div', { class: 'kpi' }, [el('b', { text: sl.total ? Math.round(sl.foreign / sl.total * 100) + '%' : '0%' }), el('span', { text: 'From foreign tourists' })])
          ]),
          sl.recent.length ? el('ul', { class: 'sale-list' }, sl.recent.map(function (x) {
            return el('li', null, [el('b', { text: peso(x.amount) }), el('span', { text: [x.item, x.customer === 'local' ? 'local tourist' : x.customer === 'foreign' ? 'foreign tourist' : '', x.time].filter(Boolean).join(' • ') })]);
          })) : el('p', { class: 'muted small', text: 'No sales recorded yet.' })
        ]);
      };
      paintSales(d.sales);
      var amount = el('input', { id: 'sale-amt', type: 'text', inputmode: 'decimal', maxlength: '12', placeholder: 'e.g. 350' });
      var item = el('select', { id: 'sale-item' }, (d.items || []).map(function (x) { return el('option', { value: x.name, text: x.name }); }).concat([el('option', { value: 'Other', text: 'Other / several items' })]));
      var cust = 'unknown';
      var custBtns = [['local', 'Local tourist'], ['foreign', 'Foreign tourist'], ['unknown', 'Not sure']].map(function (c) {
        var b = el('button', { type: 'button', class: 'seg__btn', 'aria-pressed': String(c[0] === cust), text: c[1] });
        b.addEventListener('click', function () { cust = c[0]; custBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
        return b;
      });
      var save = button('Save sale', 'check', { type: 'submit', variant: 'green' });
      var form2 = el('form', { class: 'stack', onsubmit: function (e) {
        e.preventDefault();
        if (!amount.value.trim()) { toast('Type the amount.'); amount.focus(); return; }
        setBusy(save, true, 'Saving…');
        Api.saleRecord(code.value.trim(), { amount: amount.value.trim(), item: item.value, customer: cust }).then(function (r) {
          toast('Sale saved. Salamat!'); amount.value = ''; paintSales(r.sales);
        }, function (err) { toast(friendlyError(err)); }).then(function () { setBusy(save, false); });
      } }, [
        el('div', { class: 'sale-row' }, [formField('sale-amt', 'Amount (₱)', amount), formField('sale-item', 'What was sold', item)]),
        el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'Customer' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Customer' }, custBtns)]),
        save
      ]);
      return el('section', { class: 'card stack' }, [
        el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('plus')), 'Record a sale']),
        el('p', { class: 'muted small', text: 'Tap after each sale to a tourist. Your LGU and the Department of Tourism see only area totals, never your single sales, and tourists never see them.' }),
        form2, sumBox
      ]);
    };

    var show = function (d) {
      body.textContent = '';
      var s = d.shop, st = d.stats || { totals: {}, days: [] };
      var live = String(s.status).toLowerCase() === 'approved';
      var maxV = Math.max(1, Math.max.apply(null, st.days.map(function (x) { return x.views; })));
      var tipsOut = outputBox();
      var tipsBtn = button('Get selling tips (Muse Spark)', 'sparkle', { variant: 'glow', onclick: function () {
        setBusy(tipsBtn, true, 'Thinking…');
        tipsOut.loading('Muse Spark is reading your numbers…');
        Api.merchantTips(code.value.trim(), lang).then(function (r) { tipsOut.show(r.tips || 'No tips right now.', r.demo ? 'warn' : null); },
          function (err) { tipsOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(tipsBtn, false); });
      } });
      appendChildren(body, [
        el('section', { class: 'card stack' }, [
          el('div', { class: 'dash-head' }, [
            el('h2', { class: 'card__title', text: s.name }),
            el('p', { class: 'place-card__meta' }, [
              el('span', { class: 'chip chip--sm', style: '--c:' + (live ? '#02A04F' : '#E09A00'), text: live ? 'Live in the app' : (String(s.status).toLowerCase() === 'rejected' ? 'Not approved' : 'Waiting for review') }),
              s.featured ? el('span', { class: 'chip chip--sm chip--featured' }, [icon('star'), 'Featured']) : null,
              el('span', { text: provinceName(s.province) })
            ])
          ]),
          el('div', { class: 'kpis' }, STAT_LABELS.map(function (k) {
            return el('div', { class: 'kpi' }, [el('b', { text: String(st.totals[k[0]] || 0) }), el('span', { text: k[1] })]);
          })),
          el('p', { class: 'muted small', text: 'Last 30 days. Counted when tourists see your shop card or tap its buttons in SMILE.' }),
          el('figure', { class: 'bars', 'aria-label': 'Shop views per day, last 30 days' }, [
            el('figcaption', { class: 'small', text: 'Shop views per day' }),
            el('div', { class: 'bars__row' }, st.days.map(function (x) {
              return el('span', { class: 'bars__bar', style: 'height:' + Math.max(3, Math.round(x.views / maxV * 100)) + '%', title: x.date + ': ' + x.views + ' view' + (x.views === 1 ? '' : 's') });
            }))
          ])
        ]),
        saleCard(d),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#ED0460' }, icon('postcard')), 'SMILE postcards']),
          el('div', { class: 'kpis kpis--3' }, [
            el('div', { class: 'kpi' }, [el('b', { text: String(d.postcards.bought) }), el('span', { text: 'Bought from PhilPost' })]),
            el('div', { class: 'kpi' }, [el('b', { text: String(d.postcards.used) }), el('span', { text: 'Used by tourists' })]),
            el('div', { class: 'kpi' }, [el('b', { text: String(d.postcards.left) }), el('span', { text: 'Still in stock' })])
          ])
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('shop')), 'Products and media']),
          el('ul', { class: 'shop-items' }, (d.items || []).map(function (x) {
            return el('li', { class: 'shop-item' }, el('div', { class: 'shop-item__head' }, [el('b', { text: x.name }), el('span', { class: 'shop-item__price', text: (x.price ? x.price + ' • ' : '') + x.status })]));
          })),
          el('p', { class: 'muted small', text: 'Photos and videos: ' + (d.media.approved || 0) + ' live, ' + (d.media.pending || 0) + ' waiting for review.' })
        ]),
        d.upload_token ? mediaStep({ auth: { owner_type: 'shop', owner_id: s.shop_id, token: d.upload_token }, ownerName: s.name, phrase: (d.items[0] || {}).name || s.name }) : null,
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#FF6B00' }, icon('sparkle')), 'Sell more']),
          el('p', { class: 'muted', text: 'Muse Spark looks at your views, photos and postcard sales and gives you three practical tips.' }),
          tipsBtn, tipsOut,
          s.featured ? null : el('p', { class: 'small', text: 'Want to appear first in your province? Ask the SMILE team about a featured listing: codesphereph@gmail.com' })
        ])
      ]);
      Motion.reveal(body);
    };

    var form = el('form', { class: 'card stack', onsubmit: function (e) {
      e.preventDefault();
      var c = code.value.trim().toUpperCase();
      if (!c) { toast('Type your shop code.'); code.focus(); return; }
      code.value = c;
      if (remember.checked) storageSet('smile.shopCode', c); else { try { window.localStorage.removeItem('smile.shopCode'); } catch (x) { /* optional */ } }
      setBusy(openBtn, true, 'Opening…');
      out.loading('Opening your dashboard…');
      Api.dashboard(c).then(function (d) { out.hidden = true; if (token === renderToken) show(d); }, function (err) { out.show(friendlyError(err), 'error'); })
        .then(function () { setBusy(openBtn, false); });
    } }, [
      formField('dash-code', 'Shop code', code, 'You got this code when you signed up on "Sell on SMILE". It starts with SM-.'),
      el('label', { class: 'check', for: 'dash-remember' }, [remember, ' Remember on this phone']),
      openBtn, out
    ]);
    setView(el('section', { class: 'section section--narrow' }, [
      pageHead('chart', '#0057D9', 'Shop dashboard', 'See how tourists find your shop, add photos and a promo video, and get selling tips from Muse Spark.'),
      form,
      body
    ]));
    focusHeading();
    if (code.value) form.requestSubmit ? form.requestSubmit() : openBtn.click();
  }

  // ---------------------------------------------------------------------------
  // Voice: records the microphone in the browser and builds a 16 kHz mono WAV,
  // which the backend sends to Meta's Muse Voice Transcribe.
  // ---------------------------------------------------------------------------

  var Recorder = {
    active: null,
    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)); },
    start: function () {
      return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = new AC();
        var src = ctx.createMediaStreamSource(stream);
        var node = ctx.createScriptProcessor(4096, 1, 1);
        var rec = { stream: stream, ctx: ctx, src: src, node: node, chunks: [], rate: ctx.sampleRate, t0: Date.now() };
        node.onaudioprocess = function (e) { rec.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
        src.connect(node);
        node.connect(ctx.destination);   // the processor only runs while connected; its output is silent
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        Recorder.active = rec;
        return rec;
      });
    },
    /** Stops and resolves {dataUrl, seconds} (WAV, 16 kHz, 16-bit mono). */
    stop: function () {
      var rec = Recorder.active;
      Recorder.active = null;
      if (!rec) return Promise.reject(new Error('Not recording.'));
      try { rec.src.disconnect(); rec.node.disconnect(); } catch (e) { /* ignore */ }
      rec.stream.getTracks().forEach(function (t) { t.stop(); });
      try { rec.ctx.close(); } catch (e) { /* ignore */ }
      var total = rec.chunks.reduce(function (n, c) { return n + c.length; }, 0);
      var all = new Float32Array(total), off = 0;
      rec.chunks.forEach(function (c) { all.set(c, off); off += c.length; });
      var ratio = rec.rate / 16000, outLen = Math.floor(all.length / ratio);
      var pcm = new Int16Array(outLen);
      for (var i = 0; i < outLen; i++) {
        var start = Math.floor(i * ratio), end = Math.min(all.length, Math.floor((i + 1) * ratio)), sum = 0;
        for (var j = start; j < end; j++) sum += all[j];
        var v = end > start ? sum / (end - start) : 0;
        v = Math.max(-1, Math.min(1, v));
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7FFF;
      }
      var buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
      var str = function (o, t) { for (var k = 0; k < t.length; k++) dv.setUint8(o + k, t.charCodeAt(k)); };
      str(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true);
      dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
      new Int16Array(buf, 44).set(pcm);
      var seconds = pcm.length / 16000;
      return blobToDataUrl(new Blob([buf], { type: 'audio/wav' })).then(function (d) { return { dataUrl: d, seconds: seconds }; });
    }
  };

  /**
   * "Speak" button: tap to record, tap again (or reach maxSec) to stop; the words come back as text.
   * o: {lang: () => 'en'|'tl'|'hil', onText(text), maxSec, label}
   */
  function micButton(o) {
    var maxSec = o.maxSec || 60;
    var status = el('span', { class: 'mic__status small', role: 'status', 'aria-live': 'polite' });
    var btn = button(o.label || 'Speak', 'mic', { variant: 'light', small: !!o.small, label: 'Speak instead of typing' });
    var timer = null, busy = false;
    var finish = function () {
      clearInterval(timer);
      btn.classList.remove('is-recording');
      setBusy(btn, true, 'Writing…');
      status.textContent = 'Muse Voice is writing down what you said…';
      Recorder.stop().then(function (r) {
        if (r.seconds < 0.6) throw new Error('That was too short. Hold on a bit longer and try again.');
        return Api.transcribe(r.dataUrl, o.lang ? o.lang() : 'en');
      }).then(function (res) {
        var t = String(res.text || '').trim();
        status.textContent = t ? '' : 'We did not catch any words. Please try again a little closer to the phone.';
        if (t) o.onText(t);
      }, function (err) { status.textContent = err && err.name === 'ApiError' ? friendlyError(err) : (err && err.message) || 'Could not transcribe.'; })
        .then(function () { busy = false; setBusy(btn, false); });
    };
    btn.addEventListener('click', function () {
      if (busy && !Recorder.active) return;
      if (Recorder.active) { finish(); return; }
      if (!Recorder.supported()) { toast('This browser cannot record audio. Please type instead.'); return; }
      busy = true;
      Recorder.start().then(function () {
        btn.classList.add('is-recording');
        var t = btn.querySelector('.btn__text');
        var tick = function () {
          var s = (Date.now() - Recorder.active.t0) / 1000;
          if (t) t.textContent = 'Stop  ' + Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
          if (s >= maxSec) finish();
        };
        status.textContent = 'Listening… tap Stop when you are done (up to ' + maxSec + ' s).';
        tick();
        timer = setInterval(function () { if (Recorder.active) tick(); }, 250);
      }, function () {
        busy = false;
        status.textContent = 'Microphone not allowed. Allow the microphone for this site in your browser settings, or type instead.';
      });
    });
    return el('span', { class: 'mic' }, [btn, status]);
  }

  // ---------------------------------------------------------------------------
  // Accounts: sign up / sign in. The token stays on this device; the account name is the leaderboard name.
  // ---------------------------------------------------------------------------

  var Auth = {
    KEY: 'smile.auth',
    get: function () { var v = readJson(Auth.KEY, null); return v && v.token && v.user ? v : null; },
    user: function () { var v = Auth.get(); return v ? v.user : null; },
    token: function () { var v = Auth.get(); return v ? v.token : ''; },
    set: function (r) {
      storageSet(Auth.KEY, JSON.stringify({ token: r.token, user: r.user }));
      Passport.setName(r.user.name);
      if (r.points !== undefined) Passport.setPoints(r.points);
      Auth.paint();
    },
    clear: function () { try { window.localStorage.removeItem(Auth.KEY); } catch (e) { /* optional */ } Auth.paint(); },
    signOut: function () {
      var t = Auth.token();
      Auth.clear();
      if (t) Api.signout(t).catch(function () { /* already signed out locally */ });
      toast('Signed out. See you on your next adventure!');
      location.hash = '#/';
    },
    paint: function () {
      var a = $('#account-btn');
      if (!a) return;
      var u = Auth.user();
      var av = a.querySelector('.account-btn__avatar');
      av.textContent = u ? u.name.charAt(0).toUpperCase() : '';
      if (u && u.photo_id) { av.textContent = ''; av.appendChild(driveImg(u.photo_id, 96, '')); }
      av.classList.toggle('has-photo', !!(u && u.photo_id));
      av.classList.toggle('is-guest', !u);
      a.querySelector('.account-btn__text').textContent = u ? u.name.split(' ')[0] : 'Sign in';
      a.setAttribute('aria-label', u ? 'My profile: ' + u.name : 'Sign in or sign up');
      a.setAttribute('href', '#/me');
    },
    /** Sign in / sign up modal. then(user) runs after success. */
    open: function (mode, then) {
      var isUp = mode === 'signup';
      var out = outputBox();
      var email = el('input', { id: 'auth-email', type: 'email', autocomplete: 'email', required: true, maxlength: '120' });
      var pw = el('input', { id: 'auth-pw', type: 'password', autocomplete: isUp ? 'new-password' : 'current-password', required: true, minlength: isUp ? '8' : null, maxlength: '100' });
      var name = el('input', { id: 'auth-name', type: 'text', autocomplete: 'nickname', maxlength: '40', placeholder: 'e.g. Kris of Jaro', value: isUp ? (Passport.name() || '') : '' });
      var nationality = el('input', { id: 'auth-nat', type: 'text', autocomplete: 'off', maxlength: '40', placeholder: 'e.g. Filipino, Korean, American' });
      var hometown = el('input', { id: 'auth-home', type: 'text', autocomplete: 'address-level1', maxlength: '60', placeholder: 'e.g. Iloilo, Cebu, Seoul, California' });
      var submit = button(isUp ? 'Create my account' : 'Sign in', isUp ? 'star' : 'user', { type: 'submit', block: true, variant: isUp ? 'glow' : 'blue' });
      var form = el('form', { class: 'stack', onsubmit: function (e) {
        e.preventDefault();
        setBusy(submit, true, isUp ? 'Creating…' : 'Signing in…');
        out.hidden = true;
        var req = isUp ? Api.signup({ name: name.value.trim(), email: email.value.trim(), password: pw.value, nationality: nationality.value.trim(), hometown: hometown.value.trim(), province: currentProvince() }) : Api.signin(email.value.trim(), pw.value);
        req.then(function (r) {
          Auth.set(r);
          Modal.close();
          toast(isUp ? 'Welcome to SMILE, ' + r.user.name + '!' : 'Welcome back, ' + r.user.name + '!');
          if (typeof then === 'function') then(r.user); else route();
        }, function (err) { out.show(friendlyError(err), 'error'); setBusy(submit, false); });
      } }, [
        isUp ? formField('auth-name', 'Display name (shown on the SMILE Hub)', name) : null,
        formField('auth-email', 'Email', email),
        formField('auth-pw', 'Password', pw, isUp ? 'At least 8 characters.' : null),
        isUp ? formField('auth-nat', 'Nationality', nationality, 'Everyone is welcome to SMILE.') : null,
        isUp ? formField('auth-home', 'Province or state you are from', hometown, 'Optional.') : null,
        submit, out,
        el('p', { class: 'muted small center' }, [isUp ? 'Already have an account? ' : 'New to SMILE? ',
          el('a', { href: '#', text: isUp ? 'Sign in' : 'Create an account', onclick: function (e) { e.preventDefault(); Auth.open(isUp ? 'signin' : 'signup', then); } })]),
        isUp ? el('p', { class: 'muted small', text: 'We keep your name, email, points and journal. Your password is stored only as a secure hash.' }) : null
      ]);
      Modal.open({ title: isUp ? 'Join SMILE' : 'Sign in to SMILE', name: 'auth', body: form, initialFocus: isUp ? name : email });
    }
  };

  /** Card shown on pages that need an account. */
  function signInCard(why) {
    return el('div', { class: 'card stack center' }, [
      el('span', { class: 'state__icon' }, icon('user')),
      el('h2', { class: 'card__title', text: 'Sign in to continue' }),
      el('p', { class: 'muted', text: why }),
      el('div', { class: 'btn-row btn-row--center' }, [
        button('Sign in', 'user', { variant: 'blue', onclick: function () { Auth.open('signin'); } }),
        button('Create an account', 'star', { variant: 'glow', onclick: function () { Auth.open('signup'); } })
      ])
    ]);
  }

  var RANK_COLORS = { E: '#8A93A6', D: '#00A651', C: '#0096C7', B: '#0057D9', A: '#7B2CBF', S: '#ED0460', SS: '#FF6A03', SSS: '#E09A00' };
  function rankBadge(rank, points) {
    rank = rank || 'E';
    return el('span', { class: 'rank-badge', style: '--r:' + (RANK_COLORS[rank] || '#8A93A6'), title: 'Rank ' + rank + (points != null ? ', ' + points + ' points' : '') }, [
      el('b', { text: rank }), points != null ? el('span', { text: points + ' pts' }) : null
    ]);
  }
  function timeAgo(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago';
    try { return new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; }
  }

  /** One journal post: on the SMILE Hub (public) or in the traveler's own profile (with status and delete). */
  function postCard(p, opts) {
    opts = opts || {};
    var pv = provinceInfo(p.province);
    var liked = readJson('smile.liked', {});
    var likeBtn = button(String(p.likes || 0), 'heart', { small: true, variant: liked[p.post_id] ? 'pink' : 'light', label: 'Like this post' });
    likeBtn.classList.add('like-btn');
    likeBtn.addEventListener('click', function () {
      var l = readJson('smile.liked', {}), undo = !!l[p.post_id];
      if (undo) delete l[p.post_id]; else l[p.post_id] = 1;
      storageSet('smile.liked', JSON.stringify(l));
      p.likes = Math.max(0, (p.likes || 0) + (undo ? -1 : 1));
      likeBtn.querySelector('.btn__text').textContent = String(p.likes);
      likeBtn.classList.toggle('btn--pink', !undo); likeBtn.classList.toggle('btn--light', undo);
      Api.hubLike(p.post_id, undo).catch(function () { /* the count catches up next time */ });
    });
    var videoSlot = el('div');
    var text = el('p', { class: 'post__text', text: p.text });
    var long = p.text && p.text.length > 260;
    if (long) text.classList.add('is-clamped');
    var statusChip = opts.mine ? el('span', { class: 'chip chip--sm', style: '--c:' + (p.visibility === 'private' ? '#5B6478' : p.status === 'live' ? '#02A04F' : '#E09A00'),
      text: p.visibility === 'private' ? 'Private' : p.status === 'live' ? 'On the SMILE Hub' : 'Waiting for review' }) : null;
    return el('article', { class: 'card post reveal' }, [
      el('header', { class: 'post__head' }, [
        avatarEl(p.name, p.avatar_id),
        el('div', { class: 'post__who' }, [
          el('b', { text: p.name }),
          el('span', { class: 'small muted', text: [p.place_name, pv ? pv.name : '', timeAgo(p.created)].filter(String).join(' • ') })
        ]),
        p.rank ? rankBadge(p.rank, p.points) : null
      ]),
      p.photo_id ? el('a', { class: 'post__photo', href: driveView(p.photo_id), target: '_blank', rel: 'noopener', 'aria-label': 'Open photo full size' }, driveImg(p.photo_id, 1000, 'Photo by ' + p.name + (p.place_name ? ' at ' + p.place_name : ''))) : null,
      p.video_id ? el('div', null, [videoSlot, button('Play video clip', 'camera', { small: true, variant: 'light', onclick: function (e) {
        e.currentTarget.remove();
        videoSlot.appendChild(el('div', { class: 'gallery__video' }, el('iframe', { src: drivePreview(p.video_id), title: 'Video clip by ' + p.name, allow: 'autoplay; fullscreen', allowfullscreen: true })));
      } })]) : null,
      p.text ? text : null,
      long ? button('Read more', 'chevronDown', { small: true, variant: 'light', onclick: function (e) { text.classList.remove('is-clamped'); e.currentTarget.remove(); } }) : null,
      p.caption ? el('p', { class: 'post__caption', text: p.caption }) : null,
      el('div', { class: 'btn-row post__actions' }, [
        opts.mine ? statusChip : likeBtn,
        p.place_id && findPlace(p.place_id) ? button('Visit ' + (findPlace(p.place_id) || {}).name, 'pin', { small: true, variant: 'light', onclick: function () { openPlace(p.place_id); } }) : null,
        opts.mine ? button('Delete', 'close', { small: true, variant: 'light', onclick: function (e) {
          if (!window.confirm || window.confirm('Delete this journal post?')) {
            var b = e.currentTarget; setBusy(b, true, 'Deleting…');
            Api.journalDelete(Auth.token(), p.post_id).then(function () { toast('Post deleted.'); if (opts.onChange) opts.onChange(); }, function (err) { toast(friendlyError(err)); setBusy(b, false); });
          }
        } }) : null
      ])
    ]);
  }

  /** #/me: profile, rank, stamp album and the traveler's own journal history. */
  function renderMe(token) {
    if (!Auth.user()) {
      setView(el('section', { class: 'section section--narrow' }, [pageHead('user', '#0057D9', 'My SMILE profile', 'Your rank, stamps and travel journal in one place.'), signInCard('Sign in or create a free account to keep a travel journal and share your adventures on the SMILE Hub.')]));
      focusHeading();
      return;
    }
    var u = Auth.user();
    var list = el('div', { class: 'stack' }, el('p', { class: 'muted', text: 'Loading your journal…' }));
    var head = el('div', { class: 'stack-lg' });
    var load = function () {
      Api.me(Auth.token()).then(function (r) {
        if (token !== renderToken) return;
        storageSet(Auth.KEY, JSON.stringify({ token: Auth.token(), user: r.user }));
        Passport.setPoints(r.points);
        head.textContent = '';
        head.appendChild(profileHead(r));
        list.textContent = '';
        appendChildren(list, r.posts.length ? r.posts.map(function (p) { return postCard(p, { mine: true, onChange: load }); })
          : el('p', { class: 'empty' }, ['No journal entries yet. ', el('a', { href: '#/journal', text: 'Write your first one' }), '!']));
        Motion.reveal(list);
      }, function (err) {
        if (err && err.code === 'SIGNED_OUT') { Auth.clear(); route(); return; }
        list.textContent = '';
        list.appendChild(el('p', { class: 'empty', text: friendlyError(err) }));
      });
    };
    var profileHead = function (r) {
      var bio = el('textarea', { id: 'me-bio', rows: '2', maxlength: '200', placeholder: 'A line about you, e.g. "Chasing every festival in Western Visayas"' });
      bio.value = r.user.bio || '';
      var save = button('Save', 'check', { small: true, variant: 'light', onclick: function () {
        setBusy(save, true, 'Saving…');
        Api.me(Auth.token(), { bio: bio.value.trim() }).then(function () { toast('Profile saved.'); }, function (err) { toast(friendlyError(err)); }).then(function () { setBusy(save, false); });
      } });
      var avatarSlot = el('div', { class: 'profile__photo' }, avatarEl(r.user.name, r.user.photo_id, true));
      var photoMsg = el('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
      var uploadPhoto = function (res) {
        photoMsg.textContent = 'Saving your photo…';
        avatarSlot.classList.add('is-busy');
        Api.profilePhoto(Auth.token(), res.dataUrl).then(function (x) {
          r.user.photo_id = x.photo_id;
          storageSet(Auth.KEY, JSON.stringify({ token: Auth.token(), user: r.user }));
          avatarSlot.textContent = '';
          avatarSlot.appendChild(el('span', { class: 'post__avatar post__avatar--big has-photo' }, el('img', { src: res.dataUrl, alt: 'Photo of ' + r.user.name })));
          photoMsg.textContent = 'Photo saved. It shows on your profile and your SMILE Hub posts.';
          Auth.paint();
        }, function (err) { photoMsg.textContent = friendlyError(err); }).then(function () { avatarSlot.classList.remove('is-busy'); });
      };
      var picker = photoPicker({ id: 'me-photo', facing: 'user', cameraLabel: r.user.photo_id ? 'New selfie' : 'Take a selfie', title: 'Profile selfie', hint: 'Smile! This photo shows on your SMILE profile.', variant: 'light', max: 800, onPhoto: uploadPhoto });
      picker.classList.add('profile__photo-btns');
      return el('section', { class: 'card stack profile' }, [
        el('div', { class: 'profile__top' }, [
          avatarSlot,
          el('div', null, [el('h2', { class: 'card__title', text: r.user.name }), el('p', { class: 'muted small', text: [r.user.nationality, r.user.hometown].filter(Boolean).join(' • ') + (r.user.nationality || r.user.hometown ? ' • ' : '') + r.posts.length + ' journal entr' + (r.posts.length === 1 ? 'y' : 'ies') })]),
          rankBadge(r.rank, r.points)
        ]),
        picker, photoMsg,
        formField('me-bio', 'About me', bio), save
      ]);
    };
    head.appendChild(el('section', { class: 'card' }, el('h2', { class: 'card__title', text: u.name })));
    setView(el('section', { class: 'section section--narrow stack-lg' }, [
      pageHead('user', '#0057D9', 'My SMILE profile', 'Your rank, stamps and travel journal.'),
      head,
      el('div', { class: 'btn-row' }, [
        button('New journal entry', 'mic', { variant: 'glow', href: '#/journal' }),
        button('SMILE Hub', 'heart', { variant: 'light', href: '#/hub' }),
        button('Sign out', 'close', { variant: 'light', onclick: Auth.signOut })
      ]),
      stampAlbum(),
      el('h2', { class: 'section__title' }, [icon('postcard'), ' My travel journal']),
      list
    ]));
    focusHeading();
    load();
  }

  // ---------------------------------------------------------------------------
  // Hotline (header button): national emergency numbers, local numbers from the Hotlines sheet,
  // and "find the nearest" map searches using the phone's location.
  // ---------------------------------------------------------------------------

  var HOTLINE_KINDS = {
    police: { label: 'Police station', icon: 'shield', color: '#0057D9', search: 'police station' },
    tanod: { label: 'Barangay tanod outpost', icon: 'shield', color: '#0B2A66', search: 'barangay hall' },
    drrmo: { label: 'DRRMO (disaster response)', icon: 'alert', color: '#E09A00', search: 'disaster risk reduction and management office' },
    healthoffice: { label: 'Municipal health office', icon: 'clinic', color: '#02A04F', search: 'municipal health office' },
    hospital: { label: 'Hospital', icon: 'hospital', color: '#E2141E', search: 'hospital' },
    clinic: { label: 'Clinic', icon: 'clinic', color: '#ED0460', search: 'medical clinic' },
    vet: { label: 'Veterinary clinic', icon: 'paw', color: '#7B2CBF', search: 'veterinary clinic' },
    drugstore: { label: 'Drugstore', icon: 'pill', color: '#02A04F', search: 'pharmacy drugstore' },
    fire: { label: 'Fire station', icon: 'alert', color: '#FF6A03', search: 'fire station' },
    coastguard: { label: 'Coast Guard', icon: 'boat', color: '#0096C7', search: 'coast guard' },
    tourism: { label: 'Tourist assistance', icon: 'guide', color: '#FDB603', search: 'tourism office' },
    postoffice: { label: 'Post office', icon: 'mailbox', color: '#0057D9', search: 'post office' },
    other: { label: 'Hotline', icon: 'phone', color: '#5B6478', search: 'emergency' }
  };
  var hotlineCache = {};
  function telHref(num) { return 'tel:' + String(num).replace(/[^\d+]/g, ''); }

  var Hotline = {
    open: function () {
      var provId = currentProvince(), pv = provinceInfo(provId);
      var where = pv ? pv.name + ', Philippines' : 'Western Visayas, Philippines';
      var nearLinks = {};
      var mapUrl = function (kind, here) {
        var q = HOTLINE_KINDS[kind].search + (here ? ' near ' + here.lat.toFixed(4) + ',' + here.lng.toFixed(4) : ' in ' + where);
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
      };
      var locNote = el('p', { class: 'muted small', role: 'status', 'aria-live': 'polite', text: 'Finding your location for the nearest results…' });
      var nearGrid = el('div', { class: 'sos-near' }, ['police', 'hospital', 'clinic', 'vet', 'drugstore'].map(function (k) {
        var t = HOTLINE_KINDS[k];
        var a = el('a', { class: 'sos-near__btn', href: mapUrl(k), target: '_blank', rel: 'noopener', style: '--c:' + t.color }, [icon(t.icon), el('span', { text: t.label })]);
        nearLinks[k] = a;
        return a;
      }));
      var local = el('div', { class: 'stack' }, el('p', { class: 'muted small', text: 'Loading local hotlines…' }));
      var localHead = el('h3', { class: 'sos-h', text: 'Local hotlines' + (pv ? ' in ' + pv.name : '') });
      var allLines = null, here = null;
      var paintLocal = function () {
        if (!allLines) return;
        var list;
        if (here) {
          list = allLines.map(function (h) { var c = Object.assign({}, h); if (hasLatLng(h)) c.km = distKm(here, { lat: Number(h.lat), lng: Number(h.lng) }); return c; })
            .filter(function (h) { return h.km != null ? h.km <= 30 : (!provId || !h.province || h.province === provId); })
            .sort(function (x, y) { return (x.km == null ? 999 : x.km) - (y.km == null ? 999 : y.km); });
          localHead.textContent = 'Local hotlines near you';
        } else {
          list = allLines.filter(function (h) { return !provId || !h.province || h.province === provId; });
        }
        local.textContent = '';
        if (!list.length) {
          local.appendChild(el('p', { class: 'muted small', text: 'Verified local numbers for ' + (here ? 'your area' : (pv ? pv.name : 'your province')) + ' will appear here once the SMILE team adds them. In an emergency, call 911.' }));
          return;
        }
        list.slice(0, 12).forEach(function (h) {
          var t = HOTLINE_KINDS[h.type] || HOTLINE_KINDS.other;
          local.appendChild(el('div', { class: 'sos-line', style: '--c:' + t.color }, [
            el('a', { class: 'sos-line__main', href: telHref(h.phone) }, [
              el('span', { class: 'sos-line__icon' }, icon(t.icon)),
              el('span', { class: 'sos-line__text' }, [el('b', { text: h.name }), el('small', { text: [t.label, h.notes, h.address].filter(Boolean).join(' • ') })]),
              el('span', { class: 'sos-line__num' }, [icon('phone'), h.phone])
            ]),
            hasLatLng(h) ? el('div', { class: 'sos-line__route' }, [
              h.km != null ? el('span', { class: 'dist-badge', text: kmText(h.km) }) : null,
              routeButton(button('Directions', 'route', { small: true, variant: 'light', href: '#', target: '_blank' }), Number(h.lat) + ',' + Number(h.lng))
            ]) : null
          ]));
        });
      };
      Modal.open({ title: 'Emergency hotlines', name: 'hotline', body: el('div', { class: 'sos stack' }, [
        el('div', { class: 'sos-main' }, [
          el('a', { class: 'sos-call sos-call--red', href: 'tel:911' }, [icon('phone'), el('span', null, [el('b', { text: '911' }), el('small', { text: 'Police, fire, ambulance (national emergency)' })])]),
          el('a', { class: 'sos-call', href: 'tel:143' }, [icon('hospital'), el('span', null, [el('b', { text: '143' }), el('small', { text: 'Philippine Red Cross' })])])
        ]),
        el('h3', { class: 'sos-h', text: 'Find the nearest' }),
        nearGrid, locNote,
        localHead,
        local,
        el('p', { class: 'muted small', text: 'In a life-threatening emergency, call 911 first. Google Maps lists the nearest places with their phone numbers: tap one, then Directions, for the blue route.' }),
        el('div', { class: 'sos-join' }, [
          el('span', { text: 'Police, tanod, fire, DRRMO, health office, clinic or drugstore?' }),
          button('List your hotline', 'plus', { small: true, variant: 'blue', href: '#/partner', onclick: function () { Modal.close(); } })
        ])
      ]) });
      Geo.fresh().then(function (h) {
        here = h;
        Object.keys(nearLinks).forEach(function (k) { nearLinks[k].href = mapUrl(k, h); });
        locNote.textContent = 'Showing places near you.';
        paintLocal();
      }, function () { locNote.textContent = 'Location is off, so the map searches ' + where + '. Allow location for the nearest results.'; });
      var notPO = function (list) { return (list || []).filter(function (h) { return h.type !== 'postoffice'; }); };
      if (hotlineCache.all) { allLines = notPO(hotlineCache.all); paintLocal(); }
      else Api.hotlines('').then(function (r) { hotlineCache.all = r.hotlines || []; allLines = notPO(hotlineCache.all); paintLocal(); }, function () { allLines = []; paintLocal(); });
    }
  };

  // ---------------------------------------------------------------------------
  // LGU / DOT Partner portal (#/partners): same sign-in as travelers; totals only, never names.
  // ---------------------------------------------------------------------------

  function peso(n) { n = Number(n) || 0; try { return '₱' + n.toLocaleString('en-PH', { maximumFractionDigits: 0 }); } catch (e) { return '₱' + Math.round(n); } }
  function pct(a, b) { return b ? Math.round(a / b * 100) + '%' : '0%'; }
  /** Horizontal bars: [{label, value, note}] */
  function barList(rows, color, fmt) {
    var max = Math.max.apply(null, [1].concat(rows.map(function (r) { return r.value; })));
    if (!rows.length) return el('p', { class: 'muted small', text: 'No data for this period yet.' });
    return el('ul', { class: 'hbars', style: '--c:' + (color || '#0057D9') }, rows.map(function (r) {
      return el('li', { class: 'hbars__row' }, [
        el('span', { class: 'hbars__label' }, [r.label, r.note ? el('small', { text: ' ' + r.note }) : null]),
        el('span', { class: 'hbars__track' }, el('span', { class: 'hbars__fill', style: 'width:' + Math.max(3, Math.round(r.value / max * 100)) + '%' })),
        el('b', { class: 'hbars__val', text: fmt ? fmt(r.value) : String(r.value) })
      ]);
    }));
  }
  /** One stacked bar: [{label, value, color}] */
  function splitBar(parts, fmt) {
    var total = parts.reduce(function (s, p) { return s + p.value; }, 0);
    return el('div', { class: 'split' }, [
      el('div', { class: 'split__bar', role: 'img', 'aria-label': parts.map(function (p) { return p.label + ' ' + pct(p.value, total); }).join(', ') },
        total ? parts.filter(function (p) { return p.value; }).map(function (p) { return el('span', { style: 'width:' + (p.value / total * 100) + '%;background:' + p.color }); }) : el('span', { class: 'split__empty' })),
      el('ul', { class: 'split__legend' }, parts.map(function (p) {
        return el('li', null, [el('i', { style: 'background:' + p.color }), p.label + ': ', el('b', { text: (fmt ? fmt(p.value) : String(p.value)) + ' (' + pct(p.value, total) + ')' })]);
      }))
    ]);
  }

  function renderPartners(token) {
    var head = pageHead('chart', '#0057D9', 'Partner portal', 'For LGU tourism offices and the Department of Tourism: who visits your area, what they love, what they buy from SMILE merchants, and what to improve.');
    if (!Auth.user()) {
      setView(el('section', { class: 'section section--narrow' }, [head, signInCard('Sign in with your SMILE account. New partner? Create an account first, then request partner access on this page.')]));
      focusHeading();
      return;
    }
    var box = el('div', { class: 'stack-lg' }, el('p', { class: 'muted', text: 'Opening your portal…' }));
    var days = Number(storageGet('smile.partnerDays')) || 30, area = '';

    var requestForm = function (msg) {
      var org = el('input', { id: 'pr-org', type: 'text', maxlength: '100', placeholder: 'e.g. Iloilo Provincial Tourism Office' });
      var pos = el('input', { id: 'pr-pos', type: 'text', maxlength: '80', placeholder: 'e.g. Tourism Officer' });
      var phone = el('input', { id: 'pr-phone', type: 'tel', maxlength: '40', placeholder: 'Office phone for our verification call' });
      var areaSel = el('select', { id: 'pr-area' }, [el('option', { value: 'all', text: 'All provinces (DOT regional office)' })].concat(PROVINCES.map(function (p) { return el('option', { value: p.id, text: p.name }); })));
      areaSel.value = currentProvince() || 'iloilo';
      var note = el('textarea', { id: 'pr-note', rows: '2', maxlength: '300', placeholder: 'Optional: city or town, and what you hope to learn' });
      var out = outputBox();
      var send = button('Request partner access', 'send', { type: 'submit', block: true, variant: 'blue' });
      box.textContent = '';
      appendChildren(box, [
        msg ? el('div', { class: 'output', text: msg }) : null,
        el('form', { class: 'card stack', onsubmit: function (e) {
          e.preventDefault();
          if (!org.value.trim() || !pos.value.trim()) { toast('Type your office and position.'); return; }
          setBusy(send, true, 'Sending…');
          Api.partnerRequest(Auth.token(), { org: org.value.trim(), position: pos.value.trim(), phone: phone.value.trim(), area: areaSel.value, note: note.value.trim() })
            .then(function (r) { pendingCard(r.message); }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(send, false); });
        } }, [
          el('h2', { class: 'card__title', text: 'Request partner access' }),
          el('p', { class: 'muted small', text: 'For LGU tourism offices and the Department of Tourism. The SMILE team confirms with your office before opening your portal.' }),
          formField('pr-org', 'Office', org), formField('pr-pos', 'Your position', pos), formField('pr-phone', 'Office phone', phone),
          formField('pr-area', 'Area', areaSel), formField('pr-note', 'Note (optional)', note), send, out
        ])
      ]);
    };
    var pendingCard = function (msg) {
      box.textContent = '';
      box.appendChild(el('div', { class: 'card stack center' }, [
        el('span', { class: 'state__icon' }, icon('check')),
        el('h2', { class: 'card__title', text: 'Request received' }),
        el('p', { class: 'muted', text: msg || 'The SMILE team will confirm with your office and open your portal. Sign in again here once you get the go-ahead.' })
      ]));
    };

    var show = function (d) {
      var st = d.stats, v = st.visitors, m = st.merchants, pu = m.purchases;
      var periodSel = el('select', { id: 'pt-days', 'aria-label': 'Period' }, [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last 12 months']].map(function (x) { return el('option', { value: String(x[0]), text: x[1] }); }));
      periodSel.value = String(st.days);
      periodSel.addEventListener('change', function () { days = Number(periodSel.value); storageSet('smile.partnerDays', String(days)); load(); });
      var areaSel = d.scope.length > 1 ? el('select', { id: 'pt-area', 'aria-label': 'Area' }, [el('option', { value: '', text: 'My whole area' })].concat(d.scope.map(function (id) { return el('option', { value: id, text: provinceName(id) }); }))) : null;
      if (areaSel) { areaSel.value = area; areaSel.addEventListener('change', function () { area = areaSel.value; load(); }); }
      var areaName = st.provinces.map(provinceName).join(', ');
      var insOut = outputBox();
      var insQ = el('input', { id: 'pt-q', type: 'text', maxlength: '300', placeholder: 'Optional: ask something, e.g. Which festival should we promote abroad?' });
      var insBtn = button('What is working, what is not (Muse Spark)', 'sparkle', { block: true, variant: 'glow', onclick: function () {
        setBusy(insBtn, true, 'Thinking…'); insOut.loading('Muse Spark is reading your area’s totals…');
        Api.partnerInsights(Auth.token(), days, area, insQ.value.trim()).then(function (r) { insOut.show(r.insights || 'No insights right now.', r.demo ? 'warn' : null); },
          function (err) { insOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(insBtn, false); });
      } });
      var csv = button('Download CSV', 'save', { small: true, variant: 'light', onclick: function () {
        var rows = [['SMILE partner report', d.org, areaName, 'last ' + st.days + ' days'], [],
          ['Check-ins', v.checkins], ['Unique travelers', v.travelers], ['Local travelers', v.local], ['Foreign travelers', v.foreign], ['Not stated', v.unknown], ['Festival check-ins', v.festival_checkins],
          ['Merchants enrolled', m.enrolled], ['Purchases (PHP)', pu.total], ['Sales recorded', pu.count], ['Average sale (PHP)', pu.average], ['Local purchases (PHP)', pu.local], ['Foreign purchases (PHP)', pu.foreign],
          ['Postcards mailed', st.postcards.mailed], ['Postcards adopted', st.postcards.adopted], ['Photobooth postcards', st.photobooth], [],
          ['Top places', 'Province', 'Check-ins']].concat(st.top_places.map(function (x) { return [x.name, provinceName(x.province), x.count]; }))
          .concat([[], ['Nationality', 'Travelers']]).concat(st.nationalities.map(function (x) { return [x.name, x.count]; }))
          .concat([[], ['Purchases by category', 'PHP']]).concat(pu.by_category.map(function (x) { return [x.name, x.amount]; }))
          .concat([[], ['Date', 'Check-ins', 'Purchases (PHP)']]).concat(st.per_day.map(function (x) { return [x.date, x.checkins, x.purchases]; }));
        var text = rows.map(function (r) { return r.map(function (c) { var t = String(c == null ? '' : c); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(','); }).join('\n');
        var url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
        var aEl = el('a', { href: url, download: 'smile-partner-report-' + st.days + 'd.csv' }); document.body.appendChild(aEl); aEl.click(); aEl.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } });
      var maxDay = Math.max(1, Math.max.apply(null, st.per_day.map(function (x) { return x.checkins; })));
      var wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      box.textContent = '';
      appendChildren(box, [
        el('section', { class: 'card stack' }, [
          el('div', { class: 'row-between' }, [
            el('div', null, [el('p', { class: 'eyebrow', text: d.org || 'Partner' }), el('h2', { class: 'card__title', text: areaName })]),
            csv
          ]),
          el('div', { class: 'portal-filters' }, [periodSel, areaSel]),
          el('div', { class: 'kpis portal-kpis' }, [
            ['Check-ins', String(v.checkins)], ['Travelers', String(v.travelers)], ['Local · ' + pct(v.local, v.travelers), String(v.local)],
            ['Foreign · ' + pct(v.foreign, v.travelers), String(v.foreign)], ['Purchases', peso(pu.total)], ['Sales recorded', String(pu.count)]
          ].map(function (k) { return el('div', { class: 'kpi' }, [el('b', { text: k[1] }), el('span', { text: k[0] })]); })),
          el('figure', { class: 'bars', 'aria-label': 'Check-ins per day' }, [
            el('figcaption', { class: 'small', text: 'Check-ins per day' }),
            el('div', { class: 'bars__row' }, st.per_day.map(function (x) { return el('span', { class: 'bars__bar', style: 'height:' + Math.max(3, Math.round(x.checkins / maxDay * 100)) + '%', title: x.date + ': ' + x.checkins }); }))
          ]),
          el('p', { class: 'muted small', text: 'Totals only: SMILE never shows partners any traveler names. Local or foreign comes from the nationality travelers give when they sign up; guests show as not stated.' })
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#ED0460' }, icon('globe')), 'Who visits']),
          splitBar([{ label: 'Local', value: v.local, color: '#0057D9' }, { label: 'Foreign', value: v.foreign, color: '#ED0460' }, { label: 'Not stated', value: v.unknown, color: '#C9C2B5' }]),
          el('div', { class: 'portal-2col' }, [
            el('div', null, [el('h3', { class: 'portal-h', text: 'Nationalities' }), barList(st.nationalities.map(function (x) { return { label: x.name, value: x.count }; }), '#ED0460')]),
            el('div', null, [el('h3', { class: 'portal-h', text: 'Where they come from' }), barList(st.hometowns.map(function (x) { return { label: x.name, value: x.count }; }), '#7B2CBF')])
          ]),
          el('h3', { class: 'portal-h', text: 'Busiest days of the week' }),
          barList(st.weekday.map(function (n, i) { return { label: wk[i], value: n }; }), '#0096C7')
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#02A04F' }, icon('star')), 'What is engaging']),
          barList(st.top_places.map(function (x) { return { label: x.name, note: d.scope.length > 1 ? provinceName(x.province) : '', value: x.count }; }), '#02A04F'),
          el('div', { class: 'kpis kpis--3' }, [
            el('div', { class: 'kpi' }, [el('b', { text: String(v.festival_checkins) }), el('span', { text: 'Festival check-ins' })]),
            el('div', { class: 'kpi' }, [el('b', { text: st.challenges.completed + ' / ' + st.challenges.accepted }), el('span', { text: 'Challenges completed / accepted' })]),
            el('div', { class: 'kpi' }, [el('b', { text: String(st.photobooth) }), el('span', { text: 'Photobooth postcards' })])
          ])
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#E09A00' }, icon('alert')), 'Needs a push']),
          el('p', { class: 'muted small', text: 'SMILE places in your area with no check-ins in this period.' }),
          st.quiet_places.length ? el('div', { class: 'chips chips--wrap' }, st.quiet_places.map(function (x) { return el('span', { class: 'chip', text: x.name }); })) : el('p', { class: 'small', text: 'Every place had visitors. Maayo gid!' })
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#FF6A03' }, icon('shop')), 'Merchants and purchases']),
          el('div', { class: 'kpis kpis--3' }, [
            el('div', { class: 'kpi' }, [el('b', { text: String(m.enrolled) }), el('span', { text: 'SMILE merchants' })]),
            el('div', { class: 'kpi' }, [el('b', { text: peso(pu.total) }), el('span', { text: 'Bought by travelers' })]),
            el('div', { class: 'kpi' }, [el('b', { text: peso(pu.average) }), el('span', { text: 'Average sale' })])
          ]),
          splitBar([{ label: 'Local tourists', value: pu.local, color: '#0057D9' }, { label: 'Foreign tourists', value: pu.foreign, color: '#ED0460' }, { label: 'Not stated', value: pu.unknown, color: '#C9C2B5' }], peso),
          el('div', { class: 'portal-2col' }, [
            el('div', null, [el('h3', { class: 'portal-h', text: 'By product type' }), barList(pu.by_category.map(function (x) { return { label: (SHOP_TYPES[x.name] || { label: x.name }).label, value: x.amount }; }), '#FF6A03', peso)]),
            el('div', null, [el('h3', { class: 'portal-h', text: 'Top merchants' }), barList(pu.top_shops.map(function (x) { return { label: x.name, value: x.amount }; }), '#FDB603', peso)])
          ]),
          el('h3', { class: 'portal-h', text: 'Shop interest in the app' }),
          el('div', { class: 'kpis' }, STAT_LABELS.map(function (k) { return el('div', { class: 'kpi' }, [el('b', { text: String(m.engagement[k[0]] || 0) }), el('span', { text: k[1] })]); })),
          el('p', { class: 'muted small', text: 'Purchases are recorded by the merchants themselves on their SMILE shop dashboard.' })
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#0057D9' }, icon('mailbox')), 'Postcards']),
          el('div', { class: 'kpis kpis--3' }, [
            el('div', { class: 'kpi' }, [el('b', { text: String(st.postcards.mailed) }), el('span', { text: 'Mailed from your area' })]),
            el('div', { class: 'kpi' }, [el('b', { text: String(st.postcards.adopted) }), el('span', { text: 'Adopted by new travelers' })]),
            el('div', { class: 'kpi' }, [el('b', { text: pct(st.postcards.adopted, st.postcards.mailed) }), el('span', { text: 'Adoption rate' })])
          ])
        ]),
        el('section', { class: 'card stack' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#7B2CBF' }, icon('sparkle')), 'Insights from Muse Spark']),
          el('p', { class: 'muted small', text: 'Muse Spark reads only these totals for your area, never traveler names.' }),
          insQ, insBtn, insOut
        ])
      ]);
      Motion.reveal(box);
    };
    var load = function () {
      Api.partnerDashboard(Auth.token(), days, area).then(function (d) { if (token === renderToken) show(d); }, function (err) {
        if (token !== renderToken) return;
        if (err && err.code === 'SIGNED_OUT') { Auth.clear(); route(); return; }
        if (err && err.code === 'NOT_PARTNER') { requestForm(); return; }
        if (err && err.code === 'PARTNER_PENDING') { pendingCard(err.message); return; }
        box.textContent = ''; box.appendChild(el('p', { class: 'empty', text: friendlyError(err) }));
      });
    };
    setView(el('section', { class: 'section section--narrow stack-lg' }, [head, box]));
    focusHeading();
    load();
  }

  // ---------------------------------------------------------------------------
  // Hotline partners (#/partner): hospitals, clinics, veterinary clinics and drugstores list their number and pin.
  // ---------------------------------------------------------------------------

  function renderPartner() {
    var type = el('select', { id: 'pt-type' }, [
      el('optgroup', { label: 'Government and barangay' }, [['police', 'Police station'], ['tanod', 'Barangay tanod outpost'], ['fire', 'Fire station'], ['drrmo', 'DRRMO (Disaster Risk Reduction and Management Office)'], ['healthoffice', 'Municipal / city health office'], ['postoffice', 'Post office (for mailing SMILE postcards)']].map(function (t) { return el('option', { value: t[0], text: t[1] }); })),
      el('optgroup', { label: 'Health and pets' }, [['hospital', 'Hospital'], ['clinic', 'Clinic'], ['vet', 'Veterinary clinic'], ['drugstore', 'Drugstore / pharmacy']].map(function (t) { return el('option', { value: t[0], text: t[1] }); }))
    ]);
    type.value = 'police';
    var name = el('input', { id: 'pt-name', type: 'text', maxlength: '80', placeholder: 'e.g. La Paz Police Station, Brgy. Tabuc Suba Tanod Outpost' });
    var prov = el('select', { id: 'pt-prov' }, PROVINCES.map(function (p) { return el('option', { value: p.id, text: p.name }); }));
    prov.value = currentProvince() || DEFAULT_PROVINCE;
    var address = el('input', { id: 'pt-address', type: 'text', maxlength: '120', placeholder: 'Street, barangay, town or city' });
    var phone = el('input', { id: 'pt-phone', type: 'tel', maxlength: '40', placeholder: 'e.g. (033) 123 4567 or 0917 123 4567' });
    var notes = el('input', { id: 'pt-notes', type: 'text', maxlength: '120', placeholder: 'e.g. Open 24 hours, emergency room, accepts pets' });
    var person = el('input', { id: 'pt-person', type: 'text', maxlength: '60', placeholder: 'Your name and role (for our verification call)' });
    var trap = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', class: 'hp-field', 'aria-hidden': 'true' });
    var confirm = el('input', { id: 'pt-confirm', type: 'checkbox' });
    var pin = null;
    var pinNote = el('span', { class: 'muted small', role: 'status', 'aria-live': 'polite', text: 'Stand at your entrance and tap, so travelers get the blue route to your door.' });
    var pinBtn = button('Pin our location (GPS)', 'pin', { small: true, variant: 'light', onclick: function () {
      setBusy(pinBtn, true, 'Finding you…');
      Geo.get().then(function (h) {
        pin = { lat: Math.round(h.lat * 1e5) / 1e5, lng: Math.round(h.lng * 1e5) / 1e5 };
        pinNote.textContent = 'Pinned! (within about ' + kmText((h.acc || 20) / 1000) + ')';
      }, function (err) { pinNote.textContent = err.message; }).then(function () { setBusy(pinBtn, false); });
    } });
    var out = outputBox();
    var submit = button('Send for verification', 'send', { type: 'submit', block: true, variant: 'green' });
    var form = el('form', { class: 'card stack', onsubmit: function (e) {
      e.preventDefault();
      if (!name.value.trim()) { toast('Type the name of your office or business.'); name.focus(); return; }
      if (!phone.value.trim()) { toast('Type the phone number travelers can call.'); phone.focus(); return; }
      if (!address.value.trim()) { toast('Type your address.'); address.focus(); return; }
      if (!confirm.checked) { toast('Please tick the box to confirm.'); confirm.focus(); return; }
      if (!pin && !window.confirm('You have not pinned your location yet. Send without the map pin?')) return;
      setBusy(submit, true, 'Sending…');
      out.loading('Sending your hotline…');
      Api.hotlineSubmit({ type: type.value, name: name.value.trim(), province: prov.value, address: address.value.trim(), phone: phone.value.trim(), notes: notes.value.trim(),
        contact_person: person.value.trim(), lat: pin ? pin.lat : '', lng: pin ? pin.lng : '', confirm: true, website: trap.value }).then(function (r) {
        out.show(r.message || 'Salamat! The SMILE team will call to verify your number.', 'ok');
        form.reset(); pin = null; pinNote.textContent = 'Stand at your entrance and tap, so travelers get the blue route to your door.';
        delete hotlineCache.all;
      }, function (err) { out.show(friendlyError(err), 'error'); }).then(function () { setBusy(submit, false); });
    } }, [
      formField('pt-type', 'We are a', type),
      formField('pt-name', 'Name', name),
      formField('pt-prov', 'Province', prov),
      formField('pt-address', 'Address', address),
      el('div', { class: 'btn-row shop-pin' }, [pinBtn, pinNote]),
      formField('pt-phone', 'Phone number for travelers', phone),
      formField('pt-notes', 'Hours and services (optional)', notes),
      formField('pt-person', 'Contact person (not shown to travelers)', person),
      trap,
      el('label', { class: 'check-row', for: 'pt-confirm' }, [confirm, el('span', { text: 'I represent this office or business, and this number and location are correct. SMILE may call to verify.' })]),
      submit, out
    ]);
    setView(el('section', { class: 'section section--narrow stack-lg' }, [
      pageHead('phone', '#E2141E', 'List your hotline', 'Police stations, barangay tanod outposts, fire stations, DRRMOs, health offices, hospitals, clinics, veterinary clinics and drugstores: be there for travelers in an emergency. Free to join. The SMILE team calls to verify each number before it appears in the Hotline.'),
      form
    ]));
    focusHeading();
  }

  // ---------------------------------------------------------------------------
  // Travel journal (#/journal): speak or type, Muse Spark tidies or translates it, add a selfie or photo
  // and a short clip, generate a caption, then keep it private or share it on the SMILE Hub.
  // ---------------------------------------------------------------------------

  var JOURNAL_LANGS = [['en', 'English'], ['tl', 'Tagalog'], ['hil', 'Hiligaynon']];

  function renderJournal(token, query) {
    var head = pageHead('mic', '#ED0460', 'My travel journal', 'Tell your story out loud or type it. Muse Voice writes down what you say, Muse Spark polishes or translates it, and you can share it on the SMILE Hub.');
    if (!Auth.user()) {
      setView(el('section', { class: 'section section--narrow' }, [head, signInCard('Your travel journal is saved to your account, so you can read it again on any phone.')]));
      focusHeading();
      return;
    }
    var place = el('select', { id: 'j-place' });
    var fillPlaces = function () {
      var keep = place.value || query.place || '';
      place.textContent = '';
      place.appendChild(el('option', { value: '', text: 'Somewhere else / not a SMILE place' }));
      PROVINCES.forEach(function (pv) {
        var ps = State.places.filter(function (p) { return provinceOf(p) === pv.id; });
        if (ps.length) place.appendChild(el('optgroup', { label: pv.name }, ps.map(function (p) { return el('option', { value: p.id, text: p.name }); })));
      });
      place.value = keep;
    };
    fillPlaces();
    var location2 = el('input', { id: 'j-loc', type: 'text', maxlength: '80', placeholder: 'e.g. Sugar Beach, Sipalay' });
    var locField = formField('j-loc', 'Where were you?', location2);
    var syncLoc = function () { locField.hidden = !!place.value; };
    place.addEventListener('change', syncLoc);
    var lang = el('select', { id: 'j-lang' }, JOURNAL_LANGS.map(function (l) { return el('option', { value: l[0], text: l[1] }); }));
    lang.value = storageGet('smile.lang') === 'tl' ? 'tl' : (storageGet('smile.lang') === 'hil' ? 'hil' : 'en');
    var story = el('textarea', { id: 'j-text', rows: '6', maxlength: '3000', placeholder: 'What did you see, taste and feel today?' });
    var undoText = null;
    var mic = micButton({ label: 'Speak my story', maxSec: 120, lang: function () { return lang.value; }, onText: function (t) {
      story.value = (story.value.trim() ? story.value.trim() + ' ' : '') + t;
      toast('Added what you said. You can edit it, or let Muse Spark polish it.');
    } });
    var tidyOut = outputBox();
    var tidy = button('Polish / translate with Muse Spark', 'sparkle', { small: true, variant: 'blue', onclick: function () {
      if (!story.value.trim()) { toast('Say or type your story first.'); return; }
      setBusy(tidy, true, 'Writing…');
      tidyOut.loading('Muse Spark is writing your entry in ' + lang.options[lang.selectedIndex].text + '…');
      Api.translate(story.value.trim(), lang.value).then(function (r) {
        undoText = story.value; story.value = r.text || story.value;
        tidyOut.show('Done. Edit anything you like.' + (r.demo ? ' (Demo mode: AI key not set.)' : ''), r.demo ? 'warn' : 'ok');
        undoBtn.hidden = false;
      }, function (err) { tidyOut.show(friendlyError(err), 'error'); }).then(function () { setBusy(tidy, false); });
    } });
    var undoBtn = button('Undo', 'refresh', { small: true, variant: 'light', onclick: function () { if (undoText != null) { story.value = undoText; undoText = null; undoBtn.hidden = true; tidyOut.hidden = true; } } });
    undoBtn.hidden = true;

    var photo = null, video = null;
    var photoPrev = el('img', { class: 'proof-preview', alt: 'Your journal photo', hidden: true });
    var photoRemove = button('Remove photo', 'close', { small: true, variant: 'light', onclick: function () { photo = null; photoPrev.hidden = true; photoRemove.hidden = true; } });
    photoRemove.hidden = true;
    var picker = photoPicker({ id: 'j-photo', facing: 'user', cameraLabel: 'Take a selfie', title: 'Journal selfie', hint: 'Smile! Tap the round button, or use the timer.', variant: 'orange', max: 1600,
      onPhoto: function (r) { photo = r; photoPrev.src = r.dataUrl; photoPrev.hidden = false; photoRemove.hidden = false; } });
    var vidIn = el('input', { type: 'file', accept: 'video/*', hidden: true });
    var vidBox = el('div', { class: 'stack' });
    var paintVideo = function (msg) {
      vidBox.textContent = '';
      if (video) {
        vidBox.appendChild(el('video', { class: 'media-video', controls: true, playsinline: true, src: video.previewUrl }));
        vidBox.appendChild(button('Remove clip', 'close', { small: true, variant: 'light', onclick: function () { URL.revokeObjectURL(video.previewUrl); video = null; paintVideo(); } }));
      } else vidBox.appendChild(button('Add a short clip (up to 15 s)', 'camera', { variant: 'light', onclick: function () { vidIn.click(); } }));
      if (msg) vidBox.appendChild(el('p', { class: 'muted small', text: msg }));
    };
    vidIn.addEventListener('change', function () {
      var f = vidIn.files && vidIn.files[0]; vidIn.value = '';
      if (!f) return;
      vidBox.textContent = '';
      var prog = el('p', { class: 'muted small', role: 'status', text: 'Preparing your clip…' });
      vidBox.appendChild(prog);
      prepareVideo(f, function (p) { prog.textContent = 'Preparing your clip… ' + Math.round(p * 100) + '%'; })
        .then(function (r) { r.previewUrl = URL.createObjectURL(r.blob); video = r; paintVideo(); }, function (err) { video = null; paintVideo(err.message); });
    });
    paintVideo();

    var caption = el('textarea', { id: 'j-cap', rows: '2', maxlength: '400', placeholder: 'A short caption for your post' });
    var capBtn = button('Generate caption', 'caption', { small: true, variant: 'yellow', onclick: function () {
      if (!story.value.trim() && !photo) { toast('Add your story or a photo first.'); return; }
      setBusy(capBtn, true, 'Writing…');
      Api.journalCaption({ text: story.value.trim(), place_id: place.value, location: location2.value.trim(), photo: photo ? photo.dataUrl : '' })
        .then(function (r) { caption.value = r.caption || caption.value; }, function (err) { toast(friendlyError(err)); })
        .then(function () { setBusy(capBtn, false); });
    } });
    var vis = 'public';
    var visRadio = function (value, label, sub) {
      var input = el('input', { type: 'radio', name: 'j-vis', value: value, checked: value === 'public' });
      input.addEventListener('change', function () { vis = value; });
      return el('label', { class: 'radio-card' }, [input, el('span', null, [el('b', { text: label }), el('small', { text: sub })])]);
    };
    var out = outputBox();
    var save = button('Save to my journal', 'save', { type: 'submit', block: true, variant: 'green' });
    var form = el('form', { class: 'card stack', onsubmit: function (e) {
      e.preventDefault();
      if (!story.value.trim() && !photo && !video) { toast('Add your story, a photo or a clip first.'); return; }
      setBusy(save, true, 'Saving…');
      out.loading(video ? 'Saving your entry and uploading your clip…' : 'Saving your entry…');
      Api.journalSave({ token: Auth.token(), place_id: place.value, location: location2.value.trim(), province: place.value ? '' : currentProvince(),
        text: story.value.trim(), caption: caption.value.trim(), lang: lang.value, photo: photo ? photo.dataUrl : '', video: video ? video.dataUrl : '', visibility: vis })
        .then(function (r) {
          var msg = r.visibility === 'private' ? 'Saved in your private journal.' : (r.status === 'live' ? 'Posted! Your adventure is now on the SMILE Hub.' : 'Saved. ' + (r.note || 'It will show on the SMILE Hub after a quick review.'));
          out.show(msg, r.status === 'live' || r.visibility === 'private' ? 'ok' : 'warn');
          story.value = ''; caption.value = ''; photo = null; photoPrev.hidden = true; photoRemove.hidden = true;
          if (video) { URL.revokeObjectURL(video.previewUrl); video = null; } paintVideo();
          out.appendChild(el('div', { class: 'btn-row' }, [button('See my journal', 'user', { small: true, variant: 'light', href: '#/me' }), button('Open SMILE Hub', 'heart', { small: true, variant: 'light', href: '#/hub' })]));
        }, function (err) {
          if (err && err.code === 'SIGNED_OUT') Auth.clear();
          out.show(friendlyError(err), 'error');
        }).then(function () { setBusy(save, false); });
    } }, [
      formField('j-place', 'Where are you?', place), locField,
      el('h3', { class: 'sell-items__title', text: 'Your story' }),
      el('div', { class: 'journal-voice' }, [formField('j-lang', 'Write it in', lang), mic]),
      story,
      el('div', { class: 'btn-row' }, [tidy, undoBtn]), tidyOut,
      el('h3', { class: 'sell-items__title', text: 'Selfie or photo' }), picker, photoPrev, photoRemove,
      el('h3', { class: 'sell-items__title', text: 'Short video clip' }), vidBox, vidIn,
      formField('j-cap', 'Caption', caption), capBtn,
      el('fieldset', { class: 'radio-group' }, [el('legend', { class: 'field__label', text: 'Who can see it?' }),
        visRadio('public', 'Share on the SMILE Hub', 'Everyone can see it with your name and rank.'),
        visRadio('private', 'Only me', 'Kept in your private journal.')]),
      save, out
    ]);
    setView(el('section', { class: 'section section--narrow' }, [head, form]));
    syncLoc();
    focusHeading();
    loadPlaces().then(function () { if (token === renderToken) { fillPlaces(); syncLoc(); } });
  }

  // ---------------------------------------------------------------------------
  // SMILE Hub (#/hub): everyone's public travel posts, with the traveler's rank.
  // ---------------------------------------------------------------------------

  function renderHub(token) {
    var filter = '';
    var feed = el('div', { class: 'feed' });
    var load = function () {
      feed.textContent = '';
      feed.appendChild(el('p', { class: 'muted', text: 'Loading the latest adventures…' }));
      Api.hub(filter).then(function (r) {
        if (token !== renderToken) return;
        feed.textContent = '';
        var posts = Array.isArray(r.posts) ? r.posts : [];
        appendChildren(feed, posts.length ? posts.map(function (p) { return postCard(p); })
          : el('p', { class: 'empty' }, ['No posts here yet. ', el('a', { href: '#/journal', text: 'Be the first to share your adventure' }), '!']));
        Motion.reveal(feed);
      }, function (err) {
        if (token !== renderToken) return;
        feed.textContent = '';
        feed.appendChild(el('p', { class: 'empty', text: State.demo ? 'The SMILE Hub needs the server connection (demo mode).' : friendlyError(err) }));
      });
    };
    setView(el('section', { class: 'section section--narrow' }, [
      pageHead('heart', '#ED0460', 'SMILE Hub', 'Real trips by SMILE explorers across Western Visayas and the Negros Island Region. Every post shows the traveler\'s rank, so keep collecting stamps!'),
      el('div', { class: 'btn-row' }, [
        button('Share your adventure', 'mic', { variant: 'glow', href: '#/journal' }),
        button('Ranks', 'trophy', { variant: 'light', href: '#/ranks' })
      ]),
      feed
    ]));
    focusHeading();
    loadPlaces();
    load();
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
el('article', { class: 'card stack reveal' }, [
          el('h2', { class: 'card__title' }, [el('span', { class: 'card-icon card-icon--sm', style: 'background:#0057D9' }, icon('chart')), 'LGU and DOT Partner portal']),
          el('p', { class: 'muted', text: 'For tourism offices: local and foreign visitors, top and quiet places, purchases at SMILE merchants in your area, and Muse Spark insights. Sign in with your partner account.' }),
          button('Open the Partner portal', 'chart', { block: true, variant: 'blue', href: '#/partners' })
        ])
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
  /** Round avatar: the traveler's photo, or their first letter. */
  function avatarEl(name, photoId, big) {
    var cls = 'post__avatar' + (big ? ' post__avatar--big' : '') + (photoId ? ' has-photo' : '');
    if (photoId) return el('span', { class: cls }, driveImg(photoId, big ? 240 : 96, name ? 'Photo of ' + name : ''));
    return el('span', { class: cls, 'aria-hidden': 'true', text: String(name || '?').charAt(0).toUpperCase() });
  }

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
      var custom = Camera.opts && Camera.opts.parse;
      var parsed = custom ? Camera.opts.parse(val) : parsePostcardQR(val);
      if (!parsed || !parsed.code) {
        if (Date.now() - Camera.lastMsg > 2500) { Camera.lastMsg = Date.now(); Camera.say(custom ? (Camera.opts.badQr || 'That QR is not the right kind. Try again.') : 'That QR is not a SMILE postcard. Try the QR on the back of your postcard.'); }
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
          var okQr = val && (Camera.opts && Camera.opts.parse ? Camera.opts.parse(val) : parsePostcardQR(val));
          if (okQr && okQr.code) Camera.gotQR(val);
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
    ranks: renderRanks,
    media: renderMediaAdmin,
    events: renderEvents,
    dashboard: renderDashboard,
    me: renderMe,
    partner: renderPartner,
    partners: renderPartners,
    journal: renderJournal,
    hub: renderHub
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
    setTimeout(hideSplash, prefersReducedMotion() ? 0 : 2600);
    loadPlaces();
    loadMedia();
    Auth.paint();
    var hb = $('#hotline-btn');
    if (hb) hb.addEventListener('click', function () { Hotline.open(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Exposed for automated tests only (no secrets here).
  window.SmileApp = { Camera: Camera, parsePostcardQR: parsePostcardQR, State: State, Passport: Passport, Install: Install, Modal: Modal, route: route, rankOf: rankOf };
})();
