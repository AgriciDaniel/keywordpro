# Security policy

## Supported version

No version has been released. The latest commit on `main` is the only supported
private-development version until a tagged release is published.

## Reporting a vulnerability

Use the repository's private GitHub Security Advisory form. Do not disclose a
suspected vulnerability in a regular issue, discussion, screenshot, or public
channel.

Include a concise impact description, reproduction steps, and affected commit.
Remove all API credentials, encryption keys, personal data, and paid provider
response bodies from the report.

## Secrets and local data

- Keep DataForSEO credentials in `.env` or the encrypted Connections store.
- Keep the encryption key in `.env` or a private file referenced by
  `KEYWORD_PRO_ENCRYPTION_KEY_FILE`.
- Use a unique 32-byte base64 `KEYWORD_PRO_ENCRYPTION_KEY` for each environment.
- For rotation, use named 32-byte keys in `KEYWORD_PRO_ENCRYPTION_KEYS` and set
  `KEYWORD_PRO_ENCRYPTION_KEY_ACTIVE` to the current write key.
- Legacy encryption aliases are read only for private-preview compatibility.
  Startup stops if canonical and legacy values disagree.
- Never reuse the CI placeholder key outside CI.
- Treat saved reports and exported provider responses as private data.
- Keep legacy compatibility exports outside the repository. They contain cached
  provider responses and retained encrypted credential values even though the
  export command never decrypts them.
- Rotate credentials immediately if they appear in logs or screenshots.
- The documented startup command rejects malformed database TLS settings and
  encryption-key material before opening the application port.

## Network boundary

Keyword Pro is designed for one user on one machine and binds to `127.0.0.1` by
default. Direct LAN or internet exposure is unsupported without authentication,
trusted secret management, shared rate limiting, privacy-safe observability,
and a deployment-specific threat review.

Set `DATABASE_SSL_MODE=disable` only for the bundled loopback PostgreSQL
service. Use `DATABASE_SSL_MODE=require` for a hosted database that supports
TLS.
