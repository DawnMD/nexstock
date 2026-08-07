/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from "next";
import "./env";

const nextConfig: NextConfig = {
  // Auto-memoize components and hooks so re-renders skip unchanged subtrees without
  // hand-written `useMemo`/`useCallback`/`memo`. The matching lint rules already ship
  // with `eslint-plugin-react-hooks` v7 via `eslint-config-next`.
  reactCompiler: true,
  experimental: {
    // `typescript` resolves to the TS 6 API package so typescript-eslint can run (see
    // package.json). That package ships a `tsc6` bin rather than `tsc`, so Next has no
    // CLI to shell out to — type-check through the TypeScript API instead. `pnpm
    // typecheck` still runs the native TS 7 `tsc`.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
