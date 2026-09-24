# The GitHub token that sends repository invitations

`src/lib/commerce/githubInvite.ts` calls one endpoint:

```
PUT /repos/{owner}/{repo}/collaborators/{username}   { "permission": "pull" }
```

It reads `process.env.GITHUB_TOKEN`. With that unset it returns
`not-configured`, the order stays `pending_invite`, and the buyer gets the
manual-fallback email. Nothing breaks — invitations just do not send
themselves.

`src/lib/commerce/checkout.ts` reads the same variable for the pre-purchase
username lookup, where it is optional and only raises the rate limit.

**`GITHUB_TOKEN` is the only GitHub credential in this app.** Anything
GitHub-related is prefixed `GITHUB_*`. In particular `ACCESS_LINK_SECRET` is
_not_ a GitHub token — it is an HMAC key we generate ourselves to sign the
`/access/<token>` download links emailed after a digital purchase. It was
called `ACCESS_TOKEN_SECRET`, which read like a third-party access token and
sat one line away from this one in `.env.example`; the old name still works
and warns.

## Which kind of token

GitHub's REST quickstart lists four ways to authenticate. Three of them are
wrong for this, and it is worth knowing why before you generate anything.

|                              | Works here?               |                                                                                                                                                       |
| ---------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fine-grained PAT**         | **Yes — use this**        | Scoped to the four kit repos, expires on a date you choose                                                                                            |
| Classic PAT                  | Works, but blunt          | `repo` grants read/write on _every_ repository you can reach, including private ones with nothing to do with WareKit                                  |
| GitHub CLI (`gh auth token`) | No                        | It is your personal login session. It rotates, it dies when you `gh auth logout`, and it carries your whole account into a deployed environment       |
| OAuth App                    | Works, but pointless here | A redirect URI and a callback to build, and the token you end up holding is a user token with `repo` — the classic PAT, the long way round. See below |
| `GITHUB_TOKEN` in Actions    | No                        | That token only exists inside a workflow run. This code runs in a Vercel function                                                                     |

### What about an OAuth App?

Worth spelling out, because it looks like the missing option and is not.

An OAuth App issues a **user access token**: it authenticates _as whoever
authorised it_. Build the redirect URI, handle the callback, and what lands
in your hand is a token that acts as you, with `repo` scope, which is exactly
what a classic PAT already is. You would have written an OAuth flow to arrive
at the token you can generate in a web form in thirty seconds — and it is
still a long-lived user token in an environment variable. For _sending_
invitations there is nothing an OAuth App gives you that the PAT does not.
GitHub also recommends GitHub Apps over OAuth Apps generally.

Where an OAuth App genuinely earns the callback URI is the other side of the
transaction: **letting the buyer sign in with GitHub at checkout.** Today
they type a username, we look it up, show the avatar and ask them to confirm
it is theirs — which exists because a typed username can be wrong and a wrong
one sends someone else the kit. Sign-in deletes that entire class of mistake:
the account is proven, not asserted, and you get a verified email with it.

That is a product decision rather than a token decision, and it is not free
(a callback route, session handling, and a buyer who bounces if they are not
signed into GitHub in that browser). Worth doing if typo'd usernames turn out
to be a real support cost. Not worth doing to avoid generating a PAT.

A **GitHub App** is the genuinely correct answer at scale: installation
tokens are scoped to the org, expire after 60 minutes and are minted on
demand, so nothing long-lived sits in an environment variable. It is also
more moving parts than one product deserves today — a private key to store,
a JWT to sign, an installation id to track. Revisit it when invitations
matter more than they do now, or when a second service needs org access.

## Generating the fine-grained PAT

github.com → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → **Generate new token**

1. **Resource owner:** `amwaredotdev`, not your personal account. This is the
   step people miss: a token owned by your user cannot administer org repos
   even though you can. If the org requires approval, the token sits pending
   until an owner approves it — you are an owner, so approve it.
2. **Repository access:** _Only select repositories_, and pick the four kits:
   - `warekit-react-netsuite-lite`
   - `warekit-react-netsuite` _(once it exists)_
   - `warekit-next-netsuite-lite`
   - `warekit-next-netsuite`
3. **Repository permissions:** **Administration → Read and write.** That one
   permission is what "add a repository collaborator" requires. Nothing else
   needs to be granted; leave Contents, Issues and the rest at _No access_.
4. **Expiration:** pick a date and put it in your calendar. A token that
   expires silently turns every sale into a manual invite, and the only
   symptom is `forbidden` in the logs.

Then:

```bash
echo 'GITHUB_TOKEN=github_pat_…' >> .env.local
```

and add the same variable in Vercel → Project → Settings → Environment
Variables, for Production and Preview. Never commit it: `.env.local` is
already gitignored, and `.env.example` carries only the name.

### The classic alternative

If fine-grained tokens are blocked by org policy, a classic PAT with the
`repo` scope works — that is what the endpoint's `X-Accepted-OAuth-Scopes`
header asks for. It is a bigger blast radius for the same job, so prefer the
fine-grained one.

## Checking it works

Check the token against GitHub alone. The command waits for you to paste the
token. Nothing appears on screen while you paste; press Enter when done:

```bash
read -s GH_TOKEN && export GH_TOKEN && echo && for r in warekit-next-netsuite warekit-next-netsuite-lite warekit-react-netsuite-lite; do printf "%s: " "$r"; gh api "repos/amwaredotdev/$r/invitations" --silent && echo ok; done; unset GH_TOKEN
```

Listing a repository's invitations needs the Administration permission, so
`ok` means the token reaches that kit with it. Add `warekit-react-netsuite` to
the list once it exists.

- `404` means the resource owner is your personal account rather than
  `amwaredotdev`, or the repo was not in the selected list, or the org has not
  approved the token yet.
- `403` means Administration was not granted.

Listing needs only read access, and sending an invitation needs write, but this
check gets the same answer for both. So confirm the token's settings say
**Read and write**.

**Do not use `pnpm sim` for this.** Most sim files start Payload, and that
includes the token preflight, which uses it to read the kit list. Outside
production, Payload pushes the checkout's schema to the database whenever it
starts. Development and production share one database, so a sim run from any
checkout rewrites production's tables to match that checkout. It adds that
checkout's columns, and it can drop columns it does not know about. The other
sim files also seed rows, send real mail and edit the live Whop webhook.

## What GitHub limits

- **50 invitations per repository per 24 hours.** No cap for inviting
  existing org members, which buyers are not. Past it, GitHub answers `422`,
  reported as `rejected`.
- **Invitations lapse** if they sit unaccepted. The API exposes an `expired`
  flag but GitHub does not publish the window, which is why the buyer email
  says invitations lapse rather than naming a number of days.
- `403` is both "missing permission" and "out of requests"; only the
  `x-ratelimit-remaining` header separates them, which is what the module
  checks.

## When it fails

`fulfillmentStatus` reaches `sent` only when access genuinely exists.
Everything else stays `pending_invite`, so filtering the Purchases collection
on `pending_invite` is the queue of orders still owed a repository. Each row
carries the `githubRepo` and username, so finishing one by hand is:

```bash
gh api -X PUT "repos/<githubRepo>/collaborators/<githubUsername>" -f permission=pull
```
