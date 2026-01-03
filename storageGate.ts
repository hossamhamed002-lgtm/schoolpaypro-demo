export const isAuthenticated = (currentUser?: any, schoolCode?: string) =>
  Boolean(currentUser) && Boolean((schoolCode || '').trim());

const moduleKey = (moduleName: string) => `MODULE_ACTIVE__${moduleName}`;

export const setModuleActive = (moduleName: string, active: boolean) => {
  if (typeof window === 'undefined') return;
  const key = moduleKey(moduleName);
  if (active) {
    sessionStorage.setItem(key, 'true');
  } else {
    sessionStorage.removeItem(key);
  }
};

export const isModuleActive = (moduleName: string) =>
  typeof window !== 'undefined' && sessionStorage.getItem(moduleKey(moduleName)) === 'true';
