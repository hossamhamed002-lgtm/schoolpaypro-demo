import { Employee } from '../../../types';

interface UseEmployeesResult {
  employees: Employee[];
}

const useEmployees = (store: any): UseEmployeesResult => {
  const employees: Employee[] = store.employees || [];

  return {
    employees
  };
};

export default useEmployees;
