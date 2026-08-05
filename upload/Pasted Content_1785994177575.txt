My conclusion after checking the repository again

The intended architecture is already pointed in the correct direction, but the current public implementation does not yet give the Grand Architect reliable access to the entire Studio.

The architecture documents define the Grand Architect as an authorized intelligence that can inspect, test, modify, and extend every subsystem through a control plane, with the same practical reach as a senior engine engineer. They also correctly separate:

an event channel for observation;
a typed command channel for actual mutations;
browser/VLM observation for visual grounding.

The Live Studio document already specifies most of the experience you actually want:

request
→ resolve the real target
→ highlight it
→ clarify ambiguity
→ produce an operation plan
→ preview
→ analyze dependencies and performance
→ inspect
→ accept, revise, partially accept, or discard
→ apply transactionally

It also says every plugin should register an ArchitectCapabilityDescriptor, and that accepted art-direction decisions should become machine-readable constraints tied to locations, factions, cultures, assets, or systems.

That is very close to the correct answer.

The problem is that the implementation has not converged on that architecture.

The public main branch I can currently inspect still ends at merge commit 35e617e, and its history does not expose the many later SHAs that your workspace agent reported. The current public Studio directory contains the foundational grounding, selection, transaction, capability-descriptor, operation-plan, and world-state files—but not the later claimed MeshKernel, animation, terrain, or Asset Forge implementations.

The current editor store is still a large Zustand store that directly:

fetches generated worlds from /api/editor/world;
stores local entity edits;
toggles simulation state;
records lightweight transactions;
loads a separate capability list;
exposes an Architect “presence” mood/status.

Its own comments call it the single reactive source of truth, but its actions bypass a unified Grand Architect command path. applyEdits() still applies individual local edits one at a time, and undoTransaction() only marks a record as undone instead of reversing the world change.

Even the editor reconstruction notes in the public merge explicitly acknowledge that editor edits remain local overlays rather than committed world state, and say a future “Commit to engine” action would be required.

So the honest maturity is:

The repository has a strong Authorial Grand Architect specification and several foundational prototypes, but not yet one operational intelligence with dependable access to the entire Studio.

What the Grand Architect should actually be

Your comparison to the author of a novel is exactly right, with one important refinement:

The Grand Architect should be the author, director, world designer, continuity editor, simulation conductor, and tool orchestrator—but it should not be a giant god-object containing every implementation.

An author does not personally become the printing press, actor, camera, paintbrush, weather simulation, architectural CAD program, and physics engine.

The author has:

complete awareness of the work;
authority to express intent;
access to appropriate instruments;
memory of prior decisions;
an understanding of theme and continuity;
the ability to revise;
the ability to commission missing capabilities;
responsibility for judging whether the result serves the vision.

That should be the Grand Architect.

YOU
  │
  ▼
Grand Architect — Authorial Intelligence
  ├── understands your intent
  ├── knows the canon and art direction
  ├── understands current world truth
  ├── discovers every available capability
  ├── composes multi-system plans
  ├── directs specialized providers
  ├── previews and critiques results
  ├── preserves continuity and causality
  └── presents revisions for acceptance
           │
           ▼
Authoritative Studio Action System
  ├── World Fabric
  ├── Live Studio
  ├── Asset Forge
  ├── Character Studio
  ├── Animation
  ├── Terrain
  ├── Simulation
  ├── Narrative
  ├── Visual Evidence
  ├── Plugin Compatibility Lab
  └── external providers

The Grand Architect becomes practically unlimited because it can discover, invoke, combine, evaluate, and extend capabilities—not because it has unrestricted direct access to internal memory and arbitrary functions.

The key missing architecture: one canonical action definition

Right now there are several separate notions of functionality:

UI buttons and panel handlers;
Zustand actions;
API routes;
plugin capabilities;
Architect tools;
operation plans;
runtime commands;
Frontier experiments.

These need to collapse into one canonical action model.

Every real action should be registered exactly once:

interface StudioActionDefinition<
  TContext = unknown,
  TInput = unknown,
  TResult = unknown
> {
  actionId: string;
  version: string;

  label: string;
  description: string;
  category: string;
  keywords: string[];

  capabilityId: string;
  registeredByPlugin: string;

  inputSchema: JsonSchema;
  outputSchema: JsonSchema;

  selectionRequirements: SelectionRequirement[];
  availability(context: TContext): AvailabilityResult;

  inspect?(
    context: TContext,
    input: TInput
  ): Promise<ActionInspection>;

  preview?(
    context: TContext,
    input: TInput,
    signal: AbortSignal
  ): Promise<ActionPreview<TResult>>;

  execute(
    context: TContext,
    input: TInput,
    signal: AbortSignal
  ): Promise<ActionExecution<TResult>>;

  undoPolicy: UndoPolicy;
  transactionPolicy: TransactionPolicy;
  approvalPolicy: ApprovalPolicy;

  permissionClass: PermissionClass;
  autonomyRequired: AutonomyLevel;

  maturity:
    | "prototype"
    | "integrated"
    | "browser-proven"
    | "validated"
    | "blocked";

  evidenceRequirements: EvidenceRequirement[];
  stylePolicy: StyleApplicationPolicy;
  canonPolicy: CanonApplicationPolicy;
}

That same action must power:

Toolbar button
Context menu
Inspector control
Command palette
Keyboard shortcut
Grand Architect tool
Automation
Browser test
Documentation

For example:

Action ID:
terrain.carveTunnel

It can be invoked through:

the Terrain Studio brush panel;
a viewport context menu;
the command palette;
the Grand Architect interpreting “carve a cultivation cave here”;
an automated regression test.

All of those paths use the exact same:

validation;
targeting;
preview;
transaction;
progress reporting;
artifact compilation;
undo;
evidence.

That is how the Grand Architect gains access to the whole Studio without needing to literally click through the UI or know every React component.

The UI becomes one view onto the action system.

The Architect becomes another authorized client of the same action system.

The Architect should be able to operate the interface—but not rely on it

There are two distinct forms of Studio control.

Semantic control

This is the primary path:

Grand Architect
→ studio.describeActions()
→ studio.inspectContext()
→ action.preview()
→ action.execute()

It is stable, typed, testable, and does not break because a button moved.

Embodied UI control

This is useful for transparency and collaboration:

studio.openWorkspace("terrain")
studio.focusPanel("terrain.materials")
studio.selectEntity("mountain-723")
studio.highlightRegion(...)
studio.revealAction("terrain.carveTunnel")
studio.showEvidence(...)

This lets the Grand Architect visually guide you:

“I have selected the eastern cliff face. The highlighted capsule is the tunnel volume I intend to subtract.”

But it should not primarily operate by guessing screen coordinates and clicking DOM elements.

The correct principle is:

The Grand Architect controls semantic Studio actions and controls the UI only to reveal, explain, ground, and collaborate.

The Studio Context Graph

Before the Grand Architect can act accurately, it needs one comprehensive, queryable representation of the current Studio.

I would add a StudioContextGraph.

interface StudioContextSnapshot {
  snapshotId: string;
  worldRevision: number;
  studioRevision: number;

  currentMode:
    | "play"
    | "live-architect"
    | "isolated-preview";

  activeWorkspace: string;
  activeDocument?: DocumentReference;

  selection: SemanticSelection;
  hoveredTarget?: SemanticTarget;
  camera: CameraSnapshot;
  viewport: ViewportSnapshot;

  world: WorldContextReference;
  entities: EntityContextReference[];
  assets: AssetContextReference[];
  operationGraphs: OperationGraphReference[];

  activeJobs: JobReference[];
  recentTransactions: TransactionReference[];
  availableActions: AvailableActionReference[];

  canonContext: CanonContextReference;
  styleContext: StyleContextReference;
  narrativeContext: NarrativeContextReference;

  capabilityGaps: CapabilityGapReference[];
  validationFailures: ValidationFailureReference[];
}

It should expose queries such as:

studio.inspectCurrentContext
studio.inspectSelection
studio.inspectWorkspace
studio.inspectVisibleObjects
studio.inspectAvailableActions
studio.inspectOpenJobs
studio.inspectRecentHistory
studio.inspectCapabilityGaps
studio.inspectValidationState

The current World Oracle appears designed around capabilities, decisions, and audit information. It should evolve into an index over:

authoritative world state;
Studio state;
asset registry;
UI/action registry;
plugin registry;
canon graph;
style graph;
narrative graph;
job system;
transaction history;
evidence store.

The Grand Architect should be able to ask internally:

What is selected?
What kind of thing is it?
Which plugin owns it?
Which properties are editable?
Which operations can affect it?
Which actions are currently blocked?
Which canon and style constraints apply?
What previous decisions created it?
What would changing it invalidate?

That is the actual “access to everything.”

The art bible cannot remain merely prose

Your decision to make the art and game bibles extremely descriptive is good.

For a project like this, terse bullet points are not enough. The Grand Architect needs to understand:

what sacredness feels like;
how ancient materials age;
how mortal poverty differs from cultivated austerity;
how architecture changes with realm, climate, culture, and history;
what visual excess would cheapen a location;
how a Fourth-Step presence alters atmosphere without covering the screen in random glowing particles;
how ordinary people cook, work, worship, fear, gossip, inherit, mourn, marry, trade, and survive;
how sect doctrines shape architecture, clothing, etiquette, landscapes, and techniques.

That depth is how the world stops feeling like procedural nouns scattered over terrain.

But the whole Bible should not be pasted into every generation prompt.

That would cause:

context dilution;
irrelevant details competing for attention;
contradictory instructions;
increased latency and cost;
poor prioritization;
style drift despite more words;
inability to tell hard canon from illustrative prose.

You need two Bible layers.

Layer 1 — The Authorial Source Bible

This remains verbose, evocative, discursive, and human-readable.

It contains:

full cultural essays;
visual philosophy;
examples;
negative examples;
historical explanations;
sensory prose;
thematic intent;
metaphors;
stylistic reasoning;
ordinary-life descriptions;
edge cases;
exceptions;
author commentary.

This is the “novel author’s room.”

Layer 2 — The Compiled Canon and Style Graph

The source Bible is compiled into atomic machine-readable records.

interface CanonRule {
  ruleId: string;
  title: string;
  statement: string;

  domain:
    | "cosmology"
    | "history"
    | "cultivation"
    | "culture"
    | "character"
    | "geography"
    | "institution"
    | "artifact"
    | "narrative";

  authority:
    | "hard-canon"
    | "project-canon"
    | "regional-canon"
    | "local-truth"
    | "soft-guidance"
    | "rumor"
    | "deliberate-uncertainty";

  scope: CanonScope;
  validFrom?: WorldTime;
  validUntil?: WorldTime;

  provenance: BibleReference[];
  supersedes?: string[];
  conflictsWith?: string[];

  visibility:
    | "authorial-only"
    | "world-observable"
    | "faction-known"
    | "character-known"
    | "rumor";

  overridePolicy:
    | "forbidden"
    | "requires-retcon"
    | "requires-explicit-exception"
    | "softly-overridable";
}

And for visual direction:

interface StyleConstraint {
  constraintId: string;
  category:
    | "shape-language"
    | "proportion"
    | "silhouette"
    | "palette"
    | "material"
    | "surface-detail"
    | "lighting"
    | "atmosphere"
    | "composition"
    | "animation"
    | "vfx"
    | "ui"
    | "cultural-motif";

  requirement: string;
  negativeConstraints: string[];

  scope: StyleScope;
  priority: number;

  inheritance:
    | "inherit"
    | "replace"
    | "merge"
    | "subtract";

  validation:
    | DeterministicStyleCheck
    | VisualStyleCheck
    | HumanReviewRequirement;

  provenance: BibleReference[];
}

The enormous prose Bible is the source.

The graph is what the engine can reason over.

Style inheritance must be automatic

Art direction should resolve through a hierarchy:

Project Art Bible
        ↓
Cosmological domain
        ↓
World or realm
        ↓
Region
        ↓
Culture and faction
        ↓
Asset family
        ↓
Specific location or character
        ↓
Current scene
        ↓
Explicit user request

For example:

Project:
stylized high-fidelity xianxia rendering

Region:
cold northern cultivation country

Faction:
severe sword sect with restrained ornament

Asset family:
outer-disciple architecture

Scene:
poor mountain outpost after twenty years of decline

User request:
“Make it look recently repaired for a recruitment ceremony.”

The result should not discard the project style because of the local request.

It merges them:

high-fidelity stylized rendering
+ northern stone/timber grammar
+ austere sword-sect silhouettes
+ impoverished construction history
+ selective fresh repairs
+ ceremonial temporary banners

The Grand Architect should receive a compiled packet before every creative operation:

interface CreativeContextPacket {
  requestId: string;

  userIntent: AuthorialIntent;

  hardCanon: CanonRule[];
  applicableStyle: StyleConstraint[];
  narrativeContext: NarrativeContext;
  historicalContext: HistoricalContext;
  culturalContext: CulturalContext;

  references: VisualReference[];
  acceptedPrecedents: AssetReference[];

  forbiddenPatterns: string[];
  requiredMotifs: string[];

  technicalBudget: TechnicalBudget;
  gameplayRequirements: GameplayRequirement[];

  unresolvedQuestions: ContextQuestion[];
  contradictions: ContextConflict[];

  contextHash: string;
}

No asset generator, terrain generator, structure grammar, character generator, animation provider, or VFX provider should run without a CreativeContextPacket.

That is how style becomes a default engine behavior, not a hope buried in a system prompt.

Art-direction decisions need durable memory

The Live Studio specification already says accepted artistic decisions should be saved as machine-readable constraints. That is one of the most important ideas in the repository.

Implement separate ledgers:

Canon Decision Ledger
Art Direction Ledger
Narrative Decision Ledger
Technical Decision Ledger
Exception/Retcon Ledger

An accepted exchange such as:

“This valley should feel sacred through age, silence, and composition—not obvious glowing fantasy clutter.”

should produce records like:

scope:
  location: valley-of-silent-pines

constraints:
  - restrained supernatural emission
  - sparse moving particles
  - natural atmospheric fog
  - one dominant distant landmark
  - silhouette-framed entry reveal
  - aged materials
  - environmental motion limited to foliage, cloth, and water
  - no neon emissive clutter

status: accepted
source: user-art-direction
priority: high

Every later tool that modifies that valley receives those constraints automatically.

The Grand Architect should not have to remember them only from chat history.

The author must understand different kinds of truth

A living xianxia universe should not have one flat lore database where everyone knows everything.

You need at least these truth layers:

1. Authorial truth
   What is actually true in the universe.

2. World-state truth
   What has physically and historically occurred in this save.

3. Institutional truth
   What a sect, dynasty, clan, or religion records as true.

4. Character knowledge
   What one person has personally learned or believes.

5. Rumor and propaganda
   Claims circulating through the world.

6. Mystery
   Truth deliberately hidden from player and characters.

7. Narrative framing
   How a scene or chapter is presently meant to feel.

The Grand Architect, as author, may inspect all seven.

An NPC cannot.

A mortal farmer should not know:

the actual cosmological origin of a local relic;
the hidden cultivation realm of a passing elder;
that the village exists inside a carefully authored narrative arc;
the true history suppressed by an immortal clan.

The farmer may know:

“Grandmother said the northern hill groans when the moon is red.”

That distinction creates mystery, dramatic irony, discovery, and false belief.

Without it, the world becomes a wiki reciting itself.

The verbose Bible should generate causal life, not only descriptions

The Grand Architect needs more than a lore retriever. It needs a Narrative and Causal World Graph.

interface NarrativeWorldState {
  historicalEvents: HistoricalEvent[];
  activeConflicts: ConflictThread[];
  factionAgendas: FactionAgenda[];
  characterArcs: CharacterArc[];
  unresolvedMysteries: MysteryThread[];
  narrativePromises: NarrativePromise[];
  thematicMotifs: ThematicMotif[];
  economicPressures: EconomicPressure[];
  ecologicalPressures: EcologicalPressure[];
  socialObligations: SocialObligation[];
}

A NarrativePromise might be:

promise:
  “The cracked ancestral sword in Wang Family Bend matters.”

introduced:
  mortal village, first week

possible_payoffs:
  - clan history
  - lost sword inheritance
  - relationship to a distant protagonist incarnation
  - evidence of an erased cultivation country

status:
  seeded

visibility:
  player-visible but unexplained

The Grand Architect can preserve and develop this across hundreds of hours.

That prevents the common procedural-generation failure where everything is momentarily interesting but nothing matters later.

Simulation and authorship should reinforce one another

The Grand Architect should not simply write every event directly.

The best system is:

Authorial intent establishes:
- pressures;
- factions;
- secrets;
- motives;
- resources;
- relationships;
- constraints;
- possible arcs.

Simulation determines:
- who succeeds;
- who travels;
- who dies;
- who becomes indebted;
- which market collapses;
- which beast migrates;
- which sect gains influence;
- which rumor spreads.

Narrative direction decides:
- what becomes visible;
- what is foreshadowed;
- what is framed as meaningful;
- which consequences reach the player;
- where interventions are justified.

For instance, the Grand Architect may author:

A poor village sits above a dormant spirit vein.
A local clan unknowingly taxes the only family preserving its seal.
A sect recruitment ceremony will occur in six months.
A wounded cultivator is moving through the region.

Then the simulation can resolve:

food prices;
family conflicts;
weather damage;
rumors;
migration;
illness;
accidental qi exposure;
faction responses.

The resulting quest is not:

“Collect ten herbs because the quest generator chose herbs.”

It becomes:

The village physician has used the last of her frost-bark treating miners who unknowingly disturbed qi-tainted stone. The merchant who normally imports it refuses to enter the valley because three pack animals vanished near the old shrine.

The rich Bible supplies the cultural and material logic.

The simulation supplies immediate causality.

The Grand Architect supplies framing, continuity, and long-term meaning.

The UnboundLoop should be the authorial workflow

The system needs a persistent orchestration loop:

OBSERVE
Inspect current Studio, world, selection, history, jobs, and evidence.

UNDERSTAND
Interpret your request and identify narrative, visual, mechanical,
and technical intent.

RETRIEVE
Resolve applicable canon, style, historical, cultural, and gameplay rules.

GROUND
Identify exact entities, regions, assets, operation nodes, or systems.

DISCOVER
Query current capabilities and their maturity.

PLAN
Compose a multi-capability operation plan.

PREVIEW
Produce blockouts, diffs, branch simulations, visual comparisons,
costs, risks, and expected consequences.

EXECUTE
Invoke canonical actions transactionally.

VALIDATE
Run deterministic, visual, performance, gameplay, canon,
continuity, and style checks.

CRITIQUE
Use independent reviewers rather than trusting the generator.

PRESENT
Show what changed, why, what remains uncertain, and available revisions.

COMMIT OR REVISE
Accept, partially accept, revise, branch, or roll back.

REMEMBER
Persist accepted authorial decisions and resulting provenance.

This should be what UnboundLoop means in the project.

Not merely:

keep asking the model to write more code
How capability self-extension should work

The docs already say the Grand Architect may propose new tools and reusable capabilities when the current system cannot correctly satisfy a request. They also say it must classify output honestly instead of silently approximating.

That should become:

User asks for something
→ no suitable production capability exists
→ Architect reports the gap
→ searches approved libraries/providers/plugins
→ proposes integration method
→ works in isolated branch/workspace
→ implements adapter or native tool
→ tests it
→ benchmarks it
→ security and license review
→ visual/gameplay review
→ registers new capability
→ retries original request

This is how the Grand Architect can eventually “do anything.”

Not by pretending it already can.

Example: what a complete request should look like

Suppose you say:

“Create an ancient sword sect city carved into the cliffs. It should feel austere and spiritually oppressive, but still inhabited by ordinary disciples with believable daily lives. Put it somewhere in this valley.”

The Grand Architect should do this:

1. Understand the request
Primary intent:
Create an inhabited sword-sect city.

Emotional intent:
Austere, spiritually oppressive, ancient.

Narrative intent:
The city must feel lived in rather than decorative.

Spatial intent:
Place in the currently indicated valley.

Implicit requirements:
Traversal, economy, habitation, sect hierarchy,
cultivation infrastructure, local history.
2. Ground the location

It highlights the candidate valley and resolves:

terrain cells;
existing ecology;
watercourses;
paths;
nearby settlements;
faction ownership;
historical events;
performance budgets.
3. Retrieve context

It resolves:

project art style;
sword-sect architecture grammar;
regional climate;
available materials;
local historical era;
cultivation-realm limits;
cultural prohibitions;
accepted visual decisions for the valley;
no-glowing-clutter rule.
4. Compose the plan
Terrain:
carve terraces, stairs, cultivation caves and defensive passes.

Architecture:
outer-disciple housing, inner sect compounds, sword courts,
scripture halls, workshops, kitchens, infirmary, punishment cliffs.

Simulation:
population, disciple ranks, kitchens, water, food,
maintenance, training schedules, markets, relationships.

Narrative:
founding event, historical schism, current resource pressure,
local secret, faction agenda, visible ritual.

Presentation:
entry composition, skyline, fog, audio, restrained qi signs.
5. Use multiple capabilities
Terrain Studio;
Structure Grammar;
Asset Forge;
procedural roads and stairs;
navigation;
population generator;
economy;
cultivation scheduler;
ecology;
VFX;
audio;
img2threejs for a particular reference-derived sword monument;
Buffalo for difficult organic ornamentation;
Visual Evidence for review.
6. Preview and test

It creates an isolated branch, simulates ordinary life, and reports:

terrain changes;
navigation;
population requirements;
food imports;
GPU cost;
style compliance;
canon conflicts;
unresolved capabilities;
visible before/after captures.
7. Commit

Only after acceptance does it create permanent transactions.

That is the “author of the novel” experience.

Implementation priority

The next major Grand Architect milestone should not be more content or more dock tabs.

It should be:

One canonical authorial path from natural-language intent to grounded, style-aware, canon-aware, multi-capability Studio execution.

Build it in this order:

Priority	System
1	Canonical StudioActionRegistry
2	StudioContextGraph and inspection tools
3	UI/Architect action parity
4	real transaction and undo path
5	CreativeContextResolver
6	compiled Canon and Style Graph
7	Art/Canon/Narrative Decision Ledgers
8	UnboundLoop operation orchestration
9	independent validation and evidence
10	capability acquisition workflow
11	Narrative and causal world graph
12	one complete authorial vertical slice
Directive for the agent

Paste this to the agent:

TASK: IMPLEMENT THE AUTHORIAL GRAND ARCHITECT — COMPLETE STUDIO ACCESS, CANON/STYLE DEFAULTS, AND LIVING-WORLD ORCHESTRATION

This is now the central architectural milestone.

The Grand Architect is the authorial intelligence of the project. It must be able to understand the user’s intent, inspect the complete Studio and world, retrieve applicable canon and art direction, ground requests to exact targets, discover available capabilities, compose multi-system plans, preview consequences, execute through authoritative transactions, validate the result, and preserve accepted decisions.

Do not interpret “authorial intelligence” as unrestricted direct state mutation.

The Grand Architect is the orchestrator and creative authority.

The engine and Studio capabilities are its instruments.

All mutations must remain typed, permissioned, inspectable, previewable where necessary, transactional, reversible, auditable, and evidence-backed.

==================================================
0. REPOSITORY TRUTH
==================================================

Before implementation, reconcile the actual repository.

Preserve:

git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git log -15 --oneline --decorate
git ls-remote origin refs/heads/main

Record the preview build SHA.

The currently public main branch visible through GitHub ends at 35e617e. Do not claim later systems exist publicly unless the exact commit is resolvable and its files are visible.

Audit the revision actually being modified.

==================================================
1. CORRECT THE CURRENT ARCHITECTURAL STATUS
==================================================

The architecture documents correctly specify:

- Grand Architect Control Plane;
- Internal Architect Protocol;
- semantic visual grounding;
- operation plans;
- transactional editing;
- plugin capability descriptors;
- dormant world runtime;
- art-direction constraints;
- capability self-extension.

The current implementation is incomplete.

Identify and document every bypass:

- UI components calling API routes directly;
- Zustand actions mutating editor state directly;
- local edits not committed to authoritative world state;
- simulation toggles that only mutate UI booleans;
- fake or annotation-only undo;
- capability lists separate from tool registries;
- Architect chat actions that bypass canonical commands;
- direct scene mutations;
- API routes that expose synthetic success;
- plugin systems that do not register real Studio actions.

Do not add another parallel architecture.

Converge existing systems.

==================================================
2. CREATE ONE CANONICAL STUDIO ACTION REGISTRY
==================================================

Implement a single StudioActionRegistry.

Every real human-facing or Architect-facing action must register one StudioActionDefinition.

Required fields:

- actionId;
- version;
- label;
- description;
- keywords;
- category;
- capabilityId;
- registeredByPlugin;
- input JSON schema;
- output JSON schema;
- selection requirements;
- availability function;
- disabled reason and remediation;
- inspect handler;
- preview handler where applicable;
- execute handler;
- cancellation;
- transaction policy;
- undo policy;
- approval policy;
- permission class;
- autonomy requirement;
- maturity;
- evidence requirements;
- canon policy;
- style policy;
- tests.

The same action definition must power:

- toolbar controls;
- Inspector controls;
- context menus;
- command palette;
- keyboard shortcuts;
- Grand Architect tools;
- automated tests;
- action documentation.

Do not duplicate action logic in React components.

A visible UI button must reference an actionId or be a clearly local UI-only control.

Add a conformance test that flags visible operational controls without canonical action registration.

==================================================
3. UNIFY CAPABILITY, ACTION, AND TOOL DISCOVERY
==================================================

Every plugin must register:

- engine capabilities;
- Studio actions;
- Architect tools;
- selectable semantic types;
- editable properties;
- constraints;
- diagnostics;
- preview support;
- undo support;
- live-edit support;
- fork support;
- permissions;
- maturity;
- conformance tests.

Architect tools must be generated from or explicitly linked to Studio actions.

Do not maintain three contradictory registries.

Implement:

engine.describeCapabilities()
studio.describeActions()
studio.describeContextualActions(selection)
studio.explainAvailability(actionId)
studio.describeCapabilityGaps()

The Grand Architect must dynamically discover capabilities at runtime.

Unknown or unavailable capabilities must return structured gap records.

==================================================
4. IMPLEMENT THE STUDIO CONTEXT GRAPH
==================================================

Create a revisioned StudioContextGraph.

It must expose:

- active workspace;
- active document;
- current mode;
- current selection;
- hover target;
- viewport and camera;
- visible semantic objects;
- world revision;
- branch/fork;
- open operation graphs;
- asset revisions;
- entity instances;
- active jobs;
- recent transactions;
- validation failures;
- available contextual actions;
- capability gaps;
- applicable canon context;
- applicable style context;
- narrative context.

Provide read-only inspection tools:

studio.inspectContext
studio.inspectSelection
studio.inspectVisibleObjects
studio.inspectWorkspace
studio.inspectAction
studio.inspectOpenJobs
studio.inspectHistory
studio.inspectEvidence
studio.inspectCanonContext
studio.inspectStyleContext
studio.inspectNarrativeContext

Inspection must use immutable revisioned snapshots.

==================================================
5. SEMANTIC GROUNDING
==================================================

Preserve the existing provenance chain:

rendered pixel
→ render primitive
→ presentation object
→ runtime entity
→ entity instance
→ asset revision
→ source asset
→ owning plugin
→ operation graph
→ editable properties
→ world location
→ applicable canon/style rules

The Grand Architect must not mutate a guessed target.

Implement confidence levels:

HIGH:
highlight and proceed to preview.

MEDIUM:
highlight presumed target and request confirmation.

LOW:
show multiple labeled candidates or request click/lasso/brush selection.

Grounding evidence must be attached to the eventual transaction.

==================================================
6. CREATE AN AUTHORIAL INTENT COMPILER
==================================================

Natural language must not go directly to a random tool.

Compile the user request into:

interface AuthorialIntent {
  requestId: string;
  originalRequest: string;

  targetIntent: TargetIntent;
  creativeIntent: CreativeIntent;
  narrativeIntent?: NarrativeIntent;
  mechanicalIntent?: MechanicalIntent;
  simulationIntent?: SimulationIntent;
  technicalIntent?: TechnicalIntent;

  explicitRequirements: Requirement[];
  inferredRequirements: Requirement[];
  prohibitedResults: Requirement[];

  ambiguity: AmbiguityRecord[];
  confidence: number;
}

The compiler must preserve the original user wording.

It may infer requirements, but inferred requirements must remain distinguishable from explicit instructions.

==================================================
7. COMPILE THE VERBOSE BIBLE INTO MACHINE-READABLE TRUTH
==================================================

Do not replace or shorten the human-facing Bible.

Preserve the verbose Authorial Source Bible.

Add a compiler that produces atomic, cross-linked records:

- CanonRule;
- StyleConstraint;
- HistoricalEvent;
- CulturalPractice;
- InstitutionDefinition;
- CharacterTruth;
- FactionDoctrine;
- MaterialTradition;
- ArchitecturalGrammar;
- NarrativePromise;
- ThematicMotif;
- MysteryTruth;
- RumorRecord;
- WorldLaw;
- CultivationRule.

Every record requires:

- stable ID;
- source Bible references;
- authority level;
- scope;
- temporal validity;
- provenance;
- confidence;
- conflict relationships;
- supersession relationships;
- visibility level;
- override policy.

Differentiate:

- authorial truth;
- observable world truth;
- institutional belief;
- character knowledge;
- rumor;
- propaganda;
- mystery;
- deliberate ambiguity.

The Grand Architect can inspect authorial truth.

NPCs receive only perspective-appropriate knowledge.

==================================================
8. IMPLEMENT STYLE INHERITANCE
==================================================

Create a CreativeContextResolver.

Resolve style through:

project
→ cosmology
→ realm/world
→ region
→ culture/faction
→ asset family
→ location/character
→ scene
→ explicit user request

Rules may inherit, merge, replace, or subtract.

Create a CreativeContextPacket containing:

- original request;
- applicable hard canon;
- applicable style constraints;
- cultural context;
- historical context;
- narrative context;
- accepted precedents;
- visual references;
- required motifs;
- forbidden motifs;
- technical budget;
- gameplay requirements;
- unresolved conflicts;
- provenance;
- deterministic context hash.

Every creative provider must require a CreativeContextPacket:

- native procedural generation;
- terrain;
- structure grammar;
- character authoring;
- animation;
- VFX;
- materials;
- img2threejs;
- Buffalo;
- FiberLab;
- external tools.

A provider must not silently discard unknown constraints.

It must report unsupported constraints.

==================================================
9. DECISION LEDGERS
==================================================

Implement durable:

- Canon Decision Ledger;
- Art Direction Ledger;
- Narrative Decision Ledger;
- Technical Decision Ledger;
- Exception/Retcon Ledger.

When the user accepts an artistic decision, convert it into machine-readable scoped constraints.

Example:

User:
“I want this valley to feel sacred through age and silence, not glowing fantasy clutter.”

Persist:

- restrained palette;
- sparse supernatural indicators;
- natural fog;
- silhouette framing;
- aged materials;
- one distant landmark;
- no dense emissive clutter;
- no constant particle noise.

Future generation within that scope must inherit the decision automatically.

Every transaction records the context and decision-ledger revisions used.

==================================================
10. AUTHORIAL NARRATIVE GRAPH
==================================================

Create a NarrativeWorldGraph containing:

- historical events;
- causal dependencies;
- faction agendas;
- character arcs;
- relationships;
- obligations;
- mysteries;
- narrative promises;
- thematic motifs;
- local pressures;
- economic pressures;
- ecological pressures;
- cultivation pressures;
- unresolved consequences.

The Grand Architect must be able to inspect:

narrative.inspectPromises
narrative.inspectCharacterArc
narrative.inspectFactionAgenda
narrative.inspectMysteries
narrative.inspectConsequences
narrative.inspectContinuity
narrative.inspectThemeUsage

Do not generate quests independently of world state.

Quest, dialogue, encounters, rumors, and environmental storytelling must be grounded in actual:

- entities;
- resources;
- relationships;
- history;
- geography;
- faction goals;
- simulation consequences.

==================================================
11. IMPLEMENT UNBOUNDLOOP AS THE AUTHORIAL ORCHESTRATOR
==================================================

UnboundLoop must execute:

OBSERVE
UNDERSTAND
RETRIEVE
GROUND
DISCOVER
PLAN
PREVIEW
EXECUTE
VALIDATE
CRITIQUE
PRESENT
COMMIT_OR_REVISE
REMEMBER

Each stage produces a persisted structured artifact.

The loop must be resumable.

It must not lose:

- user intent;
- selected target;
- context packet;
- current plan;
- completed jobs;
- evidence;
- unresolved questions;
- revision baseline.

The generating agent cannot be the sole reviewer.

Use independent deterministic and visual reviewers.

==================================================
12. OPERATION PLANS
==================================================

Every nontrivial request becomes an inspectable OperationPlan.

Include:

- interpreted intent;
- grounded targets;
- actions;
- dependencies;
- ordering;
- providers;
- applicable canon;
- applicable style;
- expected world changes;
- expected asset changes;
- expected simulation consequences;
- technical cost;
- risks;
- affected systems;
- approval points;
- rollback plan;
- evidence requirements.

The user may:

- accept all;
- revise;
- accept selected operations;
- discard;
- request alternatives.

==================================================
13. ONE AUTHORITATIVE EXECUTION PATH
==================================================

Human UI and Grand Architect actions must converge on:

StudioActionRegistry
→ authorization
→ schema validation
→ revision validation
→ preview/fork where required
→ authoritative command
→ world/asset transaction
→ derived artifact invalidation
→ jobs
→ matching-revision activation
→ validation
→ history/evidence

Remove direct authoritative mutation from Zustand.

Zustand may retain transient UI state:

- active panel;
- local hover;
- provisional drag;
- open dialogs;
- unsaved form values.

It must not remain the authoritative world or asset transaction system.

Implement real forward/inverse operations.

Undo must restore actual state, not mark metadata.

==================================================
14. UI COLLABORATION
==================================================

Create an Architect Action Center.

It shows:

- original request;
- interpreted intent;
- grounded target;
- applicable canon/style;
- proposed plan;
- active jobs;
- previews;
- evidence;
- capability gaps;
- approvals;
- completed transaction;
- undo/revise controls.

The Grand Architect may:

- open a workspace;
- focus a panel;
- select/highlight a target;
- reveal an action;
- show a property;
- show evidence;
- navigate to a job or transaction.

UI navigation must be semantic.

Do not rely on pixel-coordinate clicking as the primary control path.

==================================================
15. CAPABILITY ACQUISITION
==================================================

When no validated capability can satisfy a request:

1. report the gap;
2. classify the best possible current result;
3. search approved internal/external technologies;
4. assess architecture, license, security, and performance;
5. propose an adapter, plugin, provider, or native implementation;
6. work in an isolated workspace;
7. run conformance, integration, determinism, performance, security, and visual tests;
8. require approval;
9. register the capability;
10. retry the original request.

Never silently approximate a production request using a proxy.

==================================================
16. VALIDATION
==================================================

Every creative result must be evaluated against:

- explicit user intent;
- hard canon;
- scoped canon;
- style constraints;
- visual references;
- historical coherence;
- cultural coherence;
- gameplay requirements;
- topology/material/animation requirements;
- performance budgets;
- accessibility where applicable;
- navigation and collision;
- persistence;
- narrative continuity.

Produce:

StyleComplianceReport
CanonComplianceReport
NarrativeContinuityReport
TechnicalValidationReport
VisualEvidenceBundle
CapabilityGapReport

The provider’s self-review is evidence, not authority.

==================================================
17. FIRST AUTHORIAL VERTICAL SLICE
==================================================

Do not test this on an abstract button.

Use one complete request:

“Transform the selected valley into an ancient but declining sword-sect settlement. It should feel sacred, austere, historically layered, and inhabited by ordinary disciples. Avoid glowing fantasy clutter. Preserve the river and existing village road.”

Required pipeline:

1. select and ground the valley;
2. retrieve regional/cultural/historical/style context;
3. show inherited and request-specific constraints;
4. inspect available terrain, structure, asset, population, economy, cultivation, navigation, VFX, and audio capabilities;
5. identify capability gaps;
6. produce an inspectable multi-system plan;
7. create an isolated world fork;
8. modify terrain;
9. generate architecture;
10. place reusable asset revisions and entity instances;
11. populate residents with roles, schedules, needs, relationships, and histories;
12. establish economy and cultivation infrastructure;
13. simulate at least one year in the fork;
14. report consequences and inconsistencies;
15. capture visual evidence;
16. validate art style and canon;
17. revise one failure;
18. partially or fully commit;
19. save;
20. restart;
21. reload;
22. verify the same world, decisions, assets, and narrative state.

The user must be able to inspect:

- why each decision was made;
- which Bible rules applied;
- which capabilities were used;
- what was inferred;
- what remains uncertain;
- what changed;
- what can be undone.

==================================================
18. ACCEPTANCE CRITERIA
==================================================

The milestone passes only when:

- one canonical action registry exists;
- human UI and Architect use the same actions;
- every major plugin registers real capabilities;
- Studio context is inspectable;
- target grounding is engine-backed;
- art and canon context are resolved automatically;
- accepted decisions persist;
- operation plans are inspectable;
- previews and forks work;
- transactions and undo are real;
- long-running jobs report progress;
- validation reports are evidence-backed;
- one multi-system authorial request succeeds;
- the result survives fresh-process reload;
- Chromium and Firefox workflows pass;
- exact build provenance is preserved.

Do not declare success because:

- an interface exists;
- a registry contains action names;
- a capability descriptor exists;
- an API returns HTTP 200;
- a chat response sounds intelligent;
- the Bible is searchable;
- style prose was inserted into a prompt;
- a screenshot looks attractive;
- a transaction record says “complete”;
- lint passes.

==================================================
19. HONEST STATUS LANGUAGE
==================================================

Use:

SPECIFIED
REGISTERED
WIRED
INTEGRATED
PREVIEW_PROVEN
TRANSACTION_PROVEN
STYLE_CONTEXT_PROVEN
CANON_CONTEXT_PROVEN
BROWSER_PROVEN
VERTICAL_SLICE_PROVEN
VALIDATED
BLOCKED

Do not use:

OMNIPOTENT
CAN DO ANYTHING
COMPLETE
SEAMLESS
FULL AUTHORIAL CONTROL
FULLY STYLE-ACCURATE

until evidence supports the exact claim.
Final judgment

The project does not need a smarter chat box.

It needs an authorial operating system.

The Grand Architect should possess:

complete semantic awareness
+ complete capability discovery
+ exact target grounding
+ automatic canon/style retrieval
+ multi-system planning
+ transactional Studio control
+ independent validation
+ durable authorial memory
+ capability self-extension

Your extremely descriptive Bible is valuable because it gives that authorial intelligence something deeper than tags and generic fantasy tropes to work from.

But the Bible must become:

rich prose for meaning
+
structured truth for execution
+
scoped retrieval for relevance
+
validation rules for enforcement
+
decision memory for continuity

Then the Grand Architect can function like the author of the universe: not merely placing buildings and spawning NPCs, but understanding why the valley exists, who shaped it, what its people believe, what pressures they live under, what visual language expresses its history, what mysteries it conceals, and how today’s intervention will echo through its future.