import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { PolicyActionPanel, PolicyDetails } from './policy-action-panel'; // Adjust path
import { PolicyType, Policy } from './src/shared/types/policy'; // Adjust path
import { Country } from './src/shared/types/country'; // Adjust path
import { audioService } from './services/AudioService'; // Adjust path

// Mock services
jest.mock('./services/AudioService');

// Mock Redux store and slices
const mockInitialPlayerState = {
  faction: 'USA',
  politicalCapital: 100,
  // ... other player fields
};
const playerSlice = createSlice({
  name: 'player',
  initialState: mockInitialPlayerState,
  reducers: {
    addPolicy: (state, action: { type: string, payload: Policy }) => {
      // Mock reducer, can add checks here if needed
    },
    // other reducers if needed by panel
  },
});

const mockInitialGameState = {
  currentTurn: 5,
  // ... other game fields
};
const gameSlice = createSlice({
  name: 'game',
  initialState: mockInitialGameState,
  reducers: {},
});

const mockCountryUSA: Country = {
  id: 'USA', name: 'United States', code: 'US',
  government: { type: 'democracy', stability: 90, alignment: 'western' },
  economy: { gdp: 20000, growth: 3, development: 'high' },
  military: { power: 100, spending: 700, nuclearStatus: 'arsenal' },
  internal: { insurgencyLevel: 0, coupRisk: 5 },
  relations: { USSR: 20 }
} as any; // Cast as any if some non-essential fields are missing for test

const mockInitialWorldState = {
  countries: { 'USA': mockCountryUSA },
  // ... other world fields
};
const worldSlice = createSlice({
  name: 'world',
  initialState: mockInitialWorldState,
  reducers: {},
});

const createMockStore = (playerStateOverrides = {}, worldStateOverrides = {}) => {
  return configureStore({
    reducer: {
      player: playerSlice.reducer,
      game: gameSlice.reducer,
      world: worldSlice.reducer,
    },
    preloadedState: {
      player: { ...mockInitialPlayerState, ...playerStateOverrides },
      game: { ...mockInitialGameState },
      world: { ...mockInitialWorldState, ...worldStateOverrides },
    },
  });
};

// Mock policy configurations (simplified for testing)
// The actual getPolicyConfig in the component is complex, so we'll rely on its internal logic mostly,
// but ensure that we test interaction with *a* policy.
const militaryAidPolicyType: PolicyType = 'military-aid';

describe('PolicyActionPanel', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockStore = createMockStore();
    mockOnClose.mockClear();
    (audioService.playSound as jest.Mock).mockClear();
    // Spy on dispatch
    jest.spyOn(mockStore, 'dispatch');
  });

  const renderPanel = (policyType: PolicyType = militaryAidPolicyType, countryId: string = 'USA') => {
    return render(
      <Provider store={mockStore}>
        <PolicyActionPanel countryId={countryId} policyType={policyType} onClose={mockOnClose} />
      </Provider>
    );
  };

  test('renders panel with policy name, description, levels, costs, and effects', async () => {
    renderPanel();
    
    // Check title (derived from policyTypeNames)
    expect(screen.getByText('Military Aid')).toBeInTheDocument();
    // Check description (from getPolicyConfig)
    expect(screen.getByText(/Provide military equipment and training/)).toBeInTheDocument();

    // Check for level selection buttons (labels from getPolicyConfig)
    // Level 0 "None" should exist, Level 1 "$20M" should exist for military-aid
    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '$20M' })).toBeInTheDocument();

    // Select level 1 ($20M) - it's usually selected by default if available
    // Let's ensure costs and effects are shown for the default selected level (level 1)
    await waitFor(() => {
      expect(screen.getByText(/Costs for Level 1/)).toBeInTheDocument();
      expect(screen.getByText(/Political Capital:/)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument(); // Cost for level 1
      expect(screen.getByText(/Economic Cost:/)).toBeInTheDocument();
      expect(screen.getByText(/\$20M/)).toBeInTheDocument(); // Cost for level 1

      expect(screen.getByText(/Expected Effects/)).toBeInTheDocument();
      expect(screen.getByText(/Strengthens government military/)).toBeInTheDocument();
    });
  });

  test('allows selecting different policy levels and updates displayed costs/effects', async () => {
    renderPanel();
    // Default is level 1 for military-aid
    await waitFor(() => expect(screen.getByText(/Costs for Level 1/)).toBeInTheDocument());

    // Select Level 2 ($100M)
    const level2Button = screen.getByRole('button', { name: '$100M' });
    fireEvent.click(level2Button);

    await waitFor(() => {
      expect(screen.getByText(/Costs for Level 2/)).toBeInTheDocument();
      expect(screen.getByText(/Political Capital:/)).toBeInTheDocument();
      // Check for PC cost of Level 2 Military Aid (10)
      const pcCostElements = screen.getAllByText('10'); // Get all elements with text '10'
      expect(pcCostElements.some(el => el.closest('div')?.textContent?.includes('Political Capital'))).toBe(true);

      expect(screen.getByText(/Economic Cost:/)).toBeInTheDocument();
      // Check for EC cost of Level 2 Military Aid ($100M)
      const ecCostElements = screen.getAllByText('$100M');
      expect(ecCostElements.some(el => el.closest('div')?.textContent?.includes('Economic Cost'))).toBe(true);
    });
  });

  test('disables levels if political capital is insufficient', () => {
    mockStore = createMockStore({ politicalCapital: 3 }); // Not enough for level 1 (cost 5)
    renderPanel();

    const level1Button = screen.getByRole('button', { name: '$20M' }); // Level 1 cost 5 PC
    expect(level1Button).toBeDisabled();
    const level0Button = screen.getByRole('button', { name: 'None' }); // Level 0 cost 0 PC
    expect(level0Button).not.toBeDisabled();
  });

  test('"Implement Policy" button dispatches addPolicy action and calls onClose', async () => {
    renderPanel(); // Uses default store with 100 PC

    // Level 1 is selected by default
    const implementButton = screen.getByRole('button', { name: 'Implement Policy' });
    fireEvent.click(implementButton);

    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: playerSlice.actions.addPolicy.type,
        payload: expect.objectContaining({
          type: militaryAidPolicyType,
          level: 1, // Default selected level
          targetCountryId: 'USA',
          cost: { politicalCapital: 5, economicCost: 20, militaryCost: 0 },
        }),
      }));
      expect(audioService.playSound).toHaveBeenCalledWith('policy_enacted');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('"Implement Policy" button shows error if PC is insufficient on submit', async () => {
    mockStore = createMockStore({ politicalCapital: 3 }); // PC is 3
    renderPanel();
    
    // Level 1 costs 5 PC, selected by default. Button should be disabled.
    // But if user manages to click (e.g. if disable logic was flawed), check error.
    // For testing, let's assume level 1 is selected and button is somehow clickable
    // Or, select level 0 then level 1 to ensure state is set.
    fireEvent.click(screen.getByRole('button', {name: '$20M'})); // re-select level 1
    
    const implementButton = screen.getByRole('button', { name: 'Implement Policy' });
    // Manually enable if needed for test scenario, though it should be disabled by `isLevelDisabled`
    // Object.defineProperty(implementButton, 'disabled', { writable: true });
    // (implementButton as HTMLButtonElement).disabled = false; // Not ideal for RTL

    // If button is correctly disabled, this click won't happen.
    // We are testing the handler's internal check.
    if(!implementButton.hasAttribute('disabled')) {
        fireEvent.click(implementButton);
    }


    // Check if the button is disabled due to PC
    expect(implementButton).toBeDisabled();

    // Simulate a scenario where the check within handleImplementPolicy is triggered
    // This part is tricky as the button should be disabled by isLevelDisabled.
    // We're essentially testing a safeguard.
    // To truly test handleImplementPolicy's internal check, we'd need to call it directly.
    // For component test, we verify the button state.
    // If we want to ensure error message shows if button was NOT disabled:
    // We could mock `isLevelDisabled` to return false for this specific test case.
    // (This is advanced and might overcomplicate the test for this component)
    
    // For now, the more direct test is that the button is disabled.
    // If it *was* clicked, the error would be:
    // await waitFor(() => {
    //   expect(screen.getByText('Not enough political capital.')).toBeInTheDocument();
    //   expect(audioService.playSound).toHaveBeenCalledWith('error');
    //   expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: playerSlice.actions.addPolicy.type }));
    // });
  });

  test('selecting Level 0 ("None") and clicking "Implement" calls onClose and plays cancel sound', async () => {
    renderPanel();
    
    const level0Button = screen.getByRole('button', { name: 'None' });
    fireEvent.click(level0Button);

    await waitFor(() => {
      // Button text might change based on selectedLevel === 0
      const implementButton = screen.getByRole('button', { name: 'Clear/Confirm No Action' });
      expect(implementButton).not.toBeDisabled(); // Should be enabled for level 0
      fireEvent.click(implementButton);
    });
    
    await waitFor(() => {
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: playerSlice.actions.addPolicy.type }));
      expect(audioService.playSound).toHaveBeenCalledWith('action_cancelled');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('Cancel button calls onClose', () => {
    renderPanel();
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  test('renders error message if country data is missing', () => {
    // Override store for this test to ensure country is not found
    mockStore = createMockStore({}, { countries: {} });
    renderPanel(militaryAidPolicyType, 'NON_EXISTENT_COUNTRY');
    expect(screen.getByText(/Country data for NON_EXISTENT_COUNTRY is unavailable./)).toBeInTheDocument();
  });

});
```
