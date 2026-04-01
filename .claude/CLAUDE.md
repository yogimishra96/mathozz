
# CLAUDE.md - Mathozz Project Guide

## Project Snapshot

- App name: `mathozz`
- Stack: Angular `21.x`, TypeScript `5.9`, Firebase JS SDK `12.x`
- Architecture: standalone Angular app, zoneless change detection, signal-first state
- Styling: SCSS, mostly inline component styles
- Backend: Firebase Auth + Firestore via modular SDK (no AngularFire)

## Active Runtime Entry Points

- Bootstrap: `src/main.ts`
- Root UI: `src/app/app.component.ts` (`AppComponent`)
- App config + Firebase init: `src/app/app.config.ts`
- Domain/service logic: `src/app/app.service.ts`

## Important Reality Check

There are scaffold leftovers in `src/app/app.ts`, `src/app/app.html`, and `src/app/app.scss`.
Current runtime uses `AppComponent` from `app.component.ts`, not `App` from `app.ts`.
Do not migrate code into the scaffold files unless explicitly requested.

## Required Engineering Standards

### TypeScript

- Keep strict typing.
- Prefer inference when obvious.
- Avoid `any`; use `unknown` when uncertain.

### Angular

- Use standalone components (do not add NgModules).
- Do not set `standalone: true` explicitly in decorators for Angular v20+.
- Use signals (`signal`, `computed`) for component and service state.
- Keep `ChangeDetectionStrategy.OnPush` for components.
- Use `host` metadata over `@HostBinding` and `@HostListener`.
- Prefer Angular built-in control flow (`@if`, `@for`, `@switch`) in templates.

### Accessibility

- Maintain WCAG AA minimums.
- Keep keyboard navigation intact (game already has keyboard-driven interaction).
- Ensure focus styles remain visible and sufficient color contrast is preserved.

## Project-Specific Rules

- Keep using Firebase modular SDK imports from `firebase/*`.
- Do not introduce AngularFire unless explicitly requested.
- Preserve zoneless setup (`provideZonelessChangeDetection`) in `app.config.ts`.
- Keep game/app state centralized in `AppService` unless there is a clear refactor goal.
- Avoid unnecessary routing/module architecture changes; this app is currently single-root, signal-driven screen state.

## Data + Firebase Notes

- Environment config lives in:
  - `src/environments/environment.ts`
  - `src/environments/environment.prod.ts`
- Firestore config files:
  - `firestore.rules`
  - `firestore.indexes.json`
- Firebase project/deploy config:
  - `firebase.json`
  - `.firebaserc`

## Commands

- Install: `npm install`
- Dev server: `npm start` (runs `ng serve`)
- Build: `npm run build`
- Watch build: `npm run watch`
- Test: `npm test`

## Code Change Guidance

- Prefer minimal, surgical edits over broad rewrites.
- Keep public behavior stable unless task asks for behavior changes.
- Match existing naming patterns (`Screen`, `Difficulty`, `LeaderboardScope`, etc.).
- If editing auth or persistence flows, preserve guest merge behavior and leaderboard updates.

## Testing Guidance

- Run `npm test` for behavioral changes.
- For UI-heavy changes in `app.component.ts`, verify keyboard interactions and mobile layout.
- For service changes in `app.service.ts`, verify auth transitions, guest limits, XP/level updates, and Firestore sync paths.

## Output Quality Bar

- Keep code maintainable, readable, and strongly typed.
- Avoid introducing dead files or parallel implementations.
- Document non-obvious logic with short, targeted comments only where needed.
