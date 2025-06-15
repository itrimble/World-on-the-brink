import React, { useEffect, useState } from 'react'; // Added useState
import { useDispatch, useSelector } from 'react-redux';
import NationSelection from '../pregame/NationSelection'; // Changed to default import
import { loadWorldData, selectCountries, selectWorldIsLoading, selectWorldError } from '../../store/slices/world-slice';
import { setFaction, resetPlayer } from '../../store/slices/player-slice';
import { startGame, setDifficulty } from '../../store/slices/gameSlice';
import { setAIDifficulty, AIDifficulty } from '../../store/slices/ai-player-slice';
import { AppDispatch, RootState } from '../../store';
import { Country } from '../../types';
import { CountryDataService } from '../../services/CountryDataService';

const PreGameView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('normal');
  const countries = useSelector((state: RootState) => selectCountries(state));
  const isLoading = useSelector((state: RootState) => selectWorldIsLoading(state));
  const error = useSelector((state: RootState) => selectWorldError(state));

  useEffect(() => {
    if (!isLoading && Object.keys(countries).length === 0) {
      dispatch(loadWorldData());
    }
  }, [dispatch, isLoading, countries]);

  const handleNationSelection = (nationId: string) => {
    if (selectedDifficulty) {
      dispatch(setAIDifficulty(selectedDifficulty));
      dispatch(setDifficulty(selectedDifficulty));
    }
    
    // Get starting conditions for the selected superpower
    const startingConditions = CountryDataService.getSuperpowerStartingConditions(nationId);
    
    dispatch(setFaction(nationId));
    dispatch(resetPlayer({ 
      faction: nationId,
      prestige: startingConditions.startingPrestige,
      politicalCapital: startingConditions.startingPoliticalCapital,
      economicReserves: startingConditions.startingEconomicReserves,
      militaryCapacity: startingConditions.startingMilitaryCapacity
    }));
    dispatch(startGame());
  };

  const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDifficulty(event.target.value as AIDifficulty);
  };

  if (isLoading) {
    return (
      <div className="title-screen">
        <div className="title-background">
          <div className="title-content">
            <div className="title-header">
              <h1 className="game-title">ON THE BRINK</h1>
              <p className="game-subtitle">A Geopolitical Strategy Game</p>
            </div>
            <div className="loading-message">
              <h2>Loading nations...</h2>
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="title-screen">
        <div className="title-background">
          <div className="title-content">
            <div className="title-header">
              <h1 className="game-title">ON THE BRINK</h1>
              <p className="game-subtitle">A Geopolitical Strategy Game</p>
            </div>
            <div className="error-message">
              <h2>Error loading nation data:</h2>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const superpowerOptions = CountryDataService.getSuperPowerOptions();
  
  return (
    <div className="title-screen">
      <div className="title-background">
        <div className="title-content">
          <div className="title-header">
            <h1 className="game-title">ON THE BRINK</h1>
            <p className="game-subtitle">A Geopolitical Strategy Game</p>
            <div className="title-year">2025 - 2030</div>
          </div>

          <div className="game-setup-container">
            <div className="setup-section">
              <h2>Select AI Difficulty</h2>
              <select 
                value={selectedDifficulty} 
                onChange={handleDifficultyChange} 
                className="difficulty-select"
              >
                <option value="easy">Easy - AI plays defensively</option>
                <option value="normal">Normal - Balanced AI strategy</option>
                <option value="hard">Hard - Aggressive AI opponent</option>
                <option value="realistic">Realistic - Unpredictable AI</option>
              </select>
            </div>

            <div className="setup-section">
              <h2>Choose Your Superpower</h2>
              <div className="superpower-selection">
                {superpowerOptions.map((superpower) => (
                  <button 
                    key={superpower.id}
                    className="superpower-card"
                    onClick={() => handleNationSelection(superpower.id)}
                  >
                    <div className="superpower-name">{superpower.name}</div>
                    <div className="superpower-description">{superpower.description}</div>
                    <div className="superpower-stats">
                      {(() => {
                        const country = CountryDataService.getCountry(superpower.id);
                        const startingConditions = CountryDataService.getSuperpowerStartingConditions(superpower.id);
                        return country ? (
                          <div className="stats-grid">
                            <div className="stat">
                              <span className="stat-label">Starting Prestige:</span>
                              <span className="stat-value">{startingConditions.startingPrestige}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">GDP:</span>
                              <span className="stat-value">${country.economy.gdp}B</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">Military Power:</span>
                              <span className="stat-value">{country.military?.power || 0}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-label">Nuclear Status:</span>
                              <span className="stat-value">{country.military?.nuclearStatus || 'none'}</span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreGameView;
