# Third-party notices

## Noto fonts

Keyword Pro bundles Noto Sans, Noto Sans Mono, and Noto Serif font files under
`src/assets/fonts`.

Copyright 2015 Google LLC. All Rights Reserved.

The font software is licensed under the SIL Open Font License, Version 1.1.
The full license text is available at [`src/assets/fonts/OFL.txt`](src/assets/fonts/OFL.txt).

This notice covers the bundled font files only. It does not grant a license for
Keyword Pro source code or clear third-party provider response data.

## Synthetic fixtures

Files under `scripts/fixtures/dataforseo` are generated entirely from
repository-owned synthetic values. They model documented field shapes for
interoperability testing and do not contain captured provider responses or
search results. Run `pnpm --ignore-workspace verify:fixture-provenance` to
confirm their bytes match the checked-in generator.

## Service names

DataForSEO names and marks belong to their respective owner. Keyword Pro uses
the name only to describe compatibility with the service. The project is not
affiliated with or endorsed by DataForSEO.

## Installed package licenses

The source archive does not vendor `node_modules`. A frozen production install
currently resolves 196 package license records with no unknown or unlicensed
entry. Most are MIT, ISC, Apache-2.0, BSD-3-Clause, 0BSD, or Unlicense.

The remaining records include `caniuse-lite` data under CC BY 4.0,
`@img/sharp-libvips-linux-x64` and
`@img/sharp-libvips-linuxmusl-x64` under LGPL-3.0-or-later, and `dompurify`
under its Apache-2.0 or MPL-2.0 choice. Their package distributions retain the
applicable license material. Anyone distributing a built bundle, container, or
preinstalled dependency tree must preserve the notices and source-availability
obligations that apply to that artifact.

Run `pnpm --ignore-workspace licenses list --prod` after dependency changes and
review the result before publishing a new archive or binary distribution.
