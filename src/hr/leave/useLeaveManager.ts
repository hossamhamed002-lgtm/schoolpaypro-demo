import { useCallback, useMemo, useState } from 'react';
import { leaveTypes } from './leaveTypes';
import { LeaveBalance } from './leaveBalance.types';
import { LeaveRecord } from './leaveRecord.types';

interface LeaveManagerOptions {
  employees: Array<{ Emp_ID: string }>;
  academicYearId: string;
}

interface EmployeeLeaveSummary {
  employeeId: string;
  academicYearId: string;
  balances: LeaveBalance[];
  records: LeaveRecord[];
}

interface LeaveManagerResult {
  leaveBalances: LeaveBalance[];
  leaveRecords: LeaveRecord[];
  addLeaveRecord: (payload: Omit<LeaveRecord, 'id' | 'status' | 'createdAt'>) => LeaveRecord;
  approveLeave: (recordId: string) => void;
  rejectLeave: (recordId: string) => void;
  getEmployeeLeaveSummary: (employeeId: string) => EmployeeLeaveSummary;
}

const buildBalanceKey = (employeeId: string, academicYearId: string, leaveTypeId: string) =>
  `${employeeId}::${academicYearId}::${leaveTypeId}`;

const calculateRemaining = (totalAllowed: number, used: number) => Math.max(totalAllowed - used, 0);

const initializeBalances = (employees: Array<{ Emp_ID: string }>, academicYearId: string) => {
  const balances: LeaveBalance[] = [];
  employees.forEach((employee) => {
    leaveTypes.forEach((leaveType) => {
      const totalAllowed = leaveType.defaultAnnualBalance ?? 0;
      balances.push({
        employeeId: employee.Emp_ID,
        academicYearId,
        leaveTypeId: leaveType.id,
        totalAllowed,
        used: 0,
        remaining: totalAllowed,
        manuallyAdjusted: false
      });
    });
  });
  return balances;
};

const useLeaveManager = (options: LeaveManagerOptions): LeaveManagerResult => {
  const { employees, academicYearId } = options;
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(() =>
    initializeBalances(employees, academicYearId)
  );
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);

  const leaveTypeById = useMemo(() => {
    return new Map(leaveTypes.map((leaveType) => [leaveType.id, leaveType]));
  }, []);

  const ensureBalanceExists = useCallback((employeeId: string, leaveTypeId: string) => {
    const key = buildBalanceKey(employeeId, academicYearId, leaveTypeId);
    const existing = leaveBalances.find((balance) =>
      buildBalanceKey(balance.employeeId, balance.academicYearId, balance.leaveTypeId) === key
    );
    if (existing) return;

    const leaveType = leaveTypeById.get(leaveTypeId);
    const totalAllowed = leaveType?.defaultAnnualBalance ?? 0;

    setLeaveBalances((prev) => [
      ...prev,
      {
        employeeId,
        academicYearId,
        leaveTypeId,
        totalAllowed,
        used: 0,
        remaining: totalAllowed,
        manuallyAdjusted: false
      }
    ]);
  }, [academicYearId, leaveBalances, leaveTypeById]);

  const addLeaveRecord = useCallback((payload: Omit<LeaveRecord, 'id' | 'status' | 'createdAt'>) => {
    ensureBalanceExists(payload.employeeId, payload.leaveTypeId);
    const record: LeaveRecord = {
      ...payload,
      id: `LEAVE-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setLeaveRecords((prev) => [...prev, record]);
    return record;
  }, [ensureBalanceExists]);

  const approveLeave = useCallback((recordId: string) => {
    setLeaveRecords((prev) => prev.map((record) =>
      record.id === recordId ? { ...record, status: 'approved' } : record
    ));

    const record = leaveRecords.find((item) => item.id === recordId);
    if (!record) return;

    const leaveType = leaveTypeById.get(record.leaveTypeId);
    if (!leaveType) return;

    if (leaveType.id === 'SICK_LEAVE') {
      return;
    }

    setLeaveBalances((prev) => prev.map((balance) => {
      if (balance.employeeId !== record.employeeId) return balance;
      if (balance.academicYearId !== record.academicYearId) return balance;
      if (balance.leaveTypeId !== record.leaveTypeId) return balance;

      const proposedUsed = balance.used + record.totalDays;
      const proposedRemaining = calculateRemaining(balance.totalAllowed, proposedUsed);

      if (proposedUsed > balance.totalAllowed) {
        throw new Error('رصيد الإجازة غير كافٍ');
      }

      return {
        ...balance,
        used: proposedUsed,
        remaining: proposedRemaining
      };
    }));
  }, [leaveRecords, leaveTypeById]);

  const rejectLeave = useCallback((recordId: string) => {
    setLeaveRecords((prev) => prev.map((record) =>
      record.id === recordId ? { ...record, status: 'rejected' } : record
    ));
  }, []);

  const getEmployeeLeaveSummary = useCallback((employeeId: string): EmployeeLeaveSummary => {
    return {
      employeeId,
      academicYearId,
      balances: leaveBalances.filter((balance) => balance.employeeId === employeeId),
      records: leaveRecords.filter((record) => record.employeeId === employeeId)
    };
  }, [academicYearId, leaveBalances, leaveRecords]);

  return {
    leaveBalances,
    leaveRecords,
    addLeaveRecord,
    approveLeave,
    rejectLeave,
    getEmployeeLeaveSummary
  };
};

export default useLeaveManager;

// Integration points:
// - Attendance screen should create LeaveRecord entries for approved absences.
// - Payroll screen should read approved LeaveRecords to apply leave rules.
// - Salary logic will check affectsSalary and affectsInsurance flags in leaveTypes.
