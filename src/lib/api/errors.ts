/**
 * Keyword Pro API v1 - structured error responses.
 *
 * Every error response follows the same shape:
 * { error: { code, message, requestId } }
 *
 * Error codes are stable strings that API consumers can match on.
 * Messages are human-readable and may change between versions.
 */

export type ApiErrorCode =
  | 'INVALID_API_KEY'
  | 'API_KEY_REVOKED'
  | 'RATE_LIMITED'
  | 'CREDITS_DEPLETED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PIPELINE_ALREADY_RUNNING'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, requestId } },
      {
        status: error.statusCode,
        headers: { 'x-request-id': requestId },
      },
    );
  }

  // Unexpected errors: don't leak internals
  return Response.json(
    { error: { code: 'INTERNAL_ERROR' as const, message: 'An internal error occurred', requestId } },
    {
      status: 500,
      headers: { 'x-request-id': requestId },
    },
  );
}
