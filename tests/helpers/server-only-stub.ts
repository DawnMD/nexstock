/**
 * Stand-in for the `server-only` package.
 *
 * That package resolves to a module that throws unless the `react-server`
 * export condition is set. Next sets it; Vitest does not, and setting
 * `resolve.conditions` does not reach the dependency-optimisation path — so the
 * import blows up before any test runs. The guard exists to keep secrets out of
 * the *client bundle*, and these tests have no client bundle, so aliasing it
 * away here removes nothing real.
 */
export {};
