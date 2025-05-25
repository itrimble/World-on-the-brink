import playerReducer, {
  setFaction,
  adjustPoliticalCapital,
  adjustPrestige,
  setDefcon,
  addPolicy,
  removePolicy,
  updateInfluence,
  resetPlayer,
  prepareNextTurn,
  // PlayerState, // Not needed directly for tests unless for specific type checks
} from './player-slice'; // Adjust path if your slice is elsewhere
import { Policy, PolicyCostConfig } from './src/shared/types/policy'; // Adjust path

// Define a more specific type for PlayerState if not exported from slice
// For now, using 'any' for initial state in tests for simplicity, but prefer specific type.
const getInitialState = (faction: 'usa' | 'ussr' = 'usa') => ({
  faction,
  politicalCapital: 100,
  prestige: 0,
  militaryReserves: 500000,
  economicReserves: 10000,
  defcon: 5 as 5 | 4 | 3 | 2 | 1,
  activePolicies: [] as Policy[],
  diplomaticInfluence: {} as Record<string, number>,
});

describe('playerSlice', () => {
  let initialState: ReturnType<typeof getInitialState>;

  beforeEach(() => {
    initialState = getInitialState();
  });

  test('should return the initial state', () => {
    expect(playerReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('setFaction should update the faction', () => {
    const actual = playerReducer(initialState, setFaction('ussr'));
    expect(actual.faction).toEqual('ussr');
  });

  test('adjustPoliticalCapital should add to politicalCapital', () => {
    const actual = playerReducer(initialState, adjustPoliticalCapital(10));
    expect(actual.politicalCapital).toEqual(110);
  });

  test('adjustPoliticalCapital should subtract from politicalCapital and not go below 0', () => {
    let actual = playerReducer(initialState, adjustPoliticalCapital(-50));
    expect(actual.politicalCapital).toEqual(50);
    actual = playerReducer(actual, adjustPoliticalCapital(-100)); // Try to go below 0
    expect(actual.politicalCapital).toEqual(0);
  });

  test('adjustPrestige should update prestige', () => {
    const actual = playerReducer(initialState, adjustPrestige(5));
    expect(actual.prestige).toEqual(5);
    const nextActual = playerReducer(actual, adjustPrestige(-2));
    expect(nextActual.prestige).toEqual(3);
  });

  test('setDefcon should update defcon level', () => {
    const actual = playerReducer(initialState, setDefcon(3));
    expect(actual.defcon).toEqual(3);
  });

  describe('addPolicy', () => {
    const mockPolicyCost: PolicyCostConfig = { politicalCapital: 10, economicCost: 100, militaryCost: 1000 };
    const mockPolicy: Policy = {
      id: 'policy1',
      type: 'economic-aid',
      level: 1,
      targetCountryId: 'CAN',
      sourceCountryId: 'USA',
      cost: mockPolicyCost,
      effects: [],
      status: 'active',
      turnImplemented: 1,
    };

    test('should add a policy to activePolicies and deduct costs', () => {
      const stateBeforeAdd = {
        ...initialState,
        politicalCapital: 50,
        economicReserves: 500,
        militaryReserves: 5000,
      };
      const actual = playerReducer(stateBeforeAdd, addPolicy(mockPolicy));
      
      expect(actual.activePolicies).toHaveLength(1);
      expect(actual.activePolicies[0]).toEqual(mockPolicy);
      expect(actual.politicalCapital).toEqual(stateBeforeAdd.politicalCapital - mockPolicyCost.politicalCapital);
      expect(actual.economicReserves).toEqual(stateBeforeAdd.economicReserves - mockPolicyCost.economicCost);
      expect(actual.militaryReserves).toEqual(stateBeforeAdd.militaryReserves - mockPolicyCost.militaryCost);
    });
  });

  test('removePolicy should remove a policy by id', () => {
    const policy1: Policy = { id: 'p1', type: 'treaty', cost: { politicalCapital: 0, economicCost:0, militaryCost:0}, level:1, sourceCountryId:'', status:'active', targetCountryId:'', turnImplemented:0, effects:[] };
    const policy2: Policy = { id: 'p2', type: 'economic-aid', cost: { politicalCapital: 0, economicCost:0, militaryCost:0}, level:1, sourceCountryId:'', status:'active', targetCountryId:'', turnImplemented:0, effects:[] };
    const stateWithPolicies = { ...initialState, activePolicies: [policy1, policy2] };
    
    const actual = playerReducer(stateWithPolicies, removePolicy('p1'));
    expect(actual.activePolicies).toHaveLength(1);
    expect(actual.activePolicies[0].id).toEqual('p2');
  });

  test('updateInfluence should add or update influence for a country', () => {
    let actual = playerReducer(initialState, updateInfluence({ countryId: 'MEX', value: 10 }));
    expect(actual.diplomaticInfluence['MEX']).toEqual(10);

    actual = playerReducer(actual, updateInfluence({ countryId: 'MEX', value: 5 }));
    expect(actual.diplomaticInfluence['MEX']).toEqual(15);

    actual = playerReducer(actual, updateInfluence({ countryId: 'CAN', value: 20 }));
    expect(actual.diplomaticInfluence['CAN']).toEqual(20);
  });

  test('resetPlayer should reset state to initial with specified faction', () => {
    const modifiedState = {
      ...initialState,
      politicalCapital: 50,
      prestige: 10,
      faction: 'ussr' as 'usa' | 'ussr',
    };
    const actualUSA = playerReducer(modifiedState, resetPlayer({ faction: 'usa' }));
    expect(actualUSA).toEqual(getInitialState('usa'));

    const actualUSSR = playerReducer(modifiedState, resetPlayer({ faction: 'ussr' }));
    expect(actualUSSR).toEqual(getInitialState('ussr'));
  });

  describe('prepareNextTurn', () => {
    test('should regenerate political capital', () => {
      const stateBefore = { ...initialState, politicalCapital: 50 };
      const actual = playerReducer(stateBefore, prepareNextTurn());
      expect(actual.politicalCapital).toEqual(60); // 50 + 10
    });

    test('should remove expired policies', () => {
      const activePolicy: Policy = { id: 'p1', type:'treaty', status: 'active', cost:{politicalCapital:0, economicCost:0, militaryCost:0}, level:0, sourceCountryId:'', targetCountryId:'', turnImplemented:0, effects:[] };
      const expiredPolicy: Policy = { id: 'p2', type:'treaty', status: 'expired', cost:{politicalCapital:0, economicCost:0, militaryCost:0}, level:0, sourceCountryId:'', targetCountryId:'', turnImplemented:0, effects:[] };
      const stateWithPolicies = { ...initialState, activePolicies: [activePolicy, expiredPolicy] };
      
      const actual = playerReducer(stateWithPolicies, prepareNextTurn());
      expect(actual.activePolicies).toHaveLength(1);
      expect(actual.activePolicies[0].id).toEqual('p1');
    });
  });
});
```
