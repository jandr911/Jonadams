# AGENTS.md

Contract for every AI agent in this repository. Read before your first edit.

Adams UniverseCity is a public site for the Detroit artist Jonathan Adams. The homepage
is a free-roam 3D downtown Detroit built with React Three Fiber; the inner pages are
styled rooms. Content and the admin panel live in Supabase (see [Secrets and Supabase](#secrets-and-supabase));
there is no visitor data. The thing that breaks here is
not security, it is the frame rate: the client judges the city on a mid-range laptop,
and a change that looks fine on a strong GPU can halve the frame rate on his. Bias
toward the smallest correct change and measure before you call it done.

---

## How to work

A piece of work runs start to finish like this:

| #   | Step                                  | Detail                                                      |
| --- | ------------------------------------- | ----------------------------------------------------------- |
| 0   | Cut a branch from `staging`           | [Git](#git)                                                 |
| 1   | Plan                                  | below                                                       |
| 2   | Question the plan, in client terms    | below                                                       |
| 3   | Build                                 | below, and every rule in this file                          |
| 4   | Verify                                | [Before you say you are done](#before-you-say-you-are-done) |
| 5   | Review the diff                       | below                                                       |
| 6   | Merge to `staging`, delete the branch | [Git](#git)                                                 |

**Building a feature or fixing a bug runs all of it.** Those two cases are not a
judgement call. If you are adding behaviour or correcting behaviour, every step applies
however few lines it takes.

Outside it: answering a question, explaining or tracing code, running a command,
reformatting, a docs or comment change that alters no behaviour. No branch, no plan
needed. Just do the thing.

**The test is what kind of work it is, not how big it looks.** A small feature is still a
feature; a one-line bug fix is still a bug fix. Deciding a change is too minor to deserve
the process is the one judgement you do not get to make.

A step is waived only when **the user says so in their message**: "skip the questions",
"no need to branch". Those are instructions, and you follow them. Your own sense that the
work looks trivial is not.

Running a step is not the same as producing output from it. On genuinely small work the
steps collapse honestly on their own:

- **Step 1** on a one-line fix is one sentence naming the file.
- **Step 2** asks nothing when nothing is actually undecided. "No open decisions, here is
  the assumption" is a valid result. Skipping the step and never checking is not.
- **Step 4** still runs the checks. It always runs the checks.

Announce each step as you reach it, so it is visible which one you are on. A step nobody
can see was skipped is a step that gets skipped.

### 1. Plan before you write code

State what will change, which files, and what is deliberately **out** of scope. A plan
that cannot name the files it will touch is not a plan yet. Read the surrounding code
first; the pattern you need almost always already exists here. For anything touching the
city, say what it costs per frame and how you will measure it.

### 2. Question the plan, in client terms, five questions maximum

A plan nearly always contains decisions you were about to make on someone else's behalf.
Surface them before you build, not in review.

**Run this on every feature and every bug fix**, including the ones that look too small
to need it. Read your own plan back and ask what you have quietly decided. Usually
something. Occasionally nothing, and "nothing is undecided, I am assuming X" is a fine
outcome, as long as you looked.

**Ask like the client would, not like an engineer.** The person answering is relaying to
an artist who will never open this repository. Every question must be answerable by
someone who knows what the site is for and has seen it in a browser. No file names, no
library names, no jargon in the question itself.

- **Five questions maximum.** Fewer is better.
- **Only ask what changes the work.** If both answers produce the same code, pick the
  sensible default, say so in one line, and move on.
- **Offer concrete options**, not open prompts: "A or B, and here is what each means for
  a visitor."
- **Never ask the user to pick an implementation.** That is your job.
- **Do not ask about client logistics.** Payment, accounts, branding ownership, who makes
  the art. The user handles those. Ask only about what the site does.

| Ask this                                                                            | Not this                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| "On a phone, should the city still be explorable, or show a still skyline and the links?" | "Do we gate the Canvas on a media query or on GPU tier?" |
| "When a video has no ID yet, hide the slot or show a coming-soon card?"              | "Should VideoSlot.id be optional or an empty string?" |
| "Should night mode follow the visitor's clock or a toggle they control?"             | "Do we derive the phase in a context or a hook?"     |
| "Is a slower first load acceptable if the city looks richer?"                        | "Can we raise the shadow map to 4096?"               |

If an answer does not come, choose the safer default, state the assumption plainly, and
build. The safer default on anything visual is the one that keeps the frame rate.

### 3. Build

Smallest correct change. Follow the rules below.

### 5. Review the diff before you call it done

Run your code-review skill over the diff (in Claude Code: `/code-review`). If you have
no such skill, re-read the diff yourself against
[Before you say you are done](#before-you-say-you-are-done). Fix what it finds, or say
why you did not.

---

## Toolchain

**npm.** `package-lock.json` is the lockfile. No yarn, pnpm, or bun.

The development machine has about 7 GB of RAM. An uncapped Node process installing or
building the Three.js stack gets OOM-killed with exit 137. **Prefix every npm and next
command with a heap cap**, and keep a single WebGL tab open at a time.

| Command                                                       | Purpose                       |
| ------------------------------------------------------------- | ----------------------------- |
| `NODE_OPTIONS=--max-old-space-size=768 npm install`           | Dependencies                  |
| `NODE_OPTIONS=--max-old-space-size=1024 npm run dev`          | Dev server on `:3000`         |
| `NODE_OPTIONS=--max-old-space-size=1024 npm run lint`         | ESLint (`eslint-config-next`) |
| `NODE_OPTIONS=--max-old-space-size=1024 npx tsc --noEmit`     | Typecheck                     |
| `NODE_OPTIONS=--max-old-space-size=1536 npm run build`        | Production build              |

Both lint and typecheck pass clean on `staging`. Keep them that way: a new warning is a
regression, not a baseline.

There is no formatter configured and no test runner. Adding either is a `chore/` branch
of its own, agreed with the user first. Do not fold it into a feature.

## Next.js

The version here is newer than your training data. **Before writing anything that
touches the framework**, read the matching guide under `node_modules/next/dist/docs/`
and follow it over what you remember. The managed block at the bottom of this file is
written by `next dev` and says the same thing.

- App Router only, under `src/app/`. Each public page is `src/app/<route>/page.tsx`. The
  only layout is `src/app/layout.tsx`, which loads the two fonts and the global
  stylesheet.
- **Never invent structure.** No `pages/`, no `src/pages/`, no new top-level directory.
- Components are server components unless they say `"use client"`. Anything that imports
  `three`, `@react-three/*`, `motion`, or a React hook is a client component and must
  say so at the top of its own file. Keep the boundary at the leaf: a page stays a server
  component and renders a client component, not the other way round.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Read the docs on
  both before touching data fetching or dynamic rendering.
- Styles are Tailwind v4 through `@tailwindcss/turbopack`. Turbopack does not reliably
  notice appends to `src/app/globals.css`; **restart `next dev` after editing it** before
  judging a style change in the browser.

## The city

`src/components/city/` is the homepage. It is the whole pitch, and it has a frame budget.

**Budget.** 50 to 60 fps at 1440×900 on an Intel integrated GPU in the home view, and
never below about 35 fps zoomed far out. That is what the client's machine does. A
change that drops the home view under 50 does not ship until it is back.

The budget is held by deliberate choices. Do not undo them without a measured reason:

- Default pixel ratio is 1. Do not raise it. The low quality tier renders windows over
  1.6 Mpx at a reduced ratio and scales up (`CityStage.tsx`); the high tier never does.
- Anti-aliasing is SMAA in the post chain. **Never enable multisampling on the canvas**;
  4× MSAA took the scene from 55 to 9 fps.
- The river is a custom planar mirror (`RiverMirror.tsx`, `mirrorRender.ts`) that
  renders only objects on `REFLECT_LAYER`, at 0.4 scale, every third frame and at most
  20 Hz (every sixth frame and 10 Hz in the low tier). It replaced a drei reflector that
  re-rendered the whole scene per frame. Opt an object into the reflection with
  `enableReflection`; `DetailCull` then drops meshes under 8 mirror pixels from it, which
  is what keeps the mirror pass near 200 draws instead of 330. Never bring the drei
  reflector back.
- The shadow map is 2048 and refreshes every sixth frame and at most 10 Hz through
  `ShadowThrottle` (1024, every twelfth frame and 5 Hz in the low tier).
- Mirror and shadow rates never rise above those defaults on any machine; the low tier
  only lowers them. A smooth tier that raised them
  (mirror every frame, shadows at 30 Hz) on screens holding 75 fps or more was removed after
  the client's 120 Hz Mac flickered black: his video ran clean for 18 s at the normal rates,
  then pulsed every 1.2 to 1.6 s, a 30 Hz beat against the phone camera. Not reproduced on
  Intel; do not bring a faster tier back without testing on that Mac.
- The world is clipped at `EXTENT` because fog hides everything further. Clouds sit above
  the camera ceiling and the camera floor keeps the eye above the streets. Do not move
  one without the others.
- Repeated geometry is instanced. A loop that mounts one mesh per building, car, window,
  or house is wrong here. An instance buffer rewritten every frame is marked dynamic
  (`useDynamicInstances` / `dynamicInstances` in `instancing.ts`); Windows' Direct3D path
  stalls on per-frame uploads to a static buffer.
- Procedural canvas textures live in `textures.ts`, and text and sign textures in
  `labels.ts`. Do not add image textures without asking; there is no asset pipeline and
  the memory ceiling is real.
- `labels.ts` textures are cached globally and shared. Never dispose one from a
  consumer; the next sign to ask for it gets a dead texture.

**Measure, do not guess.** `window.__cityGL` (the renderer) and `window.__cityControls`
(camera-controls) are exposed in development for exactly this. Check the home view, a
street-level view, an aerial view, and night, and report the numbers.

**Detroit, not a generic city.** Every landmark is laid out to real geography as seen
from Windsor. New detail is Detroit-specific detail: a real building, a real street, a
real texture of the place. The reference mood is overcast documentary realism, muted,
film grain, raw brick and concrete. Never copy Kanye or Murakami assets; the art is
original.

**Day and night** follow the visitor's local time through `DayNightContext`. Anything
with a colour or a light reads the phase from there, not from `Date` directly.

## Styling

Every colour is a CSS variable in `src/app/globals.css` (`--ink`, `--panel`, `--gold`,
`--paper`, `--muted`, the neon set), surfaced to Tailwind through `@theme inline`.
**Never write a raw colour in a component**: no hex, no `bg-zinc-900`, no `bg-[#07060f]`.
Add a token to `globals.css` if one is missing.

| Use                              | Not                               |
| -------------------------------- | --------------------------------- |
| `bg-ink` `bg-panel`              | `bg-black` `bg-[#0e0c1a]`         |
| `text-paper` `text-muted`        | `text-white` `text-gray-400`      |
| `text-gold` `border-line`        | `text-yellow-400` `border-white/10` |
| `text-cyan` `text-pink` `text-amber` `text-violet` | any Tailwind neon |

- Reuse the existing utilities before writing new CSS: `eyebrow`, `btn-outline`,
  `btn-solid`, `panel`, `shell`, `room`, and the card classes already in the sheet.
- DOM fonts come from `next/font` in the root layout: Cormorant Garamond for display
  (`font-serif`), Space Grotesk for body (`font-body`). Do not load a DOM font any other
  way. 3D text meshes and the share image load fonts only from `public/fonts`; canvas
  sign textures may fall back to system fonts.
- The site is a single dark theme by design. Do not add a light theme.
- Inside the 3D scene, colours are Three.js values and belong in the component that
  owns the material or in `dayNight.ts`, where the day and night palettes live.

## Content

Two layers, and the split matters:

- **Supabase is the source of truth for what the client manages**: videos (Listen),
  visuals (Watch), creatives, social links, the site song, and every line of wording. The
  admin at `/admin` edits it; `getContent()` reads it.
- **`src/content/site.ts` holds the defaults.** Every editable string lives there as the
  fallback, so the site renders sensibly with an empty database. A string with `{name}`
  placeholders is a template filled by `fill()` in `src/content/copy.ts`; the admin shows
  the placeholders and the client keeps them. Add a new line of copy by adding the default
  to `site.ts` inside one of the `DEFAULT_COPY` sections; it appears in the admin
  automatically. Numbers, booleans and asset paths in `site.ts` are not editable and stay
  code.
- Server components call `await getContent()`; client components call `useCopy()`. Neither
  imports copy constants from `site.ts` directly any more, except types and the
  non-editable values (`EQ_BARS`, `GEO`, `ALTER_EGO_ART`).
- An empty YouTube id on a video means the client has not sent it yet, and the room shows
  an "arriving soon" screen for it. Lists may be empty; every room must render with none.

## Comments

The rule agents break most often. Follow it exactly.

- **NEVER** write narration comments that describe what changed, what is new or old, or
  why you did it. No "now we do X", no "updated to…", no "this was previously…", no
  changelog-style notes in code.
- **NEVER** add a comment unless it is absolutely necessary. Default to zero comments.
- A comment is only justified when the code genuinely cannot be made self-explanatory, or
  when it captures a non-obvious constraint the code cannot express. A frame-budget
  number with the measurement that set it qualifies.
- Prefer clear names, small functions, and explicit types over explanatory comments.
- **NEVER** reference plan docs, task files, tickets, or any other non-code file from a
  comment.

## Writing code

- **Never swallow an error** to make a red state go away.
- **Delete dead code**; do not comment it out.
- **Do not abstract on the second use.** Wait for the third.
- **Never disable a `react-hooks` warning**, `exhaustive-deps` included. Fix the dependency.
- **No `any` without a comment justifying it.** Prefer `unknown` and narrow it.
- In `useFrame`, allocate nothing. Reuse vectors, matrices, and colours held in refs;
  a `new Vector3()` per frame is a garbage-collector stall on the client's laptop.
- Dispose what you create. Geometries, materials, and render targets made outside
  JSX are released in the effect cleanup.

## Dependencies

- **Never add a dependency without asking first**, and prefer what is installed:
  `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`,
  `maath`, `motion`.
- The install is already at the machine's memory limit. A new package is a cost the
  user must agree to.

## Secrets and Supabase

Content lives in Supabase (project `zetlwmrzjjxymffetmkm`): Postgres tables for copy, videos,
creatives and links, a public `media` bucket for uploads, and Supabase Auth for the single
admin account. The schema is `supabase/migrations/*.sql`, run by hand in the SQL editor.

The app holds **no secret**. It uses only the project URL and the publishable key, both
public by design; every write goes through the signed-in admin's session and is checked by
row level security (`public.is_admin()`, allow-listed emails in `public.admins`).

```sh
# .env.local (git-ignored), and the same two values in Vercel for staging and production
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Public pages read through `getContent()` in `src/lib/content.ts`: one `use cache` call
  tagged `content`, invalidated by `updateTag` from the admin actions. Never read the
  database from a component directly, and never call `cookies()` outside `src/app/admin/`.
- `/admin` is gated by `src/proxy.ts` (session refresh and redirect) and again by
  `requireAdmin()` in the layout and inside every server action. Keep both.
- **Migrations run automatically on Vercel.** `scripts/migrate.mjs` runs as `prebuild`: on a
  Vercel build with `SUPABASE_ACCESS_TOKEN` set it applies every file in
  `supabase/migrations/` that is not yet in `supabase_migrations.schema_migrations`, through
  the Supabase Management API, turns public sign-ups off, and creates the owner login from
  `ADMIN_EMAIL` and `ADMIN_PASSWORD` if it does not exist. Outside Vercel it prints
  "skipped" and exits 0, so local builds never touch the hosted database. Those variables
  are server-only Vercel environment variables; none is `NEXT_PUBLIC_` and none is read by
  the app at runtime. Add a migration by adding a new `<digits>_<name>.sql` file; never edit
  an applied one.
- Never put the service role key in this app or in Vercel; the prebuild script fetches it
  from the Management API for the one call that needs it.
- `.env*` is git-ignored and must stay so. Only `NEXT_PUBLIC_*` values reach the browser.
  Never print a key, log it, or commit it to a fixture.
- `.vercel/` holds the project link and is git-ignored. Leave it alone.

## Git

**One branch per piece of work.** `staging` is the integration branch; everything is cut
from it and merges back into it. Never commit to `staging` directly.

```sh
git checkout staging && git pull          # start current
git checkout -b feature/club-room-video   # one branch, one piece of work
```

**Naming.** Kebab-case, named for the outcome rather than the symptom, prefixed:

| Prefix      | For                        | Example                      |
| ----------- | -------------------------- | ---------------------------- |
| `feature/`  | New capability             | `feature/club-room-video`    |
| `fix/`      | Something broken           | `fix/zoom-below-streets`     |
| `chore/`    | Tooling, docs, maintenance | `chore/contributor-docs`     |
| `refactor/` | Shape change, no behaviour | `refactor/traffic-instances` |

An unprefixed branch is a mistake, not a style choice.

**Staying current.** Merge `staging` in; **never rebase onto it**.

**Delete it once it is merged.** Both copies, by whoever merged it:

```sh
git push origin --delete feature/club-room-video   # remote
git branch -d feature/club-room-video              # local
git fetch --prune
```

**Deploys.** Vercel builds every push. `staging` publishes to the staging URL the client
reviews; **every push to `main` is production.** `main` moves only by merging `staging`
into it, when the user says the staging build is approved. Never run `vercel --prod`.

**Commit messages.** Imperative, specific, one concern per commit. A fix mixed with a
reformat cannot be reviewed or reverted. If the change answers a hardware constraint,
put the measurement in the body; it is often the only surviving record.

```
Render the river mirror at half resolution on alternate frames
Keep the camera eye above street level when zooming in
```

- **Never commit or push unless the user explicitly asks.**
- **Never rewrite pushed history.** No force-push, rebase, amend, or squash of anything
  already pushed, `staging` and `main` above all.
- **Never add AI attribution** to a commit message. No `Co-Authored-By`, no "Generated
  with", no agent or tool name.
- **Never commit `.gitignore`.** Stage files explicitly; never `git add -A`.
- Never set a branch's upstream unless asked.
- The managed Next.js block at the bottom of this file is rewritten by `next dev`.
  Commit it with your work rather than fighting it.

## Verification

There is no test runner. Verification here is the typecheck, the linter, the production
build, and your own eyes in a browser on the development machine.

- **Typecheck and lint pass with zero findings.** That is the current baseline.
- **The build succeeds** under the heap cap.
- **Look at it.** Open the page, exercise the change, and for anything in the city read
  the frame rate from the renderer in the four views named above. A screenshot is not a
  frame rate.
- A bug fix comes with the reproduction: say what you did to see the bug, and what you
  did to see it gone.
- When a test runner lands, a bug fix comes with a failing regression test first.

## Reviewing code

Top down by blast radius: **frame budget** (per-frame allocation, draw calls, render
targets, shadow and reflection cost) → **framework boundary** (client directive, server
components, generated files, Next.js docs followed) → **correctness** (empty content
slots, day and night phase, resize, dispose) → **convention** (tokens, comments, naming).

You own every line you merge. "The agent wrote it" is not a review defense.

## Before you say you are done

1. `npx tsc --noEmit` passes with the heap cap.
2. `npm run lint` passes with the heap cap.
3. `npm run build` succeeds with the heap cap.
4. Checked in the browser on the development machine. For city work, frame rates
   reported for home, street, aerial, and night, and none below budget.
5. No raw colours in components, no font loaded outside the root layout, no new
   dependency without agreement.
6. No multisampling, no raised pixel ratio, no per-frame allocation in `useFrame`.
7. Step 5 of [How to work](#how-to-work) done: the diff reviewed, findings fixed.
8. Branch merged to `staging` and deleted, local and remote. See [Git](#git).

"It should work" is not verification. If you could not run something, say which check you
skipped and why.

## When the code looks wrong

Assume there is a reason and find it first. Much of the city answers a hardware
constraint that is invisible in the code: a throttle, a layer mask, a clipped extent, a
half-resolution target. `git log -S` and `git blame` will usually tell you. Removing a
guard you do not understand is how the frame rate breaks.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
