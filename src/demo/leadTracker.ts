import { isDemoMode } from '../guards/appMode';

export type Lead = {
  id: string;
  createdAt: number;
  schoolName: string;
  contactName: string;
  phone: string;
  email?: string;
  notes?: string;
  demoExpired: boolean;
  host: string;
  userAgent: string;
};

const LEADS_KEY = 'EDULOGIC_DEMO_LEADS_V1';

const getLocalStorage = (): Storage | null => {
  if (!isDemoMode()) return null;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const loadLeads = (): Lead[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(LEADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Lead[] : [];
  } catch {
    return [];
  }
};

const persistLeads = (leads: Lead[]) => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(LEADS_KEY, JSON.stringify(leads));
  } catch {
    // ignore write issues
  }
};

export function saveLead(lead: Omit<Lead, 'id' | 'createdAt'>): void {
  const storage = getLocalStorage();
  if (!storage) return;
  const now = Date.now();
  const next: Lead = {
    ...lead,
    id: `lead-${now}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now
  };
  const list = loadLeads();
  list.unshift(next);
  persistLeads(list);
}

export function getAllLeads(): Lead[] {
  return loadLeads();
}

export function exportLeadsCSV(): string {
  const leads = loadLeads();
  if (!leads.length) return '';
  const headers = ['id', 'createdAt', 'schoolName', 'contactName', 'phone', 'email', 'notes', 'demoExpired', 'host', 'userAgent'];
  const rows = leads.map((lead) =>
    headers.map((key) => {
      const value = (lead as any)[key] ?? '';
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
