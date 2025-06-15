import React from 'react';
import { useSelector } from 'react-redux';
import CountryInfoPanel from '../panels/CountryInfoPanel';
import { CrisisAdvisoryPanel } from '../crisis/CrisisAdvisoryPanel';
import { EscalationLadder } from '../crisis/EscalationLadder';
import { PrestigePanel } from '../prestige/PrestigePanel';
import { AIStatusPanel } from '../ai/AIStatusPanel';
import { selectActiveCrises } from '../../store/slices/world-slice';
import { selectPlayerFaction } from '../../store/slices/player-slice';
import '../crisis/crisis-styles.css';

/**
 * `ActionPanel` serves as a container in the main UI layout.
 * It displays contextual information and actions, including:
 * - Crisis management interface when crises are active
 * - Country information for selected countries
 * - Global escalation status
 */
const ActionPanel: React.FC = () => {
  const activeCrises = useSelector(selectActiveCrises);
  const playerFaction = useSelector(selectPlayerFaction);

  return (
    <div className="action-panel-content h-full flex flex-col gap-4">
      {/* Prestige Section - Always visible for strategic awareness */}
      <div className="prestige-section">
        <PrestigePanel className="mb-4" />
      </div>

      {/* AI Status Section - Monitor AI opponent */}
      <div className="ai-status-section">
        <AIStatusPanel className="mb-4" />
      </div>

      {/* Crisis Management Section - Always visible for awareness */}
      <div className="crisis-section">
        {/* Global Escalation Status */}
        <EscalationLadder />
        
        {/* Active Crisis Management - Only show when crises exist */}
        {activeCrises.length > 0 && (
          <CrisisAdvisoryPanel playerId={playerFaction || 'usa'} />
        )}
      </div>

      {/* Country Information Panel */}
      <div className="country-section flex-1">
        <CountryInfoPanel />
      </div>
    </div>
  );
};

export default ActionPanel;

