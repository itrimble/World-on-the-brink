import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store'; // Adjust path to your store
import { advanceTurn, selectCurrentTurn, selectCurrentYear, selectIsLoadingNextTurn } from '../../../../gameSlice'; // Adjust path to gameSlice in root
import { selectPoliticalCapital, selectPrestige } from '../../../../player-slice'; // Adjust path to player-slice in root
import { selectTensionLevel, selectClimateStability } from '../../../../world-slice'; // Adjust path to world-slice in root
import Button from '../common/Button'; // Assuming a common Button component exists

/**
 * `TurnDashboard` component displays key game state information like turn, year, player stats,
 * world stats, and provides a button to advance to the next turn.
 */
const TurnDashboard: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();

  // Selectors for game state
  const currentTurn = useSelector(selectCurrentTurn);
  const currentYear = useSelector(selectCurrentYear);
  const isLoadingNextTurn = useSelector(selectIsLoadingNextTurn);

  // Selectors for player state
  const politicalCapital = useSelector(selectPoliticalCapital);
  const prestige = useSelector(selectPrestige);

  // Selectors for world state
  const tensionLevel = useSelector(selectTensionLevel);
  const climateStabilityIndex = useSelector(selectClimateStability); // Assuming this selector exists or is created

  /**
   * Handles the click event for the "Next Turn" button.
   * Dispatches the `advanceTurn` async thunk.
   */
  const handleAdvanceTurn = () => {
    if (!isLoadingNextTurn) {
      dispatch(advanceTurn());
    }
  };

  // Basic inline styles for layout - consider moving to CSS file for larger applications
  const statItemStyle: React.CSSProperties = {
    margin: '0 10px',
    padding: '5px',
    borderRight: '1px solid #4A5568',
    minWidth: '100px', // Give some space for each stat
  };
  const lastStatItemStyle: React.CSSProperties = { ...statItemStyle, borderRight: 'none' };
  const dashboardStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 15px', // Reduced padding
    fontSize: '0.9em', // Slightly smaller font
  };
  const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap', // Allow stats to wrap on smaller screens
  };
   const valueStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#FFD369', // Accent color for values
    marginLeft: '5px',
  };


  return (
    <div style={dashboardStyle}>
      <div style={statsContainerStyle}>
        <div style={statItemStyle}>
          Turn:<span style={valueStyle}>{currentTurn}</span>
        </div>
        <div style={statItemStyle}>
          Year:<span style={valueStyle}>{currentYear}</span>
        </div>
        <div style={statItemStyle}>
          PC:<span style={valueStyle}>{politicalCapital}</span>
        </div>
        <div style={statItemStyle}>
          Prestige:<span style={valueStyle}>{prestige}</span>
        </div>
        <div style={statItemStyle}>
          Tension:<span style={valueStyle}>{tensionLevel}%</span>
        </div>
        <div style={lastStatItemStyle}> {/* Last item, no border */}
          Climate Stability:<span style={valueStyle}>{climateStabilityIndex}%</span>
        </div>
      </div>
      <Button 
        onClick={handleAdvanceTurn} 
        disabled={isLoadingNextTurn}
        variant="primary"
        size="md" // Assuming Button component has size prop
      >
        {isLoadingNextTurn ? 'Processing...' : 'Next Turn'}
      </Button>
    </div>
  );
};

export default TurnDashboard;
```
