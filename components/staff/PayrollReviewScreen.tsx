import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle, Download, Save, Send, ChevronLeft } from 'lucide-react';
import { calculateMonthlyPayroll, AttendanceSummary, LeaveUsageSummary } from '../../src/hr/payroll/payrollEngine';
import { calculatePayrollSettingsImpact } from '../../src/hr/payroll/payrollSettingsCalculator';
import { loadPayrollSettings } from '../../src/hr/payroll/payrollSettings.store';
import { usePayrollPosting } from '../../hooks/usePayrollPosting';

interface PayrollReviewScreenProps {
  store: any;
  onBack: () => void;
}

interface PayrollDraftRow {
  basicSalary: number;
  incentives: number;
  allowances: number;
  nonInsurableAmount: number;
  nonTaxableAmount: number;
}

interface ReviewRowInputs {
  attendance: AttendanceSummary;
  leaveUsage: LeaveUsageSummary;
}

const OPERATIONAL_STORAGE_KEY = 'hr_operational_employee_records_v1';
const PAYROLL_REVIEW_STORAGE_KEY = 'hr_payroll_review_draft_v1';

const loadOperationalRecords = () => {
  try {
    const stored = window.localStorage.getItem(OPERATIONAL_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, { salary?: string; contractType?: string; jobTitleId?: string }>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const loadPayrollDraft = () => {
  try {
    const stored = window.localStorage.getItem(PAYROLL_REVIEW_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, PayrollDraftRow>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistPayrollDraft = (draft: Record<string, PayrollDraftRow>) => {
  try {
    window.localStorage.setItem(PAYROLL_REVIEW_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
};

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(String(value || '0').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildDefaultDraft = (salaryValue: number): PayrollDraftRow => ({
  basicSalary: salaryValue,
  incentives: 0,
  allowances: 0,
  nonInsurableAmount: 0,
  nonTaxableAmount: 0
});

const buildDefaultAttendance = (): AttendanceSummary => ({
  totalWorkingDays: 0,
  presentDays: 0,
  absentDays: 0,
  delayMinutes: 0
});

const buildDefaultLeaveUsage = (): LeaveUsageSummary => ({
  annualDays: 0,
  casualDays: 0,
  sickDays: 0,
  maternityDays: 0,
  childCareDays: 0,
  unpaidDays: 0,
  annualBalance: 0,
  casualBalance: 0
});

const PayrollReviewScreen: React.FC<PayrollReviewScreenProps> = ({ store, onBack }) => {
  const { lang, employees = [] } = store;
  const isRtl = lang === 'ar';

  const operationalRecords = useMemo(() => loadOperationalRecords(), []);
  const [draftByEmployee, setDraftByEmployee] = useState<Record<string, PayrollDraftRow>>(() => loadPayrollDraft());
  const payrollSettings = useMemo(() => loadPayrollSettings(), []);
  const { postPayroll, isMonthPosted } = usePayrollPosting();
  const [approved, setApproved] = useState(false);

  const rowInputsByEmployee = useMemo(() => {
    const attendanceByEmployee = store.attendanceSummariesByEmployee || {};
    const leaveByEmployee = store.leaveUsageByEmployee || {};
    return new Map<string, ReviewRowInputs>(employees.map((employee: any) => {
      const attendance = attendanceByEmployee[employee.Emp_ID] || buildDefaultAttendance();
      const leaveUsage = leaveByEmployee[employee.Emp_ID] || buildDefaultLeaveUsage();
      return [employee.Emp_ID, { attendance, leaveUsage }];
    }));
  }, [employees, store.attendanceSummariesByEmployee, store.leaveUsageByEmployee]);

  const handleDraftChange = useCallback((employeeId: string, field: keyof PayrollDraftRow, value: number) => {
    setDraftByEmployee((prev) => {
      const current = prev[employeeId] || buildDefaultDraft(0);
      const next = { ...current, [field]: value };
      const updated = { ...prev, [employeeId]: next };
      return updated;
    });
  }, []);

  const handleSaveDraft = useCallback(() => {
    persistPayrollDraft(draftByEmployee);
  }, [draftByEmployee]);

  const handleApprove = useCallback(() => {
    persistPayrollDraft(draftByEmployee);
    setApproved(true);
  }, [draftByEmployee]);

  const rows = useMemo(() => {
    return employees.map((employee: any) => {
      const operational = operationalRecords[employee.Emp_ID];
      const salaryValue = toNumber(operational?.salary);
      const draft = draftByEmployee[employee.Emp_ID] || buildDefaultDraft(salaryValue);
      const inputs = rowInputsByEmployee.get(employee.Emp_ID) || { attendance: buildDefaultAttendance(), leaveUsage: buildDefaultLeaveUsage() };

      const baseSalary = clampNonNegative(draft.basicSalary);
      const incentives = clampNonNegative(draft.incentives);
      const allowances = clampNonNegative(draft.allowances);
      const nonInsurableAmount = clampNonNegative(draft.nonInsurableAmount);
      const nonTaxableAmount = clampNonNegative(draft.nonTaxableAmount);
      const grossSalary = baseSalary + incentives + allowances;
      const insurableEarnings = clampNonNegative(grossSalary - nonInsurableAmount);
      const taxableEarnings = clampNonNegative(grossSalary - nonTaxableAmount);

      const payrollResult = calculateMonthlyPayroll({
        employee: {
          employeeId: employee.Emp_ID,
          gender: employee.Gender === 'Female' || employee.Gender === 'أنثى' ? 'Female' : 'Male',
          monthlyGrossSalary: grossSalary,
          dailyWage: grossSalary && inputs.attendance.totalWorkingDays > 0 ? grossSalary / inputs.attendance.totalWorkingDays : undefined
        },
        attendance: inputs.attendance,
        leaveUsage: inputs.leaveUsage,
        context: { month: store.activeMonth || 1, year: store.activeYear?.Year_ID || 0 }
      });

      const delayDeduction = payrollResult.deductions.delayDeduction;
      const absenceDeduction = payrollResult.deductions.absenceDeduction;
      const leaveDeduction = toNumber(store.leaveDeductionsByEmployee?.[employee.Emp_ID]) || 0;

      const settingsImpact = calculatePayrollSettingsImpact({
        baseSalary,
        incentives,
        allowances,
        attendanceDeduction: delayDeduction + absenceDeduction,
        leaveDeduction,
        settings: payrollSettings,
        insurableEarnings,
        taxableEarnings
      });

      const totalDeductions = clampNonNegative(
        delayDeduction +
        absenceDeduction +
        leaveDeduction +
        settingsImpact.insuranceEmployee +
        settingsImpact.taxDeduction +
        settingsImpact.emergencyFundDeduction
      );
      const netSalary = clampNonNegative(grossSalary - totalDeductions);

      const highlight = {
        missingBasic: baseSalary <= 0,
        zeroNet: netSalary <= 0,
        excessive: totalDeductions > grossSalary * 0.5
      };

      return {
        employee,
        draft,
        operational,
        payrollResult,
        grossSalary,
        insurableEarnings,
        nonInsurableAmount,
        taxableEarnings,
        nonTaxableAmount,
        delayDeduction,
        absenceDeduction,
        leaveDeduction,
        settingsImpact,
        totalDeductions,
        netSalary,
        highlight
      };
    });
  }, [draftByEmployee, employees, operationalRecords, rowInputsByEmployee, store.activeMonth, store.activeYear, store.leaveDeductionsByEmployee]);

  const handlePostPayroll = useCallback(() => {
    const month = Number(store.activeMonth || new Date().getMonth() + 1);
    const year = Number(store.activeYear?.Year_ID || new Date().getFullYear());
    if (Number.isNaN(month) || Number.isNaN(year)) {
      alert(isRtl ? 'بيانات الشهر غير صحيحة' : 'Invalid payroll month');
      return;
    }
    if (!approved) {
      alert(isRtl ? 'يجب اعتماد الرواتب قبل الترحيل' : 'Approve payroll before posting');
      return;
    }
    if (isMonthPosted(month, year)) {
      alert(isRtl ? 'تم ترحيل هذا الشهر مسبقًا' : 'This month is already posted');
      return;
    }

    try {
      postPayroll({
        payrollMonth: month,
        payrollYear: year,
        postedBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
        rows: rows.map((row) => ({
          employeeId: row.employee.Emp_ID,
          grossSalary: row.grossSalary,
          incentives: row.draft.incentives,
          allowances: row.draft.allowances,
          absencesDeduction: row.absenceDeduction,
          latenessDeduction: row.delayDeduction,
          insuranceEmployee: row.settingsImpact.insuranceEmployee,
          insuranceEmployer: row.settingsImpact.insuranceEmployer,
          tax: row.settingsImpact.taxDeduction,
          emergencyFund: row.settingsImpact.emergencyFundDeduction,
          netSalary: row.netSalary,
          approved: approved,
          basicSalary: row.draft.basicSalary
        }))
      });
      alert(isRtl ? 'تم ترحيل الرواتب بنجاح' : 'Payroll posted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRtl ? 'تعذر الترحيل' : 'Posting failed');
      alert(message);
    }
  }, [approved, isMonthPosted, isRtl, postPayroll, rows, store.activeMonth, store.activeYear?.Year_ID, store.currentUser?.User_ID, store.currentUser?.Username]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'مراجعة الرواتب' : 'Payroll Review'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isRtl ? 'قبل الترحيل المحاسبي' : 'Before Accounting Posting'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleSaveDraft} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-xs">
            <Save size={16} />
            {isRtl ? 'حفظ مسودة' : 'Save Draft'}
          </button>
          <button onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs">
            <CheckCircle size={16} />
            {isRtl ? 'اعتماد الرواتب' : 'Approve Payroll'}
          </button>
          <button disabled={!approved} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs ${approved ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            <Send size={16} />
            {isRtl ? 'إرسال للمحاسبة' : 'Send to Accounting'}
          </button>
          <button onClick={handlePostPayroll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-black text-xs">
            {isRtl ? 'ترحيل الرواتب' : 'Post Payroll'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-xs">
            <Download size={16} />
            {isRtl ? 'تصدير' : 'Export'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الموظف' : 'Employee'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'المسمى الوظيفي' : 'Job Title'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'نوع التوظيف' : 'Employment Type'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الراتب الأساسي' : 'Basic Salary'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'حوافز' : 'Incentives'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'بدلات' : 'Allowances'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'إجمالي الاستحقاق' : 'Total Earnings'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'غير خاضع للتأمينات' : 'Non-Insurable'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خاضع للتأمينات' : 'Insurable'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'غير خاضع للضريبة' : 'Non-Taxable'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خاضع للضريبة' : 'Taxable'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'حد الإعفاء' : 'Exemption'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'صندوق الطوارئ' : 'Emergency Fund'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خصم التأخير' : 'Delay Deductions'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خصم الغياب' : 'Absence Deductions'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خصم الإجازات' : 'Leave Deductions'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'تأمين الموظف' : 'Employee Insurance'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'تأمين المدرسة' : 'Employer Insurance'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الضرائب' : 'Taxes'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest text-indigo-600">{isRtl ? 'صافي بعد الضريبة' : 'Net After Tax'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'إجمالي الخصومات' : 'Total Deductions'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest text-indigo-600">{isRtl ? 'صافي الراتب' : 'Net Salary'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const rowClasses = row.highlight.zeroNet
                  ? 'bg-rose-50/50'
                  : row.highlight.missingBasic
                    ? 'bg-amber-50/50'
                    : row.highlight.excessive
                      ? 'bg-slate-50'
                      : '';

                return (
                  <tr key={row.employee.Emp_ID} className={`transition-colors ${rowClasses}`}>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.employee.Name_Ar}</td>
                    <td className="px-4 py-3 text-slate-600">{row.employee.Level || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.operational?.contractType || '-'}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.draft.basicSalary}
                        min={0}
                        onChange={(event) => handleDraftChange(row.employee.Emp_ID, 'basicSalary', toNumber(event.currentTarget.value))}
                        className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.draft.incentives}
                        min={0}
                        onChange={(event) => handleDraftChange(row.employee.Emp_ID, 'incentives', toNumber(event.currentTarget.value))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.draft.allowances}
                        min={0}
                        onChange={(event) => handleDraftChange(row.employee.Emp_ID, 'allowances', toNumber(event.currentTarget.value))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.grossSalary.toFixed(2)}
                        readOnly
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.draft.nonInsurableAmount}
                        min={0}
                        onChange={(event) => handleDraftChange(row.employee.Emp_ID, 'nonInsurableAmount', toNumber(event.currentTarget.value))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.insurableEarnings.toFixed(2)}
                        readOnly
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.draft.nonTaxableAmount}
                        min={0}
                        onChange={(event) => handleDraftChange(row.employee.Emp_ID, 'nonTaxableAmount', toNumber(event.currentTarget.value))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.taxableEarnings.toFixed(2)}
                        readOnly
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={toNumber(payrollSettings?.taxes?.monthlyExemptionAmount).toFixed(2)}
                        readOnly
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.settingsImpact.emergencyFundDeduction.toFixed(2)}
                        readOnly
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.delayDeduction.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.absenceDeduction.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.leaveDeduction.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.settingsImpact.insuranceEmployee.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.settingsImpact.insuranceEmployer.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.settingsImpact.taxDeduction.toFixed(2)}</td>
                    <td className="px-4 py-3 font-black text-emerald-700">{row.settingsImpact.netSalary.toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{row.totalDeductions.toFixed(2)}</td>
                    <td className="px-4 py-3 font-black text-indigo-700">{row.netSalary.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const clampNonNegative = (value: number) => (value < 0 ? 0 : value);

export default PayrollReviewScreen;
