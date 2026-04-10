import React from 'react';
import { useSelector } from 'react-redux';
import {
  selectAIDifficulty,
  selectAIIsThinking,
  selectAIPrestige,
  selectAIAggressionLevel,
  selectAIPerformanceStatus,
  selectAILastDecisionSummary,
} from '../../store/slices/ai-player-slice';

interface AIStatusPanelProps {
  className?: string;
}

export const AIStatusPanel: React.FC<AIStatusPanelProps> = ({ className }) => {
  const difficulty = useSelector(selectAIDifficulty);
  const isThinking = useSelector(selectAIIsThinking);
  const prestige = useSelector(selectAIPrestige);
  const aggressionLevel = useSelector(selectAIAggressionLevel);
  const performanceStatus = useSelector(selectAIPerformanceStatus);
  const lastDecision = useSelector(selectAILastDecisionSummary);

  const getAggressionColor = (level: number): string => {
    if (level < 30) return '#66BB6A';
    if (level < 60) return '#FFA726';
    return '#EF5350';
  };

  const getAggressionLabel = (level: number): string => {
    if (level < 20) return 'Passive';
    if (level < 40) return 'Cautious';
    if (level < 60) return 'Moderate';
    if (level < 80) return 'Aggressive';
    return 'Very Aggressive';
  };

  return (
    <div className={className} style={{
      background: 'rgba(30, 30, 50, 0.9)',
      border: '1px solid rgba(255, 211, 105, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: '#e0e0e0',
      fontSize: '0.85rem',
    }}>
      <h3 style={{ color: '#FF6B6B', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
        AI Opponent {isThinking && <span style={{ color: '#FFA726' }}> (Thinking...)</span>}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div>
          <span style={{ color: '#999', fontSize: '0.75rem' }}>DIFFICULTY</span>
          <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{difficulty || 'N/A'}</div>
        </div>
        <div>
          <span style={{ color: '#999', fontSize: '0.75rem' }}>PRESTIGE</span>
          <div style={{ fontWeight: 'bold', color: '#FF6B6B' }}>{prestige}</div>
        </div>
        <div>
          <span style={{ color: '#999', fontSize: '0.75rem' }}>AGGRESSION</span>
          <div style={{ fontWeight: 'bold', color: getAggressionColor(aggressionLevel) }}>
            {getAggressionLabel(aggressionLevel)}
          </div>
        </div>
        <div>
          <span style={{ color: '#999', fontSize: '0.75rem' }}>STATUS</span>
          <div style={{ fontWeight: 'bold', color: performanceStatus === 'winning' ? '#EF5350' : performanceStatus === 'losing' ? '#66BB6A' : '#FFA726' }}>
            {performanceStatus || 'Even'}
          </div>
        </div>
      </div>

      {lastDecision && (
        <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.8rem' }}>
          <span style={{ color: '#999' }}>Last move: </span>
          <span>{lastDecision}</span>
        </div>
      )}

      {/* Aggression bar */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${aggressionLevel}%`,
            height: '100%',
            background: getAggressionColor(aggressionLevel),
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
};

export default AIStatusPanel;
