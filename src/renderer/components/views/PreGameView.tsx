import React, { useEffect, useState } from 'react'; // Added useState
import { useDispatch, useSelector } from 'react-redux';
import { NationSelection } from '../pregame/NationSelection'; // Corrected path
import { loadWorldData, selectCountries, selectWorldLoadingStatus, selectWorldError } from '../../../../world-slice'; // Adjust path to root
import { setFaction, resetPlayer } from '../../../../player-slice'; // Adjust path to root
import { startGame } from '../../../../gameSlice'; // Adjust path to root
import { setAIDifficulty, AIDifficulty } from '../../../../ai-player-slice'; // Import AI difficulty actions and type
import { AppDispatch, RootState } from '../../store'; // Assuming store is at src/renderer/store
import { Country } from '../../types';

const PreGameView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('normal'); // Default to normal
  const countries = useSelector((state: RootState) => selectCountries(state));
  const isLoading = useSelector((state: RootState) => selectWorldLoadingStatus(state)) === 'loading';
  const error = useSelector((state: RootState) => selectWorldError(state));

  useEffect(() => {
    // Only load world data if countries aren't already loaded or loading
    // This basic check might need refinement based on how worldSlice handles multiple calls
    if (!isLoading && Object.keys(countries).length === 0) {
      dispatch(loadWorldData());
    }
  }, [dispatch, isLoading, countries]);

  const handleNationSelection = (nationId: string) => {
    if (selectedDifficulty) {
      dispatch(setAIDifficulty(selectedDifficulty));
    }
    dispatch(setFaction(nationId));
    dispatch(resetPlayer({ faction: nationId }));
    dispatch(startGame());
  };

  const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDifficulty(event.target.value as AIDifficulty);
  };

  if (isLoading) {
    return <div>Loading nations...</div>;
  }

  if (error) {
    return <div>Error loading nation data: {error}</div>;
  }

  // Ensure countries is in the correct format (array of Country objects)
  // The NationSelection component expects Country[]
  // selectCountries from world-slice should provide Record<string, Country>
  // We need to convert this to Country[]
  const nationsArray: Country[] = Object.values(countries || {});

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Game Setup</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Select AI Difficulty</h2>
        <select value={selectedDifficulty} onChange={handleDifficultyChange} style={{ padding: '10px', fontSize: '16px' }}>
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div>
        <h2>Choose Your Nation</h2>
        {nationsArray.length > 0 ? (
          <NationSelection nations={nationsArray} onSelectNation={handleNationSelection} />
        ) : (
          <p>No nations available to select. Ensure world data is loaded.</p>
        )}
      </div>
    </div>
  );
};

export default PreGameView;
