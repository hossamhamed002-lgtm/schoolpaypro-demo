import { useCallback, useMemo } from 'react';
import { useFeeConfiguration } from './useFeeConfiguration';
import { useInvoicing } from './useInvoicingLogic';

export type ReceiptAllocation = {
  invoiceId: string;
  feeHeadId: string;
  invoiceSerial: number;
  amount: number;
};

export type ReceiptDistributionResult = {
  allocations: ReceiptAllocation[];
  byFeeHead: Record<string, number>;
  totalPaid: number;
  remaining: number;
};

export const useReceiptsLogic = () => {
  const { invoices } = useInvoicing();
  const { feeHeads } = useFeeConfiguration();

  const feeHeadMap = useMemo(() => new Map(feeHeads.map((head) => [head.id, head])), [feeHeads]);

  const distributePayment = useCallback(
    (studentId: string, paymentAmount: number): ReceiptDistributionResult => {
      let remaining = paymentAmount;
      const outstandingItems = invoices
        .filter((invoice) => invoice.studentId === studentId && invoice.isPosted && !invoice.isVoided)
        .flatMap((invoice) =>
          invoice.items.map((item) => ({
            invoiceId: invoice.id,
            invoiceSerial: invoice.serial,
            feeHeadId: item.feeHeadId,
            remaining: item.amount,
            priority: feeHeadMap.get(item.feeHeadId)?.priority ?? 0
          }))
        )
        .filter((item) => item.remaining > 0)
        .sort((a, b) => a.priority - b.priority);

      const allocations: ReceiptAllocation[] = [];
      const byFeeHead: Record<string, number> = {};

      for (const item of outstandingItems) {
        if (remaining <= 0) break;
        const payable = Math.min(remaining, item.remaining);
        remaining -= payable;
        allocations.push({
          invoiceId: item.invoiceId,
          feeHeadId: item.feeHeadId,
          invoiceSerial: item.invoiceSerial,
          amount: payable
        });
        byFeeHead[item.feeHeadId] = (byFeeHead[item.feeHeadId] ?? 0) + payable;
      }

      return {
        allocations,
        byFeeHead,
        totalPaid: paymentAmount - remaining,
        remaining
      };
    },
    [invoices, feeHeadMap]
  );

  return {
    distributePayment
  };
};
