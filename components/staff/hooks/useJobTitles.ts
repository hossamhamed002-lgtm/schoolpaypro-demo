import { useCallback } from 'react';
import { JobTitle, UserRole } from '../../../types';

interface UseJobTitlesResult {
  jobTitles: JobTitle[];
  createJobTitle: (payload: Partial<JobTitle>) => boolean;
  updateJobTitleRecord: (id: string, payload: Partial<JobTitle>) => boolean;
  removeJobTitle: (id: string) => boolean;
}

const useJobTitles = (store: any): UseJobTitlesResult => {
  const jobTitles: JobTitle[] = store.jobTitles || [];

  const validateJobTitle = useCallback((payload: Partial<JobTitle>) => {
    if (!payload.Title_Ar?.trim()) return 'اسم المسمى الوظيفي مطلوب';
    return '';
  }, []);

  const createJobTitle = useCallback((payload: Partial<JobTitle>) => {
    const error = validateJobTitle(payload);
    if (error) {
      alert(error);
      return false;
    }

    store.addJobTitle({
      Title_Ar: payload.Title_Ar || '',
      Title_En: payload.Title_En || '',
      Parent_Job_ID: payload.Parent_Job_ID || null,
      Default_Role: payload.Default_Role || UserRole.TEACHER,
      Department: payload.Department || ''
    });
    return true;
  }, [store, validateJobTitle]);

  const updateJobTitleRecord = useCallback((id: string, payload: Partial<JobTitle>) => {
    const error = validateJobTitle(payload);
    if (error) {
      alert(error);
      return false;
    }

    store.updateJobTitle(id, {
      Title_Ar: payload.Title_Ar || '',
      Title_En: payload.Title_En || '',
      Department: payload.Department || '',
      Parent_Job_ID: payload.Parent_Job_ID || null,
      Default_Role: payload.Default_Role || UserRole.TEACHER
    });
    return true;
  }, [store, validateJobTitle]);

  const removeJobTitle = useCallback((id: string) => {
    if (store.checkIntegrity?.isJobUsed?.(id)) {
      alert('لا يمكن حذف المسمى الوظيفي لأنه مستخدم');
      return false;
    }

    store.deleteJobTitle(id);
    return true;
  }, [store]);

  return {
    jobTitles,
    createJobTitle,
    updateJobTitleRecord,
    removeJobTitle
  };
};

export default useJobTitles;
