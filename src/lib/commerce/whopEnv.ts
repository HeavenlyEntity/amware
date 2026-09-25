/*
 * Which Whop the site is talking to.
 *
 * Whop's sandbox is a separate world: its own account, keys, plans and
 * webhooks, on sandbox-api.whop.com, with test cards. This site has one
 * database for local and production, so a service carries two plan ids --
 * the live one and the sandbox one -- and this switch decides which the
 * page uses, which API host the setup talks to, and which world a recorded
 * payment belongs to.
 *
 * NEXT_PUBLIC_WHOP_ENV is what a client component can see (inlined at
 * build); WHOP_ENV is the server's. Set both the same. Unset means
 * production, so a forgotten variable can never point real customers at
 * the sandbox.
 */
export type WhopEnvironment = 'production' | 'sandbox'

export function whopEnvironment(): WhopEnvironment {
  const raw = process.env.NEXT_PUBLIC_WHOP_ENV || process.env.WHOP_ENV
  return raw === 'sandbox' ? 'sandbox' : 'production'
}

export function isWhopSandbox(): boolean {
  return whopEnvironment() === 'sandbox'
}

/** The plan an item is bought through in this environment. */
export function planId(
  item:
    | {
        whopPlanId?: string | null
        whopSandboxPlanId?: string | null
      }
    | null
    | undefined,
  env: WhopEnvironment = whopEnvironment()
): string | null {
  if (!item) return null
  const id = env === 'sandbox' ? item.whopSandboxPlanId : item.whopPlanId
  return id || null
}

/* Kept as its own name rather than folded into planId at the call sites.
   The deposit flow is the one part of commerce already carrying real
   traffic, and renaming its helper would put a diff through code this
   migration is supposed to leave alone. */
export const depositPlanId = planId
