```typescript
// src/renderer/components/panels/PolicyActionPanel.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Policy, PolicyType } from '../../../shared/types/policy';
import { addPolicy } from '../../features/player/playerSlice';
import { audioService } from '../../services/AudioService';
import { Button } from '../common/Button';

interface PolicyActionPanelProps {
  countryId: string;
  policyType: PolicyType;
  onClose: () => void;
}

export const PolicyActionPanel: React.FC<PolicyActionPanelProps> = ({
  countryId,
  policyType,
  onClose
}) => {
  const dispatch = useDispatch();
  const country = useSelector((state: RootState) => state.world.countries[countryId]);
  const playerFaction = useSelector((state: RootState) => state.player.faction);
  const politicalCapital = useSelector((state: RootState) => state.player.politicalCapital);
  const currentTurn = useSelector((state: RootState) => state.game.currentTurn);
  
  const [selectedLevel, setSelectedLevel] = useState(1); // Default to lowest level
  
  if (!country) return null;
  
  // Policy type name mapping for display
  const policyTypeNames: Record<PolicyType, string> = {
    'military-aid': 'Military Aid',
    'aid-insurgents': 'Aid to Insurgents',
    'intervene-govt': 'Intervene for Government',
    'intervene-rebels': 'Intervene for Rebels',
    'economic-aid': 'Economic Aid',
    'trade-policy': 'Trade Policy',
    'treaty': 'Treaty',
    'diplomatic-pressure': 'Diplomatic Pressure',
    'destabilize': 'Destabilize',
    'cyber-operations': 'Cyber Operations'
  };
  
  // Get policy levels and costs based on policy type
  const getPolicyConfig = (): { 
    levels: { value: number; label: string; }[]; 
    costs: { politicalCapital: number; economicCost: number; militaryCost: number; }[];
    effects: string[];
    description: string;
  } => {
    switch (policyType) {
      case 'military-aid':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: '$20 million' },
            { value: 2, label: '$100 million' },
            { value: 3, label: '$500 million' },
            { value: 4, label: '$1 billion' },
            { value: 5, label: '$5 billion' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 5, economicCost: 20, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 100, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 500, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 1000, militaryCost: 0 },
            { politicalCapital: 30, economicCost: 5000, militaryCost: 0 }
          ],
          effects: [
            'Strengthens government military capability',
            'Increases government stability',
            'Improves diplomatic relations',
            'Deters insurgency growth'
          ],
          description: 'Provide military equipment and training to the government.'
        };
        
      case 'aid-insurgents':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: '$20 million' },
            { value: 2, label: '$100 million' },
            { value: 3, label: '$500 million' },
            { value: 4, label: '$1 billion' },
            { value: 5, label: '$2 billion' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 20, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 100, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 500, militaryCost: 0 },
            { politicalCapital: 25, economicCost: 1000, militaryCost: 0 },
            { politicalCapital: 35, economicCost: 2000, militaryCost: 0 }
          ],
          effects: [
            'Strengthens insurgent capabilities',
            'Weakens government stability',
            'Worsens diplomatic relations with government',
            'May trigger crisis with opposing superpower'
          ],
          description: 'Supply weapons and resources to insurgent forces.'
        };
        
      case 'economic-aid':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: '$50 million' },
            { value: 2, label: '$200 million' },
            { value: 3, label: '$1 billion' },
            { value: 4, label: '$3 billion' },
            { value: 5, label: '$10 billion' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 5, economicCost: 50, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 200, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 1000, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 3000, militaryCost: 0 },
            { politicalCapital: 25, economicCost: 10000, militaryCost: 0 }
          ],
          effects: [
            'Boosts economic growth',
            'Reduces coup risk',
            'Improves diplomatic relations',
            'Increases popular support for government'
          ],
          description: 'Provide financial assistance to support economic development.'
        };
        
      case 'intervene-govt':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: '5,000 troops' },
            { value: 2, label: '20,000 troops' },
            { value: 3, label: '50,000 troops' },
            { value: 4, label: '100,000 troops' },
            { value: 5, label: '250,000 troops' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 100, militaryCost: 5000 },
            { politicalCapital: 25, economicCost: 300, militaryCost: 20000 },
            { politicalCapital: 35, economicCost: 500, militaryCost: 50000 },
            { politicalCapital: 45, economicCost: 1000, militaryCost: 100000 },
            { politicalCapital: 60, economicCost: 2000, militaryCost: 250000 }
          ],
          effects: [
            'Significantly strengthens government military',
            'Major deterrent to insurgency',
            'Increases global tension level',
            'High risk of crisis with opposing superpower'
          ],
          description: 'Deploy troops to directly support the government.'
        };
        
      case 'treaty':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: 'Diplomatic Relations' },
            { value: 2, label: 'Friendship Treaty' },
            { value: 3, label: 'Mutual Assistance' },
            { value: 4, label: 'Defense Treaty' },
            { value: 5, label: 'Nuclear Defense' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 5, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 30, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 50, economicCost: 0, militaryCost: 0 }
          ],
          effects: [
            'Strengthens diplomatic relations',
            'Deters Finlandization',
            'Increases your commitment to defend',
            'May prevent opposing superpower interference'
          ],
          description: 'Sign a formal treaty establishing relations and commitments.'
        };
        
      case 'diplomatic-pressure':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: 'Mild Concern' },
            { value: 2, label: 'Official Protest' },
            { value: 3, label: 'Strong Condemnation' },
            { value: 4, label: 'Ultimatum' },
            { value: 5, label: 'Maximum Pressure' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 5, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 30, economicCost: 0, militaryCost: 0 }
          ],
          effects: [
            'Worsens diplomatic relations',
            'Increases chance of Finlandization',
            'Reduces government stability',
            'May increase military spending'
          ],
          description: 'Apply diplomatic pressure to influence government policies.'
        };
        
      case 'destabilize':
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: 'Minor Operations' },
            { value: 2, label: 'Moderate Operations' },
            { value: 3, label: 'Major Operations' },
            { value: 4, label: 'Extensive Operations' },
            { value: 5, label: 'Maximum Effort' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 30, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 40, economicCost: 0, militaryCost: 0 }
          ],
          effects: [
            'Increases coup risk',
            'Worsens diplomatic relations',
            'Reduces government stability',
            'High chance of crisis if discovered'
          ],
          description: 'Conduct covert operations to undermine the government.'
        };
        
      default:
        return {
          levels: [
            { value: 0, label: 'None' },
            { value: 1, label: 'Minimal' },
            { value: 2, label: 'Low' },
            { value: 3, label: 'Medium' },
            { value: 4, label: 'High' },
            { value: 5, label: 'Maximum' }
          ],
          costs: [
            { politicalCapital: 0, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 5, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 10, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 15, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 20, economicCost: 0, militaryCost: 0 },
            { politicalCapital: 25, economicCost: 0, militaryCost: 0 }
          ],
          effects: [
            'Generic effect 1',
            'Generic effect 2',
            'Generic effect 3'
          ],
          description: 'Generic policy description.'
        };
    }
  };
  
  const policyConfig = getPolicyConfig();
  
  // Calculate which policy levels are disabled based on political capital, costs, etc.
  const isLevelDisabled = (level: number): boolean => {
    if (level === 0) return false; // Can always choose "none"
    
    const cost = policyConfig.costs[level];
    
    // Check if we have enough political capital
    if (cost.politicalCapital > politicalCapital) {
      return true;
    }
    
    // Additional checks would be added here in a full implementation
    // For example:
    // - For military aid, check diplomatic relationship threshold
    // - For insurgency aid, check insurgency level
    // - For interventions, check contiguity requirements
    
    return false;
  };
  
  // Handle policy implementation
  const handleImplementPolicy = () => {
    if (selectedLevel === 0) {
      // If "None" selected, it's equivalent to canceling the current policy
      onClose();
      return;
    }
    
    const cost = policyConfig.costs[selectedLevel];
    
    // Create policy object
    const policyId = `${policyType}_${countryId}_${Date.now()}`;
    const policy: Policy = {
      id: policyId,
      type: policyType,
      level: selectedLevel,
      targetCountryId: countryId,
      sourceCountryId: playerFaction,
      cost,
      effects: [],
      status: 'pending',
      turnImplemented: currentTurn
    };
    
    // Play sound and dispatch action
    audioService.playSound('policy_enacted');
    dispatch(addPolicy(policy));
    
    // Close panel
    onClose();
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{policyTypeNames[policyType]}</h3>
        <button 
          className="text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      
      <p className="text-gray-300 mb-4">{policyConfig.description}</p>
      
      <div className="mb-4">
        <h4 className="text-lg font-semibold mb-2">Select Level</h4>
        <div className="grid grid-cols-3 gap-2">
          {policyConfig.levels.map((level) => (
            <button
              key={level.value}
              className={`
                px-3 py-2 rounded text-sm
                ${selectedLevel === level.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}
                ${isLevelDisabled(level.value) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'}
              `}
              onClick={() => !isLevelDisabled(level.value) && setSelectedLevel(level.value)}
              disabled={isLevelDisabled(level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
      
      {selectedLevel > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold mb-2">Cost</h4>
          <div className="bg-gray-900 rounded p-3">
            <div>Political Capital: {policyConfig.costs[selectedLevel].politicalCapital}</div>
            {policyConfig.costs[selectedLevel].economicCost > 0 && (
              <div>Economic Cost: ${policyConfig.costs[selectedLevel].economicCost} million</div>
            )}
            {policyConfig.costs[selectedLevel].militaryCost > 0 && (
              <div>Military Resources: {policyConfig.costs[selectedLevel].militaryCost} troops</div>
            )}
          </div>
        </div>
      )}
      
      {selectedLevel > 0 && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold mb-2">Effects</h4>
          <ul className="bg-gray-900 rounded p-3 list-disc list-inside">
            {policyConfig.effects.map((effect, index) => (
              <li key={index} className="text-gray-300">{effect}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-between">
        <Button
          onClick={onClose}
          variant="secondary"
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleImplementPolicy}
          variant="primary"
          disabled={selectedLevel === 0}
        >
          Implement Policy
        </Button>
      </div>
    </div>
  );
};
```