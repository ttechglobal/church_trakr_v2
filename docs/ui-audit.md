# ChurchTrakr UI / UX Audit

Date: 2026-11-19. Companion to the backend audit (all items from it are fixed or tracked separately).

## How this was done, and what it does not cover

- **Seen in a browser (dev server, desktop + 375px mobile):** marketing page, login, signup, 404 page, asset/PWA requests.
- **Reviewed in code, not visually:** the logged-in app. I did not sign in (no test account), so the shell
  (`AppShell`), the attendance flow (`AttendanceFlow`) and global styles were read line by line; every other screen
  was checked by pattern search across all 13k lines of components.
- **Measured:** WCAG contrast ratios for the brand colours, counts of accessibility and consistency patterns.
- **Not covered:** a visual pass of Dashboard, Absentees, Members, Messaging, Reports, Admin. See "Next" at the end.

---

## Status (updated after the quick-wins PR)

| Item | State |
|---|---|
| 1 Landing images | **Mitigated.** Images now render only if the file loads, so the built-in phone mockup and report card show instead of broken images. **You still need to add the 6 `.webp` files to `public/images/`** (names and descriptions are in the page source). |
| 2 PWA icons / notification badge | **Fixed** (duplicate route handlers removed; badge points at an existing icon) |
| 3 Fake service badge | **Fixed** (removed) |
| 8 Pinch-zoom | **Fixed** |
| 9 404 + error pages | **Fixed** (`not-found.js`, `error.js`, `(app)/error.js`, `global-error.js`) |
| 10 Contrast | **Mostly fixed.** Tokens, badges, placeholders, 144 grey literals, 33 dark-gold text colours and sidebar sub-labels updated. Still open: inline green/red status text (`#16a34a`, `#dc2626` used as small text in many files), the login/signup footer text. |
| 19 Dead `tailwind.config.js` | **Removed** |
| 21 Faux bold | **Fixed** (DM Sans 700 now loaded) |
| New: service worker | **Fixed.** It cached 404/500 responses for static files forever and failed to pre-cache because it listed a non-existent `/offline` route. Cache bumped to v3 so old poisoned caches are discarded. |
| 23 Brand name / logo | **Not changed — needs your decision.** Marketing says "Church Trakr" (also used deliberately as an SEO variant) while the app says "ChurchTrakr". The marketing/login pages use a "+" tile while the app sidebar uses the glossy green/orange `logo.png`. |
| 4, 5, 6, 7, 11–18, 20, 22, 24–26 | Open |

---

## P0 — Broken or misleading today (fix first)

| # | Problem | Evidence | Fix | Effort |
|---|---|---|---|---|
| 1 | **All 6 landing-page images are missing** (hero phone, problem split, steps, features, report, CTA). Visitors see broken images with alt text spilling over the phone mockup. | `/images/*.webp` all 404. `public/images/` was never committed (no git history). | Add the six WebP files to `public/images/` (or remove the `<img>` blocks). Add `width`/`height` + `next/image`. | S |
| 2 | **PWA install icons return HTTP 500.** `/icons/icon-192.png` and `icon-512.png` exist both as real files in `public/icons/` and as route handlers in `src/app/icons/`; Next refuses to serve either. | Dev log: "conflicting public file and page file". | Delete `src/app/icons/icon-192.png` and `icon-512.png` route folders (keep the `public/` files). Also `useNotifications.js` references `/icons/icon-72.png`, which does not exist. Check the live site's install prompt afterwards. | S |
| 3 | **Hard-coded "Service 1 · 9:00 AM" badge** on the attendance screen for every church. | `AttendanceFlow.js:421` | Remove, or add a real service-time setting. | S |
| 4 | **Attendance screen fails silently.** If members fail to load the user sees an empty list; save errors use `alert()`; first-timer attendance is fire-and-forget (`.catch(() => {})`) so failures lose data without telling anyone. | `AttendanceFlow.js:136, 161, 166` | Inline error with Retry; inline error banner on save; await the first-timer save and report failure. | M |
| 5 | **No "Mark all present / absent".** Every member defaults to absent; a 100-person group needs 100 taps. | No bulk action exists in the flow. | Add "Mark all present" and "Clear" to the sticky header, with an undo toast. Highest-value usability win. | S |
| 6 | **In-progress attendance is not saved.** Locking the phone or backing out loses every mark. | No draft persistence or leave-guard. | Autosave the marks to `localStorage` per group+date; restore on return; confirm on back if unsaved. | M |
| 7 | **Offline saves are invisible and can retry forever.** Queue is flushed from two places at once, only runs when the attendance page or service worker fires, and failed items are never dropped or shown. | `AttendanceFlow.js:183`, `useNotifications.js:265` | One shared queue module; "N saves waiting to upload" badge in the shell; cap retries and surface permanent failures. | M |
| 8 | **Pinch-zoom is disabled** (`maximum-scale=1, user-scalable=no`). WCAG 1.4.4 failure; hurts older congregation leaders. | `src/app/layout.js` viewport | Remove `maximumScale` and `userScalable`. | XS |
| 9 | **404 page is unbranded and unreadable** (dark text on black) with no link home. No `error.js`, `global-error.js` or `not-found.js` exist anywhere, so any runtime error shows a default page. | Seen in browser; `find` for boundaries returns none. | Add `not-found.js`, `error.js`, `global-error.js` using the app's styling, with "Try again" and "Go to dashboard". | S |

## P1 — Accessibility and consistency

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 10 | **Contrast failures on core brand colours.** The grey `mist` used for hints, placeholders, inactive tabs and row sub-labels is 2.6–2.9:1 (needs 4.5). Gold used as text is 2.1:1. Status badges are 3.0–4.1:1. It appears about 760 times via `text-mist` / `#8a9e90`. | Measured (table below). | Change the tokens once; most of the app improves. Replacement values below, all verified. |
| 11 | **Form labels are not tied to inputs.** 47 `<label>`s, only 3 use `htmlFor`, only 2 inputs have an `id`. Screen readers can't name the fields and tapping a label doesn't focus the input. | grep | Build one `<Field label=… >` component that generates the id/`htmlFor` pair, and use it everywhere. |
| 12 | **Modals are hand-rolled in 13 files, with 5 separate `Modal` components**, almost none with `role="dialog"`/`aria-modal`, focus trap, Escape-to-close or focus return. A global `.fixed.inset-0.z-50 { z-index … !important }` rule patches stacking. | `FixedModal`, `ModalShell`, three local `Modal`s | One accessible `<Modal>`/`<BottomSheet>` (the Radix dialog was already installed but unused — removed in the dependency cleanup; re-add if wanted, or use native `<dialog>`). |
| 13 | **Icon-only buttons have no accessible name** (7 `aria-label`s in the whole app; many use only `title`). The mobile avatar that opens the drawer is a `<div onClick>`. | `AppShell.js:252`, back buttons, sign-out | Add `aria-label`; make clickable divs real buttons. |
| 14 | **No toast/notice system.** 21 native `alert()/confirm()` calls and 29 swallowed `catch {}` blocks mean errors and successes are either blocking popups or invisible. | grep | One `useToast()` + `<Toaster/>`; replace `alert()`; log or show every caught error. |
| 15 | **Navigation bugs.** (a) On `/absentees/assign` both "Absentees" and "Follow-ups" are highlighted (prefix match). (b) The mobile bottom-nav **Messages** tab carries the *follow-up* count badge. (c) "More" is a fake link (`href="#"`). (d) `/settings` is a "Coming in the next build phase" placeholder while real Settings is `/profile`. (e) Desktop nav is 9 flat items with Absentees, Attendees and Follow-ups overlapping. | `AppShell.js`, `(app)/settings/page.js` | Exact-match active state for overlapping routes; move the badge to Absentees; make "More" a button; delete or redirect `/settings`; regroup nav (Attendance · People · Follow-up · Insights). |
| 16 | **Tiny text.** 149 inline `fontSize` of 9–11px, plus `text-2xs`. Sub-labels on every attendance row are 11.5px at 2.1:1 contrast. | grep | Minimum 12px, 13px for anything people must read at arm's length. |
| 17 | **Skip link, reduced-motion and focus styles.** No skip-to-content link; only 2 `prefers-reduced-motion` rules while the app animates stagger/slide/lift effects; the attendance search box sets `outline: none` with no replacement. | grep | Add skip link; wrap animations in a reduced-motion query; use `:focus-visible` rings everywhere. |

### Contrast: measured and proposed (WCAG AA text = 4.5)

| Use | Now | Ratio | Proposed | Ratio |
|---|---|---|---|---|
| `mist` hint text on white | `#8a9e90` | 2.85 | `#5b7062` | 5.33 |
| `mist` on ivory | `#8a9e90` | 2.61 | `#5b7062` | 4.89 |
| Gold used as text on ivory | `#c9a84c` | 2.10 | `#7a5c12` | 5.72 |
| Gold badge (`#a8862e` on pale gold) | `#a8862e` | 2.96 | `#7a5c12` | 5.38 |
| Green badge | `#16a34a` | 2.96 | `#166534` | 6.40 |
| Red badge | `#dc2626` | 4.13 | `#b91c1c` | 5.54 |
| Muted badge / forest-muted text | `#4a8a65` | 3.56 / 4.11 | `#2d6a47` | 5.57 / 6.43 |
| Sidebar sub-labels (35% white) | — | 2.92 | 60% white | 5.56 |
| Attendance row sub-label | `#b0bab5` | ~2.1 | `#5b7062` | 5.33 |

Passing already: body text on ivory (16.4), button text on forest (10.3), gold button (5.5), sidebar nav text (5.6).
Keep the decorative gold for fills, borders and large display text; use the darker gold only for small text.

## P2 — Design system and maintainability

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 18 | **Two parallel styling systems.** 1,658 inline `style={{…}}` blocks vs 1,451 `className`s; ~760 hard-coded hex colours in JS. The sidebar and attendance flow inject `<style>` tags and duplicate shell constants (`SIDEBAR_W`, `BOTTOM_NAV_H`). | counts | Move colours to the existing `@theme` tokens, then migrate screen by screen. Start with `AppShell` and `AttendanceFlow`. |
| 19 | **`tailwind.config.js` is dead.** The project uses Tailwind v4 `@theme`; the old config has a non-existent content path (`./app`, `./components`) and duplicates every token. | `tailwind.config.js` | Delete it; `@theme` in `globals.css` is the source of truth. |
| 20 | **`globals.css` has leftover scaffolding:** a pasted "ADD THESE RULES TO src/app/globals.css" comment block, z-index tokens that most components don't use (they hard-code 100/110/200), and `!important` overrides. | `globals.css` bottom | Clean up; adopt the z-index scale or remove it. |
| 21 | **Faux bold.** DM Sans is loaded at weights 300–600 but the UI asks for 700+ in ~350 places (`font-bold`, `fontWeight: 700`), so browsers synthesise bold — blurrier and wider than the real face. | `layout.js` vs grep | Load weight 700 for DM Sans, or cap UI weight at 600. |
| 22 | **Three icon sources.** Lucide in 33 files, hand-copied inline SVGs (`Ico`, `CheckSvg`, `ChevL`, …) in the attendance flow, and emoji used as icons/illustrations (⏳ ✅ ⭐ 📊 🎂). | grep | Use Lucide only; reserve emoji for message templates. |
| 23 | **Brand name inconsistency.** "Church Trakr" on the marketing page vs "ChurchTrakr" in the app and meta. The login logo is a "+" placeholder, not `logo.png`. | Seen in browser | Pick one spelling; use the real logo everywhere. |
| 24 | **Loading states on 9 of 34 routes.** Pages without `loading.js` (member detail, group detail, follow-up team, birthdays, credits, away, …) show nothing until data arrives. | `find` | Add skeletons, or one shared `loading.js` in the `(app)` group. |
| 25 | **Giant client components.** 12 files over 500 lines (largest 791). Hard to test, and the main reason styling stays inline. | `wc -l` | Split by section as each screen is restyled; extract `MemberRow`, `StatCard`, `Modal`, `Field`, `EmptyState`. |
| 26 | **Tap targets under 44px** in dense rows (36px back/filter buttons, 28px status circles, 34px avatar button). | `AttendanceFlow.js`, `AppShell.js` | Keep visuals, extend hit area to 44px. |

## What is already good (keep)

- Mobile-first shell: bottom nav, drawer, safe-area insets, `100dvh`.
- Attendance rows are full-width buttons with a large target, a text label ("Present"/"Absent") in addition to colour, a sticky live-stats header, search, and skeleton loading.
- A consistent, distinctive visual identity (forest + gold + Playfair); polished login/signup.
- Reasonable component CSS classes (`.btn`, `.input`, `.card`, `.badge`) with `:focus-visible` and `min-height: 44px` on buttons and 48px on inputs.
- Landing-page copy and structure are strong; once images exist it should convert well.

## Proposed order of work

1. **Quick wins (one PR, ~½ day):** items 1, 2, 3, 8, 9, 23 + the contrast token swap (10) + remove dead `tailwind.config.js` (19).
2. **Attendance flow (the screen used every week):** 4, 5, 6, 7, 16, 26 + toast system (14).
3. **Shared primitives:** `Modal`, `Field`, `Toaster`, `EmptyState`, `MemberRow`; then migrate forms and modals (11, 12, 13).
4. **Navigation clean-up:** 15, 17, 24.
5. **Design-system pass:** 18, 20, 21, 22, 25 screen by screen, starting with the shell.

## Next

A visual pass of the logged-in screens at 375 / 768 / 1280px needs a test login against a development or staging database
(not production). With that, I can complete Dashboard, Absentees, Members, Messaging, Reports and Admin, and mock the
redesigned attendance screen before building it.
