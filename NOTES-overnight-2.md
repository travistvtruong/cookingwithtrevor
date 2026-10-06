# Overnight run 2: the rest of the PRD (October 6, 2026)

Everything is on the branch **`overnight-later-items`**, not merged and not pushed. Nothing touched the live site or the database. No new migrations: nothing tonight needs a database change.

## What's built

| Req | What | Where to try it |
| --- | --- | --- |
| R9 | Serving scaler: − / + servings (or ½×–3×); amounts and wording update | Any recipe, or a library recipe |
| R31 | Cook mode: one step at a time, ingredient checklist, screen stays on | "Cook mode" on a recipe |
| R12 | Print: just the title and recipe card | "Print" on a recipe |
| R32 | Share (phone share sheet or copy link) and Pin it | Every recipe, review and blog post |
| R33 | `/tags` and `/tags/<tag>`; tags on posts are links | Tags under a post title |
| R34 | "More recipes/reviews like this" at the end of posts | Shows once there are 2+ posts of a kind |
| R10 | Grocery lists grouped by store section | Any grocery list |
| R7 | Import a recipe from a link | Library > Add a recipe |
| R11 | Installable app; grocery lists work offline | Production only: open a list, then go offline |
| R35 | Turnstile CAPTCHA (off until keys are set) | README > Optional services |
| R36 | Vercel Web Analytics (off until turned on) | README > Optional services |
| R37 | Nightly encrypted database backup (off until secrets are set) | README > Optional services |
| R38 | Search Console verification tag (when set) | README > Optional services |

Not built: **R39** custom domain (needs a purchase; steps are in the README) and **R40** email digest (would need an email password stored in the app).

## Checks

- 281 tests pass; type check, lint and production build are clean.
- Lighthouse on a local production build: accessibility, best practices and SEO 100; performance 92–96 (no CDN locally).
- Tried in the browser: tag pages, share links, the scaler, cook mode, store sections, the offline tick queue (offline, refused, and back online), the import form, and the CAPTCHA widget with Cloudflare's test key.
- Import was tried against live sites: BBC Good Food imported fully. Allrecipes and Serious Eats block automated requests, so they get a "this site doesn't allow imports" message. The cloud-metadata address was refused.

## Bugs found and fixed along the way

- Cook mode couldn't reopen after closing (it relied on a close event); Done and Finish now close it directly.
- A queued offline tick flipped back after saving (a value was read after it had been deleted).
- Offline detection treated "no `navigator.onLine`" as offline, which would have queued refused ticks forever.
- The service worker's build-file cache had no limit; it's now capped.

## What needs you

1. **Review and merge** the branch (`git log main..overnight-later-items`), then push.
2. **Try it signed in:** import a recipe, scale one, use cook mode on a phone, and open a grocery list, then turn on airplane mode and tick something.
3. **Optional services** (README > Optional services): Turnstile keys, analytics, backup secrets, Search Console. Each is a few minutes, and the README gives the safe order for each.
4. Once a few recipes are published, retake the screenshots (`npm run screenshots`). The recipe screenshot is still the old Mango Cheesecake.

## Small things to know

- Running gpg locally (to test the backup's encrypt/decrypt) created an empty `~/.gnupg` folder in your home directory.
- I added a `prod` entry to `.claude/launch.json` (production build on port 3001) for testing the service worker, which only runs in production.
- New dependency: `@vercel/analytics` (it does nothing unless analytics is turned on).
