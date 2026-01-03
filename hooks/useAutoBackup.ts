import { useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../db_engine';
import { INITIAL_STATE } from '../store';
import { isDemoMode } from '../src/guards/appMode';

type BackupEntry = {
  id: string;
  schoolId: string;
  academicYearId: string;
  backupDate: string; // YYYY-MM-DD
  createdAt: string;
  data: any;
  type: 'AUTO';
};

const buildKey = (schoolCode: string) => `AUTO_BACKUPS__${schoolCode}`;

const readBackups = (schoolCode: string): BackupEntry[] => {
  try {
    const raw = localStorage.getItem(buildKey(schoolCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeBackups = (schoolCode: string, items: BackupEntry[]) => {
  const key = buildKey(schoolCode);
  const payload = JSON.stringify(items);
  try {
    localStorage.setItem(key, payload);
    return true;
  } catch (err) {
    console.warn('[BACKUP] Failed to persist backup (likely quota)', err);
    return false;
  }
};

const toDate = (iso: string) => iso.slice(0, 10);

export const useAutoBackup = (schoolCode?: string, academicYearId?: string, isAuthenticated?: boolean) => {
  useEffect(() => {
    if (!isAuthenticated || isDemoMode()) return;
    const code = (schoolCode || '').trim();
    if (!code || code === 'PROGRAMMER') return;

    const today = toDate(new Date().toISOString());
    const backups = readBackups(code);
    const lastBackup = backups[0];
    const lastDate = lastBackup?.backupDate;
    const lastTime = lastDate ? new Date(lastDate).getTime() : 0;
    const todayTime = new Date(today).getTime();
    const daysSince = lastTime ? Math.floor((todayTime - lastTime) / (1000 * 60 * 60 * 24)) : Infinity;

    if (lastDate === today) {
      console.log('[BACKUP] Backup skipped – already created today');
      return;
    }

    // تخفيض تكرار النسخ: نسخة كل 3 أيام كحد أقصى
    if (daysSince >= 0 && daysSince < 2) {
      console.log('[BACKUP] Backup skipped – last backup is recent');
      return;
    }

    try {
      const snapshot = loadFromStorage(INITIAL_STATE, code);
      const entry: BackupEntry = {
        id: `AUTO-${Date.now()}`,
        schoolId: code,
        academicYearId: academicYearId || '',
        backupDate: today,
        createdAt: new Date().toISOString(),
        data: snapshot,
        type: 'AUTO'
      };
      let next = [entry, ...backups];
      // سقف أقصى للنسخ التلقائية لتقليل الحجم
      next = next.slice(0, 30);

      // محاولة حفظ مع تقليص في حال تجاوز السعة
      let saved = writeBackups(code, next);
      while (!saved && next.length > 1) {
        next = next.slice(0, next.length - 1);
        saved = writeBackups(code, next);
      }
      if (saved) {
        console.log(`[BACKUP] Auto backup created for school ${code}`);
        if (next.length !== backups.length + 1) {
          console.log('[BACKUP] Old backups trimmed');
        }
      } else {
        console.warn('[BACKUP] Auto backup skipped after quota attempts');
      }
    } catch (error) {
      console.error('[BACKUP] Auto backup failed', error);
    }
  }, [schoolCode, academicYearId, isAuthenticated]);
};

export default useAutoBackup;
