export type NodeCrypto = typeof import('crypto');
export type NodeFs = typeof import('fs');
export type NodeOs = typeof import('os');
export type NodePath = typeof import('path');

export const isNodeRuntime = typeof process !== 'undefined' && !!(process as any)?.versions?.node;

const safeRequire = <T = any>(id: string): T | null => {
  try {
    const req = typeof require !== 'undefined' ? require : (0, eval)('require');
    if (req) return req(id) as T;
  } catch {
    // ignore; runtime likely not node
  }
  return null;
};

export const getNodeCrypto = () => safeRequire<NodeCrypto>('crypto');
export const getNodeFs = () => safeRequire<NodeFs>('fs');
export const getNodeOs = () => safeRequire<NodeOs>('os');
export const getNodePath = () => safeRequire<NodePath>('path');
