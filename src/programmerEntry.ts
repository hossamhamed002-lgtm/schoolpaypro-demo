import { StorageAdapter } from './storage/StorageAdapter';

type EntrySource = 'shortcut' | 'login' | 'debug';

type ProgrammerContext = {
  active: boolean;
  enteredAt: string;
  lastExitAt?: string;
  entrySource?: EntrySource;
};

const NAMESPACE = 'programmer';
const KEY = 'context';
const IS_DEV = Boolean((import.meta as any)?.env?.DEV);

const readContext = (): ProgrammerContext | null => {
  try {
    return StorageAdapter.get<ProgrammerContext>(NAMESPACE, KEY);
  } catch {
    return null;
  }
};

export const isProgrammerMode = (): boolean => {
  const ctx = readContext();
  return !!ctx?.active;
};

export const enterProgrammerMode = (source: EntrySource = 'login') => {
  const now = new Date().toISOString();
  const ctx: ProgrammerContext = {
    active: true,
    enteredAt: now,
    entrySource: source
  };
  StorageAdapter.set(NAMESPACE, KEY, ctx);
  if (IS_DEV) {
    console.info('[PROGRAMMER][ENTER]', ctx);
  }
};

export const exitProgrammerMode = () => {
  const prev = readContext();
  const now = new Date().toISOString();
  const ctx: ProgrammerContext = {
    active: false,
    enteredAt: prev?.enteredAt || now,
    lastExitAt: now,
    entrySource: prev?.entrySource
  };
  StorageAdapter.set(NAMESPACE, KEY, ctx);
  if (IS_DEV) {
    console.info('[PROGRAMMER][EXIT]', ctx);
  }
};
