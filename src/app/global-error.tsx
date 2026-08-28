'use client';



/**
 * Global Error Boundary
 *
 * This catches errors at the root level (outside of the locale layout).
 * Note: i18n is not available at this level, so we use plain English text.
 *
 * Displays `error.digest`, Next.js's built-in server-error correlation id, so
 * a reported bug maps to an exact line in the local server log.
 *
 * https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1rem',
            fontFamily: 'system-ui, sans-serif',
            padding: '1rem',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Something went wrong!
          </h1>
          <p style={{ color: '#666' }}>An unexpected error occurred.</p>
          {error.digest ? (
            <p
              style={{
                color: '#999',
                fontSize: '0.85rem',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              Reference: <span data-testid="error-digest">{error.digest}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
