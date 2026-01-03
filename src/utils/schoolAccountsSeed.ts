import { Account, AccountType, AccountLevel } from '../types/accounts.types';

const seed: Account[] = [
  {
    id: 'ACC-ROOT-ASSETS',
    code: '1',
    name: 'الأصول',
    type: AccountType.ASSET,
    level: AccountLevel.ROOT,
    parentId: null,
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-11-CURRENT',
    code: '11',
    name: 'الأصول المتداولة',
    type: AccountType.ASSET,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-ASSETS',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-1101-CASH',
    code: '1101',
    name: 'الخزينة',
    type: AccountType.ASSET,
    level: AccountLevel.LEAF,
    parentId: 'ACC-11-CURRENT',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-1102-BANKS',
    code: '1102',
    name: 'البنوك',
    type: AccountType.ASSET,
    level: AccountLevel.LEAF,
    parentId: 'ACC-11-CURRENT',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-12-FIXED',
    code: '12',
    name: 'الأصول الثابتة',
    type: AccountType.ASSET,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-ASSETS',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-13-OVERDUE-INSTALLMENTS',
    code: '13',
    name: 'العملاء اقساط متاخره',
    type: AccountType.ASSET,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-ASSETS',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-14-INVENTORY',
    code: '14',
    name: 'المخزون',
    type: AccountType.ASSET,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-ASSETS',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-15-ADVANCES',
    code: '15',
    name: 'العهده',
    type: AccountType.ASSET,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-ASSETS',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-ROOT-LIABILITIES',
    code: '2',
    name: 'الخصوم',
    type: AccountType.LIABILITY,
    level: AccountLevel.ROOT,
    parentId: null,
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-21-CAPITAL',
    code: '21',
    name: 'رأس المال',
    type: AccountType.LIABILITY,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-LIABILITIES',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-22-SUPPLIERS',
    code: '22',
    name: 'موردون',
    type: AccountType.LIABILITY,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-LIABILITIES',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-23-ACCRUED-EXPENSES',
    code: '23',
    name: 'مصروفات مستحقه',
    type: AccountType.LIABILITY,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-LIABILITIES',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-ROOT-REVENUE',
    code: '4',
    name: 'الإيرادات',
    type: AccountType.REVENUE,
    level: AccountLevel.ROOT,
    parentId: null,
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-43-TUITION-REVENUE',
    code: '43',
    name: 'ايرادات الرسوم الدراسيه',
    type: AccountType.REVENUE,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-44-UNIFORM-REVENUE',
    code: '44',
    name: 'إيرادات الزي المدرسي',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-45-BUS-REVENUE',
    code: '45',
    name: 'إيرادات الحافلات',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-46-CAFETERIA-REVENUE',
    code: '46',
    name: 'إيرادات المقصف',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-47-TRIPS-REVENUE',
    code: '47',
    name: 'إيرادات الرحلات',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-48-BANK-DEPOSITS-REVENUE',
    code: '48',
    name: 'إيرادات ودائع بنكية',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-49-MISC-REVENUE',
    code: '49',
    name: 'إيرادات متنوعة',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-50-SCRAP-REVENUE',
    code: '50',
    name: 'إيراد بيع خردة وأصول',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-51-WITHDRAWN-REVENUE',
    code: '51',
    name: 'إيراد طلاب سحبوا ومردودات',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-52-STORES-SALES',
    code: '52',
    name: 'مبيعات المخازن',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-ROOT-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4301-TUITION',
    code: '4301',
    name: 'رسوم التعليم',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4302-BOOKS',
    code: '4302',
    name: 'رسوم الكتب',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4303-ACTIVITY',
    code: '4303',
    name: 'رسوم النشاط',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4304-EXTRA',
    code: '4304',
    name: 'رسم اضافيه',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4305-APPLICATION',
    code: '4305',
    name: 'رسوم ابلكيشن',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-4306-DISCOUNTS',
    code: '4306',
    name: 'الخصومات',
    type: AccountType.REVENUE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-43-TUITION-REVENUE',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-ROOT-EXPENSES',
    code: '5',
    name: 'المصروفات',
    type: AccountType.EXPENSE,
    level: AccountLevel.ROOT,
    parentId: null,
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-510-TUITION-EXPENSES',
    code: '510',
    name: 'مصروفات الرسوم الدراسية',
    type: AccountType.EXPENSE,
    level: AccountLevel.BRANCH,
    parentId: 'ACC-ROOT-EXPENSES',
    isMain: true,
    balance: 0
  },
  {
    id: 'ACC-5101-EDU-SUPPLIES',
    code: '5101',
    name: 'مصروفات مستلزمات تعليم',
    type: AccountType.EXPENSE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-510-TUITION-EXPENSES',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-5102-ACTIVITY-EXP',
    code: '5102',
    name: 'مصروفات النشاط',
    type: AccountType.EXPENSE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-510-TUITION-EXPENSES',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-5103-BOOKS-EXP',
    code: '5103',
    name: 'مصروفات الكتب',
    type: AccountType.EXPENSE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-510-TUITION-EXPENSES',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-5104-PRINTS-EXP',
    code: '5104',
    name: 'مصروفات المطبوعات',
    type: AccountType.EXPENSE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-510-TUITION-EXPENSES',
    isMain: false,
    balance: 0
  },
  {
    id: 'ACC-5105-OTHER-TUITION-EXP',
    code: '5105',
    name: 'مصروفات دراسية أخرى',
    type: AccountType.EXPENSE,
    level: AccountLevel.LEAF,
    parentId: 'ACC-510-TUITION-EXPENSES',
    isMain: false,
    balance: 0
  }
];

export const getInitialSchoolAccounts = (): Account[] => seed.map((account) => ({ ...account }));
