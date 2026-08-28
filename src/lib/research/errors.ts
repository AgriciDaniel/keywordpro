/*
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Typed research errors.
 *
 * Deliberately free of `server-only` so pure logic (and verification scripts)
 * can import them outside the Next runtime. Consumers match on `error.name`,
 * which survives serialisation across the API boundary - see
 * `src/app/api/v1/research/run/route.ts` and
 * `src/components/research-console/research-run-errors.ts`.
 */

export class UnknownEndpointError extends Error {
  constructor(type: string) {
    super(`Unknown research endpoint: ${type}`);
    this.name = 'UnknownEndpointError';
  }
}

export class MissingRequiredParamError extends Error {
  constructor(
    public readonly type: string,
    public readonly param: string,
  ) {
    super(`Missing required parameter "${param}" for ${type}`);
    this.name = 'MissingRequiredParamError';
  }
}

export class ResearchInsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResearchInsufficientCreditsError';
  }
}

export class AuthError extends Error {
  constructor(message = 'Provider authentication failed.') {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Provider rate limit exceeded.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TransientError extends Error {
  constructor(message = 'Provider temporarily unavailable.') {
    super(message);
    this.name = 'TransientError';
  }
}

export class UserError extends Error {
  constructor(message = 'Provider rejected the request.') {
    super(message);
    this.name = 'UserError';
  }
}
