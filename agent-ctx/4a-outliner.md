# Task 4a — Outliner (scene-hierarchy panel)

## What I built
- `/home/z/my-project/src/components/editor/outliner.tsx`
- Default export `Outliner`, a `'use client'` React component, no props.
- Reads all state from `useEditorStore` (src/lib/editor/store.ts). Did NOT modify the store.
- Used `getEffective(settlement, edits, entityId)` so the panel reflects local transform edits on top of generated structures.

## Store API consumed
- State: `settlement`, `edits`, `hiddenEntityIds`, `selectedEntityIds`, `hoveredEntityId`, `outlinerFilter`, `outlinerGrouping`.
- Actions: `setOutlinerFilter`, `setOutlinerGrouping`, `toggleSelectEntity`, `setHovered`, `hideEntity`, `showEntity`, `selectAll`, `clearSelection`.

## Layout
Dark wrapper (`className="dark"`, `bg-zinc-950 text-zinc-300`):
1. Header — `OUTLINER` title (uppercase tracking-wider text-zinc-500 text-[11px]) + count Badge.
2. Search — shadcn `Input` with lucide `Search` icon, placeholder "Filter entities…", `X` clear button when non-empty. Bound to `outlinerFilter`.
3. Group toggle — shadcn `ToggleGroup` (single) with Kind / Faction / None items (icon+label, small). Active state styled emerald.
4. Tree — `max-h-full overflow-y-auto` with thin custom webkit scrollbar. Groups collapsible (ChevronRight/ChevronDown + label + count). Entity rows: colored kind icon, name (text-zinc-200), hanzi (text-zinc-500 text-[11px]), `#entityId` mono badge (text-[10px] text-zinc-600), Eye/EyeOff visibility toggle.
5. Empty state — when `settlement === null`: centered `Layers` icon, "No world generated", "Generate a world to populate the scene." (text-zinc-600).
6. Footer status row — "{N} entities · {M} selected · {K} hidden" (font-mono text-[11px] text-zinc-500) + All/None quick actions.

## Visual states on entity rows
- Selected (`selectedEntityIds.includes(id)`): `bg-emerald-500/15`, `border-l-2 border-l-emerald-500`, `text-emerald-200`.
- Hovered (not selected): `bg-zinc-800/60`, `text-zinc-200`. Also calls `setHovered(id)` on enter / `setHovered(null)` on leave.
- Hidden (`hiddenEntityIds.has(id)`): `opacity-40`.
- Click: `toggleSelectEntity(id)`. Eye button: `stopPropagation` then `hideEntity`/`showEntity`.

## Kind → icon / color mapping (accent palette only — no indigo, no blue)
- household → Home / amber-300
- lineage_hall → Landmark / rose-300
- well → Droplet / cyan-300
- threshing_ground, mill → Wheat / amber-400
- spirit_shrine → Sparkles / emerald-300
- dock → Ship / cyan-400
- path → Route / zinc-400
- paddy, dryland_garden → Sprout / emerald-400
- graveyard → Cross / zinc-400
- levee → Layers / zinc-400

## Grouping
- `kind`: groups by `structure.kind`, ordered via canonical `KIND_ORDER` list.
- `faction`: groups by `structure.metadata.faction` (fallback "Unaffiliated", sorted last).
- `none`: single flat "Entities" bucket, no group headers, no collapse.

## Lint
- `bun run lint` → clean (no errors, no warnings).

## Notes for downstream agents
- The component is fully presentational and self-contained; it does not fetch data.
- Tooltip on the eye button uses shadcn Tooltip (which wraps its own TooltipProvider).
- ToggleGroup items override the default `h-8` (size="sm") with `h-6` — safe because `cn()` uses tailwind-merge.
- Local UI state is only the `collapsed: Set<string>` for group collapse.
- No `any`, no forbidden functions, strict TS throughout.
