import type { BodyStyle } from "@/lib/vehicle-art";

/**
 * US-market vehicle library, model year 2000 to the current year.
 * Entries are "Model|bodyStyle|firstYear|lastYear?" — lastYear omitted means
 * still sold. Body style drives the coverage artwork on quotes.
 */

export const LIBRARY_FIRST_YEAR = 2000;
export const LIBRARY_LAST_YEAR = new Date().getFullYear() + 1;

const M: Record<string, string[]> = {
  Acura: ["ILX|sedan|2013|2022", "Integra|hatch|2023", "Integra|coupe|2000|2001", "MDX|suv|2001", "NSX|coupe|2000|2005", "NSX|coupe|2017|2022", "RDX|suv|2007", "RL|sedan|2000|2012", "RSX|coupe|2002|2006", "TL|sedan|2000|2014", "TLX|sedan|2015", "TSX|sedan|2004|2014", "ZDX|suv|2010|2013", "ZDX|suv|2024"],
  "Alfa Romeo": ["4C|coupe|2015|2020", "Giulia|sedan|2017", "Stelvio|suv|2018", "Tonale|suv|2023"],
  "Aston Martin": ["DB11|coupe|2017", "DB12|coupe|2024", "DB9|coupe|2005|2016", "DBS|coupe|2008", "DBX|suv|2021", "Vanquish|coupe|2001", "Vantage|coupe|2006"],
  Audi: ["A3|sedan|2006", "A4|sedan|2000", "A5|coupe|2008", "A6|sedan|2000", "A7|sedan|2012", "A8|sedan|2000", "allroad|wagon|2001", "e-tron GT|sedan|2022", "Q3|suv|2015", "Q4 e-tron|suv|2022", "Q5|suv|2009", "Q7|suv|2007", "Q8|suv|2019", "R8|coupe|2008|2023", "RS 3|sedan|2017", "RS 5|coupe|2013", "RS 6 Avant|wagon|2021", "RS 7|sedan|2014", "S4|sedan|2000", "S5|coupe|2008", "TT|coupe|2000|2023"],
  Bentley: ["Bentayga|suv|2017", "Continental GT|coupe|2004", "Flying Spur|sedan|2006"],
  BMW: ["1 Series|coupe|2008|2013", "2 Series|coupe|2014", "3 Series|sedan|2000", "4 Series|coupe|2014", "5 Series|sedan|2000", "6 Series|coupe|2004|2019", "7 Series|sedan|2000", "8 Series|coupe|2019", "i3|hatch|2014|2021", "i4|sedan|2022", "i5|sedan|2024", "i7|sedan|2023", "iX|suv|2022", "M2|coupe|2016", "M3|sedan|2000", "M4|coupe|2015", "M5|sedan|2000", "X1|suv|2013", "X2|suv|2018", "X3|suv|2004", "X4|suv|2015", "X5|suv|2000", "X6|suv|2008", "X7|suv|2019", "Z4|convertible|2003"],
  Buick: ["Enclave|suv|2008", "Encore|suv|2013", "Envision|suv|2016", "Envista|suv|2024", "LaCrosse|sedan|2005|2019", "LeSabre|sedan|2000|2005", "Lucerne|sedan|2006|2011", "Regal|sedan|2011|2020", "Rendezvous|suv|2002|2007", "Verano|sedan|2012|2017"],
  Cadillac: ["ATS|sedan|2013|2019", "CT4|sedan|2020", "CT5|sedan|2020", "CT6|sedan|2016|2020", "CTS|sedan|2003|2019", "DeVille|sedan|2000|2005", "Escalade|suv|2000", "Escalade EXT|truck|2002|2013", "CTS-V|sedan|2004|2019", "Lyriq|suv|2023", "SRX|suv|2004|2016", "STS|sedan|2005|2011", "XT4|suv|2019", "XT5|suv|2017", "XT6|suv|2020", "XLR|convertible|2004|2009"],
  Chevrolet: ["Avalanche|truck|2002|2013", "Blazer|suv|2000|2005", "Blazer|suv|2019", "Bolt EV|hatch|2017", "Camaro|coupe|2010|2024", "Captiva|suv|2012|2015", "Cobalt|sedan|2005|2010", "Colorado|truck|2004", "Corvette|coupe|2000", "Cruze|sedan|2011|2019", "Equinox|suv|2005", "Express|van|2000", "HHR|wagon|2006|2011", "Impala|sedan|2000|2020", "Malibu|sedan|2000|2025", "Monte Carlo|coupe|2000|2007", "Silverado 1500|truck|2000", "Silverado 2500HD|truck|2001", "Sonic|sedan|2012|2020", "Spark|hatch|2013|2022", "SS|sedan|2014|2017", "Suburban|suv|2000", "Tahoe|suv|2000", "TrailBlazer|suv|2002|2009", "Trailblazer|suv|2021", "Traverse|suv|2009", "Trax|suv|2015", "Volt|sedan|2011|2019"],
  Chrysler: ["300|sedan|2005", "300M|sedan|2000|2004", "Crossfire|coupe|2004|2008", "Pacifica|van|2017", "Pacifica|suv|2004|2008", "PT Cruiser|wagon|2001|2010", "Sebring|sedan|2000|2010", "Town & Country|van|2000|2016", "Voyager|van|2020"],
  Dodge: ["Avenger|sedan|2008|2014", "Caliber|hatch|2007|2012", "Challenger|coupe|2008|2023", "Charger|sedan|2006", "Dakota|truck|2000|2011", "Durango|suv|2000", "Grand Caravan|van|2000|2020", "Hornet|suv|2023", "Journey|suv|2009|2020", "Magnum|wagon|2005|2008", "Neon|sedan|2000|2005", "Ram 1500|truck|2000|2010", "Viper|coupe|2000|2017"],
  Ferrari: ["296 GTB|coupe|2022", "488|coupe|2016|2020", "812|coupe|2018", "California|convertible|2009|2017", "F8 Tributo|coupe|2020|2022", "Portofino|convertible|2018", "Roma|coupe|2021", "SF90|coupe|2021", "Purosangue|suv|2024"],
  Fiat: ["124 Spider|convertible|2017|2020", "500|hatch|2012|2019", "500X|suv|2016"],
  Ford: ["Bronco|suv|2021", "Bronco Sport|suv|2021", "C-Max|hatch|2013|2018", "Crown Victoria|sedan|2000|2011", "E-Series|van|2000", "EcoSport|suv|2018|2022", "Edge|suv|2007|2024", "Escape|suv|2001", "Escort|sedan|2000|2003", "Excursion|suv|2000|2005", "Expedition|suv|2000", "Explorer|suv|2000", "F-150|truck|2000", "F-150 Lightning|truck|2022", "F-250|truck|2000", "F-350|truck|2000", "Fiesta|hatch|2011|2019", "Five Hundred|sedan|2005|2007", "Flex|wagon|2009|2019", "Focus|sedan|2000|2018", "Fusion|sedan|2006|2020", "GT|coupe|2005|2006", "GT|coupe|2017|2022", "Maverick|truck|2022", "Mustang|coupe|2000", "Mustang Mach-E|suv|2021", "Ranger|truck|2000", "Taurus|sedan|2000|2019", "Transit|van|2015", "Transit Connect|van|2010|2023"],
  Genesis: ["G70|sedan|2019", "G80|sedan|2017", "G90|sedan|2017", "GV60|suv|2023", "GV70|suv|2022", "GV80|suv|2021"],
  GMC: ["Acadia|suv|2007", "Canyon|truck|2004", "Envoy|suv|2002|2009", "Hummer EV|truck|2022", "Savana|van|2000", "Sierra 1500|truck|2000", "Sierra 2500HD|truck|2001", "Terrain|suv|2010", "Yukon|suv|2000", "Yukon XL|suv|2000"],
  Honda: ["Accord|sedan|2000", "Civic|sedan|2000", "Civic Coupe|coupe|2000|2020", "Civic Type R|hatch|2017", "Clarity|sedan|2017|2021", "CR-V|suv|2000", "CR-Z|coupe|2011|2016", "Crosstour|wagon|2010|2015", "Element|suv|2003|2011", "Fit|hatch|2007|2020", "HR-V|suv|2016", "Insight|sedan|2000", "Odyssey|van|2000", "Passport|suv|2000|2002", "Passport|suv|2019", "Pilot|suv|2003", "Prologue|suv|2024", "Ridgeline|truck|2006", "S2000|convertible|2000|2009"],
  Hyundai: ["Accent|sedan|2000|2022", "Azera|sedan|2006|2017", "Elantra|sedan|2000", "Elantra GT|hatch|2013|2020", "Genesis Coupe|coupe|2010|2016", "Ioniq|hatch|2017|2022", "Ioniq 5|suv|2022", "Ioniq 6|sedan|2023", "Kona|suv|2018", "Palisade|suv|2020", "Santa Cruz|truck|2022", "Santa Fe|suv|2001", "Sonata|sedan|2000", "Tiburon|coupe|2000|2008", "Tucson|suv|2005", "Veloster|hatch|2012|2022", "Venue|suv|2020", "Veracruz|suv|2007|2012"],
  Infiniti: ["EX35|suv|2008|2012", "FX35|suv|2003|2013", "G35|coupe|2003|2008", "G37|coupe|2008|2013", "M35|sedan|2006|2013", "Q50|sedan|2014", "Q60|coupe|2014|2022", "QX4|suv|2000|2003", "QX50|suv|2014", "QX55|suv|2022", "QX56|suv|2004|2013", "QX60|suv|2014", "QX80|suv|2014"],
  Jaguar: ["E-Pace|suv|2018", "F-Pace|suv|2017", "F-Type|coupe|2014", "I-Pace|suv|2019", "S-Type|sedan|2000|2008", "XE|sedan|2017|2020", "XF|sedan|2009", "XJ|sedan|2000|2019", "XK|coupe|2000|2015"],
  Jeep: ["Cherokee|suv|2014|2023", "Compass|suv|2007", "Gladiator|truck|2020", "Grand Cherokee|suv|2000", "Grand Wagoneer|suv|2022", "Liberty|suv|2002|2012", "Patriot|suv|2007|2017", "Renegade|suv|2015|2023", "Wagoneer|suv|2022", "Wrangler|suv|2000"],
  Kia: ["Amanti|sedan|2004|2009", "Carnival|van|2022", "EV6|suv|2022", "EV9|suv|2024", "Forte|sedan|2010", "K5|sedan|2021", "K900|sedan|2015|2020", "Niro|suv|2017", "Optima|sedan|2001|2020", "Rio|sedan|2001|2023", "Sedona|van|2002|2021", "Seltos|suv|2021", "Sorento|suv|2003", "Soul|hatch|2010", "Sportage|suv|2000", "Stinger|sedan|2018|2023", "Telluride|suv|2020"],
  "Land Rover": ["Defender|suv|2020", "Discovery|suv|2000", "Discovery Sport|suv|2015", "LR3|suv|2005|2009", "LR4|suv|2010|2016", "Range Rover|suv|2000", "Range Rover Evoque|suv|2012", "Range Rover Sport|suv|2006", "Range Rover Velar|suv|2018"],
  Lexus: ["CT 200h|hatch|2011|2017", "ES|sedan|2000", "GS|sedan|2000|2020", "GX|suv|2003", "IS|sedan|2001", "LC|coupe|2018", "LS|sedan|2000", "LX|suv|2000", "NX|suv|2015", "RC|coupe|2015", "RX|suv|2000", "RZ|suv|2023", "SC 430|convertible|2002|2010", "TX|suv|2024", "UX|suv|2019"],
  Lincoln: ["Aviator|suv|2003|2005", "Aviator|suv|2020", "Continental|sedan|2017|2020", "Corsair|suv|2020", "LS|sedan|2000|2006", "Mark LT|truck|2006|2008", "MKC|suv|2015|2019", "MKS|sedan|2009|2016", "MKT|wagon|2010|2019", "MKX|suv|2007|2018", "MKZ|sedan|2007|2020", "Nautilus|suv|2019", "Navigator|suv|2000", "Town Car|sedan|2000|2011"],
  Lucid: ["Air|sedan|2022", "Gravity|suv|2025"],
  Maserati: ["Ghibli|sedan|2014|2024", "GranTurismo|coupe|2008", "Grecale|suv|2023", "Levante|suv|2017", "MC20|coupe|2022", "Quattroporte|sedan|2005"],
  Mazda: ["3|sedan|2004", "5|van|2006|2015", "6|sedan|2003|2021", "CX-3|suv|2016|2021", "CX-30|suv|2020", "CX-5|suv|2013", "CX-50|suv|2023", "CX-7|suv|2007|2012", "CX-9|suv|2007|2023", "CX-90|suv|2024", "Miata MX-5|convertible|2000", "MPV|van|2000|2006", "Protege|sedan|2000|2003", "RX-8|coupe|2004|2011", "Tribute|suv|2001|2011"],
  McLaren: ["570S|coupe|2016|2021", "600LT|coupe|2019|2020", "650S|coupe|2015|2016", "720S|coupe|2018|2023", "750S|coupe|2024", "Artura|coupe|2022", "GT|coupe|2020|2023", "MP4-12C|coupe|2012|2014"],
  "Mercedes-Benz": ["A-Class|sedan|2019|2022", "AMG GT|coupe|2016", "C-Class|sedan|2000", "CLA|sedan|2014", "CLK|coupe|2000|2009", "CLS|sedan|2006|2023", "E-Class|sedan|2000", "EQB|suv|2022", "EQE|sedan|2023", "EQS|sedan|2022", "G-Class|suv|2002", "GLA|suv|2015", "GLB|suv|2020", "GLC|suv|2016", "GLE|suv|2016", "GLK|suv|2010|2015", "GLS|suv|2017", "M-Class|suv|2000|2015", "Metris|van|2016|2023", "R-Class|wagon|2006|2013", "S-Class|sedan|2000", "SL|convertible|2000", "SLK|convertible|2000|2016", "Sprinter|van|2003"],
  Mini: ["Clubman|wagon|2008|2024", "Convertible|convertible|2005", "Cooper|hatch|2002", "Countryman|suv|2011"],
  Mitsubishi: ["Eclipse|coupe|2000|2012", "Eclipse Cross|suv|2018", "Galant|sedan|2000|2012", "Lancer|sedan|2002|2017", "Lancer Evolution|sedan|2003|2015", "Mirage|hatch|2014", "Montero|suv|2000|2006", "Outlander|suv|2003", "Outlander Sport|suv|2011|2024"],
  Nissan: ["350Z|coupe|2003|2009", "370Z|coupe|2009|2020", "Altima|sedan|2000", "Ariya|suv|2023", "Armada|suv|2004", "Frontier|truck|2000", "GT-R|coupe|2009|2024", "Juke|suv|2011|2017", "Kicks|suv|2018", "Leaf|hatch|2011", "Maxima|sedan|2000|2023", "Murano|suv|2003", "NV200|van|2013|2021", "Pathfinder|suv|2000", "Quest|van|2000|2017", "Rogue|suv|2008", "Sentra|sedan|2000", "Titan|truck|2004|2024", "Versa|sedan|2007", "Xterra|suv|2000|2015", "Z|coupe|2023"],
  Polestar: ["Polestar 2|hatch|2021", "Polestar 3|suv|2024"],
  Pontiac: ["Aztek|suv|2001|2005", "G6|sedan|2005|2010", "G8|sedan|2008|2009", "Grand Am|sedan|2000|2005", "Grand Prix|sedan|2000|2008", "GTO|coupe|2004|2006", "Solstice|convertible|2006|2009", "Vibe|hatch|2003|2010"],
  Porsche: ["718 Boxster|convertible|2017", "718 Cayman|coupe|2017", "911|coupe|2000", "918 Spyder|convertible|2014|2015", "Boxster|convertible|2000|2016", "Carrera GT|convertible|2004|2006", "Cayenne|suv|2003", "Cayman|coupe|2006|2016", "Macan|suv|2015", "Panamera|sedan|2010", "Taycan|sedan|2020"],
  Ram: ["1500|truck|2011", "2500|truck|2011", "3500|truck|2011", "ProMaster|van|2014", "ProMaster City|van|2015|2022"],
  Rivian: ["R1S|suv|2022", "R1T|truck|2022"],
  "Rolls-Royce": ["Cullinan|suv|2019", "Dawn|convertible|2016|2023", "Ghost|sedan|2010", "Phantom|sedan|2004", "Spectre|coupe|2024", "Wraith|coupe|2014|2023"],
  Saab: ["9-3|sedan|2000|2011", "9-5|sedan|2000|2011"],
  Saturn: ["Aura|sedan|2007|2009", "Ion|sedan|2003|2007", "Outlook|suv|2007|2010", "Sky|convertible|2007|2009", "Vue|suv|2002|2010"],
  Scion: ["FR-S|coupe|2013|2016", "iA|sedan|2016|2016", "tC|coupe|2005|2016", "xB|wagon|2004|2015", "xD|hatch|2008|2014"],
  Subaru: ["Ascent|suv|2019", "Baja|truck|2003|2006", "BRZ|coupe|2013", "Crosstrek|suv|2013", "Forester|suv|2000", "Impreza|sedan|2000", "Legacy|sedan|2000", "Outback|wagon|2000", "Solterra|suv|2023", "Tribeca|suv|2006|2014", "WRX|sedan|2002"],
  Tesla: ["Cybertruck|truck|2024", "Model 3|sedan|2018", "Model S|sedan|2013", "Model X|suv|2016", "Model Y|suv|2020", "Roadster|convertible|2008|2012"],
  Toyota: ["4Runner|suv|2000", "86|coupe|2017", "Avalon|sedan|2000|2022", "bZ4X|suv|2023", "C-HR|suv|2018|2022", "Camry|sedan|2000", "Celica|coupe|2000|2005", "Corolla|sedan|2000", "Corolla Cross|suv|2022", "Corolla Hatchback|hatch|2019", "Crown|sedan|2023", "Echo|sedan|2000|2005", "FJ Cruiser|suv|2007|2014", "GR86|coupe|2022", "GR Corolla|hatch|2023", "GR Supra|coupe|2020", "Grand Highlander|suv|2024", "Highlander|suv|2001", "Land Cruiser|suv|2000", "Matrix|hatch|2003|2013", "Mirai|sedan|2016", "Prius|hatch|2001", "RAV4|suv|2000", "Sequoia|suv|2001", "Sienna|van|2000", "Solara|coupe|2000|2008", "Supra|coupe|2000|2002", "Tacoma|truck|2000", "Tundra|truck|2000", "Venza|suv|2009|2015", "Venza|suv|2021|2024", "Yaris|sedan|2007|2020"],
  Volkswagen: ["Arteon|sedan|2019|2023", "Atlas|suv|2018", "Atlas Cross Sport|suv|2020", "Beetle|coupe|2000|2019", "CC|sedan|2009|2017", "Eos|convertible|2007|2016", "Golf|hatch|2000", "GTI|hatch|2000", "ID.4|suv|2021", "ID. Buzz|van|2025", "Jetta|sedan|2000", "Passat|sedan|2000|2022", "Rabbit|hatch|2006|2009", "Routan|van|2009|2013", "Taos|suv|2022", "Tiguan|suv|2009", "Touareg|suv|2004|2017", "Golf R|hatch|2012"],
  Volvo: ["C30|hatch|2008|2013", "C40 Recharge|suv|2022", "EX30|suv|2025", "EX90|suv|2025", "S40|sedan|2000|2011", "S60|sedan|2001", "S80|sedan|2000|2016", "S90|sedan|2017", "V60|wagon|2015", "V70|wagon|2000|2010", "V90|wagon|2017", "XC40|suv|2019", "XC60|suv|2010", "XC70|wagon|2003|2016", "XC90|suv|2003"],
};

export type VehicleModel = {
  make: string;
  model: string;
  body: BodyStyle;
  from: number;
  to: number;
};

export const VEHICLE_MODELS: VehicleModel[] = Object.entries(M).flatMap(([make, rows]) =>
  rows.map((row) => {
    const [model, body, from, to] = row.split("|");
    return {
      make,
      model: model!,
      body: body as BodyStyle,
      from: Number(from),
      to: to ? Number(to) : LIBRARY_LAST_YEAR,
    };
  }),
);

export const VEHICLE_MAKES = Object.keys(M).sort((a, b) => a.localeCompare(b));

export function modelsForMake(make: string, year?: number) {
  return VEHICLE_MODELS.filter(
    (m) => m.make === make && (!year || (year >= m.from && year <= m.to)),
  ).sort((a, b) => a.model.localeCompare(b.model));
}

export function yearsFor(make?: string, model?: string) {
  const rows = VEHICLE_MODELS.filter(
    (m) => (!make || m.make === make) && (!model || m.model === model),
  );
  const first = rows.length ? Math.min(...rows.map((r) => r.from)) : LIBRARY_FIRST_YEAR;
  const last = rows.length ? Math.max(...rows.map((r) => r.to)) : LIBRARY_LAST_YEAR;
  const out: number[] = [];
  for (let y = last; y >= Math.max(first, LIBRARY_FIRST_YEAR); y--) out.push(y);
  return out;
}

const NAME_HINTS: { re: RegExp; body: BodyStyle }[] = [
  { re: /\b(f-?\d{3}|silverado|sierra|ram\s?\d|tacoma|tundra|colorado|canyon|frontier|ridgeline|titan|maverick|gladiator|cybertruck|r1t|pickup|truck)\b/i, body: "truck" },
  { re: /\b(van|sprinter|transit|promaster|odyssey|sienna|carnival|caravan|express|savana|metris)\b/i, body: "van" },
  { re: /\b(suv|crossover|4runner|tahoe|suburban|explorer|escalade|wrangler|bronco|pilot|highlander|rav4|cr-?v|equinox|telluride|palisade|q[3578]|x[1-7]|gl[abces])\b/i, body: "suv" },
  { re: /\b(wagon|avant|allroad|estate|outback)\b/i, body: "wagon" },
  { re: /\b(convertible|roadster|spyder|cabrio|miata|boxster|z4)\b/i, body: "convertible" },
  { re: /\b(coupe|corvette|mustang|camaro|challenger|911|gt-?r|supra|brz|86|m4|rc|lc)\b/i, body: "coupe" },
  { re: /\b(hatch|golf|gti|civic type r|prius|leaf|bolt|mirage|veloster|fit|yaris)\b/i, body: "hatch" },
];

/** Best-guess body style for any vehicle — library first, then name hints. */
export function resolveBodyStyle(
  make?: string | null,
  model?: string | null,
  year?: number | null,
): BodyStyle {
  const mk = (make ?? "").trim().toLowerCase();
  const md = (model ?? "").trim().toLowerCase();
  if (mk && md) {
    const exact = VEHICLE_MODELS.find(
      (v) =>
        v.make.toLowerCase() === mk &&
        v.model.toLowerCase() === md &&
        (!year || (year >= v.from && year <= v.to)),
    );
    if (exact) return exact.body;
    const loose = VEHICLE_MODELS.find(
      (v) => v.make.toLowerCase() === mk && md.startsWith(v.model.toLowerCase()),
    );
    if (loose) return loose.body;
  }
  const hay = `${make ?? ""} ${model ?? ""}`;
  for (const h of NAME_HINTS) if (h.re.test(hay)) return h.body;
  return "sedan";
}
