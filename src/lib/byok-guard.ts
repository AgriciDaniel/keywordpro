export const BYOK_KEYS_REQUIRED_CODE = 'BYOK_KEYS_REQUIRED';
const BYOK_KEYS_REQUIRED_PREFIX = `[${BYOK_KEYS_REQUIRED_CODE}]`;

export type ByokProvider = 'dataforseo';

export class ByokKeysRequiredError extends Error {
  readonly code = BYOK_KEYS_REQUIRED_CODE;

  constructor(
    public readonly provider: ByokProvider,
    public readonly missing: string[],
    message: string,
  ) {
    super(message);
    this.name = 'ByokKeysRequiredError';
  }
}

/**
 * @deprecated Use ByokKeysRequiredError for server-side control flow. This
 * string marker remains exported for one release cycle for older callers.
 */
export function formatByokKeysRequiredMessage(message: string): string {
  return `${BYOK_KEYS_REQUIRED_PREFIX} ${message}`;
}

/**
 * @deprecated Use `error instanceof ByokKeysRequiredError` on the server.
 */
export function isByokKeysRequiredMessage(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    message.includes(BYOK_KEYS_REQUIRED_CODE) ||
    normalized.includes('dataforseo credentials required')
  );
}

/**
 * @deprecated Use ByokKeysRequiredError.message on the server.
 */
export function stripByokKeysRequiredMessage(message: string): string {
  return message.replace(BYOK_KEYS_REQUIRED_PREFIX, '').trim();
}

export function emitByokKeysRequired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('keyword-pro:byok-required'));
}

export function handleByokKeysRequiredMessage(
  message?: string | null,
  onStrip?: (sanitized: string) => void
): void {
  if (!message || !isByokKeysRequiredMessage(message)) return;
  const sanitized = stripByokKeysRequiredMessage(message);
  if (onStrip && sanitized !== message) {
    onStrip(sanitized);
  }
  emitByokKeysRequired();
}
