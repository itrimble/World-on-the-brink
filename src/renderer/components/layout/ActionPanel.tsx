import React from 'react';
import CountryInfoPanel from '../panels/CountryInfoPanel'; // Adjust path as necessary

/**
 * `ActionPanel` serves as a container in the main UI layout.
 * It is intended to display contextual information and actions,
 * such as details about a selected country or options for policies.
 * Currently, it primarily hosts the `CountryInfoPanel`.
 */
const ActionPanel: React.FC = () => {
  return (
    <div className="action-panel-content h-full"> {/* Ensure this div allows CountryInfoPanel to fill height */}
      {/* The CountryInfoPanel will display details of the selected country. */}
      <CountryInfoPanel />
      {/* Other contextual panels or action forms could be conditionally rendered here in the future. */}
      {/* For example:
        {activeContext === 'policy_making' && <PolicyEditorPanel />}
        {activeContext === 'diplomacy' && <DiplomacyPanel />}
      */}
    </div>
  );
};

export default ActionPanel;
```
