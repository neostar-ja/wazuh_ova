// Country name (as returned by GeoIP/MaxMind) → ISO 3166-1 alpha-2 code,
// plus fallback [lat, lon] centroids. Extends the smaller map in
// dashboard/WorldMap.tsx with broader global coverage for the Attack Map page.

export const COUNTRY_CODES: Record<string, string> = {
  // Africa
  Algeria: 'DZ', Angola: 'AO', Benin: 'BJ', Botswana: 'BW', 'Burkina Faso': 'BF',
  Burundi: 'BI', Cameroon: 'CM', 'Cape Verde': 'CV', 'Central African Republic': 'CF',
  Chad: 'TD', Comoros: 'KM', Congo: 'CG', 'DR Congo': 'CD', Djibouti: 'DJ', Egypt: 'EG',
  'Equatorial Guinea': 'GQ', Eritrea: 'ER', Eswatini: 'SZ', Ethiopia: 'ET', Gabon: 'GA',
  Gambia: 'GM', Ghana: 'GH', Guinea: 'GN', 'Guinea-Bissau': 'GW', 'Ivory Coast': 'CI',
  Kenya: 'KE', Lesotho: 'LS', Liberia: 'LR', Libya: 'LY', Madagascar: 'MG', Malawi: 'MW',
  Mali: 'ML', Mauritania: 'MR', Mauritius: 'MU', Morocco: 'MA', Mozambique: 'MZ',
  Namibia: 'NA', Niger: 'NE', Nigeria: 'NG', Rwanda: 'RW', Senegal: 'SN',
  Seychelles: 'SC', 'Sierra Leone': 'SL', Somalia: 'SO', 'South Africa': 'ZA',
  'South Sudan': 'SS', Sudan: 'SD', Tanzania: 'TZ', Togo: 'TG', Tunisia: 'TN',
  Uganda: 'UG', Zambia: 'ZM', Zimbabwe: 'ZW',

  // Americas
  Argentina: 'AR', Bahamas: 'BS', Barbados: 'BB', Belize: 'BZ', Bolivia: 'BO',
  Brazil: 'BR', Canada: 'CA', Chile: 'CL', Colombia: 'CO', 'Costa Rica': 'CR',
  Cuba: 'CU', 'Dominican Republic': 'DO', Ecuador: 'EC', 'El Salvador': 'SV',
  Guatemala: 'GT', Guyana: 'GY', Haiti: 'HT', Honduras: 'HN', Jamaica: 'JM',
  Mexico: 'MX', Nicaragua: 'NI', Panama: 'PA', Paraguay: 'PY', Peru: 'PE',
  Suriname: 'SR', 'Trinidad and Tobago': 'TT', 'United States': 'US', Uruguay: 'UY',
  Venezuela: 'VE',

  // Asia
  Afghanistan: 'AF', Armenia: 'AM', Azerbaijan: 'AZ', Bahrain: 'BH', Bangladesh: 'BD',
  Bhutan: 'BT', Brunei: 'BN', Cambodia: 'KH', China: 'CN', Cyprus: 'CY', Georgia: 'GE',
  'Hong Kong': 'HK', India: 'IN', Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Israel: 'IL',
  Japan: 'JP', Jordan: 'JO', Kazakhstan: 'KZ', Kuwait: 'KW', Kyrgyzstan: 'KG',
  Laos: 'LA', Lebanon: 'LB', Macau: 'MO', Malaysia: 'MY', Maldives: 'MV',
  Mongolia: 'MN', Myanmar: 'MM', Nepal: 'NP', 'North Korea': 'KP', Oman: 'OM',
  Pakistan: 'PK', Palestine: 'PS', Philippines: 'PH', Qatar: 'QA',
  'Saudi Arabia': 'SA', Singapore: 'SG', 'South Korea': 'KR', 'Sri Lanka': 'LK',
  Syria: 'SY', Taiwan: 'TW', Tajikistan: 'TJ', Thailand: 'TH', Turkey: 'TR',
  Turkmenistan: 'TM', 'United Arab Emirates': 'AE', Uzbekistan: 'UZ', Vietnam: 'VN',
  Yemen: 'YE',

  // Europe
  Albania: 'AL', Andorra: 'AD', Austria: 'AT', Belarus: 'BY', Belgium: 'BE',
  'Bosnia and Herzegovina': 'BA', Bulgaria: 'BG', Croatia: 'HR', 'Czech Republic': 'CZ',
  Czechia: 'CZ', Denmark: 'DK', Estonia: 'EE', Finland: 'FI', France: 'FR',
  Germany: 'DE', Greece: 'GR', Hungary: 'HU', Iceland: 'IS', Ireland: 'IE',
  Italy: 'IT', Kosovo: 'XK', Latvia: 'LV', Liechtenstein: 'LI', Lithuania: 'LT',
  Luxembourg: 'LU', Malta: 'MT', Moldova: 'MD', Monaco: 'MC', Montenegro: 'ME',
  Netherlands: 'NL', 'North Macedonia': 'MK', Norway: 'NO', Poland: 'PL',
  Portugal: 'PT', Romania: 'RO', Russia: 'RU', Serbia: 'RS', Slovakia: 'SK',
  Slovenia: 'SI', Spain: 'ES', Sweden: 'SE', Switzerland: 'CH', Ukraine: 'UA',
  'United Kingdom': 'GB', Vatican: 'VA',

  // Oceania
  Australia: 'AU', Fiji: 'FJ', 'New Zealand': 'NZ', 'Papua New Guinea': 'PG',
}

export function countryFlag(name: string): string {
  const code = COUNTRY_CODES[name]
  if (!code || code.length !== 2) return '🏳️'
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(c.codePointAt(0)! + 127397)
  ).join('')
}

// Fallback [lat, lon] centroids — used only when the backend's geo_centroid
// aggregation returns no value (e.g. a country bucket whose documents are
// all missing GeoLocation.location) so a marker never silently disappears.
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  Algeria: [28.0339, 1.6596], Angola: [-11.2027, 17.8739], Benin: [9.3077, 2.3158],
  Botswana: [-22.3285, 24.6849], 'Burkina Faso': [12.2383, -1.5616], Burundi: [-3.3731, 29.9189],
  Cameroon: [7.3697, 12.3547], 'Central African Republic': [6.6111, 20.9394], Chad: [15.4542, 18.7322],
  'DR Congo': [-4.0383, 21.7587], Congo: [-0.228, 15.8277], Egypt: [26.8206, 30.8025],
  Ethiopia: [9.145, 40.4897], Gabon: [-0.8037, 11.6094], Ghana: [7.9465, -1.0232],
  Guinea: [9.9456, -9.6966], 'Ivory Coast': [7.54, -5.5471], Kenya: [-0.0236, 37.9062],
  Libya: [26.3351, 17.2283], Madagascar: [-18.7669, 46.8691], Malawi: [-13.2543, 34.3015],
  Mali: [17.5707, -3.9962], Morocco: [31.7917, -7.0926], Mozambique: [-18.6657, 35.5296],
  Namibia: [-22.9576, 18.4904], Niger: [17.6078, 8.0817], Nigeria: [9.082, 8.6753],
  Rwanda: [-1.9403, 29.8739], Senegal: [14.4974, -14.4524], Somalia: [5.1521, 46.1996],
  'South Africa': [-30.5595, 22.9375], 'South Sudan': [6.877, 31.307], Sudan: [12.8628, 30.2176],
  Tanzania: [-6.369, 34.8888], Tunisia: [33.8869, 9.5375], Uganda: [1.3733, 32.2903],
  Zambia: [-13.1339, 27.8493], Zimbabwe: [-19.0154, 29.1549],

  Argentina: [-38.4161, -63.6167], Bolivia: [-16.2902, -63.5887], Brazil: [-14.235, -51.9253],
  Canada: [56.1304, -106.3468], Chile: [-35.6751, -71.543], Colombia: [4.5709, -74.2973],
  'Costa Rica': [9.7489, -83.7534], Cuba: [21.5218, -77.7812], 'Dominican Republic': [18.7357, -70.1627],
  Ecuador: [-1.8312, -78.1834], 'El Salvador': [13.7942, -88.8965], Guatemala: [15.7835, -90.2308],
  Guyana: [4.8604, -58.9302], Haiti: [18.9712, -72.2852], Honduras: [15.2, -86.2419],
  Jamaica: [18.1096, -77.2975], Mexico: [23.6345, -102.5528], Nicaragua: [12.8654, -85.2072],
  Panama: [8.538, -80.7821], Paraguay: [-23.4425, -58.4438], Peru: [-9.19, -75.0152],
  Suriname: [3.9193, -56.0278], 'Trinidad and Tobago': [10.6918, -61.2225], 'United States': [37.0902, -95.7129],
  Uruguay: [-32.5228, -55.7658], Venezuela: [6.4238, -66.5897],

  Afghanistan: [33.9391, 67.71], Armenia: [40.0691, 45.0382], Azerbaijan: [40.1431, 47.5769],
  Bahrain: [26.0667, 50.5577], Bangladesh: [23.685, 90.3563], Bhutan: [27.5142, 90.4336],
  Brunei: [4.5353, 114.7277], Cambodia: [12.5657, 104.991], China: [35.8617, 104.1954],
  Cyprus: [35.1264, 33.4299], Georgia: [42.3154, 43.3569], 'Hong Kong': [22.3193, 114.1694],
  India: [20.5937, 78.9629], Indonesia: [-0.7893, 113.9213], Iran: [32.4279, 53.688],
  Iraq: [33.2232, 43.6793], Israel: [31.0461, 34.8516], Japan: [36.2048, 138.2529],
  Jordan: [30.5852, 36.2384], Kazakhstan: [48.0196, 66.9237], Kuwait: [29.3117, 47.4818],
  Kyrgyzstan: [41.2044, 74.7661], Laos: [19.8563, 102.4955], Lebanon: [33.8547, 35.8623],
  Macau: [22.1987, 113.5439], Malaysia: [4.2105, 101.9758], Maldives: [3.2028, 73.2207],
  Mongolia: [46.8625, 103.8467], Myanmar: [21.9162, 95.956], Nepal: [28.3949, 84.124],
  'North Korea': [40.3399, 127.5101], Oman: [21.4735, 55.9754], Pakistan: [30.3753, 69.3451],
  Palestine: [31.9522, 35.2332], Philippines: [12.8797, 121.774], Qatar: [25.3548, 51.1839],
  'Saudi Arabia': [23.8859, 45.0792], Singapore: [1.3521, 103.8198], 'South Korea': [35.9078, 127.7669],
  'Sri Lanka': [7.8731, 80.7718], Syria: [34.8021, 38.9968], Taiwan: [23.6978, 120.9605],
  Tajikistan: [38.861, 71.2761], Thailand: [15.87, 100.9925], Turkey: [38.9637, 35.2433],
  Turkmenistan: [38.9697, 59.5563], 'United Arab Emirates': [23.4241, 53.8478], Uzbekistan: [41.3775, 64.5853],
  Vietnam: [14.0583, 108.2772], Yemen: [15.5527, 48.5164],

  Albania: [41.1533, 20.1683], Austria: [47.5162, 14.5501], Belarus: [53.7098, 27.9534],
  Belgium: [50.5039, 4.4699], 'Bosnia and Herzegovina': [43.9159, 17.6791], Bulgaria: [42.7339, 25.4858],
  Croatia: [45.1, 15.2], 'Czech Republic': [49.8175, 15.473], Czechia: [49.8175, 15.473],
  Denmark: [56.2639, 9.5018], Estonia: [58.5953, 25.0136], Finland: [61.9241, 25.7482],
  France: [46.2276, 2.2137], Germany: [51.1657, 10.4515], Greece: [39.0742, 21.8243],
  Hungary: [47.1625, 19.5033], Iceland: [64.9631, -19.0208], Ireland: [53.4129, -8.2439],
  Italy: [41.8719, 12.5674], Kosovo: [42.6026, 20.903], Latvia: [56.8796, 24.6032],
  Lithuania: [55.1694, 23.8813], Luxembourg: [49.8153, 6.1296], Malta: [35.9375, 14.3754],
  Moldova: [47.4116, 28.3699], Montenegro: [42.7087, 19.3744], Netherlands: [52.1326, 5.2913],
  'North Macedonia': [41.6086, 21.7453], Norway: [60.472, 8.4689], Poland: [51.9194, 19.1451],
  Portugal: [39.3999, -8.2245], Romania: [45.9432, 24.9668], Russia: [61.524, 105.3188],
  Serbia: [44.0165, 21.0059], Slovakia: [48.669, 19.699], Slovenia: [46.1512, 14.9955],
  Spain: [40.4637, -3.7492], Sweden: [60.1282, 18.6435], Switzerland: [46.8182, 8.2275],
  Ukraine: [48.3794, 31.1656], 'United Kingdom': [55.3781, -3.436],

  Australia: [-25.2744, 133.7751], Fiji: [-17.7134, 178.065], 'New Zealand': [-40.9006, 174.886],
  'Papua New Guinea': [-6.315, 143.9555],
}

export function countryCentroidFallback(name: string): [number, number] | null {
  return COUNTRY_CENTROIDS[name] ?? null
}

// Bangkok / Thailand — protected asset (attack-destination marker)
export const TARGET_LATLON: [number, number] = [13.7563, 100.5018]
export const TARGET_LABEL = '🇹🇭 WUH-TARGET'
