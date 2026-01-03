import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Building,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  ShoppingCart,
  BarChart3,
  ChevronLeft,
  Plus,
  Edit3,
  Trash2,
  Shield
} from 'lucide-react';
import InventoryTab from './InventoryTab';
import StoresReportsTab from './StoresReportsTab';
import StockReports from './StockReports';
import StockInVoucher from './StockInVoucher';
import GoodsInNote from '../inventory/GoodsInNote';
import StockReceiveVoucher from '../inventory/StockReceiveVoucher';
import StockIssueVoucher from '../inventory/StockIssueVoucher';
import StockMovement from './StockMovement';
import { useAccounts } from '../../src/hooks/useAccountsLogic';
import { AccountLevel, AccountType } from '../../src/types/accounts.types';
import { useJournal } from '../../src/hooks/useJournal';
import { JournalEntry } from '../../src/types/journal.types';

type FixedAssetRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  monthlyDep: number;
  accumDep: number;
  bookValue: number;
  status: 'active' | 'retired' | 'depreciated';
  assetAccountId: string;
  assetAccountCode: string;
  creditAccountId: string;
  accumAccountId: string;
  expenseAccountId: string;
  acquisitionJournalId?: string;
  lastDepreciation?: string;
};

const ASSET_STORAGE_KEY = 'SCHOOL_FIXED_ASSETS';
const INVENTORY_TYPES_KEY = 'INVENTORY_TYPES';
const INVENTORY_TYPE_SEQ_KEY = 'INVENTORY_TYPE_SEQ';
const INVENTORY_AUTO_SEQ_KEY = 'INVENTORY_AUTO_SEQ';

type InventoryType = {
  id: string;
  name: string;
  code: string;
  description?: string;
  isAsset: boolean;
  affectsAccounts: boolean;
  linkedAccountId?: string;
  stockAccountId?: string;
  expenseAccountId?: string;
  revenueAccountId?: string;
  isConsumable?: boolean;
  isCountable?: boolean;
  allowNegative?: boolean;
  isActive: boolean;
  enableAutoJournal?: boolean;
  debitAccountId?: string;
  creditAccountId?: string;
  createdAt: string;
};

const StoresView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const schoolCode = (store.schoolCode || 'DEFAULT').trim().toUpperCase();
  const { accounts, addAccount, getNextCode } = useAccounts();
  const { addEntry } = useJournal();
  const [activeView, setActiveView] = useState<
    | 'dashboard'
    | 'stockTypes'
    | 'assets'
    | 'items'
    | 'inbound'
    | 'outbound'
    | 'movement'
    | 'purchaseOrders'
    | 'reports'
  >('dashboard');
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    id: '',
    code: '',
    name: '',
    category: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    cost: '',
    salvage: '',
    usefulLifeYears: '',
    status: 'active' as 'active' | 'retired' | 'depreciated'
  });
  const [assetError, setAssetError] = useState('');
  const [assetSeq, setAssetSeq] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(`SEQ_FIXED_ASSET__${schoolCode}`);
    return raw ? Number(raw) || 0 : 0;
  });
  const [fixedAssets, setFixedAssets] = useState<FixedAssetRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(ASSET_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as FixedAssetRecord[]) : [];
    } catch {
      return [];
    }
  });
  const [filteredAssets, setFilteredAssets] = useState<FixedAssetRecord[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(fixedAssets));
  }, [fixedAssets]);

  useEffect(() => {
    setFilteredAssets(fixedAssets);
  }, [fixedAssets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`SEQ_FIXED_ASSET__${schoolCode}`, String(assetSeq));
  }, [assetSeq, schoolCode]);

  const fixedAssetsAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.code === '12' ||
          account.id === 'ACC-12-FIXED' ||
          account.name === 'الأصول الثابتة'
      ) || null,
    [accounts]
  );

  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${INVENTORY_TYPES_KEY}__${schoolCode}`);
      return raw ? (JSON.parse(raw) as InventoryType[]) : [];
    } catch {
      return [];
    }
  });
  const [typeSeq, setTypeSeq] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(`${INVENTORY_TYPE_SEQ_KEY}__${schoolCode}`);
    return raw ? Number(raw) || 0 : 0;
  });
  const [autoAccSeq, setAutoAccSeq] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(`${INVENTORY_AUTO_SEQ_KEY}__${schoolCode}`);
    return raw ? Number(raw) || 0 : 0;
  });
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [typeForm, setTypeForm] = useState<Partial<InventoryType>>({
    name: '',
    code: '',
    description: '',
    isAsset: false,
    affectsAccounts: false,
    linkedAccountId: '',
    stockAccountId: '',
    expenseAccountId: '',
    revenueAccountId: '',
    isConsumable: false,
    isCountable: true,
    allowNegative: false,
    isActive: true,
    enableAutoJournal: false,
    debitAccountId: '',
    creditAccountId: ''
  });
  const [typeError, setTypeError] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${INVENTORY_TYPES_KEY}__${schoolCode}`, JSON.stringify(inventoryTypes));
  }, [inventoryTypes, schoolCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${INVENTORY_TYPE_SEQ_KEY}__${schoolCode}`, String(typeSeq));
  }, [typeSeq, schoolCode]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${INVENTORY_AUTO_SEQ_KEY}__${schoolCode}`, String(autoAccSeq));
  }, [autoAccSeq, schoolCode]);

  const generateTypeCode = () => {
    const next = typeSeq + 1;
    setTypeSeq(next);
    return `ST-${String(next).padStart(4, '0')}`;
  };

  const ensureAccount = (name: string, type: AccountType, parentFallback?: string) => {
    const existing = accounts.find((a) => a.name === name);
    if (existing) return existing;
    const parent =
      accounts.find((a) => a.type === type && a.level === AccountLevel.ROOT) ||
      accounts.find((a) => a.id === parentFallback) ||
      accounts.find((a) => a.level === AccountLevel.ROOT) ||
      accounts[0];
    const code = getNextCode(parent?.id || '');
    const id = `ACC-${Date.now()}-${autoAccSeq + 1}`;
    setAutoAccSeq((s) => s + 1);
    addAccount({
      id,
      code,
      name,
      type,
      level: AccountLevel.LEAF,
      parentId: parent?.id,
      isMain: false,
      balance: 0
    });
    return { id, code, name, type };
  };

  const persistInventoryType = (closeAfter: boolean) => {
    const name = (typeForm.name || '').trim();
    const code = (typeForm.code || '').trim().toUpperCase();
    if (!name || !code) {
      setTypeError(isRtl ? 'الاسم والكود إلزاميان' : 'Name and code are required');
      return;
    }

    let debitAccountId = (typeForm.debitAccountId || '').trim();
    let creditAccountId = (typeForm.creditAccountId || '').trim();

    if (typeForm.affectsAccounts) {
      // تحديد الحسابات آليًا وفق نوع المخزون
      if (typeForm.isAsset) {
        const dr = ensureAccount('الأصول الثابتة - مخزون', AccountType.ASSET);
        const cr = ensureAccount('موردين - أذونات إضافة', AccountType.LIABILITY);
        debitAccountId = dr?.id || '';
        creditAccountId = cr?.id || '';
      } else if (typeForm.isConsumable) {
        const dr = ensureAccount('مصروفات مخزنية', AccountType.EXPENSE);
        const cr = ensureAccount('موردين - مصروفات', AccountType.LIABILITY);
        debitAccountId = dr?.id || '';
        creditAccountId = cr?.id || '';
      } else {
        const dr = ensureAccount('مخزون تشغيلي', AccountType.ASSET);
        const cr = ensureAccount('موردين مخزون', AccountType.LIABILITY);
        debitAccountId = dr?.id || '';
        creditAccountId = cr?.id || '';
      }
    }

    if (typeForm.affectsAccounts && (!debitAccountId || !creditAccountId)) {
      setTypeError(isRtl ? 'تعذر إنشاء الحسابات تلقائيًا' : 'Failed to auto-create accounts');
      return;
    }
    const duplicate = inventoryTypes.some(
      (t) => t.code === code && (modalMode === 'add' || t.id !== typeForm.id)
    );
    if (duplicate) {
      setTypeError(isRtl ? 'الكود مستخدم بالفعل' : 'Code already exists');
      return;
    }
    setTypeError('');
    const now = new Date().toISOString();
    const payload: InventoryType = {
      id: modalMode === 'edit' && typeForm.id ? typeForm.id : `INV-TYPE-${Date.now()}`,
      name,
      code,
      description: typeForm.description || '',
      isAsset: !!typeForm.isAsset,
      affectsAccounts: !!typeForm.affectsAccounts,
      linkedAccountId: typeForm.affectsAccounts ? typeForm.linkedAccountId || undefined : undefined,
      stockAccountId: debitAccountId || undefined,
      expenseAccountId: undefined,
      revenueAccountId: undefined,
      isConsumable: !!typeForm.isConsumable,
      isCountable: typeForm.isCountable !== false,
      allowNegative: !!typeForm.allowNegative,
      isActive: typeForm.isActive !== false,
      enableAutoJournal: !!typeForm.enableAutoJournal,
      debitAccountId: debitAccountId || undefined,
      creditAccountId: creditAccountId || undefined,
      createdAt: modalMode === 'edit' && typeForm.createdAt ? typeForm.createdAt : now
    };
    setInventoryTypes((prev) => {
      if (modalMode === 'edit') {
        return prev.map((t) => (t.id === payload.id ? payload : t));
      }
      return [payload, ...prev];
    });
    setSelectedTypeId(payload.id);
    if (closeAfter) setTypeModalOpen(false);
  };

  const generateAssetCode = () => {
    const year = new Date().getFullYear();
    let next = assetSeq + 1;
    let code = '';
    let exists = true;
    while (exists) {
      code = `FA-${year}-${String(next).padStart(6, '0')}`;
      exists = fixedAssets.some((a) => a.code === code);
      if (exists) next += 1;
    }
    setAssetSeq(next);
    localStorage.setItem(`SEQ_FIXED_ASSET__${schoolCode}`, String(next));
    return code;
  };

  const handleSaveAsset = () => {
    if (!fixedAssetsAccount) {
      setAssetError('حساب الأصول الثابتة غير موجود.');
      return;
    }
    const name = assetForm.name.trim();
    const category = assetForm.category.trim() || 'أصل ثابت';
    const cost = Number(assetForm.cost || 0);
    const salvage = Number(assetForm.salvage || 0);
    const lifeYears = Number(assetForm.usefulLifeYears || 0);
    if (!name || cost <= 0 || lifeYears <= 0) {
      setAssetError('أكمل البيانات الإلزامية (اسم/تكلفة/عمر).');
      return;
    }
    const code = assetForm.code || generateAssetCode();
    const monthlyDep = Math.max(0, (cost - salvage) / (lifeYears * 12));
    const accumDep = 0;
    const bookValue = cost - accumDep;

    const assetAcc = ensureAccount(`أصل ثابت - ${name}`, AccountType.ASSET, fixedAssetsAccount.id);
    const creditAcc = ensureAccount('دائنون أصول ثابتة', AccountType.LIABILITY);
    const accumAcc = ensureAccount(`مجمع إهلاك - ${name}`, AccountType.ASSET, assetAcc?.parentId);
    const expenseAcc = ensureAccount('مصروف إهلاك أصول ثابتة', AccountType.EXPENSE);

    if (!assetAcc || !creditAcc || !accumAcc || !expenseAcc) {
      setAssetError('تعذر إنشاء الحسابات المرتبطة.');
      return;
    }

    const assetId = `FA-${Date.now()}`;
    const acquisitionJournal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: Date.now(),
      date: assetForm.purchaseDate || new Date().toISOString().slice(0, 10),
      description: `إثبات أصل ثابت - ${name}`,
      source: 'assets',
      sourceRefId: assetId,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
      lines: [
        { id: `${assetId}-DR`, accountId: assetAcc.id, debit: cost, credit: 0, note: 'إثبات أصل' },
        { id: `${assetId}-CR`, accountId: creditAcc.id, debit: 0, credit: cost, note: 'تمويل الأصل' }
      ],
      totalDebit: cost,
      totalCredit: cost,
      isBalanced: true
    };
    addEntry(acquisitionJournal);

    const record: FixedAssetRecord = {
      id: assetId,
      code,
      name,
      category,
      purchaseDate: assetForm.purchaseDate || new Date().toISOString().slice(0, 10),
      cost,
      salvage,
      usefulLifeYears: lifeYears,
      monthlyDep,
      accumDep,
      bookValue,
      status: 'active',
      assetAccountId: assetAcc.id,
      assetAccountCode: assetAcc.code,
      creditAccountId: creditAcc.id,
      accumAccountId: accumAcc.id,
      expenseAccountId: expenseAcc.id,
      acquisitionJournalId: acquisitionJournal.id
    };

    setFixedAssets((prev) => {
      if (assetForm.id) {
        return prev.map((a) => (a.id === assetForm.id ? record : a));
      }
      return [...prev, record];
    });

    setAssetForm({
      id: '',
      code: '',
      name: '',
      category: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      cost: '',
      salvage: '',
      usefulLifeYears: '',
      status: 'active'
    });
    setAssetError('');
    setAssetModalOpen(false);
  };

  const handleDepreciate = () => {
    const current = fixedAssets.find((a) => a.id === selectedAssetId);
    if (!current || current.status !== 'active') return;
    const amount = Math.min(current.monthlyDep, current.bookValue - current.salvage);
    if (amount <= 0) return;
    const journal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      description: `إهلاك أصل ${current.name}`,
      source: 'assets',
      sourceRefId: current.id,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: store.currentUser?.Username || 'system',
      lines: [
        { id: 'DR', accountId: current.expenseAccountId, debit: amount, credit: 0, note: 'مصروف إهلاك' },
        { id: 'CR', accountId: current.accumAccountId, debit: 0, credit: amount, note: 'مجمع إهلاك' }
      ],
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true
    };
    addEntry(journal);
    const newAccum = current.accumDep + amount;
    const bookValue = Math.max(0, current.cost - newAccum);
    const newStatus = bookValue <= current.salvage + 0.01 ? 'depreciated' : current.status;
    setFixedAssets((prev) =>
      prev.map((a) =>
        a.id === current.id
          ? { ...a, accumDep: newAccum, bookValue, status: newStatus, lastDepreciation: new Date().toISOString() }
          : a
      )
    );
  };

  const cards = [
    {
      id: 'stockTypes',
      title: isRtl ? 'أنواع المخزون' : 'Stock Types',
      desc: isRtl ? 'تعريف وتصنيف أنواع المخزون' : 'Define and categorize stock types',
      action: isRtl ? 'فتح' : 'Open',
      icon: Boxes,
      tone: 'text-indigo-600 bg-indigo-50'
    },
    {
      id: 'assets',
      title: isRtl ? 'الأصول الثابتة' : 'Fixed Assets',
      desc: isRtl ? 'تسجيل الأصول والإهلاك والحالة' : 'Track assets, depreciation, status',
      action: isRtl ? 'فتح' : 'Open',
      icon: Building,
      tone: 'text-emerald-600 bg-emerald-50'
    },
    {
      id: 'items',
      title: isRtl ? 'قائمة الأصناف' : 'Items Catalog',
      desc: isRtl ? 'كل الأصناف مع الرصيد والحد الأدنى' : 'All items, balances and thresholds',
      action: isRtl ? 'فتح' : 'Open',
      icon: Package,
      tone: 'text-sky-600 bg-sky-50'
    },
    {
      id: 'inbound',
      title: isRtl ? 'إذن إضافة مخزن' : 'Inbound Voucher',
      desc: isRtl ? 'إضافة أصناف للمخزن' : 'Add items into stock',
      action: isRtl ? 'إنشاء إذن' : 'Create',
      icon: ArrowDownCircle,
      tone: 'text-purple-600 bg-purple-50'
    },
    {
      id: 'outbound',
      title: isRtl ? 'إذن صرف مخزن' : 'Outbound Voucher',
      desc: isRtl ? 'صرف أصناف للأقسام' : 'Issue items to departments',
      action: isRtl ? 'إنشاء إذن' : 'Create',
      icon: ArrowUpCircle,
      tone: 'text-rose-600 bg-rose-50'
    },
    {
      id: 'movement',
      title: isRtl ? 'حركة المخازن' : 'Stock Movement',
      desc: isRtl ? 'سجل كامل لحركة الإضافة والصرف' : 'Full movement ledger',
      action: isRtl ? 'عرض الحركة' : 'View',
      icon: Repeat,
      tone: 'text-amber-600 bg-amber-50'
    },
    {
      id: 'purchaseOrders',
      title: isRtl ? 'أوامر الشراء' : 'Purchase Orders',
      desc: isRtl ? 'طلبات شراء الأصناف قبل الإضافة' : 'Purchase requests and approvals',
      action: isRtl ? 'فتح' : 'Open',
      icon: ShoppingCart,
      tone: 'text-teal-600 bg-teal-50'
    },
    {
      id: 'reports',
      title: isRtl ? 'تقارير المخازن' : 'Stores Reports',
      desc: isRtl ? 'تقارير الرصيد والحركة والأصول' : 'Balance and movement reports',
      action: isRtl ? 'عرض التقارير' : 'View Reports',
      icon: BarChart3,
      tone: 'text-slate-700 bg-slate-100'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div
        className={`flex flex-col sm:flex-row sm:items-center ${
          isRtl ? 'sm:justify-end' : 'justify-between'
        } gap-6`}
      >
        <div className={isRtl ? 'text-end' : 'text-start'}>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {isRtl ? 'المخازن وإدارة الأصول' : 'Stores & Assets'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {isRtl ? 'إدارة الأصناف – الحركات – الأذونات – التقارير' : 'Items, movements, vouchers, reports'}
          </p>
        </div>
        {activeView !== 'dashboard' && (
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm"
          >
            <ChevronLeft size={16} className={isRtl ? 'rotate-180' : ''} />
            {isRtl ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </button>
        )}
      </div>

      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setActiveView(card.id as any)}
              className={`bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex flex-col gap-5 ${
                isRtl ? 'text-end' : 'text-start'
              } hover:shadow-lg transition-shadow`}
              type="button"
            >
              <div className="flex items-center justify-between">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.tone}`}>
                  <card.icon size={28} />
                </div>
              </div>
              <div className={isRtl ? 'text-end' : 'text-start'}>
                <h3 className="text-lg font-black text-slate-800">{card.title}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeView === 'items' && <InventoryTab store={store} />}
      {activeView === 'reports' && <StockReports store={store} />}

      {activeView === 'stockTypes' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
            <div className={`flex flex-wrap items-center gap-3 ${isRtl ? 'justify-end' : 'justify-between'}`}>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                onClick={() => {
                  setModalMode('add');
                  setTypeForm({
                    name: '',
                    code: generateTypeCode(),
                    description: '',
                    isAsset: false,
                    affectsAccounts: false,
                    linkedAccountId: '',
                    stockAccountId: '',
                    expenseAccountId: '',
                    revenueAccountId: '',
                    isConsumable: false,
                    isCountable: true,
                    allowNegative: false,
                    isActive: true,
                    enableAutoJournal: false,
                    debitAccountId: '',
                    creditAccountId: ''
                  });
                  setTypeError('');
                  setTypeModalOpen(true);
                }}
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus size={14} /> {isRtl ? 'إضافة نوع' : 'Add Type'}
              </button>
              <button
                disabled={!selectedTypeId}
                type="button"
                onClick={() => {
                  const current = inventoryTypes.find((t) => t.id === selectedTypeId);
                  if (!current) return;
                  setModalMode('edit');
                  setTypeForm(current);
                  setTypeError('');
                  setTypeModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-50"
              >
                <Edit3 size={14} /> {isRtl ? 'تعديل' : 'Edit'}
              </button>
              <button
                disabled={!selectedTypeId}
                type="button"
                onClick={() => {
                  const current = inventoryTypes.find((t) => t.id === selectedTypeId);
                  if (!current) return;
                  // حذف ناعم: إيقاف التفعيل
                  setInventoryTypes((prev) =>
                    prev.map((t) => (t.id === current.id ? { ...t, isActive: false } : t))
                  );
                  setSelectedTypeId(null);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-600 disabled:opacity-50"
              >
                <Trash2 size={14} /> {isRtl ? 'تعطيل' : 'Disable'}
              </button>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">{isRtl ? 'أنواع المخزون' : 'Inventory Types'}</h3>
              <p className="text-sm text-slate-500 font-bold">{isRtl ? 'أنواع مرنة ينشئها المستخدم' : 'User-defined flexible types'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
                <tr>
                  <th className="px-4 py-3 text-center">{isRtl ? 'تحديد' : 'Select'}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? 'اسم النوع' : 'Type Name'}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? 'أصل ثابت؟' : 'Fixed Asset?'}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? 'محاسبي؟' : 'Affects Accounts?'}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {inventoryTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      {isRtl ? 'لا توجد بيانات' : 'No data yet'}
                    </td>
                  </tr>
                ) : (
                  inventoryTypes.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        selectedTypeId === t.id ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTypeId === t.id}
                          onChange={() => setSelectedTypeId(selectedTypeId === t.id ? null : t.id)}
                          className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-slate-700">{t.code}</td>
                      <td className="px-4 py-3 text-end font-semibold text-slate-800">{t.name}</td>
                      <td className="px-4 py-3 text-end">
                        {t.isAsset ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                            <Shield size={12} /> نعم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                            لا
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {t.affectsAccounts ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                            نعم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                            لا
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700">
                            موقوف
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {typeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Inventory</p>
                  <h3 className="text-xl font-black text-slate-900">
                    {modalMode === 'add'
                    ? isRtl ? 'إضافة نوع مخزون' : 'Add Inventory Type'
                    : isRtl ? 'تعديل نوع مخزون' : 'Edit Inventory Type'}
                </h3>
              </div>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
              </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => persistInventoryType(false)}
                className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold shadow-sm hover:bg-indigo-600"
              >
                {isRtl ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={() => persistInventoryType(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700"
              >
                {isRtl ? 'حفظ وإغلاق' : 'Save & Close'}
              </button>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

              {typeError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold px-3 py-2 rounded-xl">
                  {typeError}
                </div>
            )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500">{isRtl ? 'اسم النوع (إجباري)' : 'Type Name (required)'}</label>
                <input
                  value={typeForm.name || ''}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                  placeholder={isRtl ? 'مثال: مواد خام' : 'e.g. Raw Materials'}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500">{isRtl ? 'كود النوع' : 'Type Code'}</label>
                <input
                  value={typeForm.code || ''}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono font-bold text-slate-700"
                  placeholder="TYPE-001"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-black text-slate-500">{isRtl ? 'الوصف' : 'Description'}</label>
                <textarea
                  value={typeForm.description || ''}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  rows={2}
                  placeholder={isRtl ? 'اكتب وصفاً مختصراً' : 'Short description'}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!typeForm.isConsumable}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, isConsumable: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'نوع استهلاكي' : 'Consumable'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!typeForm.isAsset}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, isAsset: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'نوع أصل ثابت' : 'Fixed asset type'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={typeForm.isCountable !== false}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, isCountable: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'يخضع للجرد' : 'Subject to inventory'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!typeForm.allowNegative}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, allowNegative: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'يسمح بالصرف السالب' : 'Allow negative issue'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={typeForm.isActive !== false}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'نشط' : 'Active'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!typeForm.affectsAccounts}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, affectsAccounts: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'يؤثر محاسبيًا' : 'Affects accounts'}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={!!typeForm.enableAutoJournal}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, enableAutoJournal: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {isRtl ? 'ترحيل تلقائي (إعداد)' : 'Auto journal (config)'}
              </label>

              <div className="space-y-1 md:col-span-2">
                <h4 className="text-sm font-black text-slate-700 mb-1">{isRtl ? 'الربط المحاسبي التلقائي' : 'Automatic accounting link'}</h4>
                {!typeForm.affectsAccounts ? (
                  <p className="text-xs text-slate-500">{isRtl ? 'لن يتم إنشاء حسابات طالما أن الخيار غير مفعل.' : 'No accounting links while disabled.'}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="rtl">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <p className="text-[11px] font-black text-slate-500 mb-1">{isRtl ? 'الحساب المدين' : 'Debit account'}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {typeForm.debitAccountId
                          ? (() => {
                              const acc = accounts.find((a) => a.id === typeForm.debitAccountId);
                              return acc ? `${acc.code} - ${acc.name}` : typeForm.debitAccountId;
                            })()
                          : isRtl ? 'سيتم إنشاؤه تلقائيًا' : 'Will be created automatically'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <p className="text-[11px] font-black text-slate-500 mb-1">{isRtl ? 'الحساب الدائن' : 'Credit account'}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {typeForm.creditAccountId
                          ? (() => {
                              const acc = accounts.find((a) => a.id === typeForm.creditAccountId);
                              return acc ? `${acc.code} - ${acc.name}` : typeForm.creditAccountId;
                            })()
                          : isRtl ? 'سيتم إنشاؤه تلقائيًا' : 'Will be created automatically'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTypeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const name = (typeForm.name || '').trim();
                  const code = (typeForm.code || '').trim().toUpperCase();
                  const debitAccountId = (typeForm.debitAccountId || '').trim();
                  const creditAccountId = (typeForm.creditAccountId || '').trim();
                  if (!name || !code) {
                    setTypeError(isRtl ? 'الاسم والكود إلزاميان' : 'Name and code are required');
                    return;
                  }
                  if (typeForm.affectsAccounts && !debitAccountId) {
                    setTypeError(isRtl ? 'يرجى اختيار حساب المخزون للربط المحاسبي' : 'Select inventory account for accounting link');
                    return;
                  }
                  const duplicate = inventoryTypes.some(
                    (t) => t.code === code && (modalMode === 'add' || t.id !== typeForm.id)
                  );
                  if (duplicate) {
                    setTypeError(isRtl ? 'الكود مستخدم بالفعل' : 'Code already exists');
                    return;
                  }
                  setTypeError('');
                  const now = new Date().toISOString();
                  const payload: InventoryType = {
                    id: modalMode === 'edit' && typeForm.id ? typeForm.id : `INV-TYPE-${Date.now()}`,
                    name,
                    code,
                    description: typeForm.description || '',
                    isAsset: !!typeForm.isAsset,
                    affectsAccounts: !!typeForm.affectsAccounts,
                    linkedAccountId: typeForm.affectsAccounts ? typeForm.linkedAccountId || undefined : undefined,
                    stockAccountId: inventoryAccountId,
                    expenseAccountId: typeForm.expenseAccountId || undefined,
                    revenueAccountId: typeForm.revenueAccountId || undefined,
                    isConsumable: !!typeForm.isConsumable,
                    isCountable: typeForm.isCountable !== false,
                    allowNegative: !!typeForm.allowNegative,
                    isActive: typeForm.isActive !== false,
                    accountingMap: {
                      inventoryAccountId,
                      cogsAccountId: typeForm.accountingMap?.cogsAccountId || '',
                      adjustmentAccountId: typeForm.accountingMap?.adjustmentAccountId || ''
                    },
                    createdAt: modalMode === 'edit' && typeForm.createdAt ? typeForm.createdAt : now
                  };
                  setInventoryTypes((prev) => {
                    if (modalMode === 'edit') {
                      return prev.map((t) => (t.id === payload.id ? payload : t));
                    }
                    return [payload, ...prev];
                  });
                  setSelectedTypeId(payload.id);
                  setTypeModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700"
              >
                {isRtl ? 'حفظ' : 'Save'}
              </button>
              <button
                onClick={() => {
                  const name = (typeForm.name || '').trim();
                  const code = (typeForm.code || '').trim().toUpperCase();
                  const inventoryAccountId = (typeForm.accountingMap?.inventoryAccountId || '').trim();
                  if (!name || !code) {
                    setTypeError(isRtl ? 'الاسم والكود إلزاميان' : 'Name and code are required');
                    return;
                  }
                  if (typeForm.affectsAccounts && !inventoryAccountId) {
                    setTypeError(isRtl ? 'يرجى اختيار حساب المخزون للربط المحاسبي' : 'Select inventory account for accounting link');
                    return;
                  }
                  const duplicate = inventoryTypes.some(
                    (t) => t.code === code && (modalMode === 'add' || t.id !== typeForm.id)
                  );
                  if (duplicate) {
                    setTypeError(isRtl ? 'الكود مستخدم بالفعل' : 'Code already exists');
                    return;
                  }
                  setTypeError('');
                  const now = new Date().toISOString();
                  const payload: InventoryType = {
                    id: modalMode === 'edit' && typeForm.id ? typeForm.id : `INV-TYPE-${Date.now()}`,
                    name,
                    code,
                    description: typeForm.description || '',
                    isAsset: !!typeForm.isAsset,
                    affectsAccounts: !!typeForm.affectsAccounts,
                    linkedAccountId: typeForm.affectsAccounts ? typeForm.linkedAccountId || undefined : undefined,
                    stockAccountId: debitAccountId || undefined,
                    expenseAccountId: undefined,
                    revenueAccountId: undefined,
                    isConsumable: !!typeForm.isConsumable,
                    isCountable: typeForm.isCountable !== false,
                    allowNegative: !!typeForm.allowNegative,
                    isActive: typeForm.isActive !== false,
                    enableAutoJournal: !!typeForm.enableAutoJournal,
                    debitAccountId: debitAccountId || undefined,
                    creditAccountId: creditAccountId || undefined,
                    createdAt: modalMode === 'edit' && typeForm.createdAt ? typeForm.createdAt : now
                  };
                  setInventoryTypes((prev) => {
                    if (modalMode === 'edit') {
                      return prev.map((t) => (t.id === payload.id ? payload : t));
                    }
                    return [payload, ...prev];
                  });
                  setSelectedTypeId(payload.id);
                  setTypeModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold shadow-sm hover:bg-indigo-600"
              >
                {isRtl ? 'حفظ وإغلاق' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'assets' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6" dir="rtl">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button onClick={() => { setAssetForm({ id: '', code: generateAssetCode(), name: '', category: '', purchaseDate: new Date().toISOString().slice(0, 10), cost: '', salvage: '', usefulLifeYears: '', status: 'active' }); setSelectedAssetId(null); setAssetError(''); setAssetModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-black shadow-sm">
                + إضافة أصل
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={() => {
                  const current = fixedAssets.find((a) => a.id === selectedAssetId);
                  if (!current) return;
                  setAssetForm({
                    id: current.id,
                    code: current.code,
                    name: current.name,
                    category: current.category,
                    purchaseDate: current.purchaseDate,
                    cost: String(current.cost),
                    salvage: String(current.salvage),
                    usefulLifeYears: String(current.usefulLifeYears),
                    status: current.status
                  });
                  setAssetError('');
                  setAssetModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50"
              >
                ✏️ تعديل
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={() => {
                  setFixedAssets((prev) => prev.filter((a) => a.id !== selectedAssetId));
                  setSelectedAssetId(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
              >
                🗑️ حذف
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={handleDepreciate}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50"
              >
                إهلاك شهر
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={() => {
                  const current = fixedAssets.find((a) => a.id === selectedAssetId);
                  if (!current) return;
                  setFixedAssets((prev) =>
                    prev.map((a) =>
                      a.id === current.id ? { ...a, status: 'retired' as const } : a
                    )
                  );
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2 text-sm font-black text-amber-700 disabled:opacity-50"
              >
                استبعاد أصل
              </button>
              <button
                onClick={() => {
                  const headers = [
                    'الكود',
                    'الاسم',
                    'الفئة',
                    'تاريخ الشراء',
                    'التكلفة',
                    'قيمة الخردة',
                    'العمر الإنتاجي (سنوات)',
                    'الإهلاك الشهري',
                    'مجمع الإهلاك',
                    'القيمة الدفترية',
                    'الحالة'
                  ];
                  const rows = fixedAssets.map((a) => [
                    a.code,
                    a.name,
                    a.category,
                    a.purchaseDate,
                    a.cost,
                    a.salvage,
                    a.usefulLifeYears,
                    a.monthlyDep,
                    a.accumDep,
                    a.bookValue,
                    a.status
                  ]);
                  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `fixed-assets-${schoolCode}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600"
              >
                ⬇️ تصدير
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <input
                  placeholder="بحث بالاسم أو الكود"
                  className="bg-transparent outline-none text-sm font-bold text-slate-700"
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    setSelectedAssetId(null);
                    setFilteredAssets(
                      fixedAssets.filter((a) => `${a.code} ${a.name}`.toLowerCase().includes(term))
                    );
                  }}
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAssetId(null);
                    setFilteredAssets(
                      val ? fixedAssets.filter((a) => a.status === val) : fixedAssets
                    );
                  }}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700"
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="retired">مستبعد</option>
                  <option value="depreciated">مهلك</option>
                </select>
              </div>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
              <tr>
                <th className="px-4 py-3 text-center">تحديد</th>
                <th className="px-4 py-3 text-end">كود الأصل</th>
                <th className="px-4 py-3 text-end">اسم الأصل</th>
                <th className="px-4 py-3 text-end">الفئة</th>
                <th className="px-4 py-3 text-end">تاريخ الشراء</th>
                <th className="px-4 py-3 text-end">تكلفة الشراء</th>
                <th className="px-4 py-3 text-end">مجمع الإهلاك</th>
                <th className="px-4 py-3 text-end">القيمة الدفترية</th>
                <th className="px-4 py-3 text-end">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400 font-bold">لا توجد أصول مسجلة</td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${selectedAssetId === asset.id ? 'bg-indigo-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAssetId === asset.id}
                        onChange={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-end font-mono text-slate-700">{asset.code}</td>
                    <td className="px-4 py-3 text-end font-semibold text-slate-800">{asset.name}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{asset.category}</td>
                    <td className="px-4 py-3 text-end text-slate-500">{asset.purchaseDate || '—'}</td>
                    <td className="px-4 py-3 text-end text-emerald-700 font-bold">{asset.cost.toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-rose-600 font-bold">{asset.accumDep.toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{asset.bookValue.toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-600">{asset.status === 'active' ? 'نشط' : asset.status === 'depreciated' ? 'مهلك' : 'مستبعد'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'inbound' && <StockReceiveVoucher store={store} />}

      {activeView === 'outbound' && <StockIssueVoucher store={store} />}

      {activeView === 'movement' && (
        <StockMovement store={store} />
      )}

      {activeView === 'purchaseOrders' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
          <div className={`flex items-center ${isRtl ? 'justify-end gap-3' : 'justify-between'}`}>
            <h3 className="text-xl font-black text-slate-800">{isRtl ? 'أوامر الشراء' : 'Purchase Orders'}</h3>
            <button className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white">
              {isRtl ? 'أمر شراء جديد' : 'New Order'}
            </button>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
              <tr>
                <th className="px-4 py-3 text-end">{isRtl ? 'رقم' : 'No.'}</th>
                <th className="px-4 py-3 text-end">{isRtl ? 'المورد' : 'Supplier'}</th>
                <th className={`px-4 py-3 ${isRtl ? 'text-end' : 'text-center'}`}>{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className={`px-4 py-3 ${isRtl ? 'text-end' : 'text-center'}`}>{isRtl ? 'الحالة' : 'Status'}</th>
                <th className={`px-4 py-3 ${isRtl ? 'text-end' : 'text-center'}`}>{isRtl ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  {isRtl ? 'لا توجد أوامر شراء بعد' : 'No purchase orders'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {assetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Fixed Assets</p>
                <h4 className="text-lg font-black text-slate-800">{isRtl ? 'إضافة / تعديل أصل ثابت' : 'Add / Edit Fixed Asset'}</h4>
              </div>
              <button
                onClick={() => setAssetModalOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4" dir="rtl">
              {assetError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold px-3 py-2 rounded-xl">
                  {assetError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">كود الأصل</label>
                  <input
                    value={assetForm.code || ''}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-mono font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">اسم الأصل</label>
                  <input
                    value={assetForm.name}
                    onChange={(e) => setAssetForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    placeholder="مثال: أجهزة حاسب"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">فئة الأصل</label>
                  <input
                    value={assetForm.category}
                    onChange={(e) => setAssetForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    placeholder="مباني / أجهزة / أثاث"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">تاريخ الشراء</label>
                  <input
                    type="date"
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">تكلفة الشراء</label>
                  <input
                    type="number"
                    value={assetForm.cost}
                    onChange={(e) => setAssetForm((p) => ({ ...p, cost: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">قيمة الخردة (اختياري)</label>
                  <input
                    type="number"
                    value={assetForm.salvage}
                    onChange={(e) => setAssetForm((p) => ({ ...p, salvage: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">العمر الإنتاجي (سنوات)</label>
                  <input
                    type="number"
                    value={assetForm.usefulLifeYears}
                    onChange={(e) => setAssetForm((p) => ({ ...p, usefulLifeYears: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">الحالة</label>
                  <select
                    value={assetForm.status}
                    onChange={(e) =>
                      setAssetForm((p) => ({
                        ...p,
                        status: e.target.value === 'retired' ? 'retired' : e.target.value === 'depreciated' ? 'depreciated' : 'active'
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="active">نشط</option>
                    <option value="retired">مستبعد</option>
                    <option value="depreciated">مهلك</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
              <button
                onClick={() => setAssetModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveAsset}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
              >
                {isRtl ? 'حفظ الأصل' : 'Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoresView;
