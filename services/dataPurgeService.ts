import { loadFromStorage, saveToStorage } from '../db_engine';
import { INITIAL_STATE } from '../store';

type PurgeMode = 'demo' | 'all';
type ModuleKey =
  | 'students'
  | 'parents'
  | 'attendance'
  | 'fees'
  | 'receipts'
  | 'journal'
  | 'chart'
  | 'stores'
  | 'fixedAssets'
  | 'cheques'
  | 'users';

type PurgeRequest = {
  schools: Array<{ code: string; name: string }>;
  yearId?: string | null;
  modules: ModuleKey[];
  mode: PurgeMode;
  currentUserId: string;
  currentUsername: string;
};

type PurgeResult = {
  schoolCode: string;
  schoolName: string;
  deleted: Record<string, number>;
};

const AUDIT_KEY = 'developer_audit_logs';

const logAudit = (entry: any) => {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = [entry, ...parsed].slice(0, 500);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const matchesYear = (item: any, yearId?: string | null) => {
  if (!yearId) return true;
  const y = item?.Academic_Year_ID || item?.Year_ID || item?.yearId;
  return y === yearId;
};

const isDemoLike = (item: any) => {
  return item?.isDemo || item?.isSeed || item?.demo || item?.seed || item?.source === 'seed';
};

const removeByFilter = (list: any[] = [], predicate: (item: any) => boolean) =>
  list.filter((item) => !predicate(item));

export const purgeData = (request: PurgeRequest): PurgeResult[] => {
  const results: PurgeResult[] = [];

  request.schools.forEach((school) => {
    const snapshot = loadFromStorage(INITIAL_STATE, school.code);
    const deleted: Record<string, number> = {};

    const remove = (key: string, predicate: (item: any) => boolean) => {
      const before = snapshot[key]?.length || 0;
      snapshot[key] = removeByFilter(snapshot[key], predicate);
      deleted[key] = Math.max(0, before - (snapshot[key]?.length || 0));
    };

    const shouldRemove = (item: any) => {
      if (request.mode === 'demo') return isDemoLike(item) && matchesYear(item, request.yearId);
      return matchesYear(item, request.yearId);
    };

    request.modules.forEach((module) => {
      switch (module) {
        case 'students':
          remove('students', shouldRemove);
          break;
        case 'parents':
          remove('parents', shouldRemove);
          break;
        case 'attendance':
          remove('attendance', shouldRemove);
          break;
        case 'fees':
          remove('feeItems', shouldRemove);
          remove('feeStructure', shouldRemove);
          break;
        case 'receipts':
          remove('receipts', shouldRemove);
          break;
        case 'journal':
          remove('journalEntries', shouldRemove);
          break;
        case 'chart':
          remove('accounts', (item) => shouldRemove(item) && item?.isMain !== true);
          break;
        case 'stores':
          remove('inventory', shouldRemove);
          remove('stockTypes', shouldRemove);
          break;
        case 'fixedAssets':
          remove('fixedAssets', shouldRemove);
          break;
        case 'cheques':
          remove('cheques', shouldRemove);
          break;
        case 'users':
          remove('users', (item) => {
            if (item?.Role === 'Admin' && (item?.Username === 'dev_owner' || item?.Username === 'superadmin')) return false;
            if (item?.User_ID === request.currentUserId) return false;
            return request.mode === 'all' ? true : isDemoLike(item);
          });
          break;
        default:
          break;
      }
    });

    saveToStorage(snapshot, school.code);
    results.push({ schoolCode: school.code, schoolName: school.name, deleted });

    logAudit({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'PURGE',
      schoolCode: school.code,
      schoolName: school.name,
      yearId: request.yearId || 'ALL',
      modules: request.modules,
      mode: request.mode,
      deleted,
      user: request.currentUsername
    });
  });

  return results;
};

export default purgeData;
