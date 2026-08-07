/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from "next";
import "./env";

const nextConfig: NextConfig = {
  experimental: {
    // `typescript` resolves to the TS 6 API package so typescript-eslint can run (see
    // package.json). That package ships a `tsc6` bin rather than `tsc`, so Next has no
    // CLI to shell out to — type-check through the TypeScript API instead. `pnpm
    // typecheck` still runs the native TS 7 `tsc`.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
