/**
 * ModernCrisisTemplates - 20 procedural + hand-crafted crisis scenarios
 * reflecting 2030s geopolitical realities (from the Equilibrium design).
 *
 * Each template can be used by CrisisService to generate specific, flavorful
 * crises instead of generic "[Country] Diplomatic Crisis" names.
 */
import { ModernCrisisType, PrestigePillars } from '../types';

export interface CrisisTemplate {
  id: string;
  name: string;
  description: string;
  type: ModernCrisisType;
  baseTension: number;           // How much tension this adds (5-15)
  prestigeStakes: number;        // Base prestige at risk (10-25)
  pillarStakes: Partial<PrestigePillars>;  // Which pillars are affected
  escalationFlavor: string;      // Narrative description of how this escalates
  codexHint: string;             // Educational insight shown during crisis
  /** Which regions or countries are likely triggers */
  triggerRegions?: string[];
}

export const MODERN_CRISIS_TEMPLATES: CrisisTemplate[] = [
  {
    id: 'south_china_sea_drone',
    name: 'South China Sea Drone Swarm',
    description: 'Unidentified drone fleets disrupt vital shipping routes in contested waters.',
    type: 'military',
    baseTension: 12,
    prestigeStakes: 18,
    pillarStakes: { military: 4, tech: 2 },
    escalationFlavor: 'Rapid gray-zone military posturing.',
    codexHint: 'Gray-zone tactics exploit ambiguity between peace and war, making escalation harder to contain.',
    triggerRegions: ['china', 'vietnam', 'south_korea', 'japan'],
  },
  {
    id: 'arctic_resource_claim',
    name: 'Arctic Resource Claim',
    description: 'Melting ice opens new claims to oil, gas, and shipping routes in the Arctic.',
    type: 'resource',
    baseTension: 11,
    prestigeStakes: 20,
    pillarStakes: { economic: 3, military: 2 },
    escalationFlavor: 'Classic sphere-of-influence standoff over newly accessible resources.',
    codexHint: 'Resource scarcity often escalates faster than ideological disputes because the stakes are tangible and zero-sum.',
  },
  {
    id: 'ai_ethics_treaty_collapse',
    name: 'AI Ethics Treaty Collapse',
    description: 'Major powers walk away from global AI governance agreement, sparking a tech arms race.',
    type: 'tech_governance',
    baseTension: 15,
    prestigeStakes: 25,
    pillarStakes: { tech: 5, cultural: 2 },
    escalationFlavor: 'Tech/information domain confrontation with regulatory implications.',
    codexHint: 'Technology governance gaps mirror the nuclear arms control challenge — cooperation is fragile but essential.',
  },
  {
    id: 'supply_chain_cyber_attack',
    name: 'Global Supply Chain Cyber Attack',
    description: 'Coordinated cyber strikes cripple international logistics and manufacturing.',
    type: 'cyber',
    baseTension: 10,
    prestigeStakes: 16,
    pillarStakes: { tech: 3, economic: 3 },
    escalationFlavor: 'Economic + tech hybrid escalation with attribution uncertainty.',
    codexHint: 'Cyber attacks blur the line between espionage and warfare — attribution difficulty makes proportional response nearly impossible.',
  },
  {
    id: 'sahel_migration_crisis',
    name: 'Sahel Climate Migration Crisis',
    description: 'Drought and conflict drive massive refugee movements across borders.',
    type: 'migration',
    baseTension: 9,
    prestigeStakes: 14,
    pillarStakes: { cultural: 3, economic: 2 },
    escalationFlavor: 'Humanitarian + stability test with domestic political pressure.',
    codexHint: 'Climate-driven migration creates compounding crises where humanitarian need and political stability conflict.',
    triggerRegions: ['egypt', 'saudi_arabia'],
  },
  {
    id: 'orbital_debris_conflict',
    name: 'Orbital Debris Conflict',
    description: 'Anti-satellite tests create dangerous debris fields threatening critical infrastructure.',
    type: 'space',
    baseTension: 13,
    prestigeStakes: 22,
    pillarStakes: { tech: 4, military: 3 },
    escalationFlavor: 'Emerging space domain crisis with cascading infrastructure risk.',
    codexHint: 'Space debris follows the "Kessler Syndrome" — one destructive event can trigger a chain reaction making orbits unusable.',
  },
  {
    id: 'rare_earth_export_ban',
    name: 'Rare Earth Mineral Export Ban',
    description: 'Key supplier imposes sudden restrictions on critical materials for electronics and defense.',
    type: 'economic',
    baseTension: 10,
    prestigeStakes: 17,
    pillarStakes: { economic: 4, tech: 2 },
    escalationFlavor: 'Economic leverage play targeting supply chain dependencies.',
    codexHint: 'Resource weaponization creates short-term leverage but accelerates the target\'s drive toward self-sufficiency.',
    triggerRegions: ['china'],
  },
  {
    id: 'cross_strait_tech_decoupling',
    name: 'Cross-Strait Tech Decoupling',
    description: 'Sudden restrictions on advanced semiconductor trade between major tech economies.',
    type: 'tech_governance',
    baseTension: 14,
    prestigeStakes: 23,
    pillarStakes: { tech: 5, economic: 3 },
    escalationFlavor: 'High-tech prestige battle with global supply chain implications.',
    codexHint: 'Semiconductor supply chains are the most geopolitically concentrated in history — disruption here cascades everywhere.',
    triggerRegions: ['china', 'south_korea', 'japan'],
  },
  {
    id: 'polar_ice_resource_race',
    name: 'Polar Ice Melt Resource Race',
    description: 'Accelerating ice melt opens new Arctic and Antarctic territorial claims.',
    type: 'resource',
    baseTension: 12,
    prestigeStakes: 19,
    pillarStakes: { economic: 3, military: 2, cultural: 1 },
    escalationFlavor: 'Environmental + territorial scramble.',
    codexHint: 'Climate change doesn\'t just create humanitarian crises — it redraws the strategic map by opening new frontiers.',
  },
  {
    id: 'pandemic_border_closure',
    name: 'Pandemic Variant Border Closure',
    description: 'New pandemic variant triggers widespread travel and trade shutdowns.',
    type: 'diplomatic',
    baseTension: 8,
    prestigeStakes: 13,
    pillarStakes: { economic: 2, cultural: 2 },
    escalationFlavor: 'Health-security hybrid crisis with economic collateral damage.',
    codexHint: 'Pandemic responses reveal the tension between national sovereignty and global interdependence.',
  },
  {
    id: 'quantum_espionage',
    name: 'Quantum Computing Espionage',
    description: 'Accusations of state-sponsored quantum technology theft threaten encryption worldwide.',
    type: 'cyber',
    baseTension: 15,
    prestigeStakes: 24,
    pillarStakes: { tech: 5, military: 2 },
    escalationFlavor: 'Future-tech intelligence crisis with existential cybersecurity implications.',
    codexHint: 'Quantum computing threatens all current encryption — whoever achieves it first gains unprecedented intelligence advantage.',
  },
  {
    id: 'green_subsidy_war',
    name: 'Green Energy Subsidy War',
    description: 'Competing massive subsidies distort global clean-tech markets and trade relationships.',
    type: 'economic',
    baseTension: 9,
    prestigeStakes: 15,
    pillarStakes: { economic: 3, cultural: 2 },
    escalationFlavor: 'Economic soft-power contest disguised as climate leadership.',
    codexHint: 'Industrial policy can look like climate leadership or protectionism depending on who\'s describing it.',
  },
  {
    id: 'undersea_cable_sabotage',
    name: 'Undersea Cable Sabotage',
    description: 'Critical internet backbone cables damaged in strategic waters — attribution unclear.',
    type: 'information',
    baseTension: 11,
    prestigeStakes: 18,
    pillarStakes: { tech: 3, military: 2 },
    escalationFlavor: 'Infrastructure gray-zone attack with plausible deniability.',
    codexHint: '97% of intercontinental data travels via undersea cables — targeting them is the modern equivalent of cutting telegraph lines.',
  },
  {
    id: 'climate_refugee_flow',
    name: 'Climate Refugee Flow',
    description: 'Mass displacement from climate disasters overwhelms regional borders and aid systems.',
    type: 'climate',
    baseTension: 10,
    prestigeStakes: 16,
    pillarStakes: { cultural: 3, economic: 2 },
    escalationFlavor: 'Humanitarian stability crisis testing alliance commitments.',
    codexHint: 'Climate refugees challenge the international order because existing frameworks were designed for political, not environmental, displacement.',
  },
  {
    id: 'mekong_water_dispute',
    name: 'Mekong Water Rights Dispute',
    description: 'Upstream dams spark downstream water scarcity tensions between nations.',
    type: 'resource',
    baseTension: 9,
    prestigeStakes: 14,
    pillarStakes: { economic: 2, cultural: 1 },
    escalationFlavor: 'Resource-sharing standoff with riparian nations.',
    codexHint: 'Water conflicts are often called "the wars of the 21st century" — sharing rivers requires sustained cooperation.',
    triggerRegions: ['china', 'vietnam'],
  },
  {
    id: 'financial_grid_cyber_attack',
    name: 'Financial Grid Cyber Attack',
    description: 'Major intrusion targets international banking infrastructure, threatening global markets.',
    type: 'cyber',
    baseTension: 13,
    prestigeStakes: 21,
    pillarStakes: { economic: 4, tech: 3 },
    escalationFlavor: 'Economic warfare escalation with systemic financial risk.',
    codexHint: 'Financial system attacks can cause more economic damage than conventional warfare while maintaining plausible deniability.',
  },
  {
    id: 'satellite_jamming',
    name: 'Satellite Navigation Jamming',
    description: 'Widespread GPS jamming disrupts civilian and military navigation across key regions.',
    type: 'space',
    baseTension: 12,
    prestigeStakes: 19,
    pillarStakes: { tech: 3, military: 3 },
    escalationFlavor: 'Space-domain hybrid threat affecting civilian and military systems.',
    codexHint: 'Modern militaries and economies are deeply dependent on satellite navigation — jamming is low-cost but high-impact.',
  },
  {
    id: 'deep_sea_mining_collapse',
    name: 'Deep-Sea Mining Regulatory Collapse',
    description: 'International seabed mining rules break down amid competing resource claims.',
    type: 'resource',
    baseTension: 10,
    prestigeStakes: 17,
    pillarStakes: { economic: 3, cultural: 1, tech: 1 },
    escalationFlavor: 'Emerging blue-economy conflict over shared ocean resources.',
    codexHint: 'The deep seabed is legally "the common heritage of mankind" — but enforcement is nearly impossible when minerals become scarce.',
  },
  {
    id: 'data_sovereignty_breach',
    name: 'Data Sovereignty Breach',
    description: 'Major cloud providers accused of violating national data protection laws across multiple countries.',
    type: 'information',
    baseTension: 11,
    prestigeStakes: 18,
    pillarStakes: { tech: 4, cultural: 2 },
    escalationFlavor: 'Information control crisis with trade implications.',
    codexHint: 'Data sovereignty reflects a fundamental tension: the internet was designed to be borderless, but governance is territorial.',
  },
  {
    id: 'antarctic_sovereignty',
    name: 'Antarctic Sovereignty Dispute',
    description: 'Overlapping claims flare over new research and resource stations in Antarctica.',
    type: 'resource',
    baseTension: 12,
    prestigeStakes: 20,
    pillarStakes: { military: 2, economic: 2, tech: 2 },
    escalationFlavor: 'Polar great-power competition testing international treaties.',
    codexHint: 'The Antarctic Treaty System (1959) has kept the continent peaceful — but it was designed when resources were unreachable.',
  },
];

/**
 * Get a random crisis template, optionally filtered by type or region.
 */
export function getRandomCrisisTemplate(
  options?: { type?: ModernCrisisType; regionCountry?: string }
): CrisisTemplate {
  let pool = MODERN_CRISIS_TEMPLATES;

  if (options?.type) {
    const filtered = pool.filter(t => t.type === options.type);
    if (filtered.length > 0) pool = filtered;
  }

  if (options?.regionCountry) {
    const filtered = pool.filter(t =>
      t.triggerRegions?.includes(options.regionCountry!)
    );
    if (filtered.length > 0) pool = filtered;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a crisis template by its ID.
 */
export function getCrisisTemplateById(id: string): CrisisTemplate | undefined {
  return MODERN_CRISIS_TEMPLATES.find(t => t.id === id);
}
