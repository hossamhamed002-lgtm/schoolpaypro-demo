import { loadFromStorage, saveToStorage } from '../db_engine';
import { INITIAL_STATE } from '../store';

type BackupRecord = {
  id: string;
  schoolCode: string;
  schoolName: string;
  createdAt: string;
  size: number;
  type: 'manual' | 'auto' | 'AUTO';
  status: 'success' | 'failed' | 'pending';
  createdBy: string;
  notes?: string;
  payload: string; // JSON snapshot
};

const buildBackupKey = (schoolCode: string) => `BACKUPS__${schoolCode}`;
const buildAutoKey = (schoolCode: string) => `AUTO_BACKUPS__${schoolCode}`;

const readBackups = (schoolCode: string): BackupRecord[] => {
  try {
    const raw = localStorage.getItem(buildBackupKey(schoolCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeBackups = (schoolCode: string, items: BackupRecord[]) => {
  localStorage.setItem(buildBackupKey(schoolCode), JSON.stringify(items));
};

const readAutoBackups = (schoolCode: string): BackupRecord[] => {
  try {
    const raw = localStorage.getItem(buildAutoKey(schoolCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAutoBackups = (schoolCode: string, items: BackupRecord[]) => {
  localStorage.setItem(buildAutoKey(schoolCode), JSON.stringify(items));
};

export const useBackupRestore = () => {
  const createSafetyBackup = (schoolCode: string, schoolName: string) => {
    const snapshot = loadFromStorage(INITIAL_STATE, schoolCode);
    const payload = JSON.stringify(snapshot);
    const now = new Date();
    const entry: BackupRecord = {
      id: `AUTO-SAFE-${now.getTime()}`,
      schoolCode,
      schoolName,
      createdAt: now.toISOString(),
      size: payload.length,
      type: 'AUTO',
      status: 'success',
      createdBy: 'auto-backup-before-restore',
      notes: 'نسخة تلقائية قبل الاستعادة',
      payload
    };
    const existing = readAutoBackups(schoolCode);
    const next = [entry, ...existing].slice(0, 30);
    writeAutoBackups(schoolCode, next);
    console.log('[BACKUP] Safety backup created before restore for', schoolCode);
  };

  const restoreBackup = (schoolCode: string, schoolName: string, backupId: string) => {
    const backups = readBackups(schoolCode);
    const target = backups.find((item) => item.id === backupId);
    if (!target) {
      console.error('[BACKUP] Restore failed: backup not found for school', schoolCode);
      return { ok: false, error: 'النسخة غير موجودة' };
    }

    // Safety snapshot
    createSafetyBackup(schoolCode, schoolName);

    try {
      const parsed = JSON.parse(target.payload);
      saveToStorage(parsed, schoolCode);
      console.log('[BACKUP] Restore completed for school', schoolCode);
      return { ok: true };
    } catch (error) {
      console.error('[BACKUP] Restore failed', error);
      return { ok: false, error: 'فشل الاستعادة' };
    }
  };

  const modulePropMap: Record<string, string[]> = {
    students: ['students', 'parents'],
    studentsAffairs: ['stages', 'grades', 'classes', 'feeItems', 'feeStructure'],
    attendance: ['attendance'],
    staff: ['employees', 'jobTitles'],
    accounts: ['accounts', 'journalEntries', 'receipts', 'rules'],
    ledger: ['journalEntries'],
    treasury: ['receipts', 'banks', 'suppliers'],
    cheques: ['cheques'],
    stores: ['inventory', 'stockTypes'],
    fixedAssets: ['fixedAssets'],
    settings: ['schools', 'years', 'reportConfigs']
  };

  const restorePartial = (
    schoolCode: string,
    schoolName: string,
    backupId: string,
    modules: string[]
  ) => {
    if (!modules.length) {
      return { ok: false, error: 'يجب اختيار قسم واحد على الأقل.' };
    }
    const backups = readBackups(schoolCode);
    const target = backups.find((item) => item.id === backupId);
    if (!target) {
      console.error('[BACKUP] Partial restore failed: backup not found for school', schoolCode);
      return { ok: false, error: 'النسخة غير موجودة' };
    }

    // Snapshot for rollback
    const currentSnapshot = loadFromStorage(INITIAL_STATE, schoolCode);
    createSafetyBackup(schoolCode, schoolName);

    try {
      const backupSnapshot = JSON.parse(target.payload);
      const nextSnapshot = { ...currentSnapshot };

      modules.forEach((moduleKey) => {
        const props = modulePropMap[moduleKey] || [];
        props.forEach((prop) => {
          if (prop in backupSnapshot) {
            nextSnapshot[prop] = backupSnapshot[prop];
          }
        });
      });

      saveToStorage(nextSnapshot, schoolCode);
      console.log('[BACKUP] Partial restore completed for school', schoolCode, 'modules:', modules.join(','));
      return { ok: true };
    } catch (error) {
      console.error('[BACKUP] Partial restore failed', error);
      // rollback
      saveToStorage(currentSnapshot, schoolCode);
      return { ok: false, error: 'فشل الاسترجاع الجزئي' };
    }
  };

  return {
    readBackups,
    writeBackups,
    createSafetyBackup,
    restoreBackup,
    restorePartial
  };
};

export default useBackupRestore;
