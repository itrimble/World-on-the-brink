// src/shared/types/policy.ts
export type PolicyType = 'military' | 'economic' | 'diplomatic' | 'environmental' | 'social';

export interface Policy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  cost: {
    economicCost?: number;
    militaryCost?: number;
    politicalCost?: number;
  };
  effects: any[];
  requirements?: any[];
}

export interface PolicyAction {
  policyId: string;
  targetCountry?: string;
  parameters?: any;
}