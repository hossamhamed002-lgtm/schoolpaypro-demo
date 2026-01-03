import { useSyncExternalStore } from 'react';

let isRedistributingStudents = false;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors to avoid blocking others
    }
  });
};

export const setRedistributingStudentsFlag = (value: boolean) => {
  if (isRedistributingStudents === value) return;
  isRedistributingStudents = value;
  emit();
};

export const getRedistributingStudentsFlag = () => isRedistributingStudents;

export const subscribeRedistributionFlag = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRedistributionGuard = () =>
  useSyncExternalStore(subscribeRedistributionFlag, getRedistributingStudentsFlag);
