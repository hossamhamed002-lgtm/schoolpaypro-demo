import React, { useEffect, useMemo, useState } from 'react';
import { Info, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { useFeeConfiguration } from '../../hooks/useFeeConfiguration';
import { useStore } from '../../store';
import { Grade } from '../../types';
import { FeeHeadType } from '../../src/types/finance.types';

const Badge: React.FC<{ type: 'mandatory' | 'optional' }> = ({ type }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
      type === 'mandatory' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
    }`}
  >
    {type === 'mandatory' ? 'إلزامي' : 'اختياري'}
  </span>
);

const FeeConfiguration: React.FC = () => {
  const { selectedYearId } = useAcademicYear();
  const { accounts } = useAccounts();
  const {
    gradeFeeStructures,
    initializeYearFees,
    addGradeFeeItem,
    updateGradeFeeItem,
    deleteGradeFeeItem,
    addFeeHead,
    feeHeads
  } = useFeeConfiguration();
  const store = useStore();

  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [newItemSelections, setNewItemSelections] = useState<Record<string, string>>({});
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadAccount, setNewHeadAccount] = useState('');
  const [newHeadType, setNewHeadType] = useState<FeeHeadType>(FeeHeadType.MANDATORY);
  const [newHeadPriority, setNewHeadPriority] = useState(100);

  const handleCreateFeeHead = () => {
    if (!newHeadName.trim() || !newHeadAccount) {
      alert('يرجى إدخال اسم البند واختيار حساب الإيراد.');
      return;
    }
    try {
      addFeeHead({
        id: `FH-${Date.now()}`,
        name: newHeadName.trim(),
        linkedRevenueAccountId: newHeadAccount,
        type: newHeadType,
        isRecurring: true,
        priority: newHeadPriority
      });
      setNewHeadName('');
      setNewHeadAccount('');
      setNewHeadPriority(100);
    } catch (error: any) {
      alert(error.message || 'حدث خطأ أثناء حفظ البند.');
    }
  };

  const gradeLookup = useMemo(() => {
    const map = new Map<string, Grade>();
    (store.allGrades || []).forEach((grade: Grade) => {
      map.set(grade.Grade_ID, grade);
  });
    return map;
  }, [store.allGrades]);

  const activeGrades = useMemo(() => {
    return (gradeFeeStructures || [])
      .filter((structure) => structure.academicYearId === selectedYearId)
      .map((structure) => {
        const gradeRecord = gradeLookup.get(structure.gradeId);
        return {
          ...structure,
          gradeName: gradeRecord?.Grade_Name || structure.gradeId,
          stageName: gradeRecord?.Stage_Name
        };
      });
  }, [gradeFeeStructures, selectedYearId, gradeLookup]);

  useEffect(() => {
    initializeYearFees(selectedYearId);
  }, [initializeYearFees, selectedYearId]);

  const revenueAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'Revenue' && !account.isMain),
    [accounts]
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'Expense' && !account.isMain),
    [accounts]
  );

  const getStructure = (gradeId: string) =>
    gradeFeeStructures.find((structure) => structure.gradeId === gradeId && structure.academicYearId === selectedYearId);

  const formatGradeHeading = (gradeStructure: any) => {
    const raw = gradeStructure.gradeName || gradeStructure.gradeId;
    if (/^GRD-/i.test(raw)) {
      return {
        title: 'الصف الدراسي',
        subtitle: `رمز: ${raw}`
      };
    }
    return {
      title: raw,
      subtitle: gradeStructure.stageName || 'الصف الدراسي'
    };
  };

  const headingTotals = (structure: any) => {
    const mandatory = structure.items
      .filter((item: any) => feeHeads.find((head) => head.id === item.feeHeadId)?.type === 'Mandatory')
      .reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
    const optional = structure.items
      .filter((item: any) => feeHeads.find((head) => head.id === item.feeHeadId)?.type === 'Optional')
      .reduce((sum: number, entry: any) => sum + Number(entry.amount), 0);
    return { mandatory, optional };
  };

  const handleAmountChange = (gradeId: string, feeHeadId: string, amount: number) => {
    const structure = getStructure(gradeId);
    if (!structure) return;
    updateGradeFeeItem(structure.id, feeHeadId, { amount });
  };

  const handleAccountChange = (
    gradeId: string,
    feeHeadId: string,
    payload: { revenueAccountId?: string; costAccountId?: string }
  ) => {
    const structure = getStructure(gradeId);
    if (!structure) return;
    updateGradeFeeItem(structure.id, feeHeadId, payload);
  };

  const handleTermInput = (
    gradeId: string,
    feeHeadId: string,
    termKey: 'term1Percent' | 'term2Percent',
    value: number
  ) => {
    const structure = getStructure(gradeId);
    if (!structure) return;
    const otherKey = termKey === 'term1Percent' ? 'term2Percent' : 'term1Percent';
    updateGradeFeeItem(structure.id, feeHeadId, {
      [termKey]: value,
      [otherKey]: 100 - value
    });
  };

  const handleDeleteItem = (gradeId: string, feeHeadId: string) => {
    const structure = getStructure(gradeId);
    if (!structure) return;
    deleteGradeFeeItem(structure.id, feeHeadId);
  };

  const handleAddItem = (gradeId: string, feeHeadId: string) => {
    const structure = getStructure(gradeId);
    if (!structure) return;
    const revenueAccountId = revenueAccounts[0]?.id || '';
    addGradeFeeItem(structure.id, {
      feeHeadId,
      amount: 0,
      revenueAccountId,
      costAccountId: undefined,
      term1Percent: 50,
      term2Percent: 50
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6 text-sm text-slate-700 shadow-sm flex items-start gap-3">
        <Info size={20} className="text-indigo-600" />
        <div>
          <p className="font-black text-indigo-900">تعليمات الرسوم</p>
          <p>يتم تسجيل حسابات الإيرادات في الجانب الدائن، وتُربط حسابات التكلفة بالجانب المدين. البنود الإلزامية تُطبق تلقائياً.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-800">بنود الرسوم المتاحة</p>
            <p className="text-xs text-slate-400">أضف البند أولاً ليتاح في قائمة “اختر بنداً”.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {feeHeads.length === 0 && <span className="text-slate-400">لا توجد بنود مسجلة بعد</span>}
            {feeHeads.slice(0, 4).map((head) => (
              <span
                key={head.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
              >
                {head.name} · {head.type === FeeHeadType.MANDATORY ? 'إلزامي' : 'اختياري'}
              </span>
            ))}
            {feeHeads.length > 4 && (
              <span className="rounded-full border border-slate-200 bg-indigo-50 px-3 py-1 text-indigo-600">
                {feeHeads.length - 4} إضافات أكثر...
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">اسم البند</label>
            <input
              value={newHeadName}
              onChange={(event) => setNewHeadName(event.target.value)}
              placeholder="مثال: مصروفات الدفاتر"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-indigo-100 focus:ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">حساب الإيراد</label>
            <select
              value={newHeadAccount}
              onChange={(event) => setNewHeadAccount(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500"
            >
              <option value="">اختر الحساب المرتبط</option>
              {revenueAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">نوع البند</label>
            <div className="flex gap-2">
              {Object.values(FeeHeadType).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewHeadType(type)}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.3em] transition ${
                    newHeadType === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {type === FeeHeadType.MANDATORY ? 'إلزامي' : 'اختياري'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <input
                type="number"
                min={1}
                value={newHeadPriority}
                onChange={(event) => setNewHeadPriority(Number(event.target.value))}
                className="w-20 rounded-2xl border border-slate-200 px-3 py-1 text-slate-600 text-center"
              />
              <span className="text-slate-400">أولوية الدفع</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleCreateFeeHead}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-sm hover:bg-indigo-500 transition"
          >
            + حفظ بند جديد
          </button>
        </div>
      </div>

      {activeGrades.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          لا توجد صفوف مفعلة لهذا العام الدراسي.
        </div>
      )}

      <div className="space-y-4">
        {activeGrades.map((gradeStructure) => {
          const totals = headingTotals(gradeStructure);
          const isExpanded = expandedGrade === gradeStructure.gradeId;
          return (
            <div key={gradeStructure.gradeId} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div
                className="flex items-center justify-between gap-4 p-6 cursor-pointer"
                onClick={() => setExpandedGrade(isExpanded ? null : gradeStructure.gradeId)}
              >
                {(() => {
                  const heading = formatGradeHeading(gradeStructure);
                  return (
                    <div>
                      <p className="text-lg font-black">{heading.title}</p>
                      <p className="text-xs text-slate-400">{heading.subtitle}</p>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-xs uppercase text-slate-500">الإجمالي الإلزامي</p>
                    <p className="text-base text-indigo-600 font-black">{totals.mandatory.toFixed(2)} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">الإجمالي الاختياري</p>
                    <p className="text-base text-slate-400 font-black">{totals.optional.toFixed(2)} EGP</p>
                  </div>
                  <div className="text-indigo-600">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-slate-100 px-6 pb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-slate-700 border-collapse">
                      <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-start">البند</th>
                          <th className="px-3 py-2 text-center">المبلغ</th>
                          <th className="px-3 py-2 text-center">دفعة 1 %</th>
                          <th className="px-3 py-2 text-center">دفعة 2 %</th>
                          <th className="px-3 py-2 text-center">حساب الإيرادات</th>
                          <th className="px-3 py-2 text-center">حساب التكلفة</th>
                          <th className="px-3 py-2 text-center">النوع</th>
                          <th className="px-3 py-2 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeStructure.items.map((item: any) => {
                          const head = feeHeads.find((h) => h.id === item.feeHeadId);
                          return (
                            <tr key={item.feeHeadId} className="border-b border-slate-100">
                              <td className="px-3 py-2">
                                <input
                                  value={head?.name || ''}
                                  readOnly
                                  className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.amount}
                                  onChange={(event) =>
                                    handleAmountChange(gradeStructure.gradeId, item.feeHeadId, Number(event.target.value))
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-sm focus:border-indigo-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.term1Percent ?? 50}
                                  onChange={(event) =>
                                    handleTermInput(
                                      gradeStructure.gradeId,
                                      item.feeHeadId,
                                      'term1Percent',
                                      Number(event.target.value)
                                    )
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-center text-sm ${
                                    ((item.term1Percent ?? 50) + (item.term2Percent ?? 50) !== 100)
                                      ? 'border-rose-400'
                                      : 'border-slate-200'
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.term2Percent ?? 50}
                                  onChange={(event) =>
                                    handleTermInput(
                                      gradeStructure.gradeId,
                                      item.feeHeadId,
                                      'term2Percent',
                                      Number(event.target.value)
                                    )
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-center text-sm ${
                                    ((item.term1Percent ?? 50) + (item.term2Percent ?? 50) !== 100)
                                      ? 'border-rose-400'
                                      : 'border-slate-200'
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.revenueAccountId || ''}
                                  onChange={(event) =>
                                    handleAccountChange(gradeStructure.gradeId, item.feeHeadId, {
                                      revenueAccountId: event.target.value
                                    })
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  {revenueAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.code} · {account.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={item.costAccountId || ''}
                                  onChange={(event) =>
                                    handleAccountChange(gradeStructure.gradeId, item.feeHeadId, {
                                      costAccountId: event.target.value || undefined
                                    })
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <option value="">-</option>
                                  {expenseAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.code} · {account.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge type={head?.type === FeeHeadType.MANDATORY ? 'mandatory' : 'optional'} />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => handleDeleteItem(gradeStructure.gradeId, item.feeHeadId)}
                                  className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-rose-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <select
                      value={newItemSelections[gradeStructure.gradeId] || ''}
                      onChange={(event) =>
                        setNewItemSelections((prev) => ({
                          ...prev,
                          [gradeStructure.gradeId]: event.target.value
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 focus:border-indigo-500"
                    >
                      <option value="">اختر بنداً</option>
                      {feeHeads
                        .filter(
                          (head) => !gradeStructure.items.some((item: any) => item.feeHeadId === head.id)
                        )
                        .map((head) => (
                          <option key={head.id} value={head.id}>
                            {head.name}
                          </option>
                        ))}
                    </select>
                    <button
                      disabled={!newItemSelections[gradeStructure.gradeId]}
                      onClick={() => {
                        handleAddItem(gradeStructure.gradeId, newItemSelections[gradeStructure.gradeId]);
                        setNewItemSelections((prev) => ({ ...prev, [gradeStructure.gradeId]: '' }));
                      }}
                      className="rounded-2xl bg-indigo-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-white transition hover:bg-indigo-500 disabled:opacity-40"
                    >
                      + إضافة بند جديد
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeeConfiguration;
