// src/renderer/components/crisis/EscalationLadder.tsx

import React from 'react';
import { useSelector } from 'react-redux';
import { selectHighestEscalationLevel, selectCrisisByEscalationLevel } from '../../store/slices/world-slice';
import { CrisisService } from '../../services/CrisisService';
import type { Crisis } from '../../types';

export const EscalationLadder: React.FC = () => {
  const highestEscalationLevel = useSelector(selectHighestEscalationLevel);

  const escalationLevels: Array<{
    level: Crisis['escalationLevel'];
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    {
      level: 1,
      name: 'Question',
      description: 'Diplomatic inquiry or concern',
      severity: 'low'
    },
    {
      level: 2,
      name: 'Challenge',
      description: 'Formal protest or objection',
      severity: 'low'
    },
    {
      level: 3,
      name: 'Diplomatic Crisis',
      description: 'Public confrontation between nations',
      severity: 'medium'
    },
    {
      level: 4,
      name: 'DefCon 4',
      description: 'Military forces on increased alert',
      severity: 'medium'
    },
    {
      level: 5,
      name: 'DefCon 3',
      description: 'Military on heightened readiness',
      severity: 'high'
    },
    {
      level: 6,
      name: 'DefCon 2',
      description: 'Armed forces ready for war',
      severity: 'high'
    },
    {
      level: 7,
      name: 'DefCon 1',
      description: 'Nuclear war imminent - GAME OVER',
      severity: 'critical'
    }
  ];

  return (
    <div className="escalation-ladder">
      <h3>Global Escalation Status</h3>
      
      <div className="ladder-visualization">
        {escalationLevels.map((level) => {
          const isCurrentLevel = highestEscalationLevel === level.level;
          const isPastLevel = highestEscalationLevel ? highestEscalationLevel > level.level : false;
          const hasActiveCrisis = useSelector((state: any) => selectCrisisByEscalationLevel(state, level.level).length > 0);
          
          return (
            <EscalationStep
              key={level.level}
              level={level}
              isActive={isCurrentLevel}
              isPassed={isPastLevel}
              hasActiveCrisis={hasActiveCrisis}
            />
          );
        })}
      </div>
      
      {highestEscalationLevel && (
        <div className="current-status">
          <div className={`status-indicator severity-${escalationLevels[highestEscalationLevel - 1].severity}`}>
            Current Global Status: <strong>{CrisisService.getEscalationLevelName(highestEscalationLevel)}</strong>
          </div>
        </div>
      )}
      
      {!highestEscalationLevel && (
        <div className="current-status">
          <div className="status-indicator severity-low">
            Global Status: <strong>Peaceful</strong>
          </div>
        </div>
      )}
    </div>
  );
};

interface EscalationStepProps {
  level: {
    level: Crisis['escalationLevel'];
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  isActive: boolean;
  isPassed: boolean;
  hasActiveCrisis: boolean;
}

const EscalationStep: React.FC<EscalationStepProps> = ({ level, isActive, isPassed, hasActiveCrisis }) => {
  const stepClasses = [
    'escalation-step',
    `severity-${level.severity}`,
    isActive && 'active',
    isPassed && 'passed',
    hasActiveCrisis && 'has-crisis'
  ].filter(Boolean).join(' ');

  return (
    <div className={stepClasses}>
      <div className="step-number">{level.level}</div>
      <div className="step-content">
        <div className="step-name">{level.name}</div>
        <div className="step-description">{level.description}</div>
        {hasActiveCrisis && (
          <div className="crisis-indicator">
            <CrisisCount level={level.level} />
          </div>
        )}
      </div>
      {isActive && <div className="pulse-indicator" />}
    </div>
  );
};

interface CrisisCountProps {
  level: Crisis['escalationLevel'];
}

const CrisisCount: React.FC<CrisisCountProps> = ({ level }) => {
  const crisesAtLevel = useSelector((state: any) => selectCrisisByEscalationLevel(state, level));
  
  if (crisesAtLevel.length === 0) return null;
  
  return (
    <div className="crisis-count">
      {crisesAtLevel.length} active crisis{crisesAtLevel.length !== 1 ? 'es' : ''}
    </div>
  );
};