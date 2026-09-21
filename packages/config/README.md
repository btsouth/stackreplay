# @stackreplay/config

Shared TypeScript configuration. Every workspace package extends one of these:

- `tsconfig.base.json` — strict baseline (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax). No emit.
- `tsconfig.react.json` — browser + JSX (`react-jsx`) for React component packages.
- `tsconfig.node.json` — Node.js runtime packages (ESM, NodeNext resolution).

Packages that emit build output add their own `tsconfig.build.json` that extends their local
`tsconfig.json` and sets `noEmit: false`, `outDir: "dist"` and `rootDir: "src"`.

Usage:

```json
{
  "extends": "@stackreplay/config/tsconfig.node.json",
  "include": ["src"]
}
```
