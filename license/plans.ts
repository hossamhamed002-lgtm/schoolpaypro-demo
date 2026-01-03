export type LicensePlan = {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  priceEGP: number | null;
  durationMonths: number;
  maxStudents?: number;
  features: string[];
  stripePriceId?: string;
};

export const LICENSE_PLANS: LicensePlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceEGP: 3000,
    durationMonths: 12,
    maxStudents: 300,
    features: ['students', 'finance', 'reports']
  },
  {
    id: 'pro',
    name: 'Pro',
    priceEGP: 6000,
    durationMonths: 12,
    maxStudents: 1000,
    features: ['all']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceEGP: null,
    durationMonths: 12,
    features: ['all', 'custom']
  }
];
