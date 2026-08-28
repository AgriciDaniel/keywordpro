# Changelog

All notable changes to Keyword Pro will be documented here.

The format follows Keep a Changelog. Versions use semantic versioning.

## Unreleased

No changes yet.

## [1.0.0-rc.1] - 2026-08-28

### Added

- Apache License 2.0 project licensing and package metadata.
- Project-specific code of conduct, support, and governance guidance.
- Standalone keyword research console and saved reports.
- Guided keyword report with up to 19 calls and advanced keyword endpoints.
- DataForSEO credential management and local encrypted storage.
- Free and Pro AI Marketing Hub community links.
- Complete 94-market and 46-language guided-report catalog with visible
  country-language compatibility.
- GitHub release-note categories and tag-triggered verification.
- Transactional database migration for fresh installs and private-preview
  compatibility.
- Count-only legacy-data inventory and an explicit mode `0600` compatibility
  export that refuses repository paths and existing files.
- Deterministic synthetic demo reports and hash-verified application
  screenshots for public documentation.
- A guarded clean-history public candidate and source-archive builder.
- A repository-safety gate for private paths, local paths, personal email,
  unsafe symlinks, and common credential markers.

### Changed

- Captured provider responses are replaced by deterministic synthetic contract
  fixtures with byte-for-byte regeneration checks.
- README screenshots now come from the real application using synthetic data,
  with fixed inventory, dimensions, metadata, and SHA-256 checks.
- Targeting selects reserve a dedicated lane for their chevrons.
- Dormant website and social dashboards are no longer part of the shipped
  browser surface.
- Guided reports now omit unsupported Bing and Amazon calls for the selected
  market and language.
- Advanced runs now expose every locale field used by their executable request
  and validate product-wide, Labs, and Bing family-specific targeting before a
  provider call.
- Endpoint receipts distinguish returned data, empty responses, and failures.
- Canonical Keyword Pro encryption keyring variables replace source-era names,
  with temporary conflict-detecting aliases for existing local ciphertext.
- Database tables, indexes, checks, and foreign keys use canonical Keyword Pro
  names without rewriting saved reports or encrypted credential bytes.

### Fixed

- Quoted the default local-user name so `.env.example` can be sourced safely.
- Bound development and production servers to loopback by default.
- Made database TLS an explicit setting so a local production build can use
  the bundled PostgreSQL service without an invalid forced-TLS connection.
- Gave Keyword Pro dedicated local PostgreSQL and Redis ports so it can run
  beside other local applications without sharing or blocking their services.
- Removed the default-locale redirect loop from application routes.
- Made the local-user seed command load `.env` before opening the database.
- Made the documented production startup validate database TLS mode and
  encryption-key material before opening the application port.
- Corrected the contributor setup guide to use the shipped `db:migrate`
  command instead of a nonexistent `db:push` command.
- Removed the framework-identification response header and restricted the
  production browser connection policy to the local application origin.
- Denied framing and unused browser camera, microphone, and geolocation access.

### Security

- Non-keyword API requests are rejected before credentials or providers are
  reached.
- Startup rejects conflicting canonical and legacy encryption settings instead
  of silently choosing one.
- Encryption keys can be read from a private file without copying the secret
  into the repository directory.
