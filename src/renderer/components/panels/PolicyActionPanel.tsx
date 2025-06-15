// src/renderer/components/panels/PolicyActionPanel.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { Policy, Country } from '../../types';
import { addPolicy } from '../../store/slices/player-slice';
import { applyPolicyEffects, checkPolicyEligibility, selectCountryById } from '../../store/slices/world-slice';
import { selectPrestige, selectPoliticalCapital, selectEconomicReserves, selectMilitaryReserves } from '../../store/slices/player-slice';
import Button from '../common/Button';

interface PolicyActionPanelProps {
  targetCountryId: string;
  onClose: () => void;
}

const PolicyActionPanel: React.FC<PolicyActionPanelProps> = ({
  targetCountryId,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const targetCountry = useSelector((state: RootState) => selectCountryById(state, targetCountryId));
  const playerCountryId = useSelector((state: RootState) => state.player.faction);
  const playerPrestige = useSelector(selectPrestige);
  const politicalCapital = useSelector(selectPoliticalCapital);
  const economicReserves = useSelector(selectEconomicReserves);
  const militaryReserves = useSelector(selectMilitaryReserves);
  
  // Component state
  const [selectedPolicyType, setSelectedPolicyType] = useState<Policy['type']>('military_aid');
  const [isImplementing, setIsImplementing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Policy definitions based on PRD
  const availablePolicies: Record<Policy['type'], Omit<Policy, 'id' | 'targetCountryId' | 'turnEnacted'>> = {
    military_aid: {
      name: 'Military Aid',
      description: 'Provide military equipment, training, and support to strengthen allied governments',
      type: 'military_aid',
      cost: { politicalCapital: 15, economicCost: 100, militaryCost: 50 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: 10,
        coupRiskChange: -15,
        relationChangeWithPlayer: 15,
        prestigeChangePlayer: 5
      }],
      duration: 3,
      requirements: {
        minRelationWithTarget: -25,
        targetAlignment: ['western', 'neutral'],
        isTargetSuperpower: false
      }
    },
    insurgency_aid: {
      name: 'Aid to Insurgents',
      description: 'Provide covert support to rebel groups fighting against unfriendly governments',
      type: 'insurgency_aid',
      cost: { politicalCapital: 20, economicCost: 50, militaryCost: 25 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: -15,
        insurgencyChange: 30,
        relationChangeWithPlayer: -20,
        prestigeChangePlayer: 8
      }],
      duration: 4,
      requirements: {
        maxRelationWithTarget: 25,
        targetAlignment: ['eastern', 'neutral'],
        isTargetSuperpower: false
      }
    },
    intervention: {
      name: 'Military Intervention',
      description: 'Direct military involvement to support or replace a government',
      type: 'intervention',
      cost: { politicalCapital: 40, economicCost: 500, militaryCost: 200 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: 0, // Variable based on circumstances
        relationChangeWithPlayer: -30,
        prestigeChangePlayer: 15
      }],
      duration: 6,
      requirements: {
        isTargetSuperpower: false
      }
    },
    economic_aid: {
      name: 'Economic Aid',
      description: 'Provide financial assistance to stabilize friendly economies',
      type: 'economic_aid',
      cost: { politicalCapital: 10, economicCost: 200 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: 8,
        relationChangeWithPlayer: 20,
        prestigeChangePlayer: 3
      }],
      duration: 2,
      requirements: {
        minRelationWithTarget: 0,
        isTargetSuperpower: false
      }
    },
    destabilization: {
      name: 'Destabilization Operations',
      description: 'Covert operations to undermine hostile governments',
      type: 'destabilization',
      cost: { politicalCapital: 25, economicCost: 75 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: -20,
        insurgencyChange: 25,
        coupRiskChange: 30,
        relationChangeWithPlayer: -35,
        prestigeChangePlayer: 10
      }],
      duration: 3,
      requirements: {
        maxRelationWithTarget: 0,
        isTargetSuperpower: false
      }
    },
    diplomatic_pressure: {
      name: 'Diplomatic Pressure',
      description: 'Use diplomatic leverage to influence government decisions',
      type: 'diplomatic_pressure',
      cost: { politicalCapital: 8 },
      effects: [{
        targetCountryId: targetCountryId,
        relationChangeWithPlayer: -10,
        prestigeChangePlayer: 2
      }],
      duration: 1,
      requirements: {}
    },
    treaty: {
      name: 'Formal Treaty',
      description: 'Establish formal diplomatic agreements and commitments',
      type: 'treaty',
      cost: { politicalCapital: 20 },
      effects: [{
        targetCountryId: targetCountryId,
        relationChangeWithPlayer: 25,
        prestigeChangePlayer: 8
      }],
      duration: 12,
      requirements: {
        minRelationWithTarget: 50
      }
    },
    trade_policy: {
      name: 'Trade Agreement',
      description: 'Establish beneficial trade relationships and economic partnerships',
      type: 'trade_policy',
      cost: { politicalCapital: 5, economicCost: 50 },
      effects: [{
        targetCountryId: targetCountryId,
        stabilityChange: 5,
        relationChangeWithPlayer: 12,
        prestigeChangePlayer: 3
      }],
      duration: 8,
      requirements: {
        minRelationWithTarget: -10
      }
    }
  };

  const selectedPolicy = availablePolicies[selectedPolicyType];

  // Check if policy can be implemented
  const canImplement = () => {
    if (!targetCountry || !playerCountryId) return false;
    
    return politicalCapital >= selectedPolicy.cost.politicalCapital &&
           economicReserves >= (selectedPolicy.cost.economicCost || 0) &&
           militaryReserves >= (selectedPolicy.cost.militaryCost || 0);
  };

  const handleImplementPolicy = async () => {
    if (!targetCountry || !playerCountryId) return;

    setIsImplementing(true);
    setError('');
    setMessage('');

    try {
      // Create policy instance
      const policy: Policy = {
        ...selectedPolicy,
        id: `${selectedPolicyType}_${targetCountryId}_${Date.now()}`,
        targetCountryId: targetCountryId,
        turnEnacted: Date.now(), // This should be the current game turn
        status: 'active'
      };

      // Check eligibility
      const eligibilityResult = await dispatch(checkPolicyEligibility({
        policy,
        targetCountryId,
        playerCountryId,
        playerState: {
          politicalCapital,
          economicReserves,
          militaryReserves
        }
      })).unwrap();

      if (!eligibilityResult.canImplement) {
        setError(eligibilityResult.reason || 'Policy cannot be implemented');
        return;
      }

      // Apply policy effects
      const result = await dispatch(applyPolicyEffects({
        policy,
        targetCountryId,
        playerCountryId,
        playerPrestige
      })).unwrap();

      // Add policy to player's active policies and deduct costs
      dispatch(addPolicy(policy));

      setMessage(result.message);
      
      // Close panel after short delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to implement policy');
    } finally {
      setIsImplementing(false);
    }
  };

  if (!targetCountry) {
    return (
      <div className="policy-action-panel">
        <div className="panel-header">
          <h3>Policy Actions</h3>
          <Button onClick={onClose}>×</Button>
        </div>
        <div className="panel-content">
          <p>Target country not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-action-panel">
      <div className="panel-header">
        <h3>Policy Actions - {targetCountry.name}</h3>
        <Button onClick={onClose}>×</Button>
      </div>

      <div className="panel-content">
        <div className="country-info">
          <h4>Target Country Status</h4>
          <p><strong>Government Type:</strong> {targetCountry.government.type}</p>
          <p><strong>Alignment:</strong> {targetCountry.government.alignment}</p>
          <p><strong>Stability:</strong> {targetCountry.government.stability}%</p>
          <p><strong>Relations:</strong> {targetCountry.relations[playerCountryId] || 0}</p>
        </div>

        <div className="policy-selection">
          <h4>Select Policy Type</h4>
          <select 
            value={selectedPolicyType} 
            onChange={(e) => setSelectedPolicyType(e.target.value as Policy['type'])}
          >
            {Object.entries(availablePolicies).map(([type, policy]) => (
              <option key={type} value={type}>
                {policy.name}
              </option>
            ))}
          </select>
        </div>

        <div className="policy-details">
          <h4>{selectedPolicy.name}</h4>
          <p>{selectedPolicy.description}</p>
          
          <div className="policy-costs">
            <h5>Implementation Costs:</h5>
            <ul>
              <li>Political Capital: {selectedPolicy.cost.politicalCapital}</li>
              {selectedPolicy.cost.economicCost && (
                <li>Economic Cost: ${selectedPolicy.cost.economicCost}M</li>
              )}
              {selectedPolicy.cost.militaryCost && (
                <li>Military Resources: {selectedPolicy.cost.militaryCost}</li>
              )}
            </ul>
          </div>

          <div className="policy-effects">
            <h5>Expected Effects:</h5>
            <ul>
              {selectedPolicy.effects.map((effect, index) => (
                <li key={index}>
                  {effect.stabilityChange && `Stability: ${effect.stabilityChange > 0 ? '+' : ''}${effect.stabilityChange}`}
                  {effect.insurgencyChange && ` | Insurgency: ${effect.insurgencyChange > 0 ? '+' : ''}${effect.insurgencyChange}`}
                  {effect.coupRiskChange && ` | Coup Risk: ${effect.coupRiskChange > 0 ? '+' : ''}${effect.coupRiskChange}`}
                  {effect.relationChangeWithPlayer && ` | Relations: ${effect.relationChangeWithPlayer > 0 ? '+' : ''}${effect.relationChangeWithPlayer}`}
                  {effect.prestigeChangePlayer && ` | Prestige: ${effect.prestigeChangePlayer > 0 ? '+' : ''}${effect.prestigeChangePlayer}`}
                </li>
              ))}
            </ul>
          </div>

          <div className="current-resources">
            <h5>Current Resources:</h5>
            <p>Political Capital: {politicalCapital}</p>
            <p>Economic Reserves: ${economicReserves}M</p>
            <p>Military Reserves: {militaryReserves}</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <div className="panel-actions">
          <Button 
            onClick={handleImplementPolicy}
            disabled={!canImplement() || isImplementing}
          >
            {isImplementing ? 'Implementing...' : 'Implement Policy'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default PolicyActionPanel;