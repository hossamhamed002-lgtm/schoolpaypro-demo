import { useMemo } from 'react';
import { useStore } from '../store';
import { normalizeEgyPhone } from './whatsappUtils';
import { StudentMaster, StudentReceipt, Grade, Class as ClassType, Stage } from '../types';

export interface WhatsAppRecipient {
  studentId: string;
  studentName: string;
  fatherName: string;
  rawMobile: string;
  normalizedMobile: string | null;
  currentBalance: number;
  grade: string;
  class: string;
  stage: string;
  isValid: boolean;
}

export const useWhatsAppLogic = () => {
  const store = useStore();

  const students = store.students || [];
  const receipts = store.receipts || [];
  const feeStructure = store.feeStructure || [];
  const grades = store.grades || [];
  const classes = store.classes || [];
  const stages = store.stages || [];

  const receiptsByStudent = useMemo(() => {
    const map = new Map<string, number>();
    (receipts as StudentReceipt[]).forEach((receipt) => {
      const id = receipt.Enroll_ID || '';
      if (!id) return;
      const amount = Number(receipt.Amount_Paid ?? 0);
      if (Number.isNaN(amount)) return;
      map.set(id, (map.get(id) ?? 0) + amount);
    });
    return map;
  }, [receipts]);

  const gradeFeeMap = useMemo(() => {
    const map = new Map<string, number>();
    feeStructure.forEach((entry: any) => {
      const gradeId = entry.Grade_ID || entry.Grade?.Grade_ID;
      if (!gradeId) return;
      const amount = Number(entry.Amount ?? entry.Fee_Amount ?? 0);
      if (Number.isNaN(amount)) return;
      map.set(gradeId, (map.get(gradeId) ?? 0) + amount);
    });
    return map;
  }, [feeStructure]);

  const gradeNameMap = useMemo(
    () => new Map<string, string>(grades.map((grade: Grade) => [grade.Grade_ID, grade.Grade_Name])),
    [grades]
  );

  const stageNameMap = useMemo(() => new Map<string, string>(stages.map((stage: Stage) => [stage.Stage_ID, stage.Stage_Name])), [stages]);

  const classNameMap = useMemo(() => {
    return new Map<string, string>(classes.map((klass: ClassType) => [klass.Class_ID, klass.Class_Name]));
  }, [classes]);

  const recipients = useMemo<WhatsAppRecipient[]>(() => {
    return students.map((student: StudentMaster) => {
      const father = student.Father;
      const mother = student.Mother;
      const rawMobile =
        father?.Mobile ||
        father?.WhatsApp ||
        student.Guardian_Phone ||
        mother?.Mobile ||
        mother?.WhatsApp ||
        '';

      const normalizedMobile = normalizeEgyPhone(rawMobile);
      const expectedFee = gradeFeeMap.get(student.Grade_ID) ?? 0;
      const paidAmount = receiptsByStudent.get(student.Student_Global_ID) ?? 0;
      const currentBalance = Number((expectedFee - paidAmount).toFixed(2));

    const gradeName = gradeNameMap.get(student.Grade_ID) || student.Level || '';
    const className = classNameMap.get(student.Class_ID) || '';
    const stageName = stageNameMap.get(student.Stage_ID) || '';
      const fatherName = father?.Name?.trim() || student.Name_Ar || student.Name_En || '—';

      return {
        studentId: student.Student_Global_ID,
        studentName: student.Name_Ar || student.Name_En || '',
        fatherName,
        rawMobile: rawMobile.trim(),
        normalizedMobile,
        currentBalance,
      grade: gradeName,
      stage: stageName,
      class: className,
        isValid: normalizedMobile !== null
      };
    });
  }, [students, receiptsByStudent, gradeFeeMap, gradeNameMap, classNameMap, stageNameMap]);

  const validRecipients = recipients.filter((item) => item.isValid);
  const invalidRecipients = recipients.length - validRecipients.length;

  return {
    recipients,
    validCount: validRecipients.length,
    invalidCount: invalidRecipients,
    recap: {
      total: recipients.length,
      valid: validRecipients.length,
      invalid: invalidRecipients
    }
  };
};
