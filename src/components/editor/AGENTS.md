# Editor UI Instructions

Scope: `src/components/editor/**` (EditorLayout, viewport, panels, toolbar).

## Authority

The editor is a **view and control surface** over canonical actions. It is
**not** an authoritative store.

- Transient UI state lives in `src/lib/editor/store.ts` (Zustand):
  selection, transforms, panel state, logs, perf stats.
- Canonical UI actions live in `src/lib/studio-ui/action-registry.ts`.
  Every button, context menu, command palette entry, keyboard shortcut, and
  Grand Architect tool must reference a registered action ID. **No unique
  ad hoc logic embedded in button components.**
- Engine state is mutated only through the canonical command/transaction
  path. UI components dispatch actions; they do not call engine mutators
  directly.

## Do not

- Embed authoritative mutation logic in components.
- Update React state every simulation frame (causes render loops). Use refs
  and the `PhysicsRuntime` singleton; read interpolated snapshots.
- Add another top-level tab or panel without information-architecture
  review. The current panel set is large; consolidation is preferred to
  growth.
- Create an operational button without a canonical action ID.
- Add a new panel that duplicates an existing panel's responsibility.

## Panel state requirements (mandatory)

Every panel must handle **all six** states:

1. **loading** — show a skeleton or spinner.
2. **failure** — show an actionable error message with retry.
3. **blocked** — show what is blocking and what would unblock it.
4. **empty** — show a helpful empty state with a call to action.
5. **overflow** — `max-h-96 overflow-y-auto` with custom scrollbar styling.
6. **keyboard access** — minimum 44 px touch targets; tabbable; ARIA labels.

## 3D viewport

- `Viewport3D.tsx` is the React Three Fiber canvas.
- `CharacterController.tsx` (editor mode) and `PlaytestCharacter.tsx`
  (playtest mode) both use the `PhysicsRuntime` singleton via refs only.
- Camera modes are separated: `EDITOR` (OrbitControls) vs `PLAYTEST`
  (character follow). Escape exits playtest mode.
- Use `react-resizable-panels` for panel layout; do not hand-roll splitters.

## UI toolkit

- **shadcn/ui (New York)** is the canonical component library. All
  components live in `src/components/ui/`. Do not reimplement existing
  components.
- **Lucide icons** for iconography.
- **Tailwind CSS 4** for styling. No indigo or blue colors unless explicitly
  requested.
- **Framer Motion** for subtle transitions (hover, focus, page). Do not
  animate every state change.

## Required validation

Changes under `src/components/editor/` require:

1. `bun run lint` (clean).
2. `bun run typecheck` (no new errors in your files).
3. Manual browser verification of the affected panel in `EDITOR` mode.
4. If you touched the viewport or physics, verify `PLAYTEST` mode still
   works (WASD move, Space jump, Shift sprint, Escape exits).

## Accessibility (mandatory)

- Semantic HTML (`main`, `header`, `nav`, `section`, `article`).
- Proper ARIA roles, labels, descriptions.
- `sr-only` class for screen-reader-only content.
- Keyboard navigation for every interactive element.
- Responsive design (mobile-first, then enhance for desktop).

## Layout (mandatory)

- Sticky footer if a footer exists (`min-h-screen flex flex-col` root,
  `mt-auto` on the footer).
- Mobile safe area insets on iOS.
- Consistent card padding (`p-4` or `p-6`).
- Consistent gap spacing (`gap-4` or `gap-6`).
