The project is at risk of becoming a warehouse of capabilities that technically exist but cannot be reliably found, reached, understood, or operated. A profound Studio is not measured by having eighteen tabs. It is measured by whether a user—and the Grand Architect—can move from intent to result without becoming lost.

The public package already contains strong UI building blocks such as Radix components, react-resizable-panels, cmdk, drag-and-drop support, and React Three Fiber. However, its scripts and development dependencies do not currently show a proper Playwright, axe accessibility, component-testing, or visual-regression harness. The repository also contains numerous manually captured editor screenshots, but isolated screenshots cannot prove button behavior, scrolling reachability, keyboard operation, responsive reflow, or complete workflows.

Playwright supports role-based interaction, accessibility-tree snapshots, and integration with @axe-core/playwright, but its own documentation correctly warns that automated accessibility scans must be supplemented by manual assessment. WCAG 2.2 also requires keyboard operability, freedom from keyboard traps, and visible, unobscured focus—important requirements for a dense professional editor.

The agent needs a UI Integration and Experience Program, not another visual makeover.

The design principle

The Studio should expose one unified interaction model:

User intent
├── direct manipulation in the viewport
├── structured panel controls
├── command palette/search
├── keyboard shortcut
└── natural-language Grand Architect request
          │
          ▼
Same registered capability/action
          │
          ▼
Preview → execute → progress → result → undo/history

The Grand Architect must not have a separate hidden universe of capabilities from the human UI.

For every legitimate action:

the user should be able to find and execute it;
the Grand Architect should be able to discover and invoke it;
the Studio should be able to explain whether it is available;
the UI should show progress, failure, evidence, and undo state;
automated tests should prove the interaction works.

That is how everything becomes seamless.

Paste this entire directive to the agent
TASK: GRAND ARCHITECT LIVE STUDIO — COMPLETE UI/UX/GUI/HUD ACCESSIBILITY, DISCOVERABILITY, RESPONSIVENESS, AND INTERACTION AUDIT

This is now the highest-priority stabilization milestone.

Stop adding unrelated engine features, plugins, API routes, editor tabs, procedural generators, Frontier techniques, or subsystem dashboards until the existing capabilities can be reliably accessed, understood, executed, inspected, and verified through the Studio.

The problem is not merely visual styling.

The problem is complete interaction integrity:

- Are all implemented capabilities reachable?
- Do all visible buttons perform a real action?
- Are unavailable actions clearly identified and explained?
- Can all content be reached through scrolling?
- Does long content wrap or scroll locally rather than breaking the entire layout?
- Do panels remain usable after resizing?
- Can users operate the Studio through keyboard and mouse?
- Can the Grand Architect access the same actions as the human user?
- Is the distinction between prototype, available, blocked, running, failed, and validated visible?
- Can a user move from intent to verified result without knowing internal API route names?
- Does the UI remain stable across browser sizes, zoom levels, large content sets, and failure states?

The target is not “a pretty dashboard.”

The target is a profound, professional, AI-native authoring environment that feels coherent even though the engine is highly modular.

==================================================
0. NON-NEGOTIABLE PRODUCT PRINCIPLES
==================================================

1. The Studio is one coherent product, not a collection of engineering demos.

2. Do not expose every subsystem as an equal top-level tab.

3. Features should appear where they are contextually relevant.

4. Direct manipulation, structured controls, command-palette actions, and Grand Architect actions must converge on the same canonical action implementation.

5. No visible button may silently do nothing.

6. No action may report success when it only returned HTTP 200, registered a handler, created metadata, or displayed a toast.

7. Every asynchronous action must show:
   - queued;
   - running;
   - progress when measurable;
   - cancellation availability;
   - completed;
   - failed;
   - retry;
   - output location;
   - resulting transaction or revision.

8. Every unavailable action must show why:
   - provider unavailable;
   - capability not implemented;
   - no selection;
   - wrong object type;
   - insufficient permission;
   - validation blocked;
   - dependency missing;
   - process offline;
   - unsupported browser;
   - prototype not promoted.

9. Long content must never make controls unreachable.

10. The browser page itself should not receive an accidental horizontal scrollbar during normal Studio operation.

11. Scrolling must be local and intentional:
    - Outliner scrolls independently;
    - Inspector scrolls independently;
    - bottom dock scrolls independently;
    - code blocks and large tables may scroll horizontally inside themselves;
    - the entire application shell remains fixed and stable.

12. Layout state must persist:
    - panel sizes;
    - collapsed panels;
    - selected workspace;
    - open document;
    - active viewport mode;
    - bottom-dock state;
    - UI scale where appropriate.

13. There must always be a “Reset Workspace Layout” action.

14. The UI must distinguish:
    - Studio/editor mode;
    - playtest/game mode;
    - runtime HUD;
    - debug overlays;
    - Grand Architect proposal mode.

15. Do not label the UI “complete,” “profound,” or “production ready” based on appearance alone.

==================================================
1. FIRST RECONCILE REPOSITORY AND PREVIEW TRUTH
==================================================

Before modifying UI code, preserve:

git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git log -10 --oneline --decorate
git ls-remote origin refs/heads/main

Record:

- exact local SHA;
- exact remote SHA;
- preview build SHA;
- dirty status;
- package version;
- browser build under test;
- whether the preview corresponds to the source being audited.

Do not audit one revision and fix another.

Do not report UI success from a dirty hot-reload state without also reproducing it from a clean production build.

==================================================
2. BUILD A COMPLETE UI SURFACE INVENTORY
==================================================

Programmatically inventory every interactive surface in the repository.

Find and classify:

- buttons;
- icon buttons;
- links;
- tabs;
- menu items;
- context-menu actions;
- dropdown items;
- switches;
- checkboxes;
- sliders;
- text inputs;
- number inputs;
- drag handles;
- resizers;
- tree nodes;
- outliner actions;
- keyboard shortcuts;
- command-palette commands;
- viewport tools;
- gizmos;
- modal actions;
- toast actions;
- API-backed quick actions;
- Grand Architect tools;
- hidden developer actions;
- runtime HUD controls;
- debug controls.

Create a UI Surface Manifest.

Required schema:

interface UiSurfaceRecord {
  surfaceId: string;
  componentPath: string;
  visibleLabel: string;
  accessibleName: string;
  role: string;

  workspace:
    | "world"
    | "asset"
    | "character"
    | "animation"
    | "material"
    | "simulation"
    | "architect"
    | "playtest"
    | "diagnostics"
    | "global";

  actionId?: string;
  capabilityId?: string;
  apiRoute?: string;
  shortcut?: string;

  currentStatus:
    | "working"
    | "broken"
    | "no-op"
    | "placeholder"
    | "unreachable"
    | "overflow-hidden"
    | "prototype"
    | "unknown";

  evidence?: string[];
  testIds?: string[];
  notes?: string[];
}

For each visible action determine:

- what user intent it represents;
- what code it calls;
- whether that code executes;
- whether a state change occurs;
- whether the change appears in the viewport or appropriate panel;
- whether the result can be undone;
- whether failure is visible;
- whether the action is duplicated elsewhere;
- whether the label accurately describes its maturity.

Do not infer that a button works because its click handler exists.

Invoke it in a real browser and inspect the result.

Produce:

UI_SURFACE_MANIFEST.json
UI_ACTION_AUDIT.md
UNREACHABLE_CAPABILITIES.md
BROKEN_INTERACTIONS.md
PLACEHOLDER_SURFACES.md

Do not spend the entire milestone creating documents. Generate these from the implementation audit and update them alongside fixes.

==================================================
3. REPLACE TAB SPRAWL WITH A COHERENT INFORMATION ARCHITECTURE
==================================================

The reported eighteen bottom-dock tabs are not a sustainable primary navigation system.

Do not delete capabilities.

Reorganize them.

Use a small number of top-level workspaces:

1. WORLD
   - terrain;
   - structures;
   - vegetation;
   - environment;
   - entities;
   - World Fabric;
   - streaming;
   - destruction;
   - navigation.

2. ASSETS
   - Asset Forge;
   - imported assets;
   - img2threejs;
   - Hunyuan/Buffalo candidates;
   - MeshKernel;
   - operation stack;
   - materials;
   - UV;
   - LOD;
   - collision;
   - validation;
   - revisions.

3. CHARACTERS
   - body;
   - equipment;
   - garment fitting;
   - body-hide zones;
   - skeleton;
   - weights;
   - sockets;
   - morphs;
   - animation compatibility.

4. ANIMATION & PRESENTATION
   - clips;
   - state machines;
   - timeline;
   - events;
   - VFX;
   - cameras;
   - cinematics;
   - audio hooks.

5. SIMULATION
   - NPC simulation;
   - economy;
   - ecology;
   - combat;
   - cultivation;
   - schedules;
   - simulation LOD;
   - world events.

6. ARCHITECT
   - conversation;
   - current plan;
   - proposed operations;
   - clarifications;
   - capability discovery;
   - evidence;
   - job execution;
   - approval queue.

7. PLAYTEST
   - embodied game view;
   - runtime HUD;
   - input testing;
   - game-state inspection;
   - performance overlay;
   - return-to-editor controls.

8. DIAGNOSTICS
   - console;
   - crashes;
   - jobs;
   - conformance;
   - benchmarks;
   - Frontier Lab;
   - capability gaps;
   - provenance;
   - security;
   - build information.

These workspaces should not all be rendered simultaneously.

Within each workspace use contextual panes.

Recommended desktop shell:

TOP BAR
- project/world identity;
- active workspace;
- save state;
- undo/redo;
- play/pause;
- command palette;
- job status;
- build provenance;
- user/Architect mode.

LEFT SIDEBAR
- Outliner or Asset Browser depending on workspace;
- searchable;
- filterable;
- collapsible;
- virtualized for large lists.

CENTER
- primary 3D viewport;
- UV canvas;
- timeline;
- graph;
- comparison viewer;
- whichever canvas belongs to the current task.

RIGHT SIDEBAR
- context-sensitive Inspector;
- only tools relevant to current selection and mode;
- capability status;
- validation warnings.

BOTTOM DOCK
- timeline;
- console;
- jobs;
- evidence;
- history;
- diagnostics;
- task-specific secondary tools.

The bottom dock is not the primary application navigation.

Consolidate engineering-only surfaces under Diagnostics rather than allowing them to compete with authoring tools.

==================================================
4. CREATE ONE CANONICAL UI ACTION REGISTRY
==================================================

Create a canonical UiActionRegistry shared by:

- buttons;
- context menus;
- command palette;
- keyboard shortcuts;
- Grand Architect capability discovery;
- automated testing;
- documentation;
- action telemetry.

Suggested contract:

interface UiActionDefinition<TContext = unknown> {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  category: string;
  icon?: string;

  capabilityId?: string;
  maturity:
    | "prototype"
    | "integrated"
    | "browser-proven"
    | "validated"
    | "blocked";

  availability(
    context: TContext
  ): {
    available: boolean;
    reason?: string;
    remediation?: string;
  };

  invoke(
    context: TContext,
    signal: AbortSignal
  ): Promise<UiActionResult>;

  undoable: boolean;
  dangerous: boolean;
  requiresConfirmation?: boolean;
  supportsPreview?: boolean;

  shortcut?: string;
  keywords: string[];
  documentationRef?: string;
}

interface UiActionResult {
  status: "completed" | "failed" | "cancelled" | "blocked";
  message: string;
  transactionId?: string;
  jobId?: string;
  artifactIds?: string[];
  revision?: number;
  error?: StructuredUiError;
}

Every button must reference an action ID.

Avoid unique ad hoc logic embedded in button components.

A command-palette entry, toolbar button, context menu, and Architect request for the same action must call the same registered action.

Example:

terrain.carveTunnel

Human paths:
- terrain toolbar;
- right-click terrain;
- command palette;
- keyboard shortcut where appropriate.

Grand Architect path:
- capability lookup;
- authorized action invocation.

Canonical execution:
- the same UiActionDefinition;
- the same validation;
- the same EngineRuntime command;
- the same progress state;
- the same undo/history result.

Add a development assertion:

A visible interactive control with no registered action or local well-defined UI behavior must be flagged.

==================================================
5. CREATE A CAPABILITY ACCESS MATRIX
==================================================

For every engine and Studio capability, record whether it has:

- direct manipulation;
- structured UI;
- command-palette access;
- keyboard shortcut;
- Grand Architect tool;
- API;
- documentation;
- automated browser test;
- current maturity;
- disabled reason.

Suggested schema:

interface CapabilityAccessRecord {
  capabilityId: string;
  label: string;
  maturity: string;

  directManipulation: boolean;
  structuredPanel: boolean;
  commandPalette: boolean;
  shortcut?: string;
  architectTool: boolean;
  apiAvailable: boolean;

  workspace: string;
  navigationPath: string[];
  requiredSelection?: string;
  testIds: string[];

  missingAccessPaths: string[];
}

Core rule:

Every user-facing capability must have at least:

1. one obvious contextual access path;
2. one searchable command-palette path;
3. one Grand Architect path when it is safe for AI invocation.

Not every capability needs a toolbar icon.

Do not create visual clutter to satisfy discoverability.

Use search and context.

==================================================
6. MAKE THE GRAND ARCHITECT A FIRST-CLASS UI PARTICIPANT
==================================================

The Grand Architect should not merely be a chat panel.

It needs structured interaction with the Studio.

When the user says:

“Make the selected roof wider and add more corner lift.”

The UI should:

1. identify and visibly highlight the selected roof;
2. show which operation or semantic part is targeted;
3. show the interpreted parameter changes;
4. show affected assets/entities;
5. present a preview where appropriate;
6. execute through the same action and transaction system;
7. show progress;
8. show before/after evidence;
9. allow accept, revise, undo, or reject.

When ambiguity exists:

- highlight candidate objects;
- ask “Are you referring to this roof?”;
- allow the user to click the intended region;
- preserve the clarification as grounding evidence.

Create an Architect Action Center containing:

- current user intent;
- interpreted target;
- action plan;
- active jobs;
- required approvals;
- proposed changes;
- evidence;
- capability gaps;
- retry/fallback choices;
- completed results.

The Grand Architect should be able to:

- open the relevant workspace;
- focus the correct panel;
- select the affected object;
- reveal a hidden control;
- explain why a command is unavailable;
- deep-link the user to the corresponding action;
- never invent a successful outcome.

Human and Architect actions must enter the same history.

==================================================
7. FIX LAYOUT, SCROLLING, WRAPPING, AND OVERFLOW SYSTEMATICALLY
==================================================

Establish a formal layout contract.

The application shell should normally use:

html,
body,
#__next or equivalent root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

Every flex or grid child that is expected to shrink must explicitly receive:

min-width: 0;
min-height: 0;

Every panel must explicitly choose one behavior:

- fixed;
- resizable;
- collapsible;
- scrollable;
- virtualized;
- overflow-menu;
- modal.

Do not rely on accidental browser overflow.

Text rules:

- ordinary prose wraps;
- labels wrap only when the control layout supports it;
- long hashes, URLs, asset IDs, error strings, and generated names use safe breaking;
- code blocks scroll horizontally inside their own container;
- tables use local overflow and sticky headers where useful;
- do not make the whole application scroll horizontally.

Use:

overflow-wrap: anywhere;

for values that can contain long unbroken strings.

Do not apply `word-break: break-all` indiscriminately because it damages readability.

Panel content:

- scroll body independently from fixed panel header;
- preserve toolbar and title;
- provide visible scrollbar or clear scrolling affordance;
- do not hide the bottom action bar behind the viewport or browser edge;
- provide adequate bottom padding;
- ensure fixed headers do not obscure focused elements.

Dialogs and popovers:

- maximum width and height based on viewport;
- independently scrollable content body;
- visible close control;
- Escape support;
- focus containment;
- focus returned to trigger when closed;
- no content extending offscreen;
- nested dialogs avoided.

Tabs:

- do not shrink labels into illegibility;
- do not clip undiscoverable tabs;
- use a scrollable tab row, grouped navigation, or overflow menu;
- show active selection clearly;
- keyboard arrow navigation;
- distinguish focused tab from selected tab.

Large collections:

- virtualize Outliner, Asset Browser, logs, histories, and capability lists;
- preserve search/filter state;
- do not render thousands of rows simultaneously;
- retain selection while filtering where reasonable.

Resizable panels:

- meaningful minimum sizes;
- collapse affordance;
- double-click reset where appropriate;
- keyboard-accessible resizing where feasible;
- no panel capable of reducing another panel to zero unintentionally;
- stored layout migration/versioning;
- Reset Layout action.

Create automated overflow assertions.

At every tested viewport:

document.documentElement.scrollWidth <= document.documentElement.clientWidth

unless the route is explicitly designed as a normal scrolling document.

For every designated scroll panel:

- scrollHeight may exceed clientHeight;
- the bottom sentinel must be reachable;
- the final control must be visible after scrolling;
- keyboard scrolling must work;
- scrolling must not unexpectedly move the wrong parent.

==================================================
8. CONTENT-STRESS TEST THE UI
==================================================

Do not test only short ideal labels.

Create a deterministic UI stress fixture containing:

- 10,000 world entities;
- 5,000 assets;
- 1,000 operations in history;
- 100 active jobs;
- deeply nested structure hierarchy;
- long asset names;
- long hashes;
- long Windows paths;
- long exception messages;
- long Grand Architect explanations;
- large generated specifications;
- large tables;
- many capability warnings;
- 50 open documents;
- empty states;
- partial-loading states;
- failed states;
- offline worker state;
- stale build state;
- permission-denied state.

Include names such as:

“Immortal_Astral_Continent_Wang_Family_Ancestral_Sword_Revision_000000001928371”

and intentionally unbroken hashes/URLs.

Verify:

- no important control disappears;
- text does not overlap icons;
- tooltips remain on-screen;
- scroll containers remain usable;
- virtualized lists retain stable selection;
- long content can be copied;
- no layout thrashing;
- no React key warnings;
- no infinite render loops;
- no unusable nested scrollbar maze.

==================================================
9. RESPONSIVE AND DISPLAY TEST MATRIX
==================================================

This is primarily a desktop professional tool, but it must remain robust across common desktop displays.

Test at minimum:

1366 × 768
1440 × 900
1536 × 864
1920 × 1080
2560 × 1440
3440 × 1440
3840 × 2160

Test browser zoom:

80%
100%
125%
150%
200%

Test device-pixel ratios:

1
1.25
1.5
2

Test:

- Chromium;
- Firefox;
- production build;
- development build only as supplemental evidence.

WebKit may be a smoke target if supported, but Firefox and Chromium are mandatory.

At 1366 × 768:

- central viewport remains usable;
- no critical action is below an unreachable fold;
- panels can collapse;
- workspace switching remains accessible;
- bottom dock cannot consume the entire viewport accidentally.

At 4K:

- controls do not become physically tiny;
- UI-scale setting works;
- line lengths remain readable;
- panels do not expand into excessive empty space.

At 200% zoom:

- labels are not clipped;
- core workflows remain operable;
- focused controls remain visible;
- menus and dialogs remain inside the viewport;
- no keyboard trap appears.

==================================================
10. ACCESSIBILITY AND KEYBOARD OPERATION
==================================================

Target WCAG 2.2 AA where applicable to a desktop web editor.

Install and configure:

- Playwright;
- @axe-core/playwright;
- accessibility-tree snapshot testing;
- a manual accessibility checklist.

Automated accessibility testing is necessary but not sufficient.

Required checks:

- every icon-only control has an accessible name;
- labels are programmatically associated with controls;
- buttons are real buttons rather than clickable divs;
- menu semantics are correct;
- tabs use correct tablist/tab/tabpanel structure;
- trees use appropriate roles and keyboard behavior;
- dialogs have names and descriptions;
- focus visibly moves;
- focus is never trapped unintentionally;
- focus is not hidden behind sticky panels;
- disabled controls expose disabled state;
- disabled reason is available;
- error messages are associated with fields;
- status updates use appropriate live-region behavior without excessive announcements;
- drag-only interactions have keyboard or form alternatives where practical;
- color is not the only state indicator;
- contrast is adequate;
- reduced-motion preference is respected;
- animations do not obscure functionality;
- viewport gizmos have structured alternatives in Inspector fields.

Create a complete keyboard walkthrough:

- open command palette;
- switch workspace;
- navigate Outliner;
- select entity;
- move focus to Inspector;
- edit a property;
- apply;
- undo;
- open Jobs;
- inspect result;
- close Jobs;
- return focus to previous location.

No mouse.

Add shortcut discovery:

- shortcut shown in menus/tooltips;
- centralized shortcut editor;
- conflict detection;
- reset defaults;
- shortcuts disabled while typing unless explicitly intended.

==================================================
11. ACTION AND BUTTON INTEGRITY TESTING
==================================================

Create a browser test that discovers every visible button, tab, menu item, and link in each deterministic test state.

Do not blindly click destructive actions against arbitrary data.

Use the UiActionRegistry and safe test fixtures.

For every action assert one of:

A. ACTION COMPLETES
- expected visible state changes;
- transaction/job/artifact is created;
- no error occurs;
- result is inspectable.

B. ACTION OPENS A SURFACE
- expected panel/menu/dialog appears;
- it has accessible name;
- it can be closed;
- focus behavior is correct.

C. ACTION IS DISABLED
- disabled state is visible;
- reason exists;
- remediation is shown where possible.

D. ACTION REQUIRES CONFIRMATION
- confirmation describes consequences;
- cancel preserves state;
- confirm creates expected transaction.

No acceptable category:

E. NOTHING HAPPENS.

Flag:

- no-op buttons;
- buttons that only log to console;
- stale API calls;
- swallowed errors;
- promises not awaited;
- buttons enabled during incompatible states;
- duplicate submit;
- actions firing twice under Strict Mode;
- actions using outdated selected objects;
- actions obscured by overlays;
- invisible click targets;
- pointer-events problems;
- hover-only access.

Every critical action must be tested with real user-facing locators such as roles and labels, not brittle CSS implementation selectors.

Use stable test IDs only where semantics are insufficient, such as viewport hit targets.

==================================================
12. GRAND ARCHITECT CAPABILITY DISCOVERY TEST
==================================================

Add a test proving the Grand Architect can discover and access the same actions as the UI.

For each test capability:

1. human opens action through contextual UI;
2. human opens action through command palette;
3. Grand Architect discovers action through capability registry;
4. all paths resolve to the same action ID;
5. availability and disabled reasons match;
6. invocation uses the same EngineRuntime/Asset Forge command;
7. history records the actor correctly;
8. undo behaves consistently.

Reference capabilities:

- create sect hall;
- create box;
- generate character candidate;
- create terrain mountain;
- carve tunnel;
- export candidate;
- place validated entity instance;
- create walk cycle;
- inspect UV data;
- invoke img2threejs reconstruction job;
- inspect runtime status;
- open crash evidence.

Do not allow the Architect to call hidden unsafe APIs that have no equivalent authorized capability.

==================================================
13. CREATE A REAL JOB CENTER
==================================================

Many Studio actions are asynchronous and should not appear as isolated button responses.

Create a unified Job Center.

Each job displays:

- job ID;
- action;
- requesting actor;
- target;
- status;
- queue time;
- start time;
- elapsed time;
- progress;
- stage;
- provider;
- source revision;
- output revision;
- warnings;
- logs;
- cancellation;
- retry;
- resulting artifacts;
- evidence;
- errors.

Examples:

- terrain remesh;
- GLB export;
- img2threejs reconstruction;
- Buffalo generation;
- topology validation;
- LOD generation;
- collision compilation;
- animation processing;
- Visual Evidence review.

Clicking a job should take the user to its target and output.

The Architect can reference jobs conversationally:

“Job 82 failed because the generated mesh exceeded the vertex budget.”

Do not communicate long-running work only through transient toasts.

==================================================
14. ERROR, EMPTY, LOADING, AND BLOCKED STATES
==================================================

Every major panel must explicitly support:

- loading;
- empty;
- ready;
- partially available;
- stale;
- disconnected;
- blocked;
- error;
- retrying.

Examples:

Empty Asset Forge:
“No asset candidates yet.”
Primary action:
“Import reference” or “Create asset.”

Provider offline:
“img2threejs worker is unavailable.”
Details:
last health check, expected provider version, retry action.

No selected object:
“Select an object to inspect its operations.”
Do not show a blank gray panel.

Prototype action:
“Experimental. Not accepted for production assets.”
Do not make it look identical to validated actions.

Failed action:
show:
- what failed;
- what was preserved;
- whether anything committed;
- retry;
- report/evidence;
- fallback provider.

Never display an ambiguous green success toast for an incomplete multi-stage operation.

==================================================
15. DESIGN SYSTEM AND VISUAL LANGUAGE
==================================================

Create a coherent design system rather than styling each panel independently.

Define tokens for:

- spacing;
- panel sizes;
- typography;
- density;
- borders;
- radius;
- shadows;
- motion;
- focus;
- surfaces;
- selection;
- status;
- warning;
- error;
- success;
- prototype;
- blocked;
- evidence confidence;
- validation maturity.

Status colors must also include text/icon/shape distinctions.

Create density profiles:

COMFORTABLE
- larger controls;
- greater spacing;
- suitable for learning and touch-adjacent use.

COMPACT
- professional desktop density;
- still accessible;
- not microscopic.

Do not let every panel choose unrelated font sizes and paddings.

Typography hierarchy:

- workspace title;
- panel title;
- section heading;
- field label;
- field value;
- helper text;
- metadata;
- code/log text.

Use short labels and tooltips where possible.

Do not put paragraphs into toolbars.

Long explanations belong in:
- expandable help;
- evidence panel;
- documentation drawer;
- Architect explanation;
- contextual help.

The visual goal is not decorative sci-fi noise.

The goal is calm, legible, powerful, spatially coherent xianxia technology:

- subtle xianxia identity;
- restrained ornament;
- strong information hierarchy;
- high contrast where needed;
- viewport remains dominant;
- effects do not reduce readability;
- state is immediately understandable.

==================================================
16. STUDIO MODE VERSUS GAME HUD
==================================================

Treat the professional Studio GUI and the in-game HUD as separate products sharing a design language.

STUDIO GUI

Purpose:
- authoring;
- inspection;
- debugging;
- simulation control;
- asset management;
- Grand Architect interaction.

Characteristics:
- resizable panels;
- keyboard-heavy;
- dense information;
- multiple workspaces;
- provenance and evidence;
- direct manipulation.

GAME HUD

Purpose:
- play;
- cultivation progression;
- combat;
- exploration;
- dialogue;
- inventory;
- technique access.

Characteristics:
- immersive;
- minimal when idle;
- context-sensitive;
- controller and keyboard/mouse compatible;
- no editor terminology;
- no engineering diagnostics unless debug mode is enabled.

The playtest transition must:

1. save or preserve editor state;
2. enter runtime input capture deliberately;
3. hide Studio panels;
4. show game HUD;
5. expose a clear Return to Studio command;
6. restore prior layout and selection;
7. avoid trapping the cursor;
8. preserve crash and performance evidence.

Test game HUD at:

- 16:9;
- 16:10;
- ultrawide;
- UI scales;
- reduced-motion mode;
- keyboard/mouse;
- gamepad where implemented.

HUD elements must respect safe margins.

Do not use fixed pixel positioning that only works at 1920 × 1080.

==================================================
17. REQUIRED CORE WORKFLOW TESTS
==================================================

Create executable workflows rather than page-load screenshots.

WORKFLOW A — WORLD EDITING

- open World workspace;
- select terrain;
- choose tunnel tool;
- modify radius;
- preview affected volume;
- execute;
- observe job;
- observe terrain change;
- inspect revision;
- undo;
- redo;
- save;
- reload.

WORKFLOW B — ASSET AUTHORING

- open Assets;
- create sect gate;
- select component;
- edit operation parameter;
- inspect result;
- assign material;
- validate;
- export candidate;
- register revision;
- place two instances;
- move one instance;
- undo.

WORKFLOW C — CHARACTER

- create base character;
- equip robe;
- inspect body-hide zones;
- inspect sockets;
- switch gender/body preset;
- verify panel remains scrollable;
- inspect warnings;
- save candidate.

WORKFLOW D — ANIMATION

- open clip;
- select track;
- add keyframe;
- scrub;
- add event;
- play;
- stop;
- undo;
- verify timeline does not overflow.

WORKFLOW E — GRAND ARCHITECT

- ask Architect to widen selected roof;
- verify target highlight;
- inspect interpreted parameters;
- approve preview;
- execute;
- inspect evidence;
- undo through history.

WORKFLOW F — PROVIDER JOB

- import reference;
- launch img2threejs candidate job;
- inspect progress;
- navigate elsewhere;
- return through Job Center;
- inspect output;
- compare evidence;
- reject or accept candidate.

WORKFLOW G — FAILURE

- intentionally stop provider;
- invoke action;
- verify visible failure;
- retry;
- choose fallback;
- no unhandled rejection;
- no fake success.

WORKFLOW H — SMALL SCREEN

At 1366 × 768 and 150% zoom:

- switch workspaces;
- resize panels;
- open long Inspector;
- reach final control;
- open command palette;
- complete one edit;
- no horizontal application overflow.

==================================================
18. AUTOMATED UI QUALITY HARNESS
==================================================

Add scripts similar to:

test:ui
test:ui:chromium
test:ui:firefox
test:ui:responsive
test:ui:overflow
test:ui:keyboard
test:ui:a11y
test:ui:visual
test:ui:actions
test:ui:workflows

Use Playwright for end-to-end interaction.

Use @axe-core/playwright for automatically detectable accessibility issues.

Use role/name locators wherever possible.

Add ARIA snapshots for stable high-level surfaces:

- top bar;
- workspace navigation;
- Outliner;
- Inspector;
- command palette;
- Job Center;
- Architect proposal;
- key dialogs.

Add visual snapshots for deterministic fixtures.

Visual snapshots must:

- use fixed test data;
- use fixed camera;
- disable irrelevant animation;
- use fixed viewport and DPR;
- identify intended changes;
- not be blindly updated after every failure.

Capture on failure:

- screenshot;
- video;
- trace;
- DOM snapshot;
- console;
- network failures;
- uncaught exceptions;
- current action;
- current workspace;
- selected entity;
- build provenance.

==================================================
19. PERFORMANCE AND INTERACTION QUALITY
==================================================

Measure UI performance independently from renderer frame rate.

Track:

- initial Studio shell load;
- workspace switch time;
- panel open time;
- command-palette response;
- Outliner filtering;
- Inspector update;
- action invocation latency;
- memory growth after repeated workspace switching;
- React render counts for critical panels;
- long-list scroll performance;
- typing latency;
- layout shifts.

Do not rerender the entire Studio because one Inspector field changes.

Do not subscribe every panel to the entire Zustand store.

Use stable selectors and derived memoization.

Virtualize large collections.

Cancel stale requests.

Debounce search appropriately.

Avoid expensive work during pointer movement.

Pointer-drag interactions should preview locally and commit once at completion where architecture requires atomic transactions.

==================================================
20. MANUAL UX REVIEW
==================================================

After automated tests pass, conduct a manual review.

The agent must actually use the Studio as a user.

Perform at least one uninterrupted 30-minute session covering:

- world editing;
- asset editing;
- Architect request;
- playtest;
- error recovery;
- workspace restoration.

Record every moment where the tester:

- cannot find a feature;
- guesses which tab contains it;
- cannot tell whether an action succeeded;
- encounters unexplained disabled state;
- loses selection;
- loses scroll position;
- cannot reach a control;
- sees clipped content;
- encounters panel overlap;
- cannot return to previous context;
- opens the wrong tool due to ambiguous labeling.

Convert findings into reproducible issues.

Do not dismiss friction as “user error.”

==================================================
21. ACCEPTANCE CRITERIA
==================================================

The milestone passes only when:

- every visible action has a known status;
- zero critical no-op buttons remain;
- every unavailable action explains why;
- all core capabilities appear in the Capability Access Matrix;
- every core capability has a contextual UI path;
- every safe core capability has a command-palette path;
- every Architect-compatible capability has an authorized Architect path;
- no accidental document-level horizontal overflow exists at tested sizes;
- every long panel can reach its final control;
- all dialogs fit and scroll;
- keyboard walkthrough passes;
- no keyboard traps;
- focus remains visible;
- Chromium and Firefox workflows pass;
- no uncaught exceptions;
- no unhandled rejections;
- no infinite render loops;
- no duplicate action execution;
- layout persistence works;
- Reset Layout works;
- playtest returns cleanly to Studio;
- Job Center tracks long actions;
- failures are visible and actionable;
- tests run against a clean production build;
- exact build provenance is preserved.

Do not report success merely because:

- lint passes;
- build passes;
- the page returns HTTP 200;
- buttons render;
- screenshots look attractive;
- a scroll class exists;
- the agent manually clicked two buttons;
- axe returns zero automated violations;
- one viewport size works;
- Chromium works while Firefox is untested;
- panels are technically scrollable but the last control is obscured.

==================================================
22. REQUIRED DELIVERABLES
==================================================

Implementation and evidence:

1. UI_SURFACE_MANIFEST.json
2. CAPABILITY_ACCESS_MATRIX.json
3. UI_ACTION_REGISTRY implementation
4. information-architecture migration
5. workspace shell
6. contextual Inspector framework
7. command-palette integration
8. Architect Action Center
9. Job Center
10. scrolling/overflow contract
11. layout persistence and reset
12. responsive test fixtures
13. accessibility test suite
14. action-integrity test suite
15. keyboard test suite
16. browser workflow suite
17. visual-regression suite
18. runtime HUD separation tests
19. raw evidence bundle
20. honest maturity report

Evidence bundle must include:

- Grand Architect commit SHA;
- clean/dirty state;
- preview build SHA;
- browser versions;
- OS;
- viewport sizes;
- zoom values;
- screenshots;
- videos for core workflows;
- Playwright traces;
- console output;
- axe reports;
- overflow reports;
- failed and skipped tests;
- known limitations.

==================================================
23. STOP CONDITIONS
==================================================

Stop and report instead of pretending when:

- an existing capability has no real implementation;
- a button calls a synthetic or hardcoded endpoint;
- an action bypasses EngineRuntime or AssetRevision boundaries;
- the intended API no longer exists;
- the same feature has multiple incompatible implementations;
- the layout cannot be fixed without restructuring;
- accessibility semantics conflict with current custom controls;
- the current viewport architecture prevents reliable automated interaction;
- the preview does not match the repository SHA;
- the agent cannot reproduce the user workflow in Firefox.

Mark these as blockers.

Do not add a placeholder and call the blocker resolved.

==================================================
24. FINAL STATUS LANGUAGE
==================================================

Use:

INVENTORIED
BROKEN
UNREACHABLE
PLACEHOLDER
FIXED_UNVERIFIED
BROWSER_PROVEN
ACCESSIBILITY_REVIEWED
WORKFLOW_PROVEN
VALIDATED
BLOCKED

Do not use:

PROFOUND
PERFECT
COMPLETE
SEAMLESS
ALL BUTTONS WORK
FULLY ACCESSIBLE
PRODUCTION READY

until the corresponding evidence supports those statements.

The desired first final statement is:

“The Live Studio’s primary capabilities are now organized into coherent workspaces and share a canonical action registry across contextual UI, command palette, and Grand Architect invocation. Core World, Asset, Character, Animation, Architect, and Playtest workflows pass in Chromium and Firefox at the required display sizes. Remaining prototype and blocked surfaces are visibly labeled and listed in the capability matrix.”
What the final Studio should feel like

The greatest improvement will come from reducing visible complexity while increasing reachable power.

A beginner should be able to:

open the World workspace;
select a mountain;
ask the Architect to carve a cave;
see exactly what will change;
approve it;
watch the job;
undo it.

An advanced user should be able to:

search terrain subtract capsule;
open the structured tool;
adjust radius, falloff, material behavior, and revision policy;
inspect generated artifacts;
compare performance;
commit it.

The Grand Architect should be able to perform the same operation through the same action definition—not through a secret API that the user cannot inspect.

The key architectural rule

Create this chain:

Capability Registry
        │
        ▼
Canonical UI Action Registry
        │
        ├── contextual panel
        ├── toolbar
        ├── context menu
        ├── command palette
        ├── shortcut
        └── Grand Architect tool
                 │
                 ▼
Authorized engine command
                 │
                 ▼
Job / transaction / result / evidence

Once that exists, every new plugin or subsystem can declare:

what it can do;
where it belongs;
when it is available;
what selection it needs;
how it is invoked;
how it reports progress;
how it is undone;
how it is exposed to the Architect.

That is the scalable solution. It prevents future additions like img2threejs, Buffalo, terrain tools, animation tools, or foreign-engine capabilities from becoming another disconnected button inside another overcrowded tab.

A profound interface is not one that shows everything. It is one that always reveals the right thing, at the right time, with a reliable path back.