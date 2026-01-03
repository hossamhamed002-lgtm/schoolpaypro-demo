import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, ChevronLeft, ShieldCheck, Receipt, Wallet } from 'lucide-react';
import { PayrollSettings } from '../../src/hr/payroll/payrollSettings.types';
import { loadPayrollSettings, savePayrollSettings } from '../../src/hr/payroll/payrollSettings.store';

interface StaffSettingsScreenProps {
  store: any;
  onBack: () => void;
}

type SettingsTab = 'insurance' | 'taxes' | 'emergency';

const StaffSettingsScreen: React.FC<StaffSettingsScreenProps> = ({ store, onBack }) => {
  const { lang } = store;
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<SettingsTab>('insurance');
  const [settings, setSettings] = useState<PayrollSettings>(() => loadPayrollSettings());

  const handleSave = useCallback(() => {
    savePayrollSettings(settings);
  }, [settings]);

  useEffect(() => {
    savePayrollSettings(settings);
  }, [settings]);

  const updateInsurance = useCallback((field: keyof PayrollSettings['insurance'], value: boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      insurance: {
        ...prev.insurance,
        [field]: value
      }
    }));
  }, []);

  const updateEmergencyFund = useCallback((field: keyof PayrollSettings['emergencyFund'], value: boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      emergencyFund: {
        ...prev.emergencyFund,
        [field]: value
      }
    }));
  }, []);

  const updateTaxExemption = useCallback((value: number) => {
    setSettings((prev) => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        monthlyExemptionAmount: value
      }
    }));
  }, []);

  const updateTaxRate = useCallback((value: number) => {
    setSettings((prev) => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        taxRatePercent: value
      }
    }));
  }, []);

  const updateTaxEnabled = useCallback((value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        isTaxEnabled: value
      }
    }));
  }, []);

  const updateTaxBracket = useCallback((index: number, update: { from?: number; to?: number; percent?: number }) => {
    setSettings((prev) => {
      const nextBrackets = prev.taxes.brackets.map((bracket, idx) =>
        idx === index ? { ...bracket, ...update } : bracket
      );
      return {
        ...prev,
        taxes: {
          ...prev.taxes,
          brackets: nextBrackets
        }
      };
    });
  }, []);

  const addTaxBracket = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        brackets: [...prev.taxes.brackets, { from: 0, to: 0, percent: 0 }]
      }
    }));
  }, []);

  const removeTaxBracket = useCallback((index: number) => {
    setSettings((prev) => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        brackets: prev.taxes.brackets.filter((_, idx) => idx !== index)
      }
    }));
  }, []);

  const tabs = useMemo(() => ([
    { id: 'insurance', label: isRtl ? 'التأمينات' : 'Insurance', icon: ShieldCheck },
    { id: 'taxes', label: isRtl ? 'الضرائب' : 'Taxes', icon: Receipt },
    { id: 'emergency', label: isRtl ? 'صندوق الطوارئ' : 'Emergency Fund', icon: Wallet }
  ]), [isRtl]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'إعدادات شؤون العاملين' : 'HR Settings'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isRtl ? 'إعدادات عامة للرواتب' : 'Payroll Global Settings'}</p>
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-2xl font-black text-xs shadow-sm">
          <Save size={16} />
          {isRtl ? 'حفظ الإعدادات' : 'Save Settings'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'insurance' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-700">{isRtl ? 'تفعيل التأمينات' : 'Enable Insurance'}</span>
            <input
              type="checkbox"
              checked={settings.insurance.enabled}
              onChange={(event) => updateInsurance('enabled', event.currentTarget.checked)}
              className="h-5 w-5"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'نسبة الموظف (%)' : 'Employee Percent (%)'}
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.insurance.employeePercent}
                onChange={(event) => updateInsurance('employeePercent', Number(event.currentTarget.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'نسبة جهة العمل (%)' : 'Employer Percent (%)'}
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.insurance.employerPercent}
                onChange={(event) => updateInsurance('employerPercent', Number(event.currentTarget.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />
            </label>
          </div>
        </div>
      )}

      {activeTab === 'taxes' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'طريقة الحساب' : 'Calculation Method'}
              <input
                type="text"
                value={isRtl ? 'شهري' : 'Monthly'}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'تطبيق على' : 'Apply To'}
              <input
                type="text"
                value={isRtl ? 'جميع الموظفين' : 'All Employees'}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500"
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-700">{isRtl ? 'تفعيل الضرائب' : 'Enable Taxes'}</span>
            <input
              type="checkbox"
              checked={settings.taxes.isTaxEnabled}
              onChange={(event) => updateTaxEnabled(event.currentTarget.checked)}
              className="h-5 w-5"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'حد الإعفاء الشهري' : 'Monthly Exemption'}
              <input
                type="number"
                min={0}
                value={settings.taxes.monthlyExemptionAmount}
                onChange={(event) => updateTaxExemption(Number(event.currentTarget.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />
            </label>
            <label className="space-y-2 text-xs font-bold text-slate-500">
              {isRtl ? 'نسبة الضريبة (%)' : 'Tax Rate (%)'}
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.taxes.taxRatePercent}
                onChange={(event) => updateTaxRate(Number(event.currentTarget.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
              />
            </label>
          </div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
            <span className="text-xs font-bold text-slate-600">{isRtl ? 'يتم تطبيق الضريبة بعد التأمينات' : 'Apply tax after insurance'}</span>
            <input type="checkbox" checked disabled className="h-5 w-5" />
          </div>
          <div className="space-y-4">
            {settings.taxes.brackets.map((bracket, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <label className="space-y-2 text-[11px] font-bold text-slate-500">
                  {isRtl ? 'من' : 'From'}
                  <input
                    type="number"
                    min={0}
                    value={bracket.from}
                    onChange={(event) => updateTaxBracket(index, { from: Number(event.currentTarget.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-[11px] font-bold text-slate-500">
                  {isRtl ? 'إلى' : 'To'}
                  <input
                    type="number"
                    min={0}
                    value={bracket.to}
                    onChange={(event) => updateTaxBracket(index, { to: Number(event.currentTarget.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-[11px] font-bold text-slate-500">
                  {isRtl ? 'النسبة (%)' : 'Percent (%)'}
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bracket.percent}
                    onChange={(event) => updateTaxBracket(index, { percent: Number(event.currentTarget.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
                  />
                </label>
                <button
                  onClick={() => removeTaxBracket(index)}
                  className="text-xs font-black text-rose-500 bg-rose-50 rounded-xl px-4 py-3"
                >
                  {isRtl ? 'حذف الشريحة' : 'Remove'}
                </button>
              </div>
            ))}
            <button onClick={addTaxBracket} className="text-xs font-black text-indigo-600 bg-indigo-50 rounded-xl px-4 py-3">
              {isRtl ? 'إضافة شريحة' : 'Add Bracket'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-700">{isRtl ? 'تفعيل صندوق الطوارئ' : 'Enable Emergency Fund'}</span>
            <input
              type="checkbox"
              checked={settings.emergencyFund.enabled}
              onChange={(event) => updateEmergencyFund('enabled', event.currentTarget.checked)}
              className="h-5 w-5"
            />
          </div>
          <label className="space-y-2 text-xs font-bold text-slate-500">
            {isRtl ? 'النسبة (%)' : 'Percent (%)'}
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.emergencyFund.percent}
              onChange={(event) => updateEmergencyFund('percent', Number(event.currentTarget.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default StaffSettingsScreen;
