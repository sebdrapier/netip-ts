# Contributing

```sh
bun install
bun test          # unit + golden tests
bun run typecheck
bun run build
```

The reference is Go's `net/netip`. If you find an input where netip-ts behaves differently from Go:

1. Add it to the lists in `test/golden/main.go`.
2. Run `bun run golden` (requires Go) to regenerate `test/golden.json`.
3. Fix `src/index.ts` until `bun test` passes.

Features that go beyond Go's API should stay small and need a good reason.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately, see [SECURITY.md](SECURITY.md).
