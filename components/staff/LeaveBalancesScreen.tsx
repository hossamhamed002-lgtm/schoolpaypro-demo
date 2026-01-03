import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, Edit3, Lock, Unlock, X, Search, Printer, Download } from 'lucide-react';
import useLeaveBalances from '../../hooks/useLeaveBalances';
import { LeaveBalance } from '../../src/hr/leave/leaveBalances.types';
import { UserRole } from '../../types';

interface LeaveBalancesScreenProps {
  store: any;
  onBack: () => void;
}

const LeaveBalancesScreen: React.FC<LeaveBalancesScreenProps> = ({ store, onBack }) => {
  const { lang, employees, activeYear, currentUser } = store;
  const isRtl = lang === 'ar';
  const academicYearId = activeYear?.Year_ID || '';

  const {
    getEmployeeLeaveBalance,
    adjustLeaveBalance,
    isBalanceLocked,
    setBalanceLock,
    isLeaveTypeEligible
  } = useLeaveBalances({
    employees: employees || [],
    academicYearId
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState({
    casualLeaveBalance: 0,
    annualLeaveBalance: 0
  });

  const canEdit = useMemo(() => {
    return currentUser?.Role === UserRole.HR_MANAGER || currentUser?.Role === UserRole.ADMIN;
  }, [currentUser]);

  const employeeMap = useMemo(() => {
    return new Map((employees || []).map((emp: any) => [emp.Emp_ID, emp]));
  }, [employees]);

  const openEdit = useCallback((employeeId: string) => {
    const balance = getEmployeeLeaveBalance(employeeId);
    if (!balance) return;
    setEditingEmployeeId(employeeId);
    setFormState({
      casualLeaveBalance: balance.casualLeaveBalance,
      annualLeaveBalance: balance.annualLeaveBalance
    });
  }, [getEmployeeLeaveBalance]);

  const closeEdit = useCallback(() => {
    setEditingEmployeeId(null);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setFormState((prev) => ({
      ...prev,
      [name]: Number(value)
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (!editingEmployeeId) return;
    const confirmed = window.confirm(isRtl ? 'هل تريد تأكيد تعديل أرصدة الإجازات؟' : 'Confirm leave balances update?');
    if (!confirmed) return;

    adjustLeaveBalance(editingEmployeeId, formState);
    closeEdit();
  }, [adjustLeaveBalance, closeEdit, editingEmployeeId, formState, isRtl]);

  const toggleLock = useCallback((employeeId: string) => {
    const locked = isBalanceLocked(employeeId);
    const confirmed = window.confirm(
      locked
        ? (isRtl ? 'هل تريد فتح الرصيد للتعديل؟' : 'Unlock balances for editing?')
        : (isRtl ? 'هل تريد قفل الرصيد بعد الموافقة؟' : 'Lock balances after approval?')
    );
    if (!confirmed) return;
    setBalanceLock(employeeId, !locked);
  }, [isBalanceLocked, isRtl, setBalanceLock]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (employees || [])
      .filter((employee: any) => {
        if (!term) return true;
        const name = (employee.Name_Ar || '').toLowerCase();
        const id = (employee.Emp_ID || '').toLowerCase();
        return name.includes(term) || id.includes(term);
      })
      .map((employee: any) => ({
        employee,
        balance: getEmployeeLeaveBalance(employee.Emp_ID)
      }));
  }, [employees, getEmployeeLeaveBalance, searchTerm]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExport = useCallback(() => {
    const header = [
      isRtl ? 'الموظف' : 'Employee',
      isRtl ? 'الكود' : 'Code',
      isRtl ? 'عارضة' : 'Casual',
      isRtl ? 'اعتيادية' : 'Annual'
    ];

    const lines = rows.map(({ employee, balance }) => ([
      employee.Name_Ar || '',
      employee.Emp_ID || '',
      isLeaveTypeEligible(employee.Emp_ID, 'casual') ? (balance?.casualLeaveBalance ?? '') : '',
      isLeaveTypeEligible(employee.Emp_ID, 'annual') ? (balance?.annualLeaveBalance ?? '') : ''
    ]));

    const csv = [header, ...lines].map((row) => row.map((cell) => `"${String(cell).replace(/\"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-balances-${academicYearId || 'year'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [academicYearId, isLeaveTypeEligible, isRtl, rows]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'إدارة أرصدة الإجازات' : 'Leave Balances Management'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{academicYearId}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} my-auto text-slate-300`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث بالاسم أو الكود' : 'Search by name or code'}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
            />
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-sm">
            <Printer size={16} />
            {isRtl ? 'طباعة' : 'Print'}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-sm">
            <Download size={16} />
            {isRtl ? 'تصدير' : 'Export'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الموظف' : 'Employee'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'عارضة' : 'Casual'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'اعتيادية' : 'Annual'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ employee, balance }) => {
                const locked = isBalanceLocked(employee.Emp_ID);
                return (
                  <tr key={employee.Emp_ID} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{employee.Name_Ar}</span>
                        <span className="text-[10px] font-bold text-slate-400">{employee.Emp_ID}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">
                      {isLeaveTypeEligible(employee.Emp_ID, 'casual') ? (balance?.casualLeaveBalance ?? '-') : ''}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">
                      {isLeaveTypeEligible(employee.Emp_ID, 'annual') ? (balance?.annualLeaveBalance ?? '-') : ''}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(employee.Emp_ID)}
                          disabled={!canEdit || locked || !balance}
                          className={`p-2 rounded-xl transition-colors ${!canEdit || locked || !balance ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => toggleLock(employee.Emp_ID)}
                          disabled={!canEdit}
                          className={`p-2 rounded-xl transition-colors ${locked ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {locked ? <Lock size={16} /> : <Unlock size={16} />}
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

      {editingEmployeeId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-start">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Edit3 size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isRtl ? 'تعديل أرصدة الإجازات' : 'Edit Leave Balances'}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                    {employeeMap.get(editingEmployeeId)?.Name_Ar} - {employeeMap.get(editingEmployeeId)?.Emp_ID}
                  </p>
                </div>
              </div>
              <button onClick={closeEdit} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8 text-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'عارضة' : 'Casual'}</label>
                  <input name="casualLeaveBalance" type="number" min="0" value={formState.casualLeaveBalance} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'اعتيادية' : 'Annual'}</label>
                  <input name="annualLeaveBalance" type="number" min="0" value={formState.annualLeaveBalance} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={closeEdit} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">{isRtl ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest">{isRtl ? 'حفظ' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalancesScreen;
