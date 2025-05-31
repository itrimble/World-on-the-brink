import React from 'react';
import { Country } from '../../types'; // Corrected path

interface NationSelectionProps {
  nations: Country[];
  onSelectNation: (nationId: string) => void;
}

const NationSelection: React.FC<NationSelectionProps> = ({ nations, onSelectNation }) => {
  return (
    <div>
      <h2>Select a Nation</h2>
      <ul>
        {nations.map((nation) => (
          <li key={nation.id}>
            <button onClick={() => onSelectNation(nation.id)}>
              {nation.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NationSelection;
