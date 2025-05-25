// src/renderer/components/panels/PolicyActionPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Policy, PolicyType } from '../../../shared/types/policy';
import { addPolicy } from '../../features/player/playerSlice';
import { audioService } from '../../services/AudioService';
import Button from '../common/Button'; 
import ErrorMessage from '../common/ErrorMessage';
import { createLogger } from '../../utils/logger'; // Assuming logger is available

const logger = createLogger('PolicyActionPanel');

/**
 * Props for the PolicyActionPanel component.
 */
interface PolicyActionPanelProps {
  /** The ID of the country targeted by the policy. */
  countryId: string;
  /** The type of policy to be configured and potentially implemented. */
  policyType: PolicyType;
  /** Callback function to close the policy action panel. */
  onClose: () => void;
}

/**
 * Configuration for a single level of a policy.
 */
export interface PolicyLevelConfig {
  /** The numerical value representing this policy level (e.g., 1, 2, 3). */
  value: number;
  /** A user-friendly label for this policy level (e.g., "$20M Aid", "5,000 Troops"). */
  label: string;
}

/**
 * Configuration for the costs associated with a policy level.
 */
export interface PolicyCostConfig {
  /** The amount of political capital required to implement this policy level. */
  politicalCapital: number;
  /** The economic cost (e.g., in millions of dollars) for this policy level. */
  economicCost: number;
  /** The military resources cost (e.g., number of troops) for this policy level. */
  militaryCost: number;
}

/**
 * Detailed configuration for a specific policy type.
 * Includes all available levels, their costs, effects, and a general description.
 */
export interface PolicyDetails {
  /** An array of available levels for this policy. */
  levels: PolicyLevelConfig[];
  /** An array of costs corresponding to each policy level. The index should match the level's value or be mapped accordingly. */
  costs: PolicyCostConfig[];
  /** An array of strings describing the general effects of this policy. */
  effects: string[];
  /** A general description of what the policy entails. */
  description: string;
}

/**
 * `PolicyActionPanel` is a UI component that allows players to configure and implement
 * various policies towards a target country. It displays policy details, costs, effects,
 * and allows selection of an implementation level.
 */
export const PolicyActionPanel: React.FC<PolicyActionPanelProps> = ({
  countryId,
  policyType,
  onClose,
}) => {
  const dispatch = useDispatch();

  // --- Redux State Selection ---
  const country = useSelector((state: RootState) => state.world.countries[countryId]);
  const playerFactionKey = useSelector((state: RootState) => state.player.faction);
  const politicalCapital = useSelector((state: RootState) => state.player.politicalCapital);
  const currentTurn = useSelector((state: RootState) => state.game.currentTurn);

  // --- Component State ---
  /** The currently selected level for the policy. Defaults to 1 (first effective level). */
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  /** Error message string to display if an issue occurs (e.g., insufficient resources). */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Memoize playerFaction to avoid re-renders if playerFactionKey is stable.
  const playerFaction = useMemo(() => playerFactionKey || 'UNKNOWN_FACTION', [playerFactionKey]);

  // Static mapping of PolicyType enum/string to human-readable names.
  const policyTypeNames: Record<PolicyType, string> = useMemo(() => ({
    'military-aid': 'Military Aid',
    'aid-insurgents': 'Aid Insurgents',
    'intervene-govt': 'Intervene for Government',
    'intervene-rebels': 'Intervene for Rebels',
    'economic-aid': 'Economic Aid',
    'trade-policy': 'Trade Policy',
    'treaty': 'Formal Treaty',
    'diplomatic-pressure': 'Diplomatic Pressure',
    'destabilize': 'Destabilize Nation',
    'cyber-operations': 'Cyber Operations',
  }), []);
  
  /**
   * Retrieves the detailed configuration for a given policy type.
   * This includes levels, costs, effects, and description.
   * This function should contain the comprehensive definitions for all policies.
   * @param type - The `PolicyType` for which to get the configuration.
   * @returns A `PolicyDetails` object for the specified policy type.
   * @todo This function needs to be fully implemented with all policy details.
   *       Currently, it uses a placeholder for policies other than 'military-aid'.
   */
  const getPolicyConfig = useCallback((type: PolicyType): PolicyDetails => {
    // Default configuration used if a specific policy type is not yet implemented.
    const defaultConfig: PolicyDetails = {
        levels: [{ value: 0, label: 'None' }, { value: 1, label: 'Standard Action' }],
        costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 10, militaryCost: 0 }
        ],
        effects: ['This policy has a generic effect.'],
        description: 'Detailed description for this policy is not yet available.',
    };

    switch (type) {
      case 'military-aid':
        return {
          levels: [
            { value: 0, label: 'None' }, { value: 1, label: '$20M' }, { value: 2, label: '$100M' },
            { value: 3, label: '$500M' }, { value: 4, label: '$1B' }, { value: 5, label: '$5B' }
          ],
          costs: [ // Index corresponds to level value
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 }, // Level 0
            { politicalCapital: 5, economicCost: 20, militaryCost: 0 },  // Level 1
            { politicalCapital: 10, economicCost: 100, militaryCost: 0 }, // Level 2
            { politicalCapital: 15, economicCost: 500, militaryCost: 0 }, // Level 3
            { politicalCapital: 20, economicCost: 1000, militaryCost: 0 },// Level 4
            { politicalCapital: 30, economicCost: 5000, militaryCost: 0 } // Level 5
          ],
          effects: ['Strengthens government military capabilities.', 'Improves diplomatic relations with the target.', 'May deter insurgency growth.'],
          description: 'Provide military equipment, funding, and training to the government of the target country.'
        };
      // --- TODO: Implement all other policy types here ---
      // case 'aid-insurgents': return { ... };
      // case 'economic-aid': return { ... };
      // ... etc.
      default:
        logger.warn(`Policy configuration for type "${type}" is not fully implemented. Using default config.`);
        return defaultConfig;
    }
  }, [logger]); // Assuming logger is stable

  // Memoize policyConfig to avoid re-calculating on every render unless policyType changes.
  const policyConfig = useMemo(() => getPolicyConfig(policyType), [policyType, getPolicyConfig]);

  // Effect to reset selectedLevel to 1 if the policyConfig changes and 1 is a valid level.
  // This handles cases where a new policyType might have different levels.
  useEffect(() => {
    if (policyConfig.levels.find(l => l.value === 1)) {
      setSelectedLevel(1);
    } else if (policyConfig.levels.length > 0) {
      // Fallback to the first available level if level 1 doesn't exist (e.g., only level 0)
      setSelectedLevel(policyConfig.levels[0].value);
    }
  }, [policyConfig]);


  if (!country) {
    logger.error(`PolicyActionPanel: Country data for ID "${countryId}" not found in Redux state.`);
    return <ErrorMessage message={`Country data for the selected nation (${countryId}) is unavailable. Please close and retry.`} />;
  }
  
  /**
   * Determines if a specific policy level is disabled based on player resources (e.g., political capital)
   * and other game conditions (not yet implemented here, e.g., diplomatic status).
   * @param levelValue - The numerical value of the policy level to check.
   * @returns `true` if the level is disabled, `false` otherwise.
   */
  const isLevelDisabled = (levelValue: number): boolean => {
    if (levelValue === 0) return false; // Level 0 (None) is always selectable.
    // Ensure the levelValue is a valid index for the costs array.
    if (levelValue < 0 || levelValue >= policyConfig.costs.length) {
        logger.warn(`isLevelDisabled: Invalid levelValue "${levelValue}" for policy "${policyType}". Costs array length: ${policyConfig.costs.length}`);
        return true; // Consider invalid levels as disabled.
    }

    const cost = policyConfig.costs[levelValue];
    if (cost.politicalCapital > politicalCapital) {
      return true; // Not enough political capital.
    }
    
    // TODO: Implement additional disabling conditions:
    // - Check for required diplomatic relations.
    // - Check for specific insurgency levels or government stability.
    // - Check for resource costs (economic, military) against player reserves.
    return false;
  };

  /**
   * Handles the implementation of the selected policy at the chosen level.
   * Validates conditions (e.g., resources), creates a policy object,
   * and dispatches it to the Redux store.
   */
  const handleImplementPolicy = () => {
    setErrorMsg(null); // Clear previous errors.

    if (selectedLevel === 0) {
      // "None" selected; typically means canceling or not applying a new policy.
      logger.info(`Policy implementation: Level 0 (None) selected for ${policyType} on ${countryId}. Closing panel.`);
      audioService.playSound('action_cancelled'); 
      onClose();
      return;
    }

    // Validate selectedLevel against available cost configurations.
    if (selectedLevel < 0 || selectedLevel >= policyConfig.costs.length) {
        logger.error(`Invalid policy level selected: ${selectedLevel} for policy type ${policyType}.`);
        setErrorMsg("An invalid policy level was selected. Please try again.");
        return;
    }
    const cost = policyConfig.costs[selectedLevel];

    // Check for sufficient political capital.
    if (cost.politicalCapital > politicalCapital) {
      logger.warn(`Insufficient political capital to implement ${policyType} level ${selectedLevel} on ${countryId}. Needed: ${cost.politicalCapital}, Have: ${politicalCapital}`);
      setErrorMsg('Not enough political capital to implement this policy level.');
      audioService.playSound('error');
      return;
    }
    // TODO: Add checks for economic and military costs against player reserves.

    // Construct the new policy object.
    const policyId = `${policyType}_${countryId}_${Date.now()}`; // Unique ID for the policy instance.
    const newPolicy: Policy = {
      id: policyId,
      type: policyType,
      level: selectedLevel,
      targetCountryId: countryId,
      sourceCountryId: playerFaction, // Assumes playerFaction is the ID of the player's country/entity.
      cost,
      effects: [], // Actual effects are determined by game logic engine based on policy type, level, and context.
      status: 'pending', // Policies might be 'pending' until turn processing, or 'active' if immediate.
      turnImplemented: currentTurn,
    };

    logger.info(`Implementing policy: ${policyType} (Level ${selectedLevel}) on country ${countryId}.`, { policy: newPolicy });
    dispatch(addPolicy(newPolicy)); // Dispatch action to add policy to player's active policies.
    audioService.playSound('policy_enacted');
    onClose(); // Close the panel after successful dispatch.
  };
  
  const currentPolicyName = policyTypeNames[policyType] || 'Unknown Policy';

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6 shadow-xl border border-gray-700 text-gray-200 w-full max-w-lg mx-auto">
      {/* Panel Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl sm:text-2xl font-semibold text-blue-300">{currentPolicyName}</h3>
        <Button onClick={onClose} variant="ghost" size="sm" aria-label="Close panel" className="text-2xl">&times;</Button>
      </div>

      {/* Policy Description and Error Message */}
      <p className="text-sm text-gray-400 mb-5">{policyConfig.description}</p>
      <ErrorMessage message={errorMsg} />

      {/* Policy Level Selection */}
      <div className="mb-5">
        <h4 className="text-md sm:text-lg font-medium text-gray-100 mb-2">Select Intensity Level</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {policyConfig.levels.map((level) => (
            <Button
              key={level.value}
              variant={selectedLevel === level.value ? 'primary' : 'secondary'}
              onClick={() => {
                if (!isLevelDisabled(level.value)) {
                  setSelectedLevel(level.value);
                  setErrorMsg(null); // Clear error when a valid level is selected.
                  logger.debug(`Policy level selected: ${level.label} (Value: ${level.value}) for ${policyType}`);
                } else {
                  logger.warn(`Attempted to select disabled level: ${level.label} for ${policyType}`);
                  // Optionally set an error message if clicking a disabled button should provide feedback.
                }
              }}
              disabled={isLevelDisabled(level.value)}
              className="w-full text-sm py-2.5" // Ensure consistent button height and full width.
              title={level.label} // Tooltip for potentially truncated labels.
            >
              {level.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Costs and Effects Display (only if a positive level is selected) */}
      {selectedLevel > 0 && selectedLevel < policyConfig.costs.length && (
        <div className="mb-5 p-3 bg-gray-750 rounded-md space-y-3">
          <div>
            <h4 className="text-md font-semibold text-gray-100 mb-1">Costs for Level {selectedLevel}</h4>
            <div className="text-sm space-y-0.5 text-gray-300">
              <p>Political Capital: <span className="font-medium text-orange-400">{policyConfig.costs[selectedLevel].politicalCapital}</span></p>
              {policyConfig.costs[selectedLevel].economicCost > 0 && (
                <p>Economic Cost: <span className="font-medium text-green-400">${policyConfig.costs[selectedLevel].economicCost}M</span></p>
              )}
              {policyConfig.costs[selectedLevel].militaryCost > 0 && (
                <p>Military Resources: <span className="font-medium text-red-400">{policyConfig.costs[selectedLevel].militaryCost} Units</span></p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-md font-semibold text-gray-100 mb-1">Expected Effects</h4>
            <ul className="list-disc list-inside text-xs text-gray-400 pl-1 space-y-0.5">
              {policyConfig.effects.map((effect, index) => (
                <li key={index}>{effect}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleImplementPolicy}
          variant="primary"
          // Disable if level 0 is selected AND it's not a "clear policy" action, or if the selected level is disabled.
          disabled={selectedLevel < 0 || isLevelDisabled(selectedLevel) && selectedLevel !==0}
          // isLoading={isImplementing} // Add a state for this if policy dispatch becomes async with feedback.
        >
          {selectedLevel === 0 ? 'Clear/Confirm No Action' : 'Implement Policy'}
        </Button>
      </div>
    </div>
  );
};
```