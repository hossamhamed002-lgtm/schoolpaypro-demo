
import React, { useMemo, useState } from 'react';
import { Package, Search, Plus, Filter, Trash2, Pencil, FileSpreadsheet, ArrowRight } from 'lucide-react';

const InventoryTab: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const inventoryItems = store.inventoryItems || store.items || [];
  const [items, setItems] = useState<any[]>(inventoryItems || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formValues, setFormValues] = useState({
    id: '',
    code: '',
    name: '',
    category: '',
    unit: '',
    quantity: '',
    purchasePrice: '',
    salePrice: '',
    acquisitionDate: '',
    salvageValue: '',
    usefulLife: '',
    assetAccount: ''
  });

  const categoryOptions = store.inventoryCategories || store.itemCategories || [];
  const unitOptions = store.inventoryUnits || store.units || [];
  const accountOptions = store.assetAccounts || store.accounts || [];

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const name = String(item.name || item.Item_Name || '').toLowerCase();
      const code = String(item.code || item.id || '').toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [items, searchTerm]);

  const openNewItem = () => {
    setIsEditing(false);
    const code = `ITM-${Date.now().toString().slice(-4)}`;
    setFormValues({
      id: '',
      code,
      name: '',
      category: '',
      unit: '',
      quantity: '',
      purchasePrice: '',
      salePrice: '',
      acquisitionDate: '',
      salvageValue: '',
      usefulLife: '',
      assetAccount: ''
    });
    setIsModalOpen(true);
  };

  const openEditItem = (item: any) => {
    setIsEditing(true);
    setFormValues({
      id: item.id || '',
      code: item.code || item.id || '',
      name: item.name || item.Item_Name || '',
      category: item.category || item.Category || '',
      unit: item.unit || item.Unit || '',
      quantity: item.qty ?? item.Quantity ?? '',
      purchasePrice: item.purchasePrice ?? item.Purchase_Price ?? '',
      salePrice: item.salePrice ?? item.Sale_Price ?? '',
      acquisitionDate: item.acquisitionDate || '',
      salvageValue: item.salvageValue || '',
      usefulLife: item.usefulLife || '',
      assetAccount: item.assetAccount || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formValues.name || !formValues.category) return;
    const payload = {
      id: formValues.id || formValues.code,
      code: formValues.code,
      name: formValues.name,
      category: formValues.category,
      unit: formValues.unit,
      qty: Number(formValues.quantity || 0),
      purchasePrice: Number(formValues.purchasePrice || 0),
      salePrice: Number(formValues.salePrice || 0),
      acquisitionDate: formValues.acquisitionDate,
      salvageValue: Number(formValues.salvageValue || 0),
      usefulLife: Number(formValues.usefulLife || 0),
      assetAccount: formValues.assetAccount
    };

    let nextItems = items;
    if (isEditing) {
      nextItems = items.map((item) => (item.id === payload.id || item.code === payload.code ? payload : item));
    } else {
      nextItems = [...items, payload];
    }
    setItems(nextItems);
    store.setInventoryItems?.(nextItems);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-2 text-slate-500 font-bold">
          <ArrowRight size={18} /> {isRtl ? 'عودة للرئيسية' : 'Back'}
        </button>
        <div className="text-start">
          <div className="flex items-center gap-3 justify-end">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{isRtl ? 'إدارة المخازن' : 'Inventory'}</h2>
              <p className="text-xs text-indigo-600 font-bold">{isRtl ? 'قائمة الأصناف' : 'Items List'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
          <Filter size={16} />
          {isRtl ? 'كل التصنيفات' : 'All Categories'}
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-300`} />
          <input
            type="text"
            className={`w-full rounded-xl border border-slate-200 bg-white ${isRtl ? 'pr-10 pl-4 text-end' : 'pl-10 pr-4'} py-2 text-sm font-semibold`}
            placeholder={isRtl ? 'بحث بكود أو اسم الصنف...' : 'Search by code or name...'}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className={`flex items-center gap-2 ${isRtl ? 'order-first' : ''}`}>
          <button className="p-2 rounded-xl border border-emerald-200 text-emerald-600 bg-emerald-50">
            <FileSpreadsheet size={16} />
          </button>
          <button className="p-2 rounded-xl border border-rose-200 text-rose-500 bg-rose-50">
            <Trash2 size={16} />
          </button>
          <button className="p-2 rounded-xl border border-slate-200 text-slate-600 bg-slate-50">
            <Pencil size={16} />
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2"
            onClick={openNewItem}
          >
            <Plus size={16} /> {isRtl ? 'إضافة صنف' : 'Add Item'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-[12px] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">
                <input type="checkbox" className="h-4 w-4 accent-indigo-500" />
              </th>
              <th className="px-4 py-3">{isRtl ? 'كود الصنف' : 'Item Code'}</th>
              <th className="px-4 py-3">{isRtl ? 'اسم الصنف' : 'Item Name'}</th>
              <th className="px-4 py-3">{isRtl ? 'التصنيف' : 'Category'}</th>
              <th className="px-4 py-3">{isRtl ? 'الوحدة' : 'Unit'}</th>
              <th className="px-4 py-3 text-center">{isRtl ? 'الكمية' : 'Quantity'}</th>
              <th className="px-4 py-3 text-center">{isRtl ? 'سعر الشراء' : 'Purchase Price'}</th>
              <th className="px-4 py-3 text-center">{isRtl ? 'سعر البيع' : 'Sale Price'}</th>
              <th className="px-4 py-3 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 font-bold">
                  {isRtl ? 'لا توجد أصناف مطابقة للبحث' : 'No items found'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item: any, index: number) => (
                <tr key={item.id || index} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" className="h-4 w-4 accent-indigo-500" />
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-600">{item.code || item.id || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name || item.Item_Name || '—'}</td>
                  <td className="px-4 py-3">{item.category || item.Category || '—'}</td>
                  <td className="px-4 py-3">{item.unit || item.Unit || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold">{item.qty ?? item.Quantity ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.purchasePrice ?? item.Purchase_Price ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.salePrice ?? item.Sale_Price ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold"
                      onClick={() => openEditItem(item)}
                    >
                      {isRtl ? 'تعديل' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-4 text-sm font-bold text-slate-500 text-end border-t border-slate-100">
          {isRtl ? 'إجمالي الأصناف:' : 'Total items:'} {items.length}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {isRtl ? 'إضافة صنف جديد / أصل' : 'Add New Item / Asset'}
              </h3>
              <button
                className="h-10 w-10 rounded-full border border-slate-200 text-slate-500"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500">اسم الصنف / الأصل *</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                  value={formValues.name}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="اسم المنتج أو الأصل..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">كود الصنف (Auto)</label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-indigo-600"
                  value={formValues.code}
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">التصنيف *</label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                  value={formValues.category}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
                >
                  <option value="">{isRtl ? 'اختر التصنيف' : 'Select category'}</option>
                  {categoryOptions.map((option: any, index: number) => (
                    <option key={option.id || index} value={option.name || option.Title || option}>
                      {option.name || option.Title || option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">الوحدة</label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                  value={formValues.unit}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, unit: event.target.value }))}
                >
                  <option value="">{isRtl ? 'اختر الوحدة' : 'Select unit'}</option>
                  {unitOptions.map((option: any, index: number) => (
                    <option key={option.id || index} value={option.name || option.Title || option}>
                      {option.name || option.Title || option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">الكمية الافتتاحية</label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-end"
                  value={formValues.quantity}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </div>
              <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100 p-4 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-indigo-700">{isRtl ? 'بيانات الأصل الثابت والإهلاك' : 'Fixed Asset & Depreciation'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">تاريخ الشراء / الاستحواذ</label>
                    <input
                      type="date"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                      value={formValues.acquisitionDate}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, acquisitionDate: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">تكلفة الشراء (للأصل الواحد)</label>
                    <input
                      type="number"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-end"
                      value={formValues.purchasePrice}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, purchasePrice: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">قيمة الخردة (في نهاية العمر)</label>
                    <input
                      type="number"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-end"
                      value={formValues.salvageValue}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, salvageValue: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">العمر الافتراضي (سنوات)</label>
                    <input
                      type="number"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-end"
                      value={formValues.usefulLife}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, usefulLife: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">ربط بحساب الأصل (الدليل المحاسبي)</label>
                    <select
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                      value={formValues.assetAccount}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, assetAccount: event.target.value }))}
                    >
                      <option value="">{isRtl ? '— اختر الحساب المالي —' : 'Select account'}</option>
                      {accountOptions.map((option: any, index: number) => (
                        <option key={option.id || index} value={option.name || option.Account_Name || option}>
                          {option.name || option.Account_Name || option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-black"
                  onClick={handleSave}
                >
                  {isEditing ? (isRtl ? 'تعديل' : 'Update') : (isRtl ? 'إضافة' : 'Add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
