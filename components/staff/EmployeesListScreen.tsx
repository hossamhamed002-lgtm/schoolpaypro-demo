import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Edit3, X, Users } from 'lucide-react';
import { Employee } from '../../types';
import useEmployees from './hooks/useEmployees';

interface EmployeesListScreenProps {
  store: any;
  onBack: () => void;
}

type OperationalStatus = 'active' | 'leave' | 'suspended';

interface OperationalRecord {
  status: OperationalStatus;
  department: string;
  hireDate: string;
  jobTitleId: string;
  salary: string;
  contractType: string;
  nationalId: string;
  insuranceNo: string;
  mobile: string;
  address: string;
  qualification: string;
  notes: string;
}

type DerivedNationalId = {
  birthDate: string;
  gender: 'Male' | 'Female' | '';
};

const deriveFromNationalId = (nationalId?: string): DerivedNationalId => {
  if (!nationalId) return { birthDate: '', gender: '' };
  const trimmed = nationalId.replace(/\s+/g, '');
  if (!/^\d{14}$/.test(trimmed)) return { birthDate: '', gender: '' };

  const centuryDigit = trimmed.charAt(0);
  const yearPart = trimmed.slice(1, 3);
  const monthPart = trimmed.slice(3, 5);
  const dayPart = trimmed.slice(5, 7);

  const century = centuryDigit === '2' ? 1900 : centuryDigit === '3' ? 2000 : null;
  if (!century) return { birthDate: '', gender: '' };

  const year = century + Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return { birthDate: '', gender: '' };

  const genderDigit = Number(trimmed.charAt(12));
  const gender = Number.isNaN(genderDigit) ? '' : (genderDigit % 2 === 0 ? 'Female' : 'Male');
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { birthDate, gender };
};

const initialOperationalState: OperationalRecord = {
  status: 'active',
  department: '',
  hireDate: '',
  jobTitleId: '',
  salary: '',
  contractType: '',
  nationalId: '',
  insuranceNo: '',
  mobile: '',
  address: '',
  qualification: '',
  notes: ''
};

const OPERATIONAL_STORAGE_KEY = 'hr_operational_employee_records_v1';

const loadOperationalRecords = () => {
  try {
    const stored = window.localStorage.getItem(OPERATIONAL_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, OperationalRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const EmployeesListScreen: React.FC<EmployeesListScreenProps> = ({ store, onBack }) => {
  const { lang } = store;
  const isRtl = lang === 'ar';
  const { employees } = useEmployees(store);
  const jobTitles = store.jobTitles || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<OperationalRecord>(initialOperationalState);
  const [operationalRecords, setOperationalRecords] = useState<Record<string, OperationalRecord>>(() => loadOperationalRecords());

  useEffect(() => {
    try {
      window.localStorage.setItem(OPERATIONAL_STORAGE_KEY, JSON.stringify(operationalRecords));
    } catch {
      // ignore storage errors
    }
  }, [operationalRecords]);

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.Emp_ID === selectedId) || null,
    [employees, selectedId]
  );

  const editDisabled = !selectedEmployee;

  const openEditModal = useCallback(() => {
    if (!selectedEmployee) return;
    setForm(operationalRecords[selectedEmployee.Emp_ID] || initialOperationalState);
    setIsModalOpen(true);
  }, [operationalRecords, selectedEmployee]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setForm(initialOperationalState);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRowSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const targetId = event.currentTarget.dataset.id || '';
    const checked = event.currentTarget.checked;
    setSelectedId(checked ? targetId : null);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedEmployee) return;
    setOperationalRecords((prev) => ({
      ...prev,
      [selectedEmployee.Emp_ID]: form
    }));
    closeModal();
  }, [closeModal, form, selectedEmployee]);

  const rows = useMemo(() => employees.map((emp, index) => ({
    index: index + 1,
    ...emp
  })), [employees]);

  const jobTitleById = useMemo(() => {
    return new Map(jobTitles.map((job: any) => [job.Job_ID, isRtl ? job.Title_Ar : job.Title_En]));
  }, [isRtl, jobTitles]);

  const resolveJobTitleLabel = useCallback((jobId?: string) => {
    if (!jobId) return '';
    return jobTitleById.get(jobId) || '';
  }, [jobTitleById]);

  const statusLabel = useCallback((status?: OperationalStatus) => {
    if (status === 'leave') return isRtl ? 'إجازة' : 'Leave';
    if (status === 'suspended') return isRtl ? 'موقوف' : 'Suspended';
    return isRtl ? 'على رأس العمل' : 'Active';
  }, [isRtl]);

  const resolvedNationalId = useMemo(() => {
    if (form.nationalId) return form.nationalId;
    return selectedEmployee?.National_ID || '';
  }, [form.nationalId, selectedEmployee?.National_ID]);

  const derivedFromNationalId = useMemo(() => {
    return deriveFromNationalId(resolvedNationalId);
  }, [resolvedNationalId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'قائمة الموظفين' : 'Employees List'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rows.length} {isRtl ? 'سجل' : 'records'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openEditModal}
            disabled={editDisabled}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${editDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'}`}
          >
            <Edit3 size={18} />
            {isRtl ? 'تعديل بيانات تشغيلية' : 'Edit Operational Data'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16"></th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الكود' : 'Code'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الاسم' : 'Name'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'المسمى الوظيفي' : 'Job Title'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الرقم القومي' : 'National ID'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'التأمينات' : 'Insurance'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الموبايل' : 'Mobile'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'تاريخ التعيين' : 'Hire Date'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الوظيفة' : 'Role'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'العنوان' : 'Address'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'المؤهل' : 'Qualification'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'الحالة الوظيفية' : 'Employment Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((emp) => {
                const operational = operationalRecords[emp.Emp_ID] || initialOperationalState;
                const operationalJobLabel = resolveJobTitleLabel(operational.jobTitleId) || emp.Level;
                return (
                  <tr key={emp.Emp_ID} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-300">{emp.index}</td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        data-id={emp.Emp_ID}
                        checked={selectedId === emp.Emp_ID}
                        onChange={handleRowSelection}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{emp.Emp_ID}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                          {emp.Name_Ar?.charAt(0) || <Users size={16} />}
                        </div>
                        <div className="max-w-[200px]">
                          <p className="text-sm font-black text-slate-800 truncate">{emp.Name_Ar}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate">{emp.Name_En}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                        {operationalJobLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.nationalId || emp.National_ID || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.insuranceNo || emp.Insurance_No || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.mobile || emp.Phone || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.hireDate || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operationalJobLabel || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.address || '-'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{operational.qualification || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 text-[10px] font-black rounded-lg border bg-slate-50 text-slate-600 border-slate-200">
                        {statusLabel(operational.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-start">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Edit3 size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isRtl ? 'تحديث بيانات تشغيلية' : 'Operational Update'}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{isRtl ? 'واجهة تشغيلية فقط' : 'Operational View Only'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-10 text-start">
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'البيانات الشخصية' : 'Personal Info'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                    <input type="text" value={selectedEmployee?.Name_Ar || ''} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'كود الموظف' : 'Employee Code'}</label>
                    <input type="text" value={selectedEmployee?.Emp_ID || ''} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'المسمى الوظيفي' : 'Job Title'}</label>
                    <input type="text" value={selectedEmployee?.Level || ''} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الرقم القومي' : 'National ID'}</label>
                    <input name="nationalId" type="text" value={form.nationalId} onChange={handleInputChange} placeholder={selectedEmployee?.National_ID || ''} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'التأمينات' : 'Insurance'}</label>
                    <input name="insuranceNo" type="text" value={form.insuranceNo} onChange={handleInputChange} placeholder={selectedEmployee?.Insurance_No || ''} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الموبايل' : 'Mobile'}</label>
                    <input name="mobile" type="text" value={form.mobile} onChange={handleInputChange} placeholder={selectedEmployee?.Phone || ''} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'تاريخ الميلاد' : 'Birth Date'}</label>
                    <input type="date" value={derivedFromNationalId.birthDate} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'النوع' : 'Gender'}</label>
                    <input
                      type="text"
                      value={
                        derivedFromNationalId.gender
                          ? (isRtl ? (derivedFromNationalId.gender === 'Female' ? 'أنثى' : 'ذكر') : derivedFromNationalId.gender)
                          : ''
                      }
                      readOnly
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'البيانات التشغيلية' : 'Operational Data'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الحالة الوظيفية' : 'Employment Status'}</label>
                    <select name="status" value={form.status} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
                      <option value="active">{isRtl ? 'على رأس العمل' : 'Active'}</option>
                      <option value="leave">{isRtl ? 'إجازة' : 'Leave'}</option>
                      <option value="suspended">{isRtl ? 'موقوف' : 'Suspended'}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'القسم / الإدارة' : 'Department'}</label>
                    <input name="department" type="text" value={form.department} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'تاريخ التعيين الفعلي' : 'Actual Hire Date'}</label>
                    <input name="hireDate" type="date" value={form.hireDate} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الوظيفة (اختياري)' : 'Role (Optional)'}</label>
                    <select name="jobTitleId" value={form.jobTitleId} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
                      <option value="">{isRtl ? 'اختر الوظيفة' : 'Select Role'}</option>
                      {jobTitles.map((job: any) => (
                        <option key={job.Job_ID} value={job.Job_ID}>{isRtl ? job.Title_Ar : job.Title_En}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'العنوان' : 'Address'}</label>
                    <input name="address" type="text" value={form.address} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'المؤهل' : 'Qualification'}</label>
                    <input name="qualification" type="text" value={form.qualification} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'تفاصيل التعاقد' : 'Contract Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الراتب الوظيفي' : 'Salary'}</label>
                    <input name="salary" type="number" min="0" value={form.salary} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'نوع التعاقد' : 'Contract Type'}</label>
                    <select name="contractType" value={form.contractType} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
                      <option value="">{isRtl ? 'اختر النوع' : 'Select Type'}</option>
                      <option value="permanent">{isRtl ? 'دائم' : 'Permanent'}</option>
                      <option value="temporary">{isRtl ? 'مؤقت' : 'Temporary'}</option>
                      <option value="partTime">{isRtl ? 'دوام جزئي' : 'Part-time'}</option>
                      <option value="contractor">{isRtl ? 'تعاقدي' : 'Contractor'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'ملاحظات إدارية' : 'Administrative Notes'}</h4>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={closeModal} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">{isRtl ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest">{isRtl ? 'حفظ' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesListScreen;
