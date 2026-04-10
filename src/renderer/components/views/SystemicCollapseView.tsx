/**
 * SystemicCollapseView - The "game over" screen when global tension hits critical levels.
 *
 * Replaces the original Balance of Power's stark "You have ignited a nuclear war"
 * with a modern equivalent: Global Systemic Collapse (cascading cyber + climate +
 * economic + tech failures). Includes educational debrief with real geopolitical
 * concepts from the in-game Codex.
 */
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectPrestige, selectPrestigePillars } from '../../store/slices/player-slice';
import { selectAIPrestige, selectCurrentYear, selectCurrentTurn } from '../../store/slices/gameSlice';
import { selectTensionLevel, selectActiveCrises } from '../../store/slices/world-slice';
import { PrestigePillars } from '../../types';

interface CodexEntry {
  title: string;
  text: string;
}

const CODEX_DEBRIEF: CodexEntry[] = [
  {
    title: 'Security Dilemma',
    text: 'Actions taken for self-defense were perceived as threats by others, triggering a spiral of escalation that no one truly wanted. This is one of the most common paths to conflict.',
  },
  {
    title: 'Thucydides Trap',
    text: 'Rising and established powers created structural tensions that made restraint increasingly difficult. History shows this dynamic leads to conflict more often than not — but it can be avoided.',
  },
  {
    title: 'Escalation Ladders',
    text: 'Small incidents grew because prestige penalties increased with each committed step. Once leaders publicly committed to positions, backing down became politically impossible.',
  },
  {
    title: 'Systemic Interconnection',
    text: 'In a multipolar world, crises cascade. A cyber attack triggers supply chain disruption, which triggers economic instability, which triggers political unrest. No crisis exists in isolation.',
  },
];

const PILLAR_LABELS: Record<keyof PrestigePillars, { label: string; color: string }> = {
  economic: { label: 'Economic', color: '#FFD700' },
  military: { label: 'Military', color: '#00D4C8' },
  cultural: { label: 'Cultural / Soft Power', color: '#9B59B6' },
  tech: { label: 'Tech / Information', color: '#3498DB' },
};

interface SystemicCollapseViewProps {
  onRestart: () => void;
}

export const SystemicCollapseView: React.FC<SystemicCollapseViewProps> = ({ onRestart }) => {
  const playerPrestige = useSelector(selectPrestige);
  const aiPrestige = useSelector(selectAIPrestige);
  const pillars = useSelector(selectPrestigePillars);
  const tension = useSelector(selectTensionLevel);
  const currentYear = useSelector(selectCurrentYear);
  const activeCrises = useSelector(selectActiveCrises);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0000 0%, #1a0a0a 40%, #2d1010 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'auto',
      padding: 'env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 20px) env(safe-area-inset-left, 20px)',
    }}>
      <div style={{
        maxWidth: '700px',
        width: '100%',
        textAlign: 'center',
        padding: '32px 24px',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#FF4D4D',
          marginBottom: '8px',
          textShadow: '0 0 30px rgba(255, 77, 77, 0.5)',
          letterSpacing: '2px',
        }}>
          GLOBAL SYSTEMIC COLLAPSE
        </h1>

        <p style={{
          fontSize: '1rem',
          color: '#cccccc',
          marginBottom: '32px',
          lineHeight: 1.6,
        }}>
          The web of interconnected crises has overwhelmed global stability.
          <br />
          Mutual escalation proved too costly for all sides. Year {currentYear}.
        </p>

        {/* Prestige Pillars Final Score */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '28px',
        }}>
          {(Object.entries(pillars) as [keyof PrestigePillars, number][]).map(([key, value]) => (
            <div key={key} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${PILLAR_LABELS[key].color}33`,
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {PILLAR_LABELS[key].label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: PILLAR_LABELS[key].color }}>
                {value}
              </div>
              {/* Mini bar */}
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px' }}>
                <div style={{
                  width: `${value}%`,
                  height: '100%',
                  background: PILLAR_LABELS[key].color,
                  borderRadius: '2px',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Final Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '28px',
          fontSize: '0.85rem',
          color: '#aaa',
        }}>
          <div>
            <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Your Prestige</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FFD369' }}>{playerPrestige}</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>AI Prestige</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FF6B6B' }}>{aiPrestige}</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Final Tension</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FF4D4D' }}>{tension}/100</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase' }}>Active Crises</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FF8C00' }}>{activeCrises.length}</div>
          </div>
        </div>

        {/* Geopolitics Codex Debrief */}
        <div style={{
          textAlign: 'left',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(0, 212, 200, 0.15)',
          marginBottom: '28px',
        }}>
          <h2 style={{ fontSize: '0.9rem', color: '#00D4C8', marginBottom: '16px', letterSpacing: '1px' }}>
            GEOPOLITICS CODEX — POST-GAME DEBRIEF
          </h2>
          {CODEX_DEBRIEF.map((entry, i) => (
            <div key={i} style={{ marginBottom: i < CODEX_DEBRIEF.length - 1 ? '14px' : 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#00D4C8', marginBottom: '4px' }}>
                {entry.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', lineHeight: 1.5 }}>
                {entry.text}
              </div>
            </div>
          ))}
        </div>

        {/* Key Lesson */}
        <div style={{
          padding: '16px',
          background: 'rgba(255, 211, 105, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 211, 105, 0.2)',
          marginBottom: '28px',
        }}>
          <p style={{ fontSize: '0.9rem', color: '#FFD369', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
            "The only winning move is not to play" applies to real brinkmanship too.
            Smart diplomacy and restraint win more often than aggression —
            exactly as Chris Crawford designed in 1985.
          </p>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: '0.65rem', color: '#555', marginBottom: '20px' }}>
          This is a fictional simulation for entertainment and education.
          Not a prediction or endorsement of any real-world policy.
        </p>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          style={{
            padding: '14px 40px',
            fontSize: '1rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #00D4C8, #0088aa)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            minHeight: '48px',
          }}
        >
          Learn & Try Again
        </button>
      </div>
    </div>
  );
};

export default SystemicCollapseView;
