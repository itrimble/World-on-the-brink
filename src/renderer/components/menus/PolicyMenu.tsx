```typescript
import React from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '../common/Button';

interface PolicyMenuProps {
  countryId: string;
  onClose: () => void;
}

export const PolicyMenu: React.FC<PolicyMenuProps> = ({ countryId, onClose }) => {
  const dispatch = useDispatch();
  
  const policyCategories = [
    {
      name: 'Military',
      policies: [
        { id: 'military-aid', name: 'Military Aid' },
        { id: 'aid-insurgents', name: 'Aid to Insurgents' },
        { id: 'intervene-govt', name: 'Intervene for Government' },
        { id: 'intervene-rebels', name: 'Intervene for Rebels' }
      ]
    },
    {
      name: 'Economic',
      policies: [
        { id: 'economic-aid', name: 'Economic Aid' },
        { id: 'trade-policy', name: 'Trade Policy' }
      ]
    },
    {
      name: 'Diplomatic',
      policies: [
        { id: 'treaty', name: 'Treaty' },
        { id: 'diplomatic-pressure', name: 'Diplomatic Pressure' }
      ]
    },
    {
      name: 'Covert',
      policies: [
        { id: 'destabilize', name: 'Destabilize' },
        { id: 'cyber-operations', name: 'Cyber Operations' }
      ]
    }
  ];
  
  const handleSelectPolicy = (policyId: string) => {
    console.log(`Selected policy: ${policyId} for country: ${countryId}`);
    // In a real implementation, this would dispatch an action to open the specific policy dialog
    // dispatch(openPolicyDialog({ countryId, policyId }));
    onClose();
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select Policy</h3>
        <button 
          className="text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        {policyCategories.map(category => (
          <div key={category.name}>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">{category.name}</h4>
            <div className="grid grid-cols-2 gap-2">
              {category.policies.map(policy => (
                <Button
                  key={policy.id}
                  onClick={() => handleSelectPolicy(policy.id)}
                  variant="secondary"
                  className="text-sm"
                >
                  {policy.name}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```