# Emergence Directive

> Engineering directive (user-provided, 2026-08-07; source: emergence.txt). Not a corpus document —
> the Bible is frozen (00_FOUNDATIONAL_DECISIONS). This directive governs how Genesis
> concepts must expose interactions; its premises are machine-audited by the
> Emergence Gauntlet in src/lib/genesis/emergence-gauntlet.ts.

The main way to ensure a lot of emergent interactive gameplay is to stop thinking of gameplay as a collection of authored activities and make it a property of the universe architecture.

The rule I would put at the center of Grand Architect is:

Every meaningful thing in the universe must expose state, affordances, resistances, relationships, consequences, and persistent history. Every meaningful action must resolve through shared world rules and emit consequences that other systems can understand.

That gives you:

Universe Genesis Graph
"What exists and why?"

          ↓

Universal Interaction Lattice
"What can affect what?"

          ↓

Law / Capability Resolution
"What actually happens here?"

          ↓

Causal Event Fabric
"What else does that change?"

          ↓

Persistent World State
"What is different afterward?"

          ↓

NPC / Ecology / Economy / Narrative Reaction
"What does the universe do about it?"

          ↓

Presentation
"Can the player see, hear and understand the consequences?"

That is the difference between a game with many mechanics and a world that produces gameplay.

The Universal Interaction Lattice

The Genesis system we've been designing answers what exists.

It needs a sibling that answers:

What are all the meaningful ways this thing can participate in the universe?

A tree isn't:

Tree
mesh
texture
health = 100

It is more like:

TREE

Matter
- wood
- bark
- sap
- leaves
- roots
- trace minerals
- qi saturation

Biology
- alive
- species
- age
- health
- growth
- reproduction
- disease

Structure
- trunk strength
- branch strength
- root anchoring
- center of mass

Ecology
- habitat
- shade
- soil retention
- water uptake
- food source

Economy
- timber
- medicine
- resin
- fuel
- spiritual material

Ownership
- wild
- private
- sect
- protected forest

World interaction
- burn
- freeze
- cut
- crush
- uproot
- harvest
- poison
- heal
- grow
- transplant
- refine
- inspect
- divine-sense scan

History
- planted naturally
- lightning scar
- harvested branches
- survived fire
- formation protected

Animation
- wind response
- branch bend
- fracture
- collapse
- uprooting

Destruction consequence
- material recovery
- canopy loss
- habitat loss
- soil exposure
- path opening
- ownership violation

Now one tree already participates in dozens of potential gameplay situations.

And the developer didn't script:

Quest #514:
Cut down tree.

The tree is simply capable of being interacted with.

Don't connect every system directly to every other system

This is critical.

You don't want:

Terrain code knows Economy
Economy knows Ecology
Ecology knows Formations
Formations know NPC AI
NPC AI knows Terrain
...

That becomes an unmaintainable mesh of special cases.

Use a Causal Event Fabric.

For example, terrain destruction produces:

interface MatterRemovedEvent {
  cause: ActionRef;
  actor: EntityRef;

  location: WorldPosition;
  bounds: Bounds3;

  removedMatter: MaterialQuantity[];
  previousTerrainRevision: TerrainRevision;
  newTerrainRevision: TerrainRevision;

  supportChanged: boolean;
  hydrologyChanged: boolean;
}

Then independent systems react.

MatterRemovedEvent
        │
        ├── Resource Recovery
        │      → create collectible matter
        │
        ├── Structural Simulation
        │      → check collapse
        │
        ├── Navigation
        │      → rebuild affected routes
        │
        ├── Hydrology
        │      → water may enter excavation
        │
        ├── Ecology
        │      → habitat changed
        │
        ├── Ownership
        │      → unauthorized extraction?
        │
        ├── NPC Knowledge
        │      → who saw/heard/sensed it?
        │
        ├── Faction System
        │      → territory violation?
        │
        ├── Economy
        │      → resource availability changed
        │
        ├── History
        │      → record permanent event
        │
        └── Narrative Director
               → is this event interesting?

This is where the combinatorial explosion you want comes from.

One action can affect ten systems without ten bespoke scripts.

Universal verbs are more valuable than thousands of special interactions

You want a relatively stable vocabulary of semantic verbs.

Not necessarily buttons—the actual simulation verbs.

Domain	Examples
Perception	see, hear, divine-sense, inspect, track, identify
Matter	move, lift, cut, fracture, dig, carve, crush, burn, freeze, melt
Terrain	raise, lower, flatten, tunnel, reinforce, collapse, terraform
Resource	harvest, collect, extract, refine, store, transport
Construction	build, place, connect, repair, dismantle, reinforce
Territory	claim, protect, trespass, siege, abandon
Formation	place, activate, fuel, reconfigure, overload, disable, decipher
Social	talk, bargain, threaten, lie, gift, steal, recruit, betray
Cultivation	cultivate, circulate, comprehend, breakthrough, suppress
Combat	strike, block, dodge, parry, grapple, pursue, flee
Living systems	feed, tame, heal, poison, breed, plant
Knowledge	teach, learn, copy, conceal, investigate
Travel	walk, climb, swim, fly, teleport, cross realms
Ownership	buy, sell, borrow, seize, inherit
Spiritual	soul attack, divine-sense attack, karma interaction, possession

Then each object declares which semantic interactions it supports and under what conditions.

A rock doesn't need custom code for every technique.

It needs physical/material properties.

The technique says:

I deliver:
physical stress = X
penetration = Y
fracture authority = Z
affected volume = V

The rock says:

I resist:
compression = A
shear = B
fracture = C

Local world reinforces me by D.
Formation reinforces me by E.

Then the Law Interaction Solver decides what happens.

World laws are an enormous emergence multiplier

This is why the world-law architecture we've been discussing matters so much.

The same semantic action:

CUT

can create entirely different gameplay.

Weak mortal world:

Sword cultivator
→ tree
→ effortless severing

Sword cultivator
→ cliff
→ enormous cut

Sword cultivator
→ space
→ spatial distortion

Powerful higher realm:

same cultivator
→ tree
→ several centimeter cut

same cultivator
→ cliff
→ shallow scar

same cultivator
→ space
→ nothing

Inside an ancient sect formation:

same cultivator
→ protected wall
→ barrier absorbs impact
→ formation node loses energy
→ attackers realize brute force is inefficient

That alone generates tactical gameplay.

The player can respond by:

become stronger
use a stronger technique
find formation weakness
destroy a node
drain its energy
learn formations
tunnel beneath it
convince the owner to open it
steal an authorization token
attack during maintenance
cut off the spirit vein feeding it

You didn't author eight separate quest solutions.

The systems produced them.

Every obstacle should expose several independent axes of attack

This is one of the strongest emergence rules I would adopt.

Suppose the player wants into a protected cave abode.

Don't define:

Requires Formation Skill Level 47.

The situation contains:

physical barrier
formation network
energy supply
owner
authorization rules
terrain
hidden entrance
social relationships
time
knowledge

Those naturally generate approaches.

Brute-force the barrier.

Excavate around it.

Attack its formation nodes.

Drain the local spirit vein.

Wait until its energy reserves run low.

Study the formation.

Steal its control token.

Become friends with the owner.

Kill the owner.

Join the sect.

Follow someone authorized inside.

Use spatial techniques if your spatial authority exceeds its lock.

Find the forgotten maintenance tunnel built 600 years ago.

Discover that the original builder left a backdoor.

None needs to be marked:

SOLUTION A
SOLUTION B
SOLUTION C

The goal is to give the universe enough independently interacting state that those solutions exist.

Matter conservation closes a huge gameplay loop

Your destruction/loot idea is especially important because it prevents terrain destruction from being merely visual.

World Matter
    ↓
destruction
    ↓
Removed Matter
    ↓
collectable resources
    ↓
storage
    ↓
crafting/building/refining
    ↓
structures/artifacts/formations
    ↓
new capabilities
    ↓
more world interaction

Consider:

player clears forest

That can produce:

wood gained
forest canopy reduced
animal habitat disrupted
soil moisture altered
path opened
merchant notices new shortcut
land becomes suitable for settlement
forest owner becomes angry
wood price locally falls
new buildings become affordable
predator moves toward nearby village

That's gameplay.

Not because the game generated a quest popup.

Because a player changed the world.

Construction has to be as systemic as destruction

If the player can destroy mountains but construction is prefab placement, you'll lose half the emergence.

Construction should create actual world entities with:

material
mass
structural support
ownership
doors/access
storage
utilities
formations
rooms
semantic purpose
NPC usage
damage state
history

So the cave abode example becomes:

find mountain
→ excavate volume
→ collect rock
→ detect spirit vein
→ establish rooms
→ install formation anchor
→ scan interior volume
→ form conformal restriction
→ furnish rooms
→ assign storage
→ plant herbs
→ invite disciple
→ establish ownership

Now NPCs understand:

This is someone's home.

Not:

Terrain cell #583 contains player objects.

That affects trespassing, stealing, invitations, raids, maintenance, inheritance and abandonment.

Let NPCs use the same systems the player does

This is mandatory.

If only the player can:

build
mine
form sects
cultivate
trade
create cave abodes
tame animals
learn techniques
claim territory

then the universe is still centered around scripted player gameplay.

NPCs should have semantic access to the same capabilities when physically, socially and cognitively appropriate.

An NPC cultivator may:

need secluded cultivation location
↓
search mountain region
↓
evaluate qi density
↓
discover cave
↓
expand it
↓
install formation
↓
live there
↓
cultivate
↓
trade for spirit stones
↓
repair formation

Another NPC might discover them.

Another may attempt to rob them.

Another may become their disciple.

A sect may eventually grow around the location.

Hundreds of years later:

original owner dead
formation partially functioning
disciples gone
local village tells stories
treasure room still sealed
beasts live in outer chambers

Now you've created what would traditionally be called a dungeon without designing a dungeon.

NPCs also need incomplete knowledge

Perfect-information AI kills emergence.

NPCs should act from:

objective reality
        ↓
perception
        ↓
knowledge
        ↓
memory
        ↓
belief
        ↓
decision

Those are different.

A merchant hears:

“A monster lives in the western mountain.”

Objective truth:

there is no monster

a secluded cultivator caused several explosions
while expanding his cave

The merchant avoids the route.

Travel decreases.

A bandit group hears the rumor.

They assume valuable treasure exists.

They investigate.

The cultivator interprets them as attackers.

A fight occurs.

Now the rumor partially becomes true:

People really are disappearing in the western mountain.

That's emergence from incorrect information.

Social systems need real consequences

Relationships shouldn't merely produce:

Affinity +5

A relationship should change:

information sharing
trust
prices
hospitality
access
teaching willingness
combat assistance
inheritance
risk tolerance
political consequences

Someone liking you may:

tell you about a hidden cave
loan you an artifact
let you use their formation
warn you about enemies
recommend you to a sect
teach you a technique

Someone fearing you may cooperate without liking you.

Someone respecting you may duel honorably.

Someone hating you may still trade because they need money.

That creates far more believable behavior than one friendship meter.

Economy should consume the same physical resources the player touches

If you destroy 200 trees and obtain wood, that wood shouldn't exist in a parallel player inventory universe.

It should be usable by the economy.

wood
→ houses
→ carts
→ boats
→ furniture
→ formation components
→ charcoal

A village rebuild after an attack should require:

labor
wood
stone
food
time

If the player destroyed the nearby forest:

reconstruction becomes harder

If the player donates thousands of kilograms of timber:

reconstruction accelerates

Now gathering has social and economic consequence.

Ecology should matter mechanically

A forest isn't a rendering biome.

It is:

water retention
soil stability
shade
herbs
animals
predators
wood
spirit ecology
qi flow

Mass clearing may produce:

more farmland initially
↓
erosion
↓
river sediment
↓
fish decrease
↓
food price changes

In a xianxia environment:

rare spirit tree removed
↓
local qi circulation changes
↓
spirit herb habitat declines
↓
sect alchemist loses supply
↓
medicine prices rise

Or:

spirit beast killed
↓
prey population expands
↓
herbs overgrazed

Again, no authored quest needed.

Hydrology is an enormous source of emergence

Because your terrain is destructible, water should eventually interact with terrain modifications.

Imagine:

player tunnels through mountain

but doesn't know:

underground aquifer lies behind wall

Breakthrough:

CRACK

water begins pouring in

Now:

cave floods
debris moves
NPCs evacuate
lower village river rises
formation has to withstand water pressure
herbs die
fish eventually enter

Or the player deliberately:

dams river
→ creates reservoir
→ powers waterwheel
→ floods old road
→ merchant route changes

Terrain becomes gameplay rather than scenery.

Structural support makes destruction more interesting

Don't require every voxel to undergo expensive structural simulation.

But important modifications should affect support graphs.

column removed
↓
roof support decreases

cliff undercut
↓
mass becomes unstable

tree roots exposed
↓
anchoring decreases

Then:

not everything collapses immediately

because materials have strength.

But structures can become:

stable
strained
unstable
collapsing
formation-supported

Your cave formation can deliberately override this:

ordinary support:
insufficient

formation topological stabilization:
sufficient

Turn formation off:

support recalculated
↓
CRACK
↓
collapse begins

That is excellent emergent gameplay.

Give techniques environmental meaning

A fire technique should not simply apply:

FireDamage

It should produce relevant world effects:

heat
ignition
air pressure
light
smoke
qi residue
material transformation

Then:

fire technique
→ dry forest
→ wildfire

But:

same fire technique
→ rainstorm
→ much smaller ignition

same technique
→ fire-affinity region
→ amplified

same technique
→ water formation
→ suppressed

Sword art:

cutting / shear / penetration

Earth art:

terrain displacement / material control

Water art:

fluid displacement / cooling / erosion

Divine-sense attack:

doesn't inexplicably destroy stone

unless the technique also couples to physical matter.

That makes techniques tools, not colored projectiles.

Keep player powers composable

This is critical for xianxia.

Suppose the player learns:

Divine Sense
Sword Control
Fire Art
Formation Knowledge
Spatial Storage

Don't only implement their intended moves.

Their combination should unlock emergent uses.

For example:

divine sense
→ detect ore

sword control
→ excavate precisely

formation knowledge
→ stabilize tunnel

spatial storage
→ collect removed material

Now the player has invented a mining method.

Or:

formation
+ fire
+ wind

becomes a furnace.

Or:

water manipulation
+ earth manipulation

builds irrigation.

You don't have to explicitly provide a “cultivator irrigation spell.”

Systems make the combination possible.

The Grand Architect should create pressures, not scripts

This is especially important for your AI author/director.

Bad:

At day 30:
bandits attack village.

Better:

Bandit faction:
food supply decreasing
leader ambitious
strength 42

Village:
wealth increasing
defense 23

Road:
low patrol presence

Regional authority:
occupied elsewhere

The simulation discovers:

bandit raid now attractive

The Grand Architect can establish the dramatic situation.

It should not force every outcome.

Similarly:

Sect A wants spirit vein.
Sect B currently controls it.
Their treaty is weakening.

Maybe war happens.

Maybe marriage alliance.

Maybe player steals the vein.

Maybe a beast destroys it first.

The narrative director then recognizes interesting emergent events and frames them.

Persistent history is mandatory

Without memory:

destruction
NPC reaction
economic change

becomes temporary spectacle.

Every important consequence needs durable provenance.

Event 81252

Player destroyed Black Pine Forest.

Consequences:
- 72% canopy removed
- timber recovered
- hunting habitat reduced
- road visibility increased
- sect ownership violated
- River South sediment +12%
- Hu family logging income collapsed

Five years later, the environment can still reflect it.

That also lets Grand Architect create narrative:

“This village never recovered from the famine that followed your destruction of the northern watershed.”

Not fabricated lore.

Actual history.

Emergence needs feedback loops

The most powerful systems feed back into each other.

For example:

PLAYER DESTROYS FOREST
        ↓
WOOD SUPPLY ↑
        ↓
WOOD PRICE ↓
        ↓
BUILDING EXPANSION ↑
        ↓
SETTLEMENT POPULATION ↑
        ↓
FOOD DEMAND ↑
        ↓
FARMLAND EXPANSION ↑
        ↓
MORE FOREST CLEARING

Another:

PLAYER KILLS SPIRIT BEAST
        ↓
PREDATION ↓
        ↓
HERBIVORES ↑
        ↓
SPIRIT HERBS ↓
        ↓
PILL SUPPLY ↓
        ↓
PILL PRICE ↑
        ↓
CULTIVATORS SEARCH OTHER REGIONS
        ↓
NEW CONFLICT

Xianxia:

PLAYER DAMAGES SPIRIT VEIN
        ↓
QI DENSITY ↓
        ↓
CULTIVATION EFFICIENCY ↓
        ↓
SECT DECLINES
        ↓
DISCIPLES LEAVE
        ↓
LOCAL ECONOMY DECLINES
        ↓
RIVAL SECT EXPANDS

That's where worlds start surprising even their creators.

Use simulation LOD so this remains computationally possible

You absolutely do not simulate all this at full fidelity everywhere.

Use your existing tier philosophy.

DISTANT

"Red Pine Sect"
population 1,842
food +3%
qi -1%
relations -12

No embodied NPC simulation.

Closer:

households
businesses
major characters
resource flows

Closer:

individual schedules
relationships
memory
movement

Player nearby:

full physics
animation
inventory
perception
conversation
combat
terrain

The important constraint is:

Changing simulation resolution must not change historical truth.

If aggregate simulation says:

three families left village

and you later visit:

those families really are gone.

Make the world readable

Emergence is useless if the player can't understand why something happened.

If a cave formation is failing:

don't only change:

formationHealth = 21%

Show:

flickering nodes
spirit stones dimming
barrier ripples spreading farther
cracks beginning
unstable sound
NPC looking toward core

If local qi is depleted:

herbs dull
cultivator comments
ambient particles diminish
technique feels weaker

If wildlife declines:

forest becomes quieter
tracks disappear
hunters complain

Systems need diegetic diagnostics.

The player should often be able to understand the simulation by observing the world.

Add an Emergence Coverage system to the Bible

This can be machine audited.

For every important definition:

interface InteractionCoverage {
  canAffect: CapabilityTag[];
  canBeAffectedBy: CapabilityTag[];

  emits: WorldEventType[];
  consumes: WorldEventType[];

  persistentConsequences: StateDomain[];

  NPCAwareness: AwarenessRule[];
  playerFeedback: FeedbackChannel[];

  simulationTiers: SimulationRepresentation[];

  lawInteractions: LawDomain[];
}

Then Grand Architect can detect:

Spirit Tree

visual = yes
physics = yes
resource = yes

ecology = NO
economy = NO
NPC interaction = NO
history = NO

and report:

This is visually implemented but systemically shallow.

That is much more useful than counting assets.

Then make an Emergence Gauntlet

This is how you ensure the game is emerging rather than just hoping it does.

Create golden simulation scenarios.

For example:

Scenario: destroy the bridge

Start with:

village
river
bridge
merchant route
two farms
sect

Destroy bridge.

Run 30 simulated days.

We expect some combination of:

route invalidated
alternate route considered
merchant delays
prices change
NPC knowledge spreads
repair considered
materials requested
possible rebuilding

The exact story does not have to be predetermined.

But if:

bridge disappears
and absolutely nothing else notices

the emergence test fails.

Scenario: drain a spirit vein

Observe:

qi ecology
cultivation
herbs
beasts
sect behavior
economy
migration
Scenario: kill a village leader

Observe:

family
authority
succession
relationships
memory
politics
funeral
ownership
Scenario: tunnel into protected cave

Observe:

terrain
formation
law resolution
structural stability
ownership
NPC perception
loot
pathfinding
Scenario: forest fire

Observe:

fire
vegetation
animals
NPC response
structures
weather
resources
economy
history

That becomes your emergent gameplay regression suite.

I would add one very important metric

Not:

Number of mechanics = 217

Measure causal fan-out.

For an action:

How many independent systems can legitimately respond?

And causal fan-in:

How many independent systems can influence its outcome?

Example:

BREAK TREE

FAN-IN
actor strength
weapon
technique
tree species
tree health
world law
formation protection
weather
ownership

FAN-OUT
wood
falling physics
habitat
economy
pathfinding
noise
NPC awareness
ownership
relationships
history

High fan-in + high fan-out is where emergence lives.

Not every interaction needs enormous fan-out.

But major world verbs should.

The ultimate example

Imagine you're traveling through a mountain range.

You find a spirit-wood forest belonging to a small sect.

You need timber for a cave abode.

You are strong enough to cut the trees.

You cut thirty.

The trees physically fall.

Wood flows into your storage as condensed loot orbs.

The noise alerts nearby disciples.

A formation protecting the inner forest activates.

Now your next sword strike fails to cut a tree because local material resistance has increased.

You inspect the formation with divine sense.

You discover one node draws qi from an underground spirit vein.

You could attack it.

But beneath the node is the sect's medicinal garden.

Destroying the vein may ruin it.

You negotiate instead.

The disciples are angry because you already stole their wood.

You offer rare ore.

Their elder needs the ore to repair a furnace.

He accepts—but requires you to help transport it because their storage treasure is too small.

While you're negotiating, the felled forest exposed an old stone foundation.

One disciple recognizes an inscription.

It belonged to a destroyed sect from three centuries ago.

The foundation contains a sealed entrance.

Your tree cutting has just uncovered a historical site that was physically there all along.

The sect now claims it.

You claim you discovered it.

A legal/social dispute begins.

Another cultivator hears about it through rumor and arrives.

The old restriction beneath the foundation begins responding to everyone's qi.

You have now generated:

resource gathering
terrain interaction
physical destruction
loot
territory
law resistance
formation gameplay
divine sense
ecology
economy
social negotiation
ownership
history
exploration
procedural discovery
faction politics
potential combat

from:

“I need some wood.”

That is the standard I would use for Grand Architect.

The deepest design rule is:

Never ask only “What gameplay do we add here?” Ask “What state exists here, what can act upon it, what resists those actions, what consequences propagate outward, who can perceive those consequences, and how does the universe remember them?”

If we build those causal connections across the Genesis Graph rather than simply adding more isolated mechanics, the world will continually generate interactions neither you nor the Grand Architect explicitly scripted.