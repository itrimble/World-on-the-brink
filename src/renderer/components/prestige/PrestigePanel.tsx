// src/renderer/components/prestige/PrestigePanel.tsx

import React from 'react';
import { useSelector } from 'react-redux';
import { 
  selectPrestige, 
  selectPrestigeHistory, 
  selectRecentPrestigeChanges,
  selectPrestigeChange
} from '../../store/slices/player-slice';
import { 
  selectPrestigeTarget, 
  selectAIPrestige, 
  selectVictoryCondition 
} from '../../store/slices/gameSlice';
import { PrestigeService } from '../../services/PrestigeService';

interface PrestigePanelProps {
  className?: string;
}

export const PrestigePanel: React.FC<PrestigePanelProps> = ({ className = '' }) => {
  const playerPrestige = useSelector(selectPrestige);
  const aiPrestige = useSelector(selectAIPrestige);
  const prestigeTarget = useSelector(selectPrestigeTarget);
  const prestigeHistory = useSelector(selectPrestigeHistory);
  const recentChanges = useSelector(selectRecentPrestigeChanges);
  const thisRoundChange = useSelector(selectPrestigeChange);
  const victoryCondition = useSelector(selectVictoryCondition);

  // Calculate progress towards victory
  const progressPercent = Math.min(100, (playerPrestige / prestigeTarget) * 100);
  const aiProgressPercent = Math.min(100, (aiPrestige / prestigeTarget) * 100);

  // Get status color based on prestige level
  const getPrestigeStatusColor = (prestige: number) => {
    if (prestige >= prestigeTarget) return 'text-green-400';
    if (prestige >= prestigeTarget * 0.75) return 'text-yellow-400';
    if (prestige >= 0) return 'text-blue-400';
    return 'text-red-400';
  };

  // Get change indicator
  const getChangeIndicator = (change: number) => {
    if (change > 0) return { text: `+${change}`, color: 'text-green-400' };
    if (change < 0) return { text: `${change}`, color: 'text-red-400' };
    return { text: '0', color: 'text-gray-400' };
  };

  const thisRoundIndicator = getChangeIndicator(thisRoundChange);

  return (
    <div className={`prestige-panel bg-gray-800 border border-gray-600 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Geopolitical Prestige</h3>
        {victoryCondition !== 'none' && (
          <div className="text-sm font-semibold text-yellow-400">
            GAME OVER
          </div>
        )}
      </div>

      {/* Main Prestige Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Player Prestige */}
        <div className="text-center">
          <div className="text-sm text-gray-300 mb-1">Your Prestige</div>
          <div className={`text-2xl font-bold ${getPrestigeStatusColor(playerPrestige)}`}>
            {playerPrestige}
          </div>
          <div className={`text-sm ${thisRoundIndicator.color}`}>
            {thisRoundIndicator.text} this turn
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(progressPercent)}% to victory
          </div>
        </div>

        {/* AI Prestige */}
        <div className="text-center">
          <div className="text-sm text-gray-300 mb-1">AI Prestige</div>
          <div className={`text-2xl font-bold ${getPrestigeStatusColor(aiPrestige)}`}>
            {aiPrestige}
          </div>
          <div className="text-sm text-gray-400">
            {playerPrestige > aiPrestige ? 'Behind' : 'Ahead'} by {Math.abs(playerPrestige - aiPrestige)}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${aiProgressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(aiProgressPercent)}% to victory
          </div>
        </div>
      </div>

      {/* Victory Target */}
      <div className="text-center mb-4 p-2 bg-gray-700 rounded">
        <div className="text-sm text-gray-300">Victory Target</div>
        <div className="text-lg font-bold text-yellow-400">{prestigeTarget}</div>
      </div>

      {/* Recent Changes */}
      {recentChanges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Changes</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {recentChanges.slice(-3).map((change, index) => {
              const changeIndicator = getChangeIndicator(change.amount);
              return (
                <div key={index} className="text-xs flex justify-between items-center">
                  <span className="text-gray-400 truncate flex-1 mr-2">
                    {change.reason}
                  </span>
                  <span className={`font-semibold ${changeIndicator.color}`}>
                    {changeIndicator.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prestige History Chart (simplified) */}
      {prestigeHistory.length > 1 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Prestige Trend</h4>
          <div className="h-16 bg-gray-700 rounded relative overflow-hidden">
            {/* Simple line chart representation */}
            <div className="absolute inset-0 flex items-end justify-between px-1">
              {prestigeHistory.slice(-10).map((entry, index) => {
                const height = Math.max(2, Math.min(100, (entry.prestige / Math.max(prestigeTarget, 100)) * 100));
                const isPositiveChange = entry.change >= 0;
                return (
                  <div
                    key={index}
                    className={`w-1 ${isPositiveChange ? 'bg-green-400' : 'bg-red-400'} rounded-t opacity-70`}
                    style={{ height: `${height}%` }}
                    title={`Turn ${entry.turn}: ${entry.prestige} (${entry.change >= 0 ? '+' : ''}${entry.change})`}
                  />
                );
              })}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            Last {Math.min(10, prestigeHistory.length)} turns
          </div>
        </div>
      )}
    </div>
  );
};

export default PrestigePanel;