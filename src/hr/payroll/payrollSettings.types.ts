export interface InsuranceSettings {
  enabled: boolean;
  employeePercent: number;
  employerPercent: number;
}

export interface TaxSettings {
  monthlyExemptionAmount: number;
  taxRatePercent: number;
  brackets: Array<{ from: number; to: number; percent: number }>;
  isTaxEnabled: boolean;
  applyAfterInsurance: boolean;
  calculationMethod: 'monthly';
  applyTo: 'all';
}

export interface EmergencyFundSettings {
  enabled: boolean;
  percent: number;
}

export interface PayrollSettings {
  insurance: InsuranceSettings;
  taxes: TaxSettings;
  emergencyFund: EmergencyFundSettings;
}
