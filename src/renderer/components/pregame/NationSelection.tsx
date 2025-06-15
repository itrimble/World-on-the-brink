import React from 'react';
import { Country } from '../../types'; // Corrected path

interface NationSelectionProps {
  nations: Country[];
  onSelectNation: (nationId: string) => void;
}

const NationSelection: React.FC<NationSelectionProps> = ({ nations, onSelectNation }) => {
  return (
    <div className="nation-selection">
      <div className="nations-grid">
        {nations.map((nation) => (
          <button 
            key={nation.id}
            className="nation-card"
            onClick={() => onSelectNation(nation.id)}
          >
            <div className="nation-name">{nation.name}</div>
            <div className="nation-info">
              <span className="nation-code">{nation.id}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NationSelection;
