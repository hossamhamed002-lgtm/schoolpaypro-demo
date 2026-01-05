import type { AppMetaState } from '../storage/appMeta';

export type InitialRoute = 'programmer' | 'activation' | 'gateway' | 'login';

type ResolveArgs = {
  appMeta: AppMetaState;
  isProgrammer: boolean;
  hasUser: boolean;
  hasActiveSchool: boolean;
  requiresActivation: boolean;
  gatewayEligible: boolean;
};

export const resolveInitialRoute = ({
  appMeta,
  isProgrammer,
  hasUser,
  hasActiveSchool,
  requiresActivation,
  gatewayEligible
}: ResolveArgs): InitialRoute => {
  if (hasUser || hasActiveSchool) return 'login';
  if (isProgrammer || appMeta.lastEntry === 'programmer') return 'programmer';
  if (requiresActivation || appMeta.lastEntry === 'activation') return 'activation';
  if (gatewayEligible || appMeta.lastEntry === 'gateway') return 'gateway';
  return 'login';
};
