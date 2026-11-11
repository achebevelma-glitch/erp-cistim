// Maps a product to its picture in the /public folder.
// 1) If the product name is the same as a picture's file name, that picture is used.
// 2) Otherwise the first rule whose words appear in the name, category or SKU wins.
//    Specific rules come before general ones.

const FILES = [
  'Apple Watch SE.png',
  'DJI Mini 3.jpg',
  'GoPro HERO12.jpg',
  'Holy Stone HS720E.jpg',
  'Huawei B311 4G LTE Router.png',
  'Laptop Charger 65W.png',
  'Laptop bag.png',
  'Lenovo IdeaPad 15 Laptop.png',
  'Lenovo Tab M10.png',
  'Modem.png',
  'PlayStation 5 Console.jpg',
  'Samsung Galaxy Tab A9.png',
  'Smart Tv 32 HD .png',
  'Smart Tv 64 HD .png',
  'TP-Link 8-Port Gigabit Switch.png',
  'TP-Link Archer C6 Wi-Fi Router.png',
  'Tenda AC10 Wi-Fi Router.png',
  'Wired USB Mouse.png',
  'Wireless Keyboard.png',
  'Xbox Series S.jpg',
  'Xiaomi Pad 6.png',
  'iPad 10th Generation.png',
];

// [picture, words that identify it (any one is enough)]
const RULES = [
  ['Laptop Charger 65W.png', ['charger', 'adapter', 'adaptor']],
  ['Laptop bag.png', ['bag', 'bags', 'backpack']],
  ['DJI Mini 3.jpg', ['dji', 'mini 3', 'osmo']],
  ['Holy Stone HS720E.jpg', ['holy stone', 'holystone', 'hs720e', 'hs720']],
  ['GoPro HERO12.jpg', ['gopro', 'hero12', 'hero 12', 'action camera']],
  ['PlayStation 5 Console.jpg', ['playstation', 'ps5']],
  ['Xbox Series S.jpg', ['xbox', 'series s']],
  ['Apple Watch SE.png', ['watch se']],
  ['iPad 10th Generation.png', ['ipad 10', 'ipad 10th']],
  ['Samsung Galaxy Tab A9.png', ['tab a9']],
  ['Lenovo Tab M10.png', ['tab m10']],
  ['Xiaomi Pad 6.png', ['xiaomi pad 6', 'pad 6']],
  ['TP-Link Archer C6 Wi-Fi Router.png', ['archer', 'c6']],
  ['Tenda AC10 Wi-Fi Router.png', ['tenda', 'ac10']],
  ['Huawei B311 4G LTE Router.png', ['huawei', 'b311', 'mifi']],
  ['Modem.png', ['modem', 'm7200']],
  ['TP-Link 8-Port Gigabit Switch.png', ['8-port', '8 port', 'switch', 'tcp']],
  ['Smart Tv 64 HD .png', ['tv 64', '64 inch', '65 inch', '64 hd', 'globalstar', 'qled']],
  ['Smart Tv 32 HD .png', ['tv 32', '32 inch', '32 hd', 'smart tv', 'television']],
  ['Lenovo IdeaPad 15 Laptop.png', ['ideapad', 'elitebook', 'laptop', 'notebook']],
  ['Wireless Keyboard.png', ['keyboard', 'keypad']],
  ['Wired USB Mouse.png', ['mouse']],
];

const normalise = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const urlFor = (file) => `${import.meta.env.BASE_URL}${encodeURIComponent(file)}`;

/** Returns the image URL for a product, or null when there is none. */
export function getProductImage(product) {
  if (!product) return null;
  if (product.imageUrl) return product.imageUrl;

  const name = normalise(product.name);

  // 1) the product name is the same as a picture's file name
  const exact = FILES.find((file) => normalise(file) === name);
  if (exact) return urlFor(exact);

  // 2) words found in the name, category or SKU
  const category = product.category?.name || product.category || '';
  const text = normalise(`${product.name} ${category} ${product.sku}`);
  const haystack = ` ${text} `;
  const tokens = new Set(text.split(/[ -]/));
  // Short words like "tv" or "c6" must match a whole word, not part of one.
  const hit = (word) => (word.length <= 4 ? tokens.has(word) : haystack.includes(word));

  for (const [file, words] of RULES) {
    if (words.some(hit)) return urlFor(file);
  }
  console.info('No product image for:', product.name);
  return null;
}