// src/renderer/components/crisis/CrisisAdvisoryPanel.tsx

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectActiveCrises, selectHighestEscalationLevel, escalateCrisis, deEscalateCrisis } from '../../store/slices/world-slice';
import { CrisisService } from '../../services/CrisisService';
import type { Crisis } from '../../types';

interface CrisisAdvisoryPanelProps {
  playerId: string;
}

export const CrisisAdvisoryPanel: React.FC<CrisisAdvisoryPanelProps> = ({ playerId }) => {
  const dispatch = useDispatch();
  const activeCrises = useSelector(selectActiveCrises);
  const highestEscalationLevel = useSelector(selectHighestEscalationLevel);

  const handleEscalateCrisis = (crisisId: string) => {
    dispatch(escalateCrisis({
      crisisId,
      actionBy: playerId
    }) as any);
  };

  const handleDeEscalateCrisis = (crisisId: string) => {
    dispatch(deEscalateCrisis({
      crisisId,
      actionBy: playerId
    }) as any);
  };

  if (activeCrises.length === 0) {
    return (
      <div className="crisis-advisory-panel">
        <h3>Crisis Advisory</h3>
        <div className="no-crises">
          <p>No active crises. World tension remains stable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crisis-advisory-panel">
      <h3>Crisis Advisory</h3>
      
      {/* Alert for high escalation levels */}
      {highestEscalationLevel && highestEscalationLevel >= 6 && (
        <div className="crisis-alert critical">
          <strong>⚠️ CRITICAL ALERT:</strong> Crisis at {CrisisService.getEscalationLevelName(highestEscalationLevel)}
        </div>
      )}
      
      {highestEscalationLevel && highestEscalationLevel >= 4 && highestEscalationLevel < 6 && (
        <div className="crisis-alert warning">
          <strong>⚡ WARNING:</strong> Military alert level active
        </div>
      )}

      <div className="active-crises">
        {activeCrises.map(crisis => (
          <CrisisCard 
            key={crisis.id}
            crisis={crisis}
            onEscalate={() => handleEscalateCrisis(crisis.id)}
            onDeEscalate={() => handleDeEscalateCrisis(crisis.id)}
            playerId={playerId}
          />
        ))}
      </div>
    </div>
  );
};

interface CrisisCardProps {
  crisis: Crisis;
  onEscalate: () => void;
  onDeEscalate: () => void;
  playerId: string;
}

const CrisisCard: React.FC<CrisisCardProps> = ({ crisis, onEscalate, onDeEscalate, playerId }) => {
  const escalationLevelName = CrisisService.getEscalationLevelName(crisis.escalationLevel);
  const isPlayerTurn = crisis.lastActionBy !== playerId;
  
  const getEscalationLevelColor = (level: Crisis['escalationLevel']): string => {
    if (level <= 2) return 'green';
    if (level <= 3) return 'yellow';
    if (level <= 5) return 'orange';
    return 'red';
  };

  return (
    <div className={`crisis-card escalation-${crisis.escalationLevel}`}>
      <div className="crisis-header">
        <h4>{crisis.name}</h4>
        <div className={`escalation-badge ${getEscalationLevelColor(crisis.escalationLevel)}`}>
          Level {crisis.escalationLevel}: {escalationLevelName}
        </div>
      </div>
      
      <div className="crisis-details">
        <p>{crisis.description}</p>
        
        <div className="crisis-info">
          <div className="involved-countries">
            <strong>Involved:</strong> {crisis.involvedCountries.join(', ')}
          </div>
          <div className="prestige-stakes">
            <strong>Prestige at Stake:</strong> {crisis.prestigeAtStakeSuperpowerA} points
          </div>
          <div className="crisis-type">
            <strong>Type:</strong> {crisis.type}
          </div>
        </div>
      </div>
      
      {isPlayerTurn && (
        <div className="crisis-actions">
          <button 
            className="btn btn-danger"
            onClick={onEscalate}
            disabled={crisis.escalationLevel >= 7}
          >
            Escalate {crisis.escalationLevel < 7 ? `→ ${CrisisService.getEscalationLevelName((crisis.escalationLevel + 1) as Crisis['escalationLevel'])}` : ''}
          </button>
          
          <button 
            className="btn btn-success"
            onClick={onDeEscalate}
            disabled={crisis.escalationLevel <= 1}
          >
            De-escalate {crisis.escalationLevel > 1 ? `→ ${CrisisService.getEscalationLevelName((crisis.escalationLevel - 1) as Crisis['escalationLevel'])}` : ''}
          </button>
        </div>
      )}
      
      {!isPlayerTurn && (
        <div className="awaiting-response">
          <em>Awaiting opponent response...</em>
        </div>
      )}
    </div>
  );
};