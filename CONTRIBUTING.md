# Contributing to Keyword Pro

Keyword Pro is currently unreleased. Keep changes small, reviewable, and
limited to keyword research workflows.

## Local setup

1. Copy `.env.example` to `.env`.
2. Generate a fresh value with `openssl rand -base64 32` and save it as
   `KEYWORD_PRO_ENCRYPTION_KEY`.
3. Run `pnpm install --frozen-lockfile --ignore-workspace`.
4. Run `./dev-up.sh`.
5. Initialize the database with `pnpm --ignore-workspace db:migrate` and
   `pnpm --ignore-workspace seed`.

Never commit `.env`, API credentials, provider responses, database dumps, or
live research exports.

## Before opening a pull request

Run:

```bash
pnpm --ignore-workspace run ci
```

Record any skipped check or pre-existing failure. Visual changes require a
visible-browser check. Live DataForSEO calls cost money and require explicit
approval before testing.

Do not add a tag, GitHub Release, or repository-visibility change in a pull
request without the owner's explicit approval. Follow
[`docs/RELEASING.md`](docs/RELEASING.md) for release evidence and identity
checks.

## Commit style

Use Conventional Commits, for example:

```text
fix(targeting): reserve space for select chevrons
feat(community): add free and pro community links
```

Keep credentials, personal email addresses, and local absolute paths out of
commit messages.

## License and contributions

By contributing, you agree that your contributions will be licensed under the
repository's [Apache License 2.0](LICENSE).
