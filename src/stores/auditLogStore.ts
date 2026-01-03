const uuidv4 = () =>
  (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : `audit-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'LOGIN'
  | 'PRINT'
  | 'BACKUP'
  | 'RESTORE'
  | 'SECURITY';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  role: string;
  schoolId: string;
  academicYearId: string;
  actionType: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  device?: string;
  severity: AuditSeverity;
  tags?: string[];
}

const STORAGE_KEY = 'APP_AUDIT_LOG';
const MAX_ENTRIES = 500;

const loadAuditLogs = (): AuditLogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
};

const persistAuditLogs = (entries: AuditLogEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
};

const evaluateSeverity = (entry: Partial<AuditLogEntry>): { severity: AuditSeverity; tags: string[] } => {
  const tags: string[] = [];
  let severity: AuditSeverity = entry.severity || 'LOW';

  if (entry.actionType === 'RESTORE' || entry.actionType === 'DELETE') {
    severity = 'HIGH';
    tags.push('CRITICAL_OPERATION');
  }
  if (entry.actionType === 'SECURITY') {
    severity = 'HIGH';
    tags.push('SECURITY_EVENT');
  }
  if (entry.actionType === 'BACKUP') {
    severity = severity === 'LOW' ? 'MEDIUM' : severity;
    tags.push('BACKUP_EVENT');
  }
  if (entry.tags?.includes('OTP_FAIL_3X')) {
    severity = 'HIGH';
    tags.push('OTP_ALERT');
  }
  if (entry.tags?.length) {
    tags.push(...entry.tags);
  }

  return { severity, tags };
};

export const logAuditEvent = (partial: Partial<AuditLogEntry>) => {
  const now = new Date().toISOString();
  const { severity, tags } = evaluateSeverity(partial);
  const entry: AuditLogEntry = {
    id: partial.id || uuidv4(),
    timestamp: partial.timestamp || now,
    userId: partial.userId || 'unknown',
    username: partial.username || 'unknown',
    role: partial.role || 'unknown',
    schoolId: partial.schoolId || 'unknown',
    academicYearId: partial.academicYearId || 'unknown',
    actionType: partial.actionType || 'SYSTEM',
    entity: partial.entity || 'System',
    entityId: partial.entityId,
    description: partial.description || '',
    ipAddress: partial.ipAddress,
    device: partial.device,
    severity,
    tags
  };
  const logs = loadAuditLogs();
  logs.push(entry);
  persistAuditLogs(logs);
  return entry;
};

export const getAuditLogs = () => loadAuditLogs();

export const withAudit = (
  actionType: AuditAction,
  entity: string,
  severity: AuditSeverity = 'LOW',
  extra?: Partial<AuditLogEntry>
) => {
  const device = typeof navigator !== 'undefined' ? `${navigator.userAgent} / ${navigator.platform}` : 'unknown';
  const ipAddress = extra?.ipAddress || 'n/a';
  const payload: Partial<AuditLogEntry> = {
    actionType,
    entity,
    severity,
    device,
    ipAddress,
    ...extra
  };
  return logAuditEvent(payload);
};
