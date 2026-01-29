/**
 * List of retailers and shops active in Serbia
 * Used for voice input parsing to ensure shop names are standardized
 */

export const SERBIAN_SHOPS = [
  // Supermarkets & Hypermarkets
  'Maxi',
  'Idea',
  'Roda',
  'Tempo',
  'Univerexport',
  'Aman',
  'Dis',
  'Lidl',
  'Mercator',
  'Super Vero',
  'Aviv Park',
  'Gomex',
  'DP Market',
  'Nectar',

  // Tech & Electronics
  'Gigatron',
  'Tehnomanija',
  'Emmi',
  'Win Win',
  'Comtrade',
  'Extreme Digital',
  'Istyle',
  'iStyle',
  'Benchmark',
  'Micronis',
  'eKapija',
  'Links',
  'Planeta',
  'PC Practic',
  'Smart',

  // Fashion & Clothing
  'Zara',
  'H&M',
  'Reserved',
  'New Yorker',
  'C&A',
  'Bershka',
  'Pull&Bear',
  'Mango',
  'Terranova',
  'LC Waikiki',
  'Sport Vision',
  'Office Shoes',
  'Deichmann',
  'Buzz',
  'Fashion Company',
  'Fashion&Friends',
  'Takko',
  'Intersport',
  'Decathlon',

  // Pharmacies
  'Apoteka Beograd',
  'Jankovic',
  'Lilly',
  'Zegin',
  'Benu',
  'Sekos',

  // Cosmetics & Drugstores
  'DM',
  'Lilly Drogerie',
  'Kozmo',
  'Sephora',
  'Notino',
  'Golden Rose',

  // Home & Furniture
  'Ikea',
  'IKEA',
  'JYSK',
  'Lesnina',
  'Forma Ideale',
  'Emmezeta',
  'Home Box',
  'Kupatila RS',
  'Casa',
  'Conforama',

  // DIY & Hardware
  'Bauhaus',
  'Bricostore',
  'Technoplast',
  'Univerexport Tehnika',
  'Tempo Market',
  'Merkur',
  'BigM',

  // Bookstores
  'Vulkan',
  'Laguna',
  'Delfi',
  'Evro Book',
  'Eduka',

  // Bakeries & Pastries
  'Hleb & Kifle',
  'Zorka',
  'Toma Varga',
  'Dona',
  'Pekara Trpkovic',
  'Pekabeta',
  'Walter',
  'Pan Pek',

  // Restaurants & Fast Food
  'McDonald\'s',
  'KFC',
  'Pizza Hut',
  'Subway',
  'Burger King',
  'Walter',
  'Smokvica',
  'Little Bay',
  'Kafana',
  'Madera',
  'Zaplet',

  // Cafes
  'Kafeterija',
  'Costa Coffee',
  'McCafe',
  'Starbucks',

  // Gas Stations
  'NIS',
  'OMV',
  'MOL',
  'Gazprom',
  'Lukoil',
  'EKO',
  'Knez Petrol',

  // Pet Shops
  'Pet Centar',
  'Zoo Markt',
  'Alfa Pet Shop',
  'Yumis',

  // Sports & Outdoor
  'Sportina',
  'Buzz Sport',
  'Hervis',
  'Planet Sport',
  'Active',

  // Toy Stores
  'Muller',
  'Müller',
  'Toys',
  'Dexy Co',

  // Online Retailers
  'Kupindo',
  'Limundo',
  'Eponuda',
  'Shoppster',
  'Bcgroup',
  'eKupi',
  'Top Shop',

  // Mobile Operators & Shops
  'Telenor',
  'A1',
  'Yettel',
  'Mts',
  'MTS',
  'Telekom',
  'Globaltel',
  'Iđmobil',
  'Idmobil',

  // Department Stores
  'Ušće Shopping Center',
  'Usce Shopping Center',
  'Big Fashion',
  'Delta City',
  'Galerija Belgrade',

  // Other Retail
  'Avon',
  'Oriflame',
  'Farmasi',
  'Amway',
  'Tupperware',
  'dm',
  'Aroma',
  'Gomex',
  'Kineski shop',
  'Kineski',
  'Pijaca',
  'Buvlja pijaca',
  'Zelena pijaca',
  'Kalenic pijaca',
  'Kalenić pijaca',
  'Kalenić',
  'Bajloni pijaca',
  'Bajloni',
  'Kivi',
  "Kiwi",

  // Utilities & Services
  'Pošta',
  'Posta',
  'Post Express',
  'AKS',
  'DExpress',
  'BEX',
  'City Express',

  // Other (fallback)
  'Other',
  'Ostalo'
];

/**
 * Normalize shop name to match against the list
 * Handles case-insensitive matching and common variations
 */
export function normalizeShopName(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'Other';
  }

  const normalized = input.trim();

  // Find exact match (case-insensitive)
  const match = SERBIAN_SHOPS.find(
    shop => shop.toLowerCase() === normalized.toLowerCase()
  );

  if (match) {
    return match;
  }

  // Find partial match (shop name contains or is contained in input)
  const partialMatch = SERBIAN_SHOPS.find(shop => {
    const shopLower = shop.toLowerCase();
    const inputLower = normalized.toLowerCase();
    return shopLower.includes(inputLower) || inputLower.includes(shopLower);
  });

  return partialMatch || 'Other';
}
