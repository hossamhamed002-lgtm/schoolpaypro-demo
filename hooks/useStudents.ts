import { useMemo } from 'react';
import { useStore } from '../store';

export const useStudents = () => {
  const store = useStore();
  return useMemo(() => store.students || [], [store.students]);
};
