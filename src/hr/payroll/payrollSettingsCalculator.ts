import { PayrollSettings } from './payrollSettings.types';

export interface PayrollSettingsCalculationInput {
  baseSalary: number;
  incentives: number;
  allowances: number;
  attendanceDeduction: number;
  leaveDeduction: number;
  settings: PayrollSettings;
  insurableEarnings?: number;
  taxableEarnings?: number;
}

export interface PayrollSettingsCalculationResult {
  grossSalary: number;
  insuranceEmployee: number;
  insuranceEmployer: number;
  taxDeduction: number;
  emergencyFundDeduction: number;
  netSalary: number;
  breakdown: Array<{ rule: string; amount: number; note?: string }>;
}

const clampNonNegative = (value: number) => (value < 0 ? 0 : value);

const resolveGrossSalary = (input: PayrollSettingsCalculationInput) => {
  return clampNonNegative(input.baseSalary) + clampNonNegative(input.incentives) + clampNonNegative(input.allowances);
};

const resolveInsurableEarnings = (input: PayrollSettingsCalculationInput, grossSalary: number) => {
  if (typeof input.insurableEarnings === 'number') {
    return clampNonNegative(input.insurableEarnings);
  }
  return grossSalary;
};

const calculateTaxAmount = (taxableIncome: number, settings: PayrollSettings) => {
  if (!settings.taxes.isTaxEnabled) return 0;
  const base = clampNonNegative(taxableIncome);
  if (base <= 0) return 0;
  const brackets = settings.taxes.brackets.slice().sort((a, b) => a.from - b.from);

  const matched = brackets.find((bracket) => {
    const lower = clampNonNegative(bracket.from);
    const upper = bracket.to > 0 ? bracket.to : Number.POSITIVE_INFINITY;
    return base >= lower && base <= upper;
  });

  if (!matched) return 0;
  return clampNonNegative(base * clampNonNegative(matched.percent) / 100);
};

export const calculatePayrollSettingsImpact = (input: PayrollSettingsCalculationInput): PayrollSettingsCalculationResult => {
  const grossSalary = resolveGrossSalary(input);
  const attendanceDeduction = clampNonNegative(input.attendanceDeduction);
  const leaveDeduction = clampNonNegative(input.leaveDeduction);

  const breakdown: Array<{ rule: string; amount: number; note?: string }> = [];

  const insurableEarnings = resolveInsurableEarnings(input, grossSalary);
  const insuranceEmployee = input.settings.insurance.enabled
    ? clampNonNegative(insurableEarnings * clampNonNegative(input.settings.insurance.employeePercent) / 100)
    : 0;
  const insuranceEmployer = input.settings.insurance.enabled
    ? clampNonNegative(insurableEarnings * clampNonNegative(input.settings.insurance.employerPercent) / 100)
    : 0;

  breakdown.push({ rule: 'insurance.employee', amount: insuranceEmployee });
  breakdown.push({ rule: 'insurance.employer', amount: insuranceEmployer });

  const taxableBase = clampNonNegative(
    (input.taxableEarnings ?? (grossSalary - attendanceDeduction - leaveDeduction)) -
    (input.settings.taxes.applyAfterInsurance ? insuranceEmployee : 0)
  );
  const taxDeduction = calculateTaxAmount(taxableBase, input.settings);
  breakdown.push({ rule: 'tax.flat', amount: taxDeduction });

  const emergencyFundDeduction = input.settings.emergencyFund.enabled
    ? clampNonNegative(grossSalary * clampNonNegative(input.settings.emergencyFund.percent) / 100)
    : 0;
  breakdown.push({ rule: 'emergency.fund', amount: emergencyFundDeduction });

  const netSalary = clampNonNegative(
    grossSalary - attendanceDeduction - leaveDeduction - insuranceEmployee - taxDeduction - emergencyFundDeduction
  );

  return {
    grossSalary,
    insuranceEmployee,
    insuranceEmployer,
    taxDeduction,
    emergencyFundDeduction,
    netSalary,
    breakdown
  };
};
