// Simplified continent outlines, hand-authored for the philately-style
// world map in PlacesScreen. Coordinates are (lon, lat) pairs.
//
// Geographic accuracy is intentionally limited — the map is decorative
// background context, the visited city pins carry the meaning. Each
// continent is ~10-30 control points, recognisable but not survey-grade.
//
// Coordinate system: longitude in [-180, 180], latitude in [-90, 90].
// `toXY` projects to a 0..360 / 0..180 viewBox (equirectangular).

export interface LonLat { lon: number; lat: number }

export function toXY(p: LonLat): [number, number] {
  return [p.lon + 180, 90 - p.lat];
}

const N: LonLat[][] = [
  // North America (mainland)
  [
    [-160, 68], [-135, 58], [-125, 47], [-122, 35], [-118, 32],
    [-114, 30], [-110, 23], [-98, 16], [-92, 15], [-85, 11],
    [-83, 15], [-80, 25], [-81, 32], [-77, 35], [-70, 41],
    [-67, 44], [-55, 52], [-62, 58], [-78, 60], [-95, 65],
    [-115, 70], [-130, 70], [-160, 71],
  ].map(([lon, lat]) => ({ lon, lat })),
  // Greenland
  [
    [-45, 60], [-22, 60], [-20, 70], [-15, 78], [-30, 82],
    [-50, 82], [-55, 78], [-50, 70], [-48, 65],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const S: LonLat[][] = [
  // South America
  [
    [-79, 8], [-72, 10], [-60, 8], [-50, -3], [-40, -5],
    [-35, -8], [-37, -22], [-48, -28], [-58, -38], [-65, -45],
    [-70, -55], [-74, -52], [-72, -42], [-72, -28], [-78, -10],
    [-80, -3], [-79, 0],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const E: LonLat[][] = [
  // Europe (mainland, very stylised — connects to Asia visually)
  [
    [-9, 36], [-9, 43], [-2, 43], [-1, 49], [5, 51],
    [12, 54], [10, 58], [5, 60], [10, 65], [20, 70],
    [30, 71], [38, 67], [40, 60], [40, 50], [30, 47],
    [28, 41], [18, 40], [12, 45], [8, 44], [3, 36],
  ].map(([lon, lat]) => ({ lon, lat })),
  // British Isles
  [
    [-5, 50], [-2, 51], [1, 51], [1, 55], [-3, 58],
    [-7, 57], [-10, 54], [-8, 51],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const AF: LonLat[][] = [
  // Africa
  [
    [-17, 21], [-10, 35], [10, 36], [22, 32], [33, 31],
    [35, 23], [42, 14], [50, 12], [52, 0], [48, -10],
    [42, -16], [38, -22], [32, -28], [22, -34], [18, -34],
    [12, -18], [9, -2], [0, 5], [-7, 4], [-15, 10],
    [-17, 16],
  ].map(([lon, lat]) => ({ lon, lat })),
  // Madagascar
  [
    [43, -12], [50, -15], [50, -22], [46, -25], [44, -23],
    [43, -18],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const AS: LonLat[][] = [
  // Asia (mainland, large)
  [
    [28, 41], [32, 35], [45, 28], [55, 25], [60, 25],
    [60, 18], [55, 12], [50, 12], [55, 5], [65, 6],
    [73, 8], [78, 8], [80, 12], [82, 20], [90, 22],
    [93, 17], [97, 16], [100, 13], [103, 1], [108, 4],
    [110, 12], [114, 22], [121, 22], [122, 30], [128, 33],
    [135, 35], [140, 38], [142, 45], [148, 45], [157, 50],
    [160, 60], [170, 65], [180, 70], [175, 73], [160, 76],
    [140, 76], [110, 74], [80, 75], [60, 73], [50, 67],
    [42, 60], [35, 53], [30, 47],
  ].map(([lon, lat]) => ({ lon, lat })),
  // India peninsula nudge — slightly bulging south
  // (Already captured in main path)
  // Japan (very stylised)
  [
    [131, 32], [136, 34], [140, 36], [142, 41], [144, 44],
    [141, 41], [137, 36], [132, 34],
  ].map(([lon, lat]) => ({ lon, lat })),
  // Sri Lanka
  [
    [80, 9], [82, 8], [82, 6], [80, 6], [79, 8],
  ].map(([lon, lat]) => ({ lon, lat })),
  // Borneo + Sumatra blob (approximate)
  [
    [108, 4], [115, 4], [118, 0], [115, -4], [108, -3], [105, 0], [108, 4],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const O: LonLat[][] = [
  // Australia
  [
    [113, -22], [122, -16], [130, -12], [137, -12], [143, -10],
    [148, -18], [153, -25], [150, -34], [142, -38], [130, -34],
    [118, -34], [113, -28], [113, -22],
  ].map(([lon, lat]) => ({ lon, lat })),
  // New Zealand
  [
    [172, -34], [175, -38], [174, -41], [170, -45], [167, -45],
    [168, -41], [172, -36],
  ].map(([lon, lat]) => ({ lon, lat })),
];

const AN: LonLat[][] = [
  // Antarctica (highly stylised polar fringe)
  [
    [-180, -67], [-150, -70], [-100, -78], [-50, -75], [0, -72],
    [50, -77], [100, -75], [150, -68], [180, -65], [180, -90],
    [-180, -90],
  ].map(([lon, lat]) => ({ lon, lat })),
];

export const CONTINENTS: { name: string; paths: LonLat[][] }[] = [
  { name: 'NorthAmerica', paths: N },
  { name: 'SouthAmerica', paths: S },
  { name: 'Europe', paths: E },
  { name: 'Africa', paths: AF },
  { name: 'Asia', paths: AS },
  { name: 'Oceania', paths: O },
  { name: 'Antarctica', paths: AN },
];

// Continent assignment by country name (for the "X continents" footer).
// Kept minimal — every country a runner's likely to log a run in.
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  'United States': 'NorthAmerica',
  'USA': 'NorthAmerica',
  'Canada': 'NorthAmerica',
  'Mexico': 'NorthAmerica',
  'Cuba': 'NorthAmerica',
  'Jamaica': 'NorthAmerica',
  'Costa Rica': 'NorthAmerica',
  'Panama': 'NorthAmerica',
  // South America
  'Brazil': 'SouthAmerica',
  'Argentina': 'SouthAmerica',
  'Chile': 'SouthAmerica',
  'Peru': 'SouthAmerica',
  'Colombia': 'SouthAmerica',
  'Uruguay': 'SouthAmerica',
  'Ecuador': 'SouthAmerica',
  'Bolivia': 'SouthAmerica',
  // Europe
  'United Kingdom': 'Europe',
  'UK': 'Europe',
  'Ireland': 'Europe',
  'France': 'Europe',
  'Germany': 'Europe',
  'Spain': 'Europe',
  'Portugal': 'Europe',
  'Italy': 'Europe',
  'Switzerland': 'Europe',
  'Netherlands': 'Europe',
  'Belgium': 'Europe',
  'Austria': 'Europe',
  'Denmark': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Finland': 'Europe',
  'Iceland': 'Europe',
  'Poland': 'Europe',
  'Czechia': 'Europe',
  'Czech Republic': 'Europe',
  'Hungary': 'Europe',
  'Greece': 'Europe',
  'Romania': 'Europe',
  'Russia': 'Europe',
  'Turkey': 'Europe',
  // Africa
  'South Africa': 'Africa',
  'Kenya': 'Africa',
  'Ethiopia': 'Africa',
  'Morocco': 'Africa',
  'Egypt': 'Africa',
  'Nigeria': 'Africa',
  'Tanzania': 'Africa',
  'Tunisia': 'Africa',
  'Uganda': 'Africa',
  // Asia
  'India': 'Asia',
  'China': 'Asia',
  'Japan': 'Asia',
  'South Korea': 'Asia',
  'Singapore': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Indonesia': 'Asia',
  'Philippines': 'Asia',
  'Malaysia': 'Asia',
  'Sri Lanka': 'Asia',
  'Nepal': 'Asia',
  'Pakistan': 'Asia',
  'Bangladesh': 'Asia',
  'UAE': 'Asia',
  'United Arab Emirates': 'Asia',
  'Israel': 'Asia',
  'Saudi Arabia': 'Asia',
  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
};

export function continentOf(country: string | undefined): string | undefined {
  if (!country) return undefined;
  return COUNTRY_TO_CONTINENT[country];
}

export function countContinents(countries: string[]): number {
  const seen = new Set<string>();
  for (const c of countries) {
    const cont = continentOf(c);
    if (cont) seen.add(cont);
  }
  return seen.size;
}

// Best-effort city centroid for cities where the activity's start coords
// are missing. Covers the major Indian metros plus a handful of global
// cities the PRD bucket-list runner is likely to visit. Optional —
// activities WITH startLat/startLon don't need this.
export const CITY_FALLBACK: Record<string, LonLat> = {
  'Bangalore':   { lon: 77.59, lat: 12.97 },
  'Bengaluru':   { lon: 77.59, lat: 12.97 },
  'Mumbai':      { lon: 72.87, lat: 19.07 },
  'Delhi':       { lon: 77.20, lat: 28.61 },
  'New Delhi':   { lon: 77.20, lat: 28.61 },
  'Hyderabad':   { lon: 78.49, lat: 17.38 },
  'Chennai':     { lon: 80.27, lat: 13.08 },
  'Kolkata':     { lon: 88.36, lat: 22.57 },
  'Karimnagar':  { lon: 79.13, lat: 18.43 },
  'Pune':        { lon: 73.85, lat: 18.52 },
  'Ahmedabad':   { lon: 72.57, lat: 23.02 },
  'Goa':         { lon: 73.83, lat: 15.50 },
  'Leh':         { lon: 77.58, lat: 34.15 },
  'Jaipur':      { lon: 75.79, lat: 26.91 },
  'Kochi':       { lon: 76.27, lat: 9.93 },
  'London':      { lon: -0.13, lat: 51.51 },
  'Paris':       { lon: 2.35,  lat: 48.86 },
  'Berlin':      { lon: 13.41, lat: 52.52 },
  'Tokyo':       { lon: 139.69, lat: 35.68 },
  'Singapore':   { lon: 103.82, lat: 1.35 },
  'New York':    { lon: -74.0, lat: 40.71 },
  'San Francisco': { lon: -122.42, lat: 37.77 },
  'Los Angeles': { lon: -118.24, lat: 34.05 },
  'Boston':      { lon: -71.06, lat: 42.36 },
  'Sydney':      { lon: 151.21, lat: -33.87 },
  'Melbourne':   { lon: 144.96, lat: -37.81 },
  'Auckland':    { lon: 174.76, lat: -36.85 },
  'Bangkok':     { lon: 100.50, lat: 13.76 },
  'Kuala Lumpur': { lon: 101.69, lat: 3.14 },
  'Hong Kong':   { lon: 114.16, lat: 22.32 },
  'Dubai':       { lon: 55.27, lat: 25.20 },
  'Lisbon':      { lon: -9.14, lat: 38.72 },
  'Madrid':      { lon: -3.70, lat: 40.42 },
  'Barcelona':   { lon: 2.17, lat: 41.39 },
  'Amsterdam':   { lon: 4.90, lat: 52.37 },
  'Cape Town':   { lon: 18.42, lat: -33.92 },
  'Nairobi':     { lon: 36.82, lat: -1.29 },
};
