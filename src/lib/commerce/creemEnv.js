/*
 * Which Creem the site is talking to.
 *
 * Creem's test mode is a separate world: its own keys, products and
 * webhooks. This site has one database for local and production, so a kit
 * carries two product ids, the live one and the sandbox one, and this switch
 * decides which the page uses and which world a recorded purchase belongs
 * to. It mirrors `whopEnv.ts`.
 *
 * NEXT_PUBLIC_CREEM_ENV is what a client component can see (inlined at
 * build); CREEM_ENV is the server's. Set both the same. Unset means
 * production, so a forgotten variable can never point real customers at the
 * sandbox.
 *
 * Imported by client components and the engine test project: no server
 * imports.
 */

/** @typedef {'production' | 'sandbox'} CreemEnvironment */

/** @returns {CreemEnvironment} */
export function creemEnvironment() {
  const raw = process.env.NEXT_PUBLIC_CREEM_ENV || process.env.CREEM_ENV
  return raw === 'sandbox' ? 'sandbox' : 'production'
}

/** The product an item is bought through in this environment. */
export function creemProductIdFor(item, env = creemEnvironment()) {
  if (!item) return null
  const id =
    env === 'sandbox' ? item.creemSandboxProductId : item.creemProductId
  return id || null
}

/** The product that upgrades to this item in this environment. */
export function creemUpgradeProductIdFor(item, env = creemEnvironment()) {
  if (!item) return null
  const id =
    env === 'sandbox'
      ? item.creemUpgradeSandboxProductId
      : item.creemUpgradeProductId
  return id || null
}
