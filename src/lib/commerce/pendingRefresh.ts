/*
 * How many times a return page checks again for a purchase the webhook has
 * not recorded yet, before it offers a manual refresh instead.
 *
 * A plain module on purpose. The onboarding and deposit pages compare their
 * attempt count against this while rendering on the server, and
 * PendingRefresh.jsx, which reads it too, is a 'use client' module. Every
 * export of a 'use client' module reaches a server component as a client
 * reference -- a function, not the value -- and a number compared with a
 * function is always false. Exported from there, this bound silently kept
 * the automatic re-check from ever rendering, on both pages.
 */
export const MAX_ATTEMPTS = 6
