# Learned Lessons

- Zod v4 uses `zod/v4` import path, not `zod`
- `z.record()` with enum keys requires all keys to have values; use `z.object()` with optional fields for partial attribute bonus schemas
- Relative imports in deeply nested directories (e.g., `data/schemas` to `core/types`) need correct `../../` path depth - path aliases only work in test/bundler config, not in raw TS resolution
- TypeScript `tsconfig.json` with `references` requires `composite: true` in the referenced config; simpler to remove references if not using project references feature
- Keep Core Layer pure (no React/DOM dependency) to enable easy unit testing; all 134 core tests run in <1s
- Zustand store should sync state after every game action by calling `syncState()` to keep React components in sync with the imperative Core layer
- Electron main process files should use CommonJS (`.js`) since Electron main process doesn't support ESM by default
- When testing settlement systems, use fixed seeds for reproducibility but still test against valid result ranges rather than exact values
