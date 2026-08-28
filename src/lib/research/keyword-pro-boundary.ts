import { getEndpointByType } from '@/lib/research/endpoint-catalog';

export const KEYWORD_PRO_MODULE_ID = 'K1';

/**
 * One admission rule shared by the UI-facing API and offline verification.
 * Unknown, Website, Social, and Commerce endpoints fail closed.
 */
export function isKeywordProEndpoint(endpointId: string): boolean {
  return getEndpointByType(endpointId)?.mode === 'keyword';
}

export function isKeywordProModule(moduleId: string): boolean {
  return moduleId === KEYWORD_PRO_MODULE_ID;
}
