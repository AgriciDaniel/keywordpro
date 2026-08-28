# Releasing Keyword Pro

Keyword Pro has no published release. A green build is necessary, but it does
not by itself authorize a tag, GitHub Release, license, or visibility change.

## Current release gates

- [x] Apply Apache License 2.0 in the root license, package metadata,
      contribution terms, README, and release documentation.
- [x] Replace captured provider-response fixtures with deterministic synthetic
      contract fixtures and enforce byte-for-byte regeneration in CI.
- [x] Replace report screenshots with actual application captures backed only
      by synthetic demo data.
- [x] Build and verify a one-commit clean-history projection whose commit uses
      only the project-safe `.invalid` identity.
- [ ] Obtain owner approval for the remote cutover strategy. Do not make the
      existing private history public in place.
- [x] Remove non-keyword provider and source-product execution code from the
      distributed source.
- [x] Add a transactional, data-preserving migration from private-preview
      database names to canonical Keyword Pro names.
- [x] Add count-only legacy inventory and an opt-in, no-overwrite private export
      that never decrypts retained values.
- [x] Record the release owner's count-only inventory: zero saved sessions,
      opportunities, credential rows, and configured legacy values. No export
      or deletion action is required for the inspected local database.
- [x] Complete clean-clone, production, and visible-browser acceptance on the
      release-candidate source tree.
- [ ] Complete the owner-approved paid run, or record the owner's explicit
      decision to release without that proof.

Do not create an RC tag while any item above remains open.

## Prepare a candidate

- [x] Create one release branch from the latest protected `main`.
- [x] Set `package.json` to the intended prerelease version.
- [x] Move shipped changelog entries from `Unreleased` to that version and date.
- [x] Finalize `docs/releases/v1.0.0.md` from evidence on the candidate.
- [x] Confirm `.env`, build output, database data, logs, live exports, and local
      agent state are absent from the tracked tree.
- [x] Confirm all screenshots under `public/images/screenshots` are clean and
      cleared for redistribution.
- [x] Run `pnpm --ignore-workspace verify:screenshot-provenance` and confirm
      the reviewed image inventory, dimensions, metadata, and hashes match.
- [x] Run `pnpm --ignore-workspace verify:fixture-provenance` and confirm every
      contract fixture is reproducible from repository-owned source.
- [x] Inventory bundled dependency and asset licenses, including Noto fonts.
- [x] Confirm the source archive includes `LICENSE` and all required
      third-party notices.

Build a clean-history candidate only from a committed, clean tree. The command
refuses existing destinations and any destination inside the source repository:

```bash
pnpm --ignore-workspace public:candidate -- \
  --output ../keyword-pro-public-candidate \
  --archive ../keyword-pro-public-source.tar.gz
pnpm --ignore-workspace verify:public-candidate -- \
  --candidate ../keyword-pro-public-candidate \
  --archive ../keyword-pro-public-source.tar.gz
```

The candidate has one commit under a project-owned `.invalid` identity, no
remote, and the exact same Git tree as the reviewed private source commit. It
does not authorize a force-push, remote replacement, tag, visibility change, or
release publication.

## Candidate verification

- [x] `pnpm install --frozen-lockfile --ignore-workspace`
- [x] `pnpm --ignore-workspace run ci`
- [x] `pnpm --ignore-workspace audit --audit-level low`
- [x] `bash -n dev-up.sh`
- [ ] Run ShellCheck when available. It was not installed on the release host.
- [x] Validate `compose.yml` with Podman 5.8.2 and podman-compose 1.6.0.
- [x] Scan tracked files, the clean candidate history, image metadata, and the release
      archive for secrets, personal emails, and absolute local paths.
- [x] Follow only the README from a clean clone and initialize a fresh database.
- [x] Run `pnpm --ignore-workspace db:migrate` twice and verify the second run is
      a no-op.
- [x] Run `pnpm --ignore-workspace legacy:inventory` and confirm its console
      output contains counts only.
- [ ] If the owner chooses export, write it outside the repository, verify mode
      `0600` and the reported checksum, then keep it out of release artifacts.
- [x] Verify development and production servers bind only to loopback.
- [x] Verify `/keyword-pro`, Connections, and `/api/health` return `200`.
- [ ] Verify an anonymous visitor can reach the private security and Code of
      Conduct reporting channels without disclosing a report publicly.
- [x] Verify retired and non-keyword routes fail before any provider call.
- [x] Check all 94 markets, the complete 46-language catalog, valid pair repair,
      and market-aware report-source counts.
- [x] Check desktop and narrow layouts, select chevrons, chart resizing, empty
      states, community links, and the browser console in a visible browser.
- [ ] With explicit spending approval, run one guided report and record the
      displayed estimate, actual cost, source count, saved reopen, and exports.

## Tag and prerelease

1. Merge the candidate through the protected branch after every required check
   passes.
2. Record the exact `main` commit and successful workflow run.
3. Create an annotated, immutable tag such as `v1.0.0-rc.1` on that commit.
4. Push the tag and wait for tag-triggered CI to pass.
5. Publish a GitHub prerelease titled `Keyword Pro v1.0.0-rc.1` using the
   reviewed release notes.
6. Install and test that exact tag. Fixes produce `rc.2`; never move an existing
   tag.

## Final v1.0.0

1. Confirm the package version, changelog version, annotated tag, release
   target, and verified source archive all resolve to the same commit.
2. Create a draft GitHub Release and inspect the generated source archives.
3. Obtain explicit owner approval for the final tag, release publication, and
   repository visibility.
4. Make the repository public only after the license and distribution gates are
   closed.
5. Enable and verify GitHub secret scanning, push protection, code scanning,
   and private vulnerability reporting where the account supports them.
6. Publish the release and verify anonymous README, license, release-note,
   archive, and clone access.
7. Reconfirm branch protection and security settings after the visibility
   change.

## Rollback

Keep releases immutable. Before publication, edit or discard the draft. After
publication, revert the release commit or publish a fixed follow-up version.
Do not rewrite a published tag to make an artifact appear unchanged.
