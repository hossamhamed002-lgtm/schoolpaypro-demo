import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, CheckCircle, XCircle, Plus } from 'lucide-react';
import useLeaveManagement from '../../hooks/useLeaveManagement';
import { isGenderEligibleForLeave, resolveEmployeeGender, resolveLeavePolicy } from '../../src/hr/leave/leavePolicy';

interface LeaveRequestsScreenProps {
  store: any;
  onBack: () => void;
}

type LeaveTypeId = 'SICK' | 'CHILD_CARE' | 'MATERNITY';

const leaveTypeOrder: LeaveTypeId[] = ['SICK', 'CHILD_CARE', 'MATERNITY'];
const OPERATIONAL_STORAGE_KEY = 'hr_operational_employee_records_v1';

const loadOperationalRecords = () => {
  try {
    const stored = window.localStorage.getItem(OPERATIONAL_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, { nationalId?: string | null }>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const LeaveRequestsScreen: React.FC<LeaveRequestsScreenProps> = ({ store, onBack }) => {
  const { lang, employees, activeYear } = store;
  const isRtl = lang === 'ar';
  const academicYearId = activeYear?.Year_ID || '';

  const employeesWithOperational = useMemo(() => {
    const operationalRecords = loadOperationalRecords();
    return (employees || []).map((employee: any) => {
      const operational = operationalRecords[employee.Emp_ID];
      return operational?.nationalId ? { ...employee, National_ID: operational.nationalId } : employee;
    });
  }, [employees]);

  const {
    leaveRecords,
    addLeaveRecord,
    approveLeave,
    rejectLeave
  } = useLeaveManagement({
    employees: employeesWithOperational,
    academicYearId
  });

  const [formState, setFormState] = useState({
    employeeId: '',
    leaveType: '' as LeaveTypeId | '',
    startDate: '',
    endDate: '',
    notes: '',
    sickInsuranceApplied: 'yes'
  });

  const selectedEmployee = useMemo(() => {
    return employeesWithOperational.find((employee: any) => employee.Emp_ID === formState.employeeId) || null;
  }, [employeesWithOperational, formState.employeeId]);

  const availableLeaveTypes = useMemo(() => {
    const gender = resolveEmployeeGender(selectedEmployee);

    return leaveTypeOrder.filter((leaveType) => {
      const policy = resolveLeavePolicy(leaveType);
      return isGenderEligibleForLeave(policy, gender);
    });
  }, [selectedEmployee]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    setFormState((prev) => {
      if (name === 'employeeId') {
        const nextEmployee = employeesWithOperational.find((employee: any) => employee.Emp_ID === value) || null;
        const gender = resolveEmployeeGender(nextEmployee);
        const currentPolicy = prev.leaveType ? resolveLeavePolicy(prev.leaveType as LeaveTypeId) : null;
        const isCurrentAllowed = currentPolicy ? isGenderEligibleForLeave(currentPolicy, gender) : true;
        return {
          ...prev,
          employeeId: value,
          leaveType: isCurrentAllowed ? prev.leaveType : ''
        };
      }
      return { ...prev, [name]: value };
    });
  }, [employeesWithOperational]);

  const calculateTotalDays = useCallback((start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    if (endDate < startDate) return 0;
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, []);

  const totalDays = useMemo(() => {
    return calculateTotalDays(formState.startDate, formState.endDate);
  }, [calculateTotalDays, formState.endDate, formState.startDate]);

  const handleSubmit = useCallback(() => {
    if (!formState.employeeId || !formState.leaveType || !formState.startDate || !formState.endDate) {
      alert(isRtl ? 'يرجى استكمال البيانات المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (totalDays <= 0) {
      alert(isRtl ? 'تأكد من صحة المدة' : 'Invalid date range');
      return;
    }

    try {
      addLeaveRecord({
        employeeId: formState.employeeId,
        leaveType: formState.leaveType,
        startDate: formState.startDate,
        endDate: formState.endDate,
        totalDays,
        notes: formState.notes || null,
        academicYearId,
        insuranceDecisionApplied: formState.leaveType === 'SICK' ? formState.sickInsuranceApplied === 'yes' : undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRtl ? 'تعذر إضافة الطلب' : 'Failed to add request');
      alert(message);
      return;
    }

    setFormState({
      employeeId: '',
      leaveType: '' as LeaveTypeId | '',
      startDate: '',
      endDate: '',
      notes: '',
      sickInsuranceApplied: 'yes'
    });
  }, [academicYearId, addLeaveRecord, formState, isRtl, totalDays]);

  const filteredRecords = useMemo(() => {
    return leaveRecords.filter((record) => leaveTypeOrder.includes(record.leaveType as LeaveTypeId));
  }, [leaveRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'طلبات الإجازات الخاصة' : 'Special Leave Requests'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{academicYearId}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الموظف' : 'Employee'}</label>
            <select name="employeeId" value={formState.employeeId} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
              <option value="">{isRtl ? 'اختر الموظف' : 'Select Employee'}</option>
              {employeesWithOperational.map((employee: any) => (
                <option key={employee.Emp_ID} value={employee.Emp_ID}>{employee.Name_Ar} - {employee.Emp_ID}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'نوع الإجازة' : 'Leave Type'}</label>
            <select name="leaveType" value={formState.leaveType} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
              <option value="">{isRtl ? 'اختر النوع' : 'Select Type'}</option>
              {availableLeaveTypes.map((typeId) => {
                const policy = resolveLeavePolicy(typeId);
                return (
                  <option key={typeId} value={typeId}>{policy.nameAr}</option>
                );
              })}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'عدد الأيام' : 'Total Days'}</label>
            <input type="number" value={totalDays} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'من تاريخ' : 'Start Date'}</label>
            <input name="startDate" type="date" value={formState.startDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'إلى تاريخ' : 'End Date'}</label>
            <input name="endDate" type="date" value={formState.endDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'ملاحظات' : 'Notes'}</label>
            <textarea name="notes" value={formState.notes} onChange={handleInputChange} rows={1} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none resize-none" />
          </div>
        </div>

        {formState.leaveType === 'SICK' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'قرار تطبيق التأمينات' : 'Insurance Decision'}</label>
              <select name="sickInsuranceApplied" value={formState.sickInsuranceApplied} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
                <option value="yes">{isRtl ? 'تُحتسب التأمينات' : 'Insurance covered'}</option>
                <option value="no">{isRtl ? 'لا تُحتسب التأمينات' : 'No insurance coverage'}</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleSubmit} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-sm">
            <Plus size={18} />
            {isRtl ? 'إضافة طلب' : 'Add Request'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الموظف' : 'Employee'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'نوع الإجازة' : 'Leave Type'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الفترة' : 'Period'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'الأيام' : 'Days'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'اعتماد' : 'Approval'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const employee = (employees || []).find((item: any) => item.Emp_ID === record.employeeId);
                const policy = resolveLeavePolicy(record.leaveType as LeaveTypeId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{employee?.Name_Ar || record.employeeId}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{policy.nameAr}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{record.startDate} → {record.endDate}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{record.totalDays}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 text-[10px] font-black rounded-lg border ${record.approved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {record.approved ? (isRtl ? 'معتمد' : 'Approved') : (isRtl ? 'قيد المراجعة' : 'Pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => approveLeave(record.id)}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => rejectLeave(record.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
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

export default LeaveRequestsScreen;
