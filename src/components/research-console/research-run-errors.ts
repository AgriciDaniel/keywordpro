'use client';

export type ResearchRunErrorInput = {
  code?: string;
  message?: string;
  issues?: unknown;
};

export type ResearchRunErrorIcon =
  | 'auth'
  | 'generic'
  | 'rate'
  | 'transient'
  | 'validation';

export type ResearchRunErrorDisplay = {
  icon: ResearchRunErrorIcon;
  message: string;
  href?: string;
};

export function formatResearchRunError(
  error?: ResearchRunErrorInput | null,
): ResearchRunErrorDisplay {
  const code = error?.code ?? '';

  if (code === 'VALIDATION_ERROR') {
    return { icon: 'validation', message: 'Check the highlighted fields' };
  }

  if (code === 'MissingRequiredParamError') {
    return {
      icon: 'validation',
      message: `Fill: ${extractMissingParam(error?.message) ?? 'required fields'}`,
    };
  }

  if (code === 'UnknownEndpointError') {
    return { icon: 'validation', message: 'Endpoint not available' };
  }

  if (code === 'MODULE_NOT_FOUND') {
    return { icon: 'validation', message: 'Module not available' };
  }

  if (code === 'AuthError' || code === 'BYOK_KEYS_REQUIRED') {
    return {
      icon: 'auth',
      message: 'Check your DFS/SC keys',
      href: '/settings/api-credentials',
    };
  }

  if (code === 'RateLimitError' || code === 'RATE_LIMITED') {
    return { icon: 'rate', message: 'Rate limited. Retry in a moment.' };
  }

  if (code === 'TransientError') {
    return {
      icon: 'transient',
      // The route appends what the provider actually said, when it said anything.
      message: error?.message?.startsWith('Provider temporarily unavailable')
        ? error.message
        : 'Provider temporarily unavailable',
    };
  }

  if (code === 'MODULE_RUN_IN_PROGRESS') {
    return { icon: 'transient', message: 'Module already running' };
  }

  if (code === 'IDEMPOTENCY_IN_PROGRESS') {
    return { icon: 'transient', message: 'Request already running' };
  }

  if (code === 'MODULE_ALL_ENDPOINTS_FAILED') {
    return { icon: 'transient', message: 'Research sources failed' };
  }

  if (code === 'UserError' && error?.message) {
    return { icon: 'validation', message: error.message };
  }

  return { icon: 'generic', message: 'Something went wrong. Try again.' };
}

function extractMissingParam(message?: string): string | null {
  if (!message) return null;
  const quoted = message.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  const fillPrefix = message.match(/Fill:\s*(.+)$/i);
  return fillPrefix?.[1]?.trim() || null;
}
