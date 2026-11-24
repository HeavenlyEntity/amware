/* What a deposit promises, by the service it is for. The retainers credit
   the deposit against the first month; the Codebase Diagnostic has no
   month to credit it against, so its deposit is refunded in full if the
   read ends in "I can’t help". One function, so the sheet, the return page
   and the receipt email cannot disagree. Plain module: the engine project
   tests it, and server and client code both import it.

   The return page's links live here too. /services leaves the Diagnostic
   out, so its buyer is sent back to the Diagnostic's own pages; retryLine
   finishes "try again …" in both of that page's sentences. */

export const DIAGNOSTIC_SLUG = 'codebase-diagnostic'

const RETAINER = {
  sheetTitle: 'Reserve your start',
  sheetLine: (amountLabel, serviceName) =>
    `${amountLabel} deposit for ${serviceName}, credited in full against your first month.`,
  reservedTitle: 'Your start is reserved.',
  reservedWithCall:
    'The deposit is credited in full against your first month. A receipt is on its way — one thing left: pick a time for the intro call.',
  reservedWithoutCall:
    'The deposit is credited in full against your first month. A receipt is on its way, and I will be in touch within one business day to set the engagement up.',
  emailLine:
    'It is credited in full against your first month, so it is a start date, not an extra cost.',
  emailNoun: ' engagement',
  emailClosing: 'set the engagement up',
  retryHref: '/services',
  retryLine: 'from the engagement you chose',
  backHref: '/services',
  backLabel: 'Back to engagements',
}

const DIAGNOSTIC_RESERVED =
  'A receipt is on its way. I will be in touch within one business day to agree the scope and set up read-only access. If I read the app and can’t help, the deposit comes back in full.'

const DIAGNOSTIC = {
  sheetTitle: 'Reserve your Diagnostic',
  sheetLine: (amountLabel, serviceName) =>
    `${amountLabel} deposit for the ${serviceName}. Fully refunded if I can’t help.`,
  reservedTitle: 'Your Diagnostic is reserved.',
  reservedWithCall: DIAGNOSTIC_RESERVED,
  reservedWithoutCall: DIAGNOSTIC_RESERVED,
  emailLine:
    'If I read the app and can’t help, it comes back in full. Nothing starts until we have agreed the scope.',
  emailNoun: '',
  emailClosing: 'agree the scope',
  retryHref: '/services/codebase-diagnostic/reserve',
  retryLine: 'from the link I sent you',
  backHref: '/services/codebase-diagnostic',
  backLabel: 'Back to the Diagnostic',
}

export function depositTerms(slug) {
  return slug === DIAGNOSTIC_SLUG ? DIAGNOSTIC : RETAINER
}
