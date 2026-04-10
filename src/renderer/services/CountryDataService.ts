/**
 * CountryDataService - Provides static country data for game initialization.
 * Contains superpower definitions, starting conditions, and country lookup.
 */
import { Country } from '../types';

interface SuperpowerOption {
  id: string;
  name: string;
  description: string;
}

interface SuperpowerStartingConditions {
  startingPrestige: number;
  startingPoliticalCapital: number;
  startingEconomicReserves: number;
  startingMilitaryCapacity: number;
}

// Comprehensive country data for the game world
const COUNTRY_DATA: Record<string, Country> = {
  usa: {
    id: 'usa',
    name: 'United States of America',
    code: 'US',
    government: { type: 'Federal Republic', stability: 75, alignment: 'western' as const },
    economy: { gdp: 25000, growth: 2.1, development: 'high' as const },
    internal: { insurgencyLevel: 5, coupRisk: 2 },
    military: { power: 95, spending: 800, nuclearStatus: 'arsenal' as const },
    relations: { ussr: -40, china: -10, uk: 85, france: 75, germany: 80, japan: 80, india: 45, brazil: 50, egypt: 40 },
  },
  ussr: {
    id: 'ussr',
    name: 'Soviet Union',
    code: 'SU',
    government: { type: 'Communist State', stability: 65, alignment: 'eastern' as const },
    economy: { gdp: 18000, growth: 1.5, development: 'high' as const },
    internal: { insurgencyLevel: 10, coupRisk: 8 },
    military: { power: 90, spending: 700, nuclearStatus: 'arsenal' as const },
    relations: { usa: -40, china: 30, cuba: 85, india: 55, egypt: 40, syria: 60, vietnam: 70, poland: 65 },
  },
  china: {
    id: 'china',
    name: "People's Republic of China",
    code: 'CN',
    government: { type: 'Communist State', stability: 80, alignment: 'eastern' as const },
    economy: { gdp: 17000, growth: 5.5, development: 'emerging' as const },
    internal: { insurgencyLevel: 8, coupRisk: 5 },
    military: { power: 75, spending: 290, nuclearStatus: 'arsenal' as const },
    relations: { usa: -10, ussr: 30, india: -20, japan: -15, pakistan: 50, north_korea: 60 },
  },
  uk: {
    id: 'uk',
    name: 'United Kingdom',
    code: 'GB',
    government: { type: 'Constitutional Monarchy', stability: 80, alignment: 'western' as const },
    economy: { gdp: 3100, growth: 1.2, development: 'high' as const },
    internal: { insurgencyLevel: 3, coupRisk: 1 },
    military: { power: 55, spending: 68, nuclearStatus: 'arsenal' as const },
    relations: { usa: 85, france: 70, germany: 75 },
  },
  france: {
    id: 'france',
    name: 'France',
    code: 'FR',
    government: { type: 'Semi-Presidential Republic', stability: 72, alignment: 'western' as const },
    economy: { gdp: 2800, growth: 1.0, development: 'high' as const },
    internal: { insurgencyLevel: 8, coupRisk: 3 },
    military: { power: 50, spending: 55, nuclearStatus: 'arsenal' as const },
    relations: { usa: 75, uk: 70, germany: 80 },
  },
  germany: {
    id: 'germany',
    name: 'Germany',
    code: 'DE',
    government: { type: 'Federal Republic', stability: 85, alignment: 'western' as const },
    economy: { gdp: 4200, growth: 0.8, development: 'high' as const },
    internal: { insurgencyLevel: 2, coupRisk: 1 },
    military: { power: 40, spending: 55, nuclearStatus: 'none' as const },
    relations: { usa: 80, france: 80, uk: 75, poland: 60 },
  },
  india: {
    id: 'india',
    name: 'India',
    code: 'IN',
    government: { type: 'Federal Republic', stability: 65, alignment: 'non-aligned' as const },
    economy: { gdp: 3500, growth: 6.5, development: 'emerging' as const },
    internal: { insurgencyLevel: 20, coupRisk: 10 },
    military: { power: 60, spending: 75, nuclearStatus: 'arsenal' as const },
    relations: { usa: 45, ussr: 55, china: -20, pakistan: -60 },
  },
  japan: {
    id: 'japan',
    name: 'Japan',
    code: 'JP',
    government: { type: 'Constitutional Monarchy', stability: 90, alignment: 'western' as const },
    economy: { gdp: 4900, growth: 0.5, development: 'high' as const },
    internal: { insurgencyLevel: 1, coupRisk: 0 },
    military: { power: 35, spending: 47, nuclearStatus: 'none' as const },
    relations: { usa: 80, china: -15, south_korea: 55 },
  },
  brazil: {
    id: 'brazil',
    name: 'Brazil',
    code: 'BR',
    government: { type: 'Federal Republic', stability: 55, alignment: 'non-aligned' as const },
    economy: { gdp: 1900, growth: 2.0, development: 'emerging' as const },
    internal: { insurgencyLevel: 15, coupRisk: 12 },
    military: { power: 30, spending: 20, nuclearStatus: 'none' as const },
    relations: { usa: 50, argentina: 40 },
  },
  egypt: {
    id: 'egypt',
    name: 'Egypt',
    code: 'EG',
    government: { type: 'Presidential Republic', stability: 55, alignment: 'non-aligned' as const },
    economy: { gdp: 400, growth: 3.5, development: 'medium' as const },
    internal: { insurgencyLevel: 25, coupRisk: 20 },
    military: { power: 35, spending: 12, nuclearStatus: 'none' as const },
    relations: { usa: 40, ussr: 40, israel: -30, saudi_arabia: 50 },
  },
  cuba: {
    id: 'cuba',
    name: 'Cuba',
    code: 'CU',
    government: { type: 'Communist State', stability: 60, alignment: 'eastern' as const },
    economy: { gdp: 100, growth: 1.0, development: 'medium' as const },
    internal: { insurgencyLevel: 10, coupRisk: 8 },
    military: { power: 15, spending: 3, nuclearStatus: 'none' as const },
    relations: { ussr: 85, usa: -70, venezuela: 50 },
  },
  pakistan: {
    id: 'pakistan',
    name: 'Pakistan',
    code: 'PK',
    government: { type: 'Federal Republic', stability: 45, alignment: 'neutral' as const },
    economy: { gdp: 350, growth: 4.0, development: 'medium' as const },
    internal: { insurgencyLevel: 35, coupRisk: 30 },
    military: { power: 40, spending: 10, nuclearStatus: 'arsenal' as const },
    relations: { usa: 30, china: 50, india: -60, saudi_arabia: 55 },
  },
  south_korea: {
    id: 'south_korea',
    name: 'South Korea',
    code: 'KR',
    government: { type: 'Presidential Republic', stability: 78, alignment: 'western' as const },
    economy: { gdp: 1700, growth: 2.5, development: 'high' as const },
    internal: { insurgencyLevel: 3, coupRisk: 2 },
    military: { power: 40, spending: 45, nuclearStatus: 'none' as const },
    relations: { usa: 75, japan: 55, north_korea: -90 },
  },
  iran: {
    id: 'iran',
    name: 'Iran',
    code: 'IR',
    government: { type: 'Theocratic Republic', stability: 50, alignment: 'other' as const },
    economy: { gdp: 400, growth: 1.5, development: 'medium' as const },
    internal: { insurgencyLevel: 30, coupRisk: 25 },
    military: { power: 35, spending: 15, nuclearStatus: 'developing' as const },
    relations: { usa: -80, ussr: 20, iraq: -50, saudi_arabia: -70 },
  },
  saudi_arabia: {
    id: 'saudi_arabia',
    name: 'Saudi Arabia',
    code: 'SA',
    government: { type: 'Absolute Monarchy', stability: 70, alignment: 'western' as const },
    economy: { gdp: 800, growth: 3.0, development: 'high' as const },
    internal: { insurgencyLevel: 10, coupRisk: 8 },
    military: { power: 30, spending: 75, nuclearStatus: 'none' as const },
    relations: { usa: 60, iran: -70, egypt: 50 },
  },
  poland: {
    id: 'poland',
    name: 'Poland',
    code: 'PL',
    government: { type: 'Republic', stability: 68, alignment: 'western' as const },
    economy: { gdp: 700, growth: 3.5, development: 'emerging' as const },
    internal: { insurgencyLevel: 5, coupRisk: 3 },
    military: { power: 25, spending: 15, nuclearStatus: 'none' as const },
    relations: { usa: 65, ussr: -30, germany: 60 },
  },
  vietnam: {
    id: 'vietnam',
    name: 'Vietnam',
    code: 'VN',
    government: { type: 'Communist State', stability: 70, alignment: 'eastern' as const },
    economy: { gdp: 400, growth: 6.0, development: 'emerging' as const },
    internal: { insurgencyLevel: 8, coupRisk: 5 },
    military: { power: 25, spending: 7, nuclearStatus: 'none' as const },
    relations: { ussr: 70, china: -10, usa: -20 },
  },
  syria: {
    id: 'syria',
    name: 'Syria',
    code: 'SY',
    government: { type: 'Presidential Republic', stability: 30, alignment: 'eastern' as const },
    economy: { gdp: 50, growth: -5.0, development: 'low' as const },
    internal: { insurgencyLevel: 60, coupRisk: 40 },
    military: { power: 15, spending: 4, nuclearStatus: 'none' as const },
    relations: { ussr: 60, iran: 50, usa: -60, israel: -80 },
  },
  israel: {
    id: 'israel',
    name: 'Israel',
    code: 'IL',
    government: { type: 'Parliamentary Republic', stability: 70, alignment: 'western' as const },
    economy: { gdp: 500, growth: 3.0, development: 'high' as const },
    internal: { insurgencyLevel: 20, coupRisk: 5 },
    military: { power: 45, spending: 24, nuclearStatus: 'suspected' as const },
    relations: { usa: 85, egypt: -30, syria: -80, iran: -90 },
  },
  north_korea: {
    id: 'north_korea',
    name: 'North Korea',
    code: 'KP',
    government: { type: 'Communist State', stability: 55, alignment: 'eastern' as const },
    economy: { gdp: 30, growth: -1.0, development: 'low' as const },
    internal: { insurgencyLevel: 5, coupRisk: 15 },
    military: { power: 30, spending: 10, nuclearStatus: 'arsenal' as const },
    relations: { china: 60, ussr: 40, south_korea: -90, usa: -90 },
  },
};

const SUPERPOWER_OPTIONS: SuperpowerOption[] = [
  {
    id: 'usa',
    name: 'United States of America',
    description: 'Lead the Western bloc with economic might, military superiority, and a global alliance network. Your challenge: maintain influence while preventing escalation.',
  },
  {
    id: 'ussr',
    name: 'Soviet Union',
    description: 'Command the Eastern bloc with ideological conviction and military parity. Your challenge: expand influence while managing internal pressures and economic constraints.',
  },
];

const SUPERPOWER_STARTING_CONDITIONS: Record<string, SuperpowerStartingConditions> = {
  usa: {
    startingPrestige: 50,
    startingPoliticalCapital: 120,
    startingEconomicReserves: 15000,
    startingMilitaryCapacity: 600000,
  },
  ussr: {
    startingPrestige: 45,
    startingPoliticalCapital: 110,
    startingEconomicReserves: 10000,
    startingMilitaryCapacity: 700000,
  },
};

export class CountryDataService {
  static getSuperPowerOptions(): SuperpowerOption[] {
    return SUPERPOWER_OPTIONS;
  }

  static getSuperpowerStartingConditions(nationId: string): SuperpowerStartingConditions {
    return SUPERPOWER_STARTING_CONDITIONS[nationId] || {
      startingPrestige: 30,
      startingPoliticalCapital: 100,
      startingEconomicReserves: 10000,
      startingMilitaryCapacity: 500000,
    };
  }

  static getCountry(countryId: string): Country | undefined {
    return COUNTRY_DATA[countryId];
  }

  static getAllCountries(): Record<string, Country> {
    return { ...COUNTRY_DATA };
  }

  static initializeBilateralRelations(): void {
    // Ensure bilateral relations are symmetric
    const countries = Object.values(COUNTRY_DATA);
    for (const country of countries) {
      for (const [otherCountryId, relationValue] of Object.entries(country.relations)) {
        const otherCountry = COUNTRY_DATA[otherCountryId];
        if (otherCountry && !(country.id in otherCountry.relations)) {
          otherCountry.relations[country.id] = relationValue;
        }
      }
    }
  }
}
