
export const getFinanceActions = (setDb: any, logAction: any, getActiveYearId: () => string) => ({
  addFeeItem: (data: any) => {
    const id = `FEE-${Date.now()}`;
    const yearId = getActiveYearId();
    setDb((prev: any) => ({
      ...prev,
      feeItems: [...(prev.feeItems || []), { ...data, Fee_ID: id, Academic_Year_ID: data.Academic_Year_ID || yearId }]
    }));
    logAction({ Action_Ar: `إضافة بند رسوم: ${data.Item_Name}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: 'الحسابات' });
  },
  deleteFeeItem: (id: string) => setDb((prev: any) => ({
    ...prev,
    feeItems: prev.feeItems.filter((i: any) => i.Fee_ID !== id)
  })),
  updateFeeItem: (id: string, payload: any) => setDb((prev: any) => ({
    ...prev,
    feeItems: prev.feeItems.map((item: any) =>
      item.Fee_ID === id ? { ...item, ...payload } : item
    )
  })),
  addReceipt: (data: any) => {
    const yearId = getActiveYearId();
    const id = data.Receipt_ID || `REC-${Date.now()}`;
    setDb((prev: any) => ({
      ...prev,
      receipts: [...(prev.receipts || []), { ...data, Receipt_ID: id, Academic_Year_ID: data.Academic_Year_ID || yearId }]
    }));
    logAction({ Action_Ar: 'إضافة سند قبض', Action_Type: 'add', Record_ID: id, Page_Name_Ar: 'الحسابات' });
  },
  updateReceipt: (id: string, payload: any) => setDb((prev: any) => ({
    ...prev,
    receipts: prev.receipts.map((receipt: any) =>
      receipt.Receipt_ID === id ? { ...receipt, ...payload } : receipt
    )
  })),
  deleteReceipt: (id: string) => setDb((prev: any) => ({
    ...prev,
    receipts: prev.receipts.filter((receipt: any) => receipt.Receipt_ID !== id)
  })),
  addFeeStructure: (data: any) => {
    const yearId = getActiveYearId();
    const resolvedYearId = data.Year_ID || yearId;
    return setDb((prev: any) => ({
      ...prev,
      feeStructure: [
        ...(prev.feeStructure || []),
        { ...data, Year_ID: resolvedYearId, Academic_Year_ID: data.Academic_Year_ID || resolvedYearId, Structure_ID: `STR-${Date.now()}` }
      ]
    }));
  },
  deleteFeeStructure: (id: string) => setDb((prev: any) => ({
    ...prev,
    feeStructure: prev.feeStructure.filter((fs: any) => fs.Structure_ID !== id)
  })),
  updateReportConfig: (id: string, data: any) => setDb((prev: any) => ({
    ...prev,
    reportConfigs: prev.reportConfigs.map((c: any) => c.Category_ID === id ? { ...c, ...data } : c)
  }))
});
