# WareKit renewals

The maintainers' page for the yearly renewal of a paid WareKit license. It is
written so that someone who has never seen this code can run the system, fix
it when something goes wrong, and change it without breaking it. Every name
below is a real function, field, file, route or environment variable.

## 1. What it does

A paid Pro or Team license gets 12 months of updates. The owner is emailed 30
days and 7 days before they end, and again on the day. On the day, the job
removes the people the license invited from the kit's GitHub repository. The
owner can renew from their license page from 60 days before the end date, and
at any time after it. Renewing adds 12 months and, if access had ended, invites
the developers on the license again. Prices come from the kit's product row,
never from code: $199.00 for Pro and $399.00 for Team today. The kit itself
never checks any of this. A license key keeps working when updates end, and
`/licenses/report` still accepts it. Only repository access and updates end.

## 2. Where the code is

| File                                                         | What it holds                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/commerce/licenseTerm.js`                            | The rule. The constants (`TERM_MONTHS`, `RENEW_WINDOW_DAYS`, `FIRST_REMINDER_DAYS`, `LAST_REMINDER_DAYS`), `computeUpdatesUntil`, `dateInForce`, `termState`, `dueAction`, `formatTermDate`. It imports nothing and reads no clock. |
| `src/lib/commerce/licenseRecord.js`                          | `recomputeTier` works the tier and the end date out from the paid purchases. `attachRenewal` puts a renewal on its license. `expectedProductIds` says which Creem product ids a checkout may carry.                                 |
| `src/lib/commerce/licenseRenew.js`                           | `startRenewal`, the server action behind the Renew button. It opens the Creem checkout.                                                                                                                                             |
| `src/app/(commerce)/webhooks/creem/route.ts`                 | The renewal branch (a paid renewal order) and the refund branch (`handleRefund`).                                                                                                                                                   |
| `src/lib/commerce/renewalJob.js`                             | The daily job: `runRenewalJob` and `handleRenewalJob`.                                                                                                                                                                              |
| `src/app/(commerce)/licenses/renewals/route.js`              | The route the schedule calls: `GET /licenses/renewals`.                                                                                                                                                                             |
| `src/lib/commerce/licenseRevoke.js`                          | Withdrawal. `planRevocation` only reads. `revokeLicenseAccess` acts. Used by the job and by the refund branch.                                                                                                                      |
| `src/lib/commerce/licenseRestore.js`                         | `restoreLicenseAccess` gives access back after a renewal. Used by the webhook and by the job.                                                                                                                                       |
| `src/lib/commerce/repoAccess.js`                             | `licenseRepo` (which repository a license's people were invited to) and `coveredByAnotherLicense` (does another license in force also hold this person).                                                                            |
| `src/lib/commerce/fulfillment.ts`                            | The three renewal email functions, which send four emails: `sendRenewalReminderEmail` (the 30-day and the 7-day one), `sendUpdatesEndedEmail`, `sendRenewalConfirmationEmail` (the receipt).                                        |
| `src/collections/Licenses.ts`, `Purchases.ts`, `Products.ts` | The new fields (see the table below).                                                                                                                                                                                               |
| `vercel.json`                                                | The schedule.                                                                                                                                                                                                                       |
| `docs/superpowers/plans/2026-11-23-warekit-renewals.sql`     | The SQL that creates the new columns. It must be applied by hand (see section 9).                                                                                                                                                   |

The new fields:

| Where     | Field                                                                   | What it is                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Licenses  | `updatesComputedUntil`                                                  | The date worked out from the paid purchases. Written by the server only.                                                                                     |
| Licenses  | `updatesUntilOverride`                                                  | A date set by hand. It can only add time.                                                                                                                    |
| Licenses  | `updatesUntil`                                                          | Not stored. It shows the later of the two dates above. This is the date in force. It is the column to read in the license list.                              |
| Licenses  | `firstReminderSentFor`, `lastReminderSentFor`, `endedNoticeSentFor`     | The end date each email was last sent for. An email is sent at most once per end date.                                                                       |
| Licenses  | `accessWithdrawnAt`, `accessWithdrawnFor`                               | Set when the job has removed the license's people. Empty while access is in place. Their presence is what tells the job to give access back after a renewal. |
| Licenses  | `needsReview`                                                           | The existing flag. Section 7 lists every reason this system sets it.                                                                                         |
| Purchases | `kind`                                                                  | `sale`, `upgrade` or `renewal`. Empty reads as a sale.                                                                                                       |
| Purchases | `fulfillmentStatus`                                                     | The existing field. A renewal that was paid but could not be used is set to `failed`.                                                                        |
| Products  | `creemRenewalProductId`, `creemRenewalSandboxProductId`, `renewalPrice` | On a Pro or Team row: the Creem renewal product (live and test) and what renewing costs, in dollars.                                                         |

### Rules that reach into other code

- **One product row per stack and tier.** `startRenewal` and the job read the kit
  row for a license's stack and tier with no status filter, so an owner can
  still renew after a row is unpublished. That means a second row for the same
  stack and tier (a draft copy, say) could supply the wrong renewal product id
  and price. Never create one. If you must replace a row, edit it.
- **The receipt quotes what was paid.** `sendRenewalConfirmationEmail` is given
  the order's `amount_paid` (cents, from the webhook, divided by 100), falling
  back to the order's `amount`. It never uses the row's current `renewalPrice`,
  so a discount or a later price change does not misstate the receipt. If
  neither amount can be read, the receipt names no price.
- **No price is ever invented.** If a kit row has no `renewalPrice`, the two
  reminders and the ended email say `Get in touch for your renewal price.` and
  the license page shows no Renew button.
- **While updates have ended**, three things are refused, each with a returned
  sentence that says nothing was charged. Adding a developer is refused by
  `addSeat`: `Updates for this license ended on <date>, so developers can be
added again once it is renewed. Nothing was charged and nobody was invited.`
  Re-sending an invitation to a developer who is already on the license is
  refused as well, because it goes through the same action as adding one.
  Moving from Pro to Team is refused by `licenseUpgrade.js`. Removing a
  developer still works.
- **The renewal checkout names the license.** `startRenewal` puts the license
  id and `renewal: '1'` in the checkout metadata, and the webhook refuses a
  renewal that does not line up with the license it names (section 7).

## 3. How the end date is worked out

The rule is `computeUpdatesUntil` in `licenseTerm.js`, run by `recomputeTier`
whenever a purchase changes, and by the daily job on a live run.

1. The term starts at the first paid, unrefunded Pro or Team purchase made
   outright (`kind` is `sale` or empty). An upgrade or an Enterprise quote
   never starts a term. The first end date is that purchase's time plus 12
   months: same day of the month, same time of day, in UTC.
2. Paid renewals are taken in date order. A renewal paid on or before the
   current end date (including the exact instant) adds 12 months to the end
   date. A renewal paid after it sets the end date to the payment time plus 12
   months.
3. A refunded purchase counts for nothing. A refund needs no history: the row
   changes status and the date is worked out again.
4. An upgrade changes nothing about the date.
5. The date in force (`updatesUntil`) is the later of the worked-out date and
   `updatesUntilOverride`.
6. Dates are shown to buyers in UTC (`10 December 2027`), the same on the page
   and in the emails.

Worked examples. Each is purchases in, date out. Times are UTC.

| Case                                           | Purchases in                                                                   | Date out                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A first purchase                               | Pro bought 10 December 2026, 15:00                                             | Updates until 10 December 2027, 15:00                                                                                                                                                                       |
| An early renewal                               | The above, then a renewal on 1 November 2027                                   | 10 December 2028. Nothing is lost by renewing early.                                                                                                                                                        |
| A late renewal                                 | The first purchase, then a renewal on 15 January 2028 (after 10 December 2027) | 15 January 2029. The days locked out are not charged for.                                                                                                                                                   |
| Two renewals                                   | The first purchase, then renewals on 1 and 2 November 2027                     | 10 December 2029. Each adds 12 months.                                                                                                                                                                      |
| A refunded renewal                             | The first purchase, then a renewal on 1 November 2027 that is refunded         | Back to 10 December 2027. Nothing else moves: no tier change, no removal, no flag.                                                                                                                          |
| An upgrade in between                          | The first purchase, then an upgrade to Team on 1 March 2027                    | Still 10 December 2027. The next renewal costs the Team price, $399.00, because the license is now Team.                                                                                                    |
| A purchase on 29 February                      | Pro bought 29 February 2028                                                    | 28 February 2029. A month shorter than the day is clamped to the month's last day.                                                                                                                          |
| An override later than the worked-out date     | Worked out to 10 December 2027, override 1 March 2028                          | 1 March 2028                                                                                                                                                                                                |
| An override earlier than the worked-out date   | Worked out to 10 December 2027, override 1 January 2027                        | 10 December 2027. An override can only add time, so this changes nothing.                                                                                                                                   |
| The original sale refunded, upgrade still paid | Pro sale refunded, the Team upgrade still paid                                 | The stored `updatesComputedUntil` is left exactly as it was, because there is no sale left to work it out from. The refund branch flags the license (section 7). Decide the date by hand with the override. |
| Enterprise                                     | A paid Enterprise quote                                                        | No date. Enterprise has no worked-out date. It has a date only when `updatesUntilOverride` is set.                                                                                                          |
| Lite                                           | A free Lite kit                                                                | No date, ever.                                                                                                                                                                                              |

A license with no date in force is never reminded, never cut off, and counts as
covering its people.

### Refunds

- **A refunded renewal** takes its 12 months back and nothing else: the refund
  branch only calls `recomputeTier`. It does not remove anyone and does not
  flag the license. Access that has already ended is not given or taken back
  there. The daily job cuts off on the new, earlier date.
- **A refunded sale or upgrade** goes through `moveLicenseDown`. When nothing
  paid is left, the refund calls `revokeLicenseAccess`.
- **`WAREKIT_REVOKE_ON_DEACTIVATE` governs refunds too.** With it anything but
  `1`, a refund removes nobody from GitHub (see section 5).
- **An ended license no longer counts as covering its people.** When the
  license being refunded or cut off shares a person with another license, that
  person is kept only if the other license has its updates in force.
  `coveredByAnotherLicense` skips a license that has ended. So when someone
  else's license is refunded or ends, a person who is also on an ended license
  is removed. Before this feature, a paid license always covered them.

### A double renewal

If a buyer pays twice (twice within seconds, or by hand in two tabs), each
payment adds 12 months. Refunding one in Creem takes its 12 months back through
the refund branch. Nothing blocks a second checkout except that, once the first
is recorded, the date has moved 12 months on and the 60-day window refuses the
second one. Two checkouts opened before the first is recorded both go through.

## 4. Running the job

### What one run does

`runRenewalJob` reads every license whose tier is Pro, Team or Enterprise and
whose `creemEnvironment` is this deployment's own (so a sandbox deployment
never touches a live license). For each, on a live run, it first calls
`recomputeTier`, which is also how a license with no stored date gets its first
one. Then it asks `dueAction` what to do. At most one thing happens per license
per run:

| `dueAction`      | When                                                                             | What the job does                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `last-reminder`  | 7 days or less to the end, and the 7-day reminder not yet sent for this end date | Sends the 7-day email                                                                                               |
| `first-reminder` | 30 days or less to the end, and neither reminder sent for this end date          | Sends the 30-day email. A missed reminder sends only the nearest one that still applies.                            |
| `withdraw`       | The end instant has passed and `accessWithdrawnAt` is empty                      | Removes the people the license invited, records `accessWithdrawnAt` and `accessWithdrawnFor`, sends the ended email |
| `notify-ended`   | Ended and withdrawn, but the ended email was not sent for this end date          | Sends the ended email (a retry after a failed send)                                                                 |
| `restore`        | `accessWithdrawnAt` is set but the license is in force again                     | Invites the developers again with `restoreLicenseAccess` and clears the marks                                       |

Cut-off is on the day: the first daily run after the end instant has passed, in
UTC. There is no grace period. Each email is claimed (its `...SentFor` field is
written) before it is sent, and the mark is given back if the send fails, so
the next run sends it once.

If a withdrawal is not complete (a removal GitHub refused, a coverage check that
failed, no repository found), the job counts it as `failed`, writes nothing
further and tries again the next day. The ended email goes only after a complete
withdrawal.

The job never throws past one license: that license counts as `failed` and the
run goes on. It never names a person in a log. Logs carry license ids and
counts only.

### The schedule

`vercel.json` declares one static schedule, `warekit-renewals`: daily at 06:00
UTC, `GET /licenses/renewals`. Vercel sends `Authorization: Bearer
<CRON_SECRET>`. With `CRON_SECRET` unset, `handleRenewalJob` refuses everyone
with a 401, so a missing secret means the job never runs. Set `CRON_SECRET` in
the Vercel project's environment variables (generate it with `openssl rand -hex
32`) and redeploy.

Vercel Schedules is in Beta. By Vercel's documented default a static schedule is
active in production and inactive on preview and custom environments. The
legacy `crons` key in `vercel.json` would do the same job. Check Vercel's
current documentation before changing this file.

### Running it by hand

The owner runs this, in their own terminal. Never paste the secret into a chat
or a page. Put it in a shell variable first, without echoing it:

```bash
read -s CRON_SECRET
curl -H "Authorization: Bearer $CRON_SECRET" https://www.amware.dev/licenses/renewals
```

A hand run is a real run. It does what the schedule does, under the same flag
(section 5). One database serves development and production, so a run from a
preview deployment acts on the same licenses of its Creem environment. A preview
sits behind Vercel sign-in, so a call to it needs the project's protection
bypass as well, sent in the `x-vercel-protection-bypass` header.

The answer is JSON, never cached:

| Status | Body                                                                                                  | Meaning                                                      |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 200    | `{ live, checked, firstReminders, lastReminders, withdrawn, notices, restored, wouldRemove, failed }` | The counts. `live` is `false` on a dry run.                  |
| 401    | `{ "status": "unauthorized" }`                                                                        | No secret was sent, the wrong one, or `CRON_SECRET` is unset |
| 405    | `{ "error": "method_not_allowed", ... }`                                                              | Anything but GET                                             |
| 500    | `{ "status": "error" }`                                                                               | The licenses could not be read at all                        |

In the log, a live run writes the line `Renewal job` with the same counts. A
dry run writes `Renewal job dry run`. Other lines to know:

| Log line                                  | Meaning                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `Renewal job: a license failed`           | One license threw. Its id and an error code follow. The run went on.                   |
| `Renewal job: withdrawal incomplete`      | A withdrawal did not finish. It is retried tomorrow.                                   |
| `Renewal job: could not send for <field>` | An email failed. The mark was given back, so the next run tries again.                 |
| `Renewal job: no owner email`             | The license has no `ownerEmail`, so nothing can be sent. It counts as `failed`.        |
| `Could not give a renewal mark back`      | A failed send could not undo its mark. The next run decides again from what is stored. |
| `Renewal job failed to run`               | The route's 500.                                                                       |
| `Would revoke repo access (flag off)`     | From `revokeLicenseAccess` while the flag is off (a refund).                           |

## 5. The flag

`WAREKIT_REVOKE_ON_DEACTIVATE` switches the whole job. Anything but `1` makes
it a dry run:

- no email is sent
- nobody is removed from GitHub (GitHub is never called)
- nothing is written, not a mark, not a flag, not a date
- the counts are logged (`Renewal job dry run`) and returned

A dry run skips the recompute. A license that has no stored date yet therefore
shows nothing in a dry run. The first live run works its date out and acts on it
in the same run.

**Before turning the flag on**, look for licenses whose date is already past.
They are cut off on the next run, with no 30-day warning, because the job sends
the ended notice and removes access in one pass. To check, open Licenses in the
admin and look at these fields:

1. `updatesUntil` (a column in the list, and in the sidebar). Any Pro or Team
   license whose `updatesUntil` is earlier than now will be cut off.
2. For a license where `updatesUntil` is empty, check its paid purchases. The
   first paid Pro or Team sale (`kind` empty or `sale`) plus 12 months is the
   date the first live run will work out, and no renewal exists yet to move it.
   If that sale is more than 12 months old, the license is cut off on the first
   live run.
3. `accessWithdrawnAt` and `accessWithdrawnFor` should be empty on every license
   before the first live run. If one is set, the job believes access was already
   withdrawn.
4. Also read one dry-run log line. `withdrawn` counts the licenses that would be
   cut off, and `wouldRemove` counts the people. A dry run only sees licenses
   that already have a stored date, so it is a lower bound.

For a license that should not be cut off, set `updatesUntilOverride` first
(section 6).

The flag also governs refunds. With it off, a refund removes nobody, and
`revokeLicenseAccess` flags the license `needsReview` when it would have removed
someone (section 7).

## 6. Giving someone extra time

Set `updatesUntilOverride` on the license, in the admin. The date in force is the
later of the worked-out date and the override, so an override can only add
time. An override earlier than the worked-out date changes nothing. Clear the
field to go back to the worked-out date.

- If access was already withdrawn, the next live run sees the license is in
  force again and gives access back.
- A reminder is sent at most once per end date. A new date (a renewal, an
  override) starts a fresh cycle on its own. To have the same reminder sent
  again for the same date, clear its field: `firstReminderSentFor`,
  `lastReminderSentFor` or `endedNoticeSentFor`.
- To give access back without a renewal, set an override past today. Do not
  clear `accessWithdrawnAt` by hand while the license has ended: the job would
  withdraw it again on the next run.

## 7. What each `needsReview` from this system means and what to do

`needsReview` is a checkbox on the license. Clear it when you have handled the
cause. These are all the places the system sets it, renewals first.

### Renewals

| Cause                                                                                                                                                                                                                                                                                                                                    | What it means                                                                                          | What to do                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A renewal was paid but refused.** The webhook answers 200, records the purchase with `kind` `renewal` and `fulfillmentStatus` `failed`, attaches nothing, and flags the license. Reasons: the license is not Pro or Team, the renewal product is for another tier than the license holds, or the payment is also marked as an upgrade. | Money is in and no date moved.                                                                         | Find the purchase (Purchases, `fulfillmentStatus` `failed`, `kind` `renewal`). If it should count, fix the cause, set its `license` to the right license and confirm the `kind`, then check `updatesUntil`. Otherwise refund it in Creem.                                                               |
| **A renewal was paid but could not be attached.** `attachRenewal` threw (a database failure). The webhook answers 200 (a redelivery would stop at the duplicate check), marks the purchase `fulfillmentStatus` `failed` and flags the license.                                                                                           | Money is in, the 12 months are not on the license, and no receipt was sent.                            | Find the purchase as above. Attach it by hand: set its `license` and make sure `kind` is `renewal` and `status` is `paid`. Saving it runs the recompute. Check `updatesUntil`. Access is not restored by hand: if it had ended, the next live run gives it back. Tell the owner, since no receipt went. |
| **`restoreLicenseAccess` returned `retry`** after a renewal, in the daily job: GitHub could not be reached or was rate limited, no token is configured, or no repository was found. The job retries every day and flags the license once.                                                                                                | The renewal is recorded, but the developers have no access yet.                                        | Check the token (`docs/github-token.md`) and that a repository can be found for the license (`licenseRepo`). The job completes the restore on a later run. If you clear the flag while it is still failing, the next run sets it again.                                                                 |
| **GitHub refused an invitation on restore** (not a connection problem: for example the username no longer exists).                                                                                                                                                                                                                       | The other developers were invited and the withdrawn marks were cleared, so the job will not try again. | Invite that developer by hand in GitHub, or ask the owner to correct the username.                                                                                                                                                                                                                      |

Three more paid renewals are recorded with `fulfillmentStatus` `failed` and
are **not** flagged on the license: one that names no license that exists, one
whose license is on another stack or Creem environment, and one whose Creem
product does not match the kit row's renewal product. Nothing attaches and no
date moves. Look for failed rows in Purchases from time to time, and refund
them in Creem or fix them by hand as above.

### Withdrawal

| Cause                                                                                                                                                                     | What it means                                                                                                                                | What to do                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **A seat with no invitation link was left in place.** The job never removes a person the license did not invite (a seat with no `inviteUrl`). It flags the license, once. | That person may be an existing collaborator, perhaps another customer, whom the owner typed in. Everyone the license did invite was removed. | Look at the repository's collaborators in GitHub and decide by hand.                                     |
| **A removal GitHub refused or could not reach**, or a coverage check that failed.                                                                                         | The withdrawal is incomplete. The job retries daily and no ended email goes yet. The flag is set each night the removal fails.               | If it keeps failing, check the token (`docs/github-token.md`). Remove the person by hand if you have to. |
| **No repository was found for the license.**                                                                                                                              | The job cannot say where the developers were invited. Retried daily.                                                                         | Check the kit row's `githubRepo`, and the license's purchases.                                           |
| **A refund while the flag is off.**                                                                                                                                       | `revokeLicenseAccess` would have removed people and did not.                                                                                 | Remove them by hand if the refund stands, or turn the flag on (section 5).                               |

### Refunds, disputes and other flags that were there before

| Cause                                                                                                                                      | What to do                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| A partial refund (of any purchase, including a renewal). Nothing changes automatically.                                                    | Decide. If the refund should end the license or a renewal, refund the rest in Creem. |
| The original sale refunded while an upgrade is still paid. The tier is left, and so is the stored date.                                    | Decide the date by hand with the override (section 3).                               |
| An upgrade refunded while a seat or account override was agreed for the tier just lost, or seats or accounts exceed the new tier's limits. | Decide whether the override still holds, and whether the owner must remove someone.  |
| A refund's license update failed.                                                                                                          | Check the license's tier and date, and the purchase's status.                        |
| A dispute is opened.                                                                                                                       | Handle it in Creem. Nothing changes automatically.                                   |
| An overpaid or refused upgrade.                                                                                                            | Decide with the buyer.                                                               |
| A seat invitation failed, or an owner freed a seat that has no invitation link.                                                            | Send the invitation by hand, or check the repository.                                |

## 8. Enterprise

An Enterprise license has no end date until you set one. A paid Enterprise quote
therefore never expires by accident. When a quote is paid and the deal has an end
date, set `updatesUntilOverride` on the license. From then on the job treats it
like any other: reminders, cut-off and restore. The license page shows no Renew
button for Enterprise, because Enterprise renews by hand: the reminders say
`Get in touch for your renewal price.` since there is no kit row for it, and
you quote the renewal yourself. When the renewal is paid, move
`updatesUntilOverride` forward. If access had ended, the next live run gives it
back.

## 9. Before any paid kit goes on sale

Do these in order.

1. **Apply the SQL.** `docs/superpowers/plans/2026-11-23-warekit-renewals.sql`
   creates the new columns. Alec applies it, once, in the Supabase SQL editor,
   before this branch is merged or deployed. Run its read-only pre-check first.
   Payload never pushes schema on production, so code that reads a missing
   column would fail. One database serves development and production, so until
   the branch is on `main`, a `pnpm dev` or `pnpm sim` from a checkout without
   these fields drops the new columns. Do not run either from `main` or an
   older checkout in that time.
2. **Set `CRON_SECRET`** in the Vercel production environment, then redeploy.
   Without it the job never runs.
3. **Create the four renewal products in Creem live mode** (Pro and Team, for
   each of the two stacks), and put their ids and prices on the product rows:
   `creemRenewalProductId` and `renewalPrice` on each Pro and Team row (and
   `creemRenewalSandboxProductId` for test mode). `renewalPrice` must match the
   Creem product.
4. **Check that there is one product row per stack and tier** (section 2).
5. **Check the scheduler is calling the job in production**, and read one run in
   the log (`Renewal job` or `Renewal job dry run`).
6. **Decide `WAREKIT_REVOKE_ON_DEACTIVATE`** the way Alec wants it. With it off,
   nothing is ever withdrawn, no reminder goes, and a refund removes nobody.
   Before turning it on, do the check in section 5.
7. **Make the term and the price say the same everywhere:** the kit `LICENSE`,
   the site copy and the product rows state the same term (12 months) and the
   same renewal price. The legal pages (branch `legal-pages`) say the same.
8. **Confirm the wording.** Every line a buyer reads in the renewal code carries
   a `TODO(alec): confirm this wording.` comment. `grep -rn "TODO(alec)" src`
   lists them. The four emails are in `fulfillment.ts`, the refusals in
   `licenseRenew.js`, `addSeat.ts` and `licenseUpgrade.js`, and the license page
   in `src/components/commerce/LicensePanel.jsx`.
