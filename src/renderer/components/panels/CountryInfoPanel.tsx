import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store'; // Adjust path to your store
import { selectCountryById } from '../../../../world-slice'; // Adjust path to world-slice in root
import { Country } from '../../types'; // Adjust path to your placeholder Country type

/**
 * `CountryInfoPanel` displays detailed information about the currently selected country.
 * It subscribes to the selected country ID from the UI state and fetches country data
 * from the world state.
 */
const CountryInfoPanel: React.FC = () => {
  // Get the ID of the currently selected country from the UI slice.
  const selectedCountryId = useSelector((state: RootState) => state.ui.selectedCountryId);
  
  // Get the detailed data for the selected country from the world slice using its ID.
  // The `selectCountryById` selector handles the logic of returning the country or null.
  const country: Country | null = useSelector((state: RootState) => selectCountryById(state, selectedCountryId));

  // If no country is selected or country data is not found, display a placeholder message.
  if (!country) {
    return (
      <div className="country-info-panel p-4 text-gray-400">
        <p>No country selected.</p>
        <p className="text-xs mt-2">Click on a country on the map to view its details here.</p>
      </div>
    );
  }

  // Basic styling for the panel content.
  const sectionStyle: React.CSSProperties = { marginBottom: '1rem' };
  const headingStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: '600', color: '#A0AEC0', marginBottom: '0.25rem' }; // Light gray for headings
  const valueStyle: React.CSSProperties = { color: '#E2E8F0', marginLeft: '0.5rem' }; // Off-white for values

  return (
    <div className="country-info-panel p-4 bg-gray-800 text-white rounded-lg shadow h-full overflow-y-auto custom-scrollbar">
      <h3 className="text-2xl font-bold mb-3 text-blue-400 border-b border-gray-700 pb-2">{country.name}</h3>
      
      <div style={sectionStyle}>
        <h4 style={headingStyle}>Basic Info</h4>
        <p>ID: <span style={valueStyle}>{country.id}</span></p>
        {country.code && <p>Code: <span style={valueStyle}>{country.code}</span></p>}
      </div>

      {country.government && (
        <div style={sectionStyle}>
          <h4 style={headingStyle}>Government</h4>
          <p>Type: <span style={valueStyle}>{country.government.type || 'N/A'}</span></p>
          <p>Alignment: <span style={valueStyle}>{country.government.alignment || 'N/A'}</span></p>
          {country.government.stability !== undefined && <p>Stability: <span style={valueStyle}>{country.government.stability}%</span></p>}
        </div>
      )}

      {country.economy && (
         <div style={sectionStyle}>
          <h4 style={headingStyle}>Economy</h4>
          <p>Development: <span style={valueStyle}>{country.economy.development || 'N/A'}</span></p>
          {country.economy.gdp !== undefined && <p>GDP: <span style={valueStyle}>${country.economy.gdp}B</span></p>}
          {country.economy.growth !== undefined && <p>Growth: <span style={valueStyle}>{country.economy.growth}%</span></p>}
        </div>
      )}
      
      {country.military && (
         <div style={sectionStyle}>
          <h4 style={headingStyle}>Military</h4>
          <p>Power Index: <span style={valueStyle}>{country.military.power || 'N/A'}</span></p>
          <p>Spending: <span style={valueStyle}>${country.military.spending}B</span></p>
          <p>Nuclear Status: <span style={valueStyle}>{country.military.nuclearStatus || 'N/A'}</span></p>
        </div>
      )}

      {country.internal && (
        <div style={sectionStyle}>
          <h4 style={headingStyle}>Internal Affairs</h4>
          <p>Insurgency: <span style={valueStyle}>{country.internal.insurgencyLevel}%</span></p>
          <p>Coup Risk: <span style={valueStyle}>{country.internal.coupRisk}%</span></p>
        </div>
      )}
      
      {country.relations && Object.keys(country.relations).length > 0 && (
        <div style={sectionStyle}>
          <h4 style={headingStyle}>Key Relations</h4>
          {Object.entries(country.relations).map(([otherCountryId, value]) => (
            <p key={otherCountryId}>{otherCountryId.toUpperCase()}: <span style={valueStyle}>{value}</span></p>
          ))}
        </div>
      )}
      
      {/* Placeholder for future actions/buttons related to this country */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-500">Actions for {country.name} will appear here.</p>
      </div>
    </div>
  );
};

export default CountryInfoPanel;
```
