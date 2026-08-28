# Synthetic DataForSEO contract fixtures

These files are deterministic synthetic payloads used by the offline
verification suite. They exercise provider-compatible response shapes without
copying a captured API response, search result, account export, or credential.

Generate them from repository-owned source:

```bash
pnpm --ignore-workspace generate:fixtures
pnpm --ignore-workspace verify:fixture-provenance
```

Every domain uses the reserved `.invalid` suffix, monetary cost is zero, and
identifiers are explicitly synthetic. The check command regenerates expected
bytes in memory and fails if a committed fixture drifts.

Do not replace these files with raw account exports or captured provider
responses. A live provider run is a separate, owner-approved acceptance gate.
