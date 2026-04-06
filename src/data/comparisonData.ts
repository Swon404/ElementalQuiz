/**
 * Comparison data for "Which is Bigger?" quiz questions.
 * Keyed by atomic number.
 *
 * density        – g/cm³ at standard conditions (null = synthetic / unmeasured)
 * pricePerKg     – approximate USD per kg (null = not commercially available)
 * dangerLevel    – kid-friendly 1–10 scale (1 = harmless, 10 = extremely dangerous)
 * abundanceCrust – parts-per-million in Earth's crust (null = synthetic)
 * meltingPoint   – °C (null = unknown / predicted)
 * boilingPoint   – °C (null = unknown / predicted)
 */

export type ComparisonData = {
  density: number | null;
  pricePerKg: number | null;
  dangerLevel: number;
  abundanceCrust: number | null;
  meltingPoint: number | null;
  boilingPoint: number | null;
};

export const comparisonData: Record<number, ComparisonData> = {
  // 1 – Hydrogen
  1: { density: 0.00009, pricePerKg: 10, dangerLevel: 3, abundanceCrust: 1400, meltingPoint: -259, boilingPoint: -253 },
  // 2 – Helium
  2: { density: 0.00018, pricePerKg: 50, dangerLevel: 1, abundanceCrust: 0.008, meltingPoint: -272, boilingPoint: -269 },
  // 3 – Lithium
  3: { density: 0.534, pricePerKg: 70, dangerLevel: 4, abundanceCrust: 20, meltingPoint: 181, boilingPoint: 1342 },
  // 4 – Beryllium
  4: { density: 1.85, pricePerKg: 850, dangerLevel: 7, abundanceCrust: 2.8, meltingPoint: 1287, boilingPoint: 2469 },
  // 5 – Boron
  5: { density: 2.34, pricePerKg: 5, dangerLevel: 2, abundanceCrust: 10, meltingPoint: 2076, boilingPoint: 3927 },
  // 6 – Carbon
  6: { density: 2.27, pricePerKg: 0.1, dangerLevel: 1, abundanceCrust: 200, meltingPoint: 3550, boilingPoint: 4027 },
  // 7 – Nitrogen
  7: { density: 0.0013, pricePerKg: 0.5, dangerLevel: 2, abundanceCrust: 19, meltingPoint: -210, boilingPoint: -196 },
  // 8 – Oxygen
  8: { density: 0.0014, pricePerKg: 0.3, dangerLevel: 2, abundanceCrust: 461000, meltingPoint: -219, boilingPoint: -183 },
  // 9 – Fluorine
  9: { density: 0.0017, pricePerKg: 2, dangerLevel: 9, abundanceCrust: 585, meltingPoint: -220, boilingPoint: -188 },
  // 10 – Neon
  10: { density: 0.0009, pricePerKg: 240, dangerLevel: 1, abundanceCrust: 0.005, meltingPoint: -249, boilingPoint: -246 },
  // 11 – Sodium
  11: { density: 0.97, pricePerKg: 3, dangerLevel: 5, abundanceCrust: 23600, meltingPoint: 98, boilingPoint: 883 },
  // 12 – Magnesium
  12: { density: 1.74, pricePerKg: 2.5, dangerLevel: 2, abundanceCrust: 23300, meltingPoint: 650, boilingPoint: 1091 },
  // 13 – Aluminium
  13: { density: 2.7, pricePerKg: 2, dangerLevel: 1, abundanceCrust: 82300, meltingPoint: 660, boilingPoint: 2519 },
  // 14 – Silicon
  14: { density: 2.33, pricePerKg: 2, dangerLevel: 1, abundanceCrust: 282000, meltingPoint: 1414, boilingPoint: 3265 },
  // 15 – Phosphorus
  15: { density: 1.82, pricePerKg: 3, dangerLevel: 6, abundanceCrust: 1050, meltingPoint: 44, boilingPoint: 281 },
  // 16 – Sulfur
  16: { density: 2.07, pricePerKg: 0.1, dangerLevel: 3, abundanceCrust: 350, meltingPoint: 115, boilingPoint: 445 },
  // 17 – Chlorine
  17: { density: 0.0032, pricePerKg: 0.2, dangerLevel: 7, abundanceCrust: 145, meltingPoint: -101, boilingPoint: -34 },
  // 18 – Argon
  18: { density: 0.0018, pricePerKg: 1, dangerLevel: 1, abundanceCrust: 3.5, meltingPoint: -189, boilingPoint: -186 },
  // 19 – Potassium
  19: { density: 0.86, pricePerKg: 13, dangerLevel: 5, abundanceCrust: 20900, meltingPoint: 64, boilingPoint: 759 },
  // 20 – Calcium
  20: { density: 1.55, pricePerKg: 2, dangerLevel: 3, abundanceCrust: 41500, meltingPoint: 842, boilingPoint: 1484 },
  // 21 – Scandium
  21: { density: 2.99, pricePerKg: 15000, dangerLevel: 2, abundanceCrust: 22, meltingPoint: 1541, boilingPoint: 2836 },
  // 22 – Titanium
  22: { density: 4.51, pricePerKg: 11, dangerLevel: 1, abundanceCrust: 5650, meltingPoint: 1668, boilingPoint: 3287 },
  // 23 – Vanadium
  23: { density: 6.11, pricePerKg: 30, dangerLevel: 3, abundanceCrust: 120, meltingPoint: 1910, boilingPoint: 3407 },
  // 24 – Chromium
  24: { density: 7.15, pricePerKg: 10, dangerLevel: 4, abundanceCrust: 102, meltingPoint: 1907, boilingPoint: 2671 },
  // 25 – Manganese
  25: { density: 7.44, pricePerKg: 2, dangerLevel: 3, abundanceCrust: 950, meltingPoint: 1246, boilingPoint: 2061 },
  // 26 – Iron
  26: { density: 7.87, pricePerKg: 0.4, dangerLevel: 1, abundanceCrust: 56300, meltingPoint: 1538, boilingPoint: 2862 },
  // 27 – Cobalt
  27: { density: 8.9, pricePerKg: 33, dangerLevel: 4, abundanceCrust: 25, meltingPoint: 1495, boilingPoint: 2927 },
  // 28 – Nickel
  28: { density: 8.91, pricePerKg: 15, dangerLevel: 3, abundanceCrust: 84, meltingPoint: 1455, boilingPoint: 2913 },
  // 29 – Copper
  29: { density: 8.96, pricePerKg: 9, dangerLevel: 2, abundanceCrust: 60, meltingPoint: 1085, boilingPoint: 2562 },
  // 30 – Zinc
  30: { density: 7.13, pricePerKg: 3, dangerLevel: 2, abundanceCrust: 70, meltingPoint: 420, boilingPoint: 907 },
  // 31 – Gallium
  31: { density: 5.91, pricePerKg: 300, dangerLevel: 2, abundanceCrust: 19, meltingPoint: 30, boilingPoint: 2204 },
  // 32 – Germanium
  32: { density: 5.32, pricePerKg: 1200, dangerLevel: 2, abundanceCrust: 1.5, meltingPoint: 938, boilingPoint: 2833 },
  // 33 – Arsenic
  33: { density: 5.73, pricePerKg: 1, dangerLevel: 9, abundanceCrust: 1.8, meltingPoint: 817, boilingPoint: 614 },
  // 34 – Selenium
  34: { density: 4.81, pricePerKg: 22, dangerLevel: 5, abundanceCrust: 0.05, meltingPoint: 221, boilingPoint: 685 },
  // 35 – Bromine
  35: { density: 3.12, pricePerKg: 5, dangerLevel: 7, abundanceCrust: 2.4, meltingPoint: -7, boilingPoint: 59 },
  // 36 – Krypton
  36: { density: 0.0037, pricePerKg: 400, dangerLevel: 1, abundanceCrust: 0.0001, meltingPoint: -157, boilingPoint: -153 },
  // 37 – Rubidium
  37: { density: 1.53, pricePerKg: 12000, dangerLevel: 5, abundanceCrust: 90, meltingPoint: 39, boilingPoint: 688 },
  // 38 – Strontium
  38: { density: 2.64, pricePerKg: 6, dangerLevel: 3, abundanceCrust: 370, meltingPoint: 777, boilingPoint: 1382 },
  // 39 – Yttrium
  39: { density: 4.47, pricePerKg: 35, dangerLevel: 2, abundanceCrust: 33, meltingPoint: 1526, boilingPoint: 3336 },
  // 40 – Zirconium
  40: { density: 6.51, pricePerKg: 25, dangerLevel: 2, abundanceCrust: 165, meltingPoint: 1855, boilingPoint: 4409 },
  // 41 – Niobium
  41: { density: 8.57, pricePerKg: 75, dangerLevel: 2, abundanceCrust: 20, meltingPoint: 2477, boilingPoint: 4744 },
  // 42 – Molybdenum
  42: { density: 10.22, pricePerKg: 40, dangerLevel: 2, abundanceCrust: 1.2, meltingPoint: 2623, boilingPoint: 4639 },
  // 43 – Technetium
  43: { density: 11.5, pricePerKg: 100000, dangerLevel: 8, abundanceCrust: null, meltingPoint: 2157, boilingPoint: 4265 },
  // 44 – Ruthenium
  44: { density: 12.37, pricePerKg: 14000, dangerLevel: 3, abundanceCrust: 0.001, meltingPoint: 2334, boilingPoint: 4150 },
  // 45 – Rhodium
  45: { density: 12.41, pricePerKg: 150000, dangerLevel: 2, abundanceCrust: 0.001, meltingPoint: 1964, boilingPoint: 3695 },
  // 46 – Palladium
  46: { density: 12.02, pricePerKg: 40000, dangerLevel: 2, abundanceCrust: 0.015, meltingPoint: 1555, boilingPoint: 2963 },
  // 47 – Silver
  47: { density: 10.49, pricePerKg: 800, dangerLevel: 1, abundanceCrust: 0.075, meltingPoint: 962, boilingPoint: 2162 },
  // 48 – Cadmium
  48: { density: 8.69, pricePerKg: 2, dangerLevel: 8, abundanceCrust: 0.15, meltingPoint: 321, boilingPoint: 767 },
  // 49 – Indium
  49: { density: 7.31, pricePerKg: 250, dangerLevel: 2, abundanceCrust: 0.25, meltingPoint: 157, boilingPoint: 2072 },
  // 50 – Tin
  50: { density: 7.29, pricePerKg: 25, dangerLevel: 1, abundanceCrust: 2.3, meltingPoint: 232, boilingPoint: 2602 },
  // 51 – Antimony
  51: { density: 6.69, pricePerKg: 6, dangerLevel: 5, abundanceCrust: 0.2, meltingPoint: 631, boilingPoint: 1587 },
  // 52 – Tellurium
  52: { density: 6.24, pricePerKg: 60, dangerLevel: 4, abundanceCrust: 0.001, meltingPoint: 450, boilingPoint: 988 },
  // 53 – Iodine
  53: { density: 4.93, pricePerKg: 35, dangerLevel: 4, abundanceCrust: 0.45, meltingPoint: 114, boilingPoint: 184 },
  // 54 – Xenon
  54: { density: 0.0059, pricePerKg: 1800, dangerLevel: 1, abundanceCrust: 0.00003, meltingPoint: -112, boilingPoint: -108 },
  // 55 – Caesium
  55: { density: 1.87, pricePerKg: 60000, dangerLevel: 7, abundanceCrust: 3, meltingPoint: 28, boilingPoint: 671 },
  // 56 – Barium
  56: { density: 3.59, pricePerKg: 55, dangerLevel: 6, abundanceCrust: 425, meltingPoint: 727, boilingPoint: 1897 },
  // 57 – Lanthanum
  57: { density: 6.15, pricePerKg: 5, dangerLevel: 2, abundanceCrust: 39, meltingPoint: 920, boilingPoint: 3464 },
  // 58 – Cerium
  58: { density: 6.77, pricePerKg: 5, dangerLevel: 2, abundanceCrust: 66.5, meltingPoint: 799, boilingPoint: 3443 },
  // 59 – Praseodymium
  59: { density: 6.77, pricePerKg: 100, dangerLevel: 2, abundanceCrust: 9.2, meltingPoint: 931, boilingPoint: 3520 },
  // 60 – Neodymium
  60: { density: 7.01, pricePerKg: 75, dangerLevel: 2, abundanceCrust: 41.5, meltingPoint: 1024, boilingPoint: 3074 },
  // 61 – Promethium
  61: { density: 7.26, pricePerKg: 460000, dangerLevel: 8, abundanceCrust: null, meltingPoint: 1042, boilingPoint: 3000 },
  // 62 – Samarium
  62: { density: 7.52, pricePerKg: 15, dangerLevel: 2, abundanceCrust: 7.05, meltingPoint: 1072, boilingPoint: 1794 },
  // 63 – Europium
  63: { density: 5.24, pricePerKg: 500, dangerLevel: 2, abundanceCrust: 2, meltingPoint: 822, boilingPoint: 1529 },
  // 64 – Gadolinium
  64: { density: 7.9, pricePerKg: 55, dangerLevel: 2, abundanceCrust: 6.2, meltingPoint: 1313, boilingPoint: 3273 },
  // 65 – Terbium
  65: { density: 8.23, pricePerKg: 700, dangerLevel: 2, abundanceCrust: 1.2, meltingPoint: 1356, boilingPoint: 3230 },
  // 66 – Dysprosium
  66: { density: 8.55, pricePerKg: 350, dangerLevel: 2, abundanceCrust: 5.2, meltingPoint: 1412, boilingPoint: 2567 },
  // 67 – Holmium
  67: { density: 8.8, pricePerKg: 1200, dangerLevel: 2, abundanceCrust: 1.3, meltingPoint: 1474, boilingPoint: 2700 },
  // 68 – Erbium
  68: { density: 9.07, pricePerKg: 95, dangerLevel: 2, abundanceCrust: 3.5, meltingPoint: 1529, boilingPoint: 2868 },
  // 69 – Thulium
  69: { density: 9.32, pricePerKg: 8000, dangerLevel: 2, abundanceCrust: 0.52, meltingPoint: 1545, boilingPoint: 1950 },
  // 70 – Ytterbium
  70: { density: 6.9, pricePerKg: 75, dangerLevel: 2, abundanceCrust: 3.2, meltingPoint: 819, boilingPoint: 1196 },
  // 71 – Lutetium
  71: { density: 9.84, pricePerKg: 10000, dangerLevel: 2, abundanceCrust: 0.8, meltingPoint: 1663, boilingPoint: 3402 },
  // 72 – Hafnium
  72: { density: 13.31, pricePerKg: 900, dangerLevel: 2, abundanceCrust: 3.0, meltingPoint: 2233, boilingPoint: 4603 },
  // 73 – Tantalum
  73: { density: 16.69, pricePerKg: 300, dangerLevel: 2, abundanceCrust: 2.0, meltingPoint: 3017, boilingPoint: 5458 },
  // 74 – Tungsten
  74: { density: 19.25, pricePerKg: 35, dangerLevel: 2, abundanceCrust: 1.3, meltingPoint: 3422, boilingPoint: 5555 },
  // 75 – Rhenium
  75: { density: 21.02, pricePerKg: 4500, dangerLevel: 3, abundanceCrust: 0.0007, meltingPoint: 3186, boilingPoint: 5596 },
  // 76 – Osmium
  76: { density: 22.59, pricePerKg: 12000, dangerLevel: 5, abundanceCrust: 0.0015, meltingPoint: 3033, boilingPoint: 5012 },
  // 77 – Iridium
  77: { density: 22.56, pricePerKg: 50000, dangerLevel: 2, abundanceCrust: 0.001, meltingPoint: 2446, boilingPoint: 4428 },
  // 78 – Platinum
  78: { density: 21.45, pricePerKg: 30000, dangerLevel: 1, abundanceCrust: 0.005, meltingPoint: 1768, boilingPoint: 3825 },
  // 79 – Gold
  79: { density: 19.3, pricePerKg: 75000, dangerLevel: 1, abundanceCrust: 0.004, meltingPoint: 1064, boilingPoint: 2856 },
  // 80 – Mercury
  80: { density: 13.53, pricePerKg: 30, dangerLevel: 9, abundanceCrust: 0.085, meltingPoint: -39, boilingPoint: 357 },
  // 81 – Thallium
  81: { density: 11.85, pricePerKg: 50, dangerLevel: 10, abundanceCrust: 0.85, meltingPoint: 304, boilingPoint: 1473 },
  // 82 – Lead
  82: { density: 11.34, pricePerKg: 2, dangerLevel: 7, abundanceCrust: 14, meltingPoint: 327, boilingPoint: 1749 },
  // 83 – Bismuth
  83: { density: 9.78, pricePerKg: 10, dangerLevel: 2, abundanceCrust: 0.009, meltingPoint: 271, boilingPoint: 1564 },
  // 84 – Polonium
  84: { density: 9.2, pricePerKg: 49000000000, dangerLevel: 10, abundanceCrust: 0.0000000002, meltingPoint: 254, boilingPoint: 962 },
  // 85 – Astatine
  85: { density: 6.35, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 302, boilingPoint: 337 },
  // 86 – Radon
  86: { density: 0.0097, pricePerKg: null, dangerLevel: 9, abundanceCrust: null, meltingPoint: -71, boilingPoint: -62 },
  // 87 – Francium
  87: { density: 1.87, pricePerKg: null, dangerLevel: 9, abundanceCrust: null, meltingPoint: 27, boilingPoint: 677 },
  // 88 – Radium
  88: { density: 5.5, pricePerKg: null, dangerLevel: 10, abundanceCrust: 0.0000009, meltingPoint: 700, boilingPoint: 1737 },
  // 89 – Actinium
  89: { density: 10.07, pricePerKg: null, dangerLevel: 9, abundanceCrust: null, meltingPoint: 1050, boilingPoint: 3200 },
  // 90 – Thorium
  90: { density: 11.72, pricePerKg: 30, dangerLevel: 7, abundanceCrust: 9.6, meltingPoint: 1750, boilingPoint: 4788 },
  // 91 – Protactinium
  91: { density: 15.37, pricePerKg: 280000, dangerLevel: 9, abundanceCrust: 0.0000014, meltingPoint: 1572, boilingPoint: 4000 },
  // 92 – Uranium
  92: { density: 18.95, pricePerKg: 100, dangerLevel: 8, abundanceCrust: 2.7, meltingPoint: 1135, boilingPoint: 4131 },
  // 93 – Neptunium
  93: { density: 20.45, pricePerKg: 660000, dangerLevel: 9, abundanceCrust: null, meltingPoint: 644, boilingPoint: 3902 },
  // 94 – Plutonium
  94: { density: 19.82, pricePerKg: 5000000, dangerLevel: 10, abundanceCrust: null, meltingPoint: 640, boilingPoint: 3228 },
  // 95 – Americium
  95: { density: 13.69, pricePerKg: 1500000, dangerLevel: 9, abundanceCrust: null, meltingPoint: 1176, boilingPoint: 2011 },
  // 96 – Curium
  96: { density: 13.51, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 1345, boilingPoint: 3110 },
  // 97 – Berkelium
  97: { density: 14.78, pricePerKg: 27000000000, dangerLevel: 10, abundanceCrust: null, meltingPoint: 986, boilingPoint: 2627 },
  // 98 – Californium
  98: { density: 15.1, pricePerKg: 27000000, dangerLevel: 10, abundanceCrust: null, meltingPoint: 900, boilingPoint: 1472 },
  // 99 – Einsteinium
  99: { density: 8.84, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 860, boilingPoint: null },
  // 100 – Fermium
  100: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 1527, boilingPoint: null },
  // 101 – Mendelevium
  101: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 827, boilingPoint: null },
  // 102 – Nobelium
  102: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 827, boilingPoint: null },
  // 103 – Lawrencium
  103: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: 1627, boilingPoint: null },
  // 104 – Rutherfordium
  104: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 105 – Dubnium
  105: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 106 – Seaborgium
  106: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 107 – Bohrium
  107: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 108 – Hassium
  108: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 109 – Meitnerium
  109: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 110 – Darmstadtium
  110: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 111 – Roentgenium
  111: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 112 – Copernicium
  112: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 113 – Nihonium
  113: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 114 – Flerovium
  114: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 115 – Moscovium
  115: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 116 – Livermorium
  116: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 117 – Tennessine
  117: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
  // 118 – Oganesson
  118: { density: null, pricePerKg: null, dangerLevel: 10, abundanceCrust: null, meltingPoint: null, boilingPoint: null },
};

/** Danger labels for kid-friendly display */
export const DANGER_LABELS: Record<number, string> = {
  1: 'Totally safe',
  2: 'Very safe',
  3: 'Mostly safe',
  4: 'A little risky',
  5: 'Be careful!',
  6: 'Quite risky',
  7: 'Dangerous',
  8: 'Very dangerous',
  9: 'Super dangerous',
  10: 'Extremely dangerous!',
};

/** Format a price nicely for kids */
export function formatPrice(pricePerKg: number): string {
  if (pricePerKg >= 1_000_000_000) return `$${(pricePerKg / 1_000_000_000).toFixed(0)} billion`;
  if (pricePerKg >= 1_000_000) return `$${(pricePerKg / 1_000_000).toFixed(0)} million`;
  if (pricePerKg >= 1_000) return `$${(pricePerKg / 1_000).toFixed(1)}k`;
  if (pricePerKg >= 1) return `$${pricePerKg.toFixed(0)}`;
  return `$${pricePerKg.toFixed(2)}`;
}
