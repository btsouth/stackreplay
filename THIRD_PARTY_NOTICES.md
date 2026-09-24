# Third-party licensing

StackReplay source is AGPL-3.0-or-later. Dependencies retain their own licenses; using a
library does not replace its license with StackReplay's. This source repository does not
vendor node_modules, native binaries, or font binaries.

The 2026-09-21 audit inspected the installed lockfile with `pnpm licenses list --json`,
package license texts and native-library notices. No incompatibility with the selected
AGPL license was identified. Recheck the lockfile when dependencies change.

| Dependency | License / obligation when redistributed |
| --- | --- |
| Geist fonts | SIL OFL 1.1. Preserve copyright and license with distributed fonts. The complete upstream text is served at `/licenses/geist.txt` and stored in [apps/web/public/licenses/geist.txt](apps/web/public/licenses/geist.txt). Fonts remain OFL; application source remains AGPL. Subsets of Geist Medium and Geist Mono Regular (Latin characters only) are embedded in `apps/web/lib/og-fonts.ts` for the share image; Geist declares no Reserved Font Name. Observe reserved-name restrictions when modifying fonts. |
| sharp / prebuilt libvips | sharp is Apache-2.0; the `@img/sharp-libvips-*` bundles include LGPL-3.0-or-later and other components. Their README contains a component-by-component license inventory. Distributing a server image or native bundle requires the applicable notices, corresponding library source and LGPL relinking/replacement rights. Do not treat the npm package's single SPDX label as the entire native dependency inventory. |
| Lightning CSS and axe-core | MPL-2.0. Preserve MPL notices and make the covered source, including any changes to covered files, available when distributing covered executable code. This is file-level copyleft, not automatic relicensing of the application. axe-core is used for testing. |
| caniuse-lite data | CC-BY-4.0. Preserve attribution and indicate changes if redistributing the dataset. It is a build-tool dependency; referencing it does not by itself license StackReplay code as CC-BY. |
| Base UI 1.0.0-rc.0 | MIT. Retain its copyright and permission notice with redistributed code. The isolated M0 drawer dependency introduces no special license incompatibility. |
| Other JS/build dependencies | Predominantly MIT, Apache-2.0, ISC and BSD variants. Retain applicable license/copyright notices; preserve Apache NOTICE files where supplied. |

This document records obligations and is not a substitute for the upstream licenses.
Source publication and distribution of a built application/container/npm package are different
release artifacts. The private workspace packages are not prepared for npm publication: their
pack smoke test verifies dependency resolution and bundled data, not a complete binary/source
license distribution. Before distributing those artifacts, include the relevant license texts,
source and notices. Preserve StackReplay's AGPL corresponding-source obligations as well.

Upstream guidance: [GNU license compatibility](https://www.gnu.org/licenses/license-compatibility.en.html),
[Mozilla MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/),
[SIL OFL FAQ](https://openfontlicense.org/ofl-faq/).
