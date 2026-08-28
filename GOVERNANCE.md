# Governance

Keyword Pro uses maintainer-led governance. The repository owner is the final
decision maker for scope, security boundaries, licensing, releases, and
repository administration.

## Roles

### Maintainer

The maintainer reviews issues and pull requests, protects the keyword-only
product boundary, decides the release sequence, and may accept, request
changes, defer, or decline a proposal. Maintainer access does not remove the
need for documented verification or the release gates in
[`docs/RELEASING.md`](docs/RELEASING.md).

### Contributor

Anyone may propose a focused issue or pull request. A contribution becomes part
of the project only after review and merge. Contributions are licensed under
the [Apache License 2.0](LICENSE).

### Security reporter

Anyone may report a suspected vulnerability through the private process in
[`SECURITY.md`](SECURITY.md). Security reports are handled separately from
public feature and support discussions.

## Decisions

- Product decisions favor a small, inspectable, local-first keyword research
  application over a broad hosted platform.
- Paid provider behavior must be separated from offline verification. Spending
  requires explicit approval from the connected account owner.
- Security, privacy, data provenance, and release identity are blocking gates,
  not documentation cleanups that can be deferred after publication.
- Material changes should be proposed through an issue or pull request with the
  user impact, alternatives considered, verification evidence, and rollback
  path.
- The maintainer may close a proposal that expands beyond keyword research,
  weakens local data protection, or makes claims the available evidence cannot
  support.

## Releases

Only the repository owner may authorize a release tag, GitHub Release,
repository visibility change, paid acceptance run, or history rewrite. A green
CI run is required evidence, but is not authorization by itself. Release
criteria and rollback rules are maintained in
[`docs/RELEASING.md`](docs/RELEASING.md).

## Conduct and conflicts

Participation is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
Technical disagreements should be resolved from reproducible evidence and the
documented product boundary. The maintainer records material unresolved risk in
the pull request or release notes rather than hiding it to obtain a pass.
