/**
 * Sect Canon Definitions — the sect↔mortal interface, appended so the
 * recruitment episodes (E3 Recruitment Day, E4's cache) are grounded in
 * definitions the Architect and generators query. Fidelity: descriptions
 * are verbatim fragments or minimal faithful derivations from doc 12
 * (Sect Institutions) and doc 43 (Holy Lands and Great Sects).
 */

import type { Definition } from '../definitions';

export const SECT_CANON_DEFINITIONS: Definition[] = [
  {
    id: "event.sect_recruitment_drive",
    kind: "event",
    name: "Sect Recruitment Drive",
    tags: ["recruitment", "sect", "mortal_interface", "every_3_to_7_years"],
    description: "The sect recruits from mortal society. Every three to seven years, elders or senior disciples tour the region's villages and market towns, testing children for spiritual roots (靈根). A child with strong roots is offered a place as an outer disciple; the family receives a gift of silver and the loss of a son or daughter. This is the central transaction between sect and mortal world: the sect takes the qi-gifted children and gives back silver, protection from beasts and bandits, and the prestige of having a cultivator in the family. It is not a fair exchange, but it is a stable one.",
    source: "doc 12 §1",
    relations: [
      { type: "AFFECTS", target: "sect.azure_sword", note: "the region's great sect" },
      { type: "AFFECTS", target: "place.qinghe_market_town", note: "recruitment stall in the square" },
      { type: "CAUSES", target: "skill.read_spiritual_roots", note: "the testing skill" },
    ],
    simulationHooks: ["economy", "social", "history", "cultivation"],
    version: "0.2.0",
  },
  {
    id: "skill.read_spiritual_roots",
    kind: "skill",
    name: "Read Spiritual Roots",
    tags: ["perception", "recruitment", "foundation_establishment", "spiritual_root"],
    description: "The recruiter's skill: a way of looking at a child that measures the invisible — the developing topology of qi-access called spiritual roots (靈根, doc 00 §6). Roots are not a birth-lottery aptitude score but a developing topology; the recruiter reads the current state and projects its likely trajectory. A strong reading offers an outer disciple place; a weak one is refused in two words, without cruelty and without comfort.",
    source: "doc 12 §1, doc 12 §2.3",
    relations: [
      { type: "REQUIRES", target: "realm.foundation_establishment", note: "recruiters are Foundation Establishment or above" },
      { type: "MEASURES", target: "metaphysical_essence.qi_access" },
    ],
    simulationHooks: ["perception", "cultivation", "social"],
    version: "0.2.0",
  },
  {
    id: "institution.spiritual_root_testing",
    kind: "institution",
    name: "Spiritual-Root Testing",
    tags: ["recruitment", "mortal_interface", "testing", "spiritual_root"],
    description: "The formal test the sect holds at villages and market towns during a recruitment drive: children line up, the recruiter reads their spiritual roots at a table, the strong are offered outer-disciple places and the family receives silver. The test is the visible face of the sect's only regular contact with mortal society.",
    source: "doc 12 §1",
    relations: [
      { type: "PRODUCES", target: "event.sect_recruitment_drive" },
      { type: "INVOLVES", target: "skill.read_spiritual_roots" },
    ],
    simulationHooks: ["economy", "social", "history"],
    version: "0.2.0",
  },
  {
    id: "economy.recruitment_silver",
    kind: "custom",
    name: "Recruitment Silver",
    tags: ["economy", "sect_mortal_transaction", "silver", "recruitment"],
    description: "The gift of silver the sect pays a family for a recruited child — the compensation half of the central sect↔mortal transaction. The family gains silver and prestige; it loses a son or daughter. The sect gains a qi-gifted disciple. The exchange is not fair but it is stable.",
    source: "doc 12 §1",
    relations: [
      { type: "PART_OF", target: "event.sect_recruitment_drive" },
      { type: "INVOLVES", target: "sect.azure_sword" },
    ],
    simulationHooks: ["economy", "social"],
    version: "0.2.0",
  },
  {
    id: "institution.sect_liability",
    kind: "institution",
    name: "Sect Liability for Harm to Mortals",
    tags: ["sect", "mortal_interface", "liability", "alliance", "court"],
    description: "When a cultivator harms mortals at scale — a Qi Condensation disciple gone rogue, a Core Formation elder whose domain-battle flattened a village — the sect is liable. The court cannot enforce this liability; the alliance can. A sect that ignores its liability finds its alliance seat contested.",
    source: "doc 12 §1",
    relations: [
      { type: "BINDS", target: "institution.courts_of_heaven", note: "cannot enforce; alliance can" },
      { type: "GOVERNS", target: "sect.azure_sword" },
    ],
    simulationHooks: ["history", "social", "economy"],
    version: "0.2.0",
  },
  {
    id: "metaphysical_essence.qi_access",
    kind: "metaphysical_essence",
    name: "Qi Access",
    tags: ["spiritual_root", "qi", "topology", "not_aptitude_score"],
    description: "Spiritual roots are a developing topology of qi-access, not a birth-lottery aptitude score. Bloodline inheritance exists but is partial and probabilistic — a lineage that produces a cultivator improves its children's chances without guaranteeing them. The topology develops with age and practice, which is why recruiters read the current state and project the trajectory.",
    source: "doc 12 §2.3, doc 00 §6",
    relations: [
      { type: "REQUIRES", target: "essence.qi" },
      { type: "MEASURED_BY", target: "skill.read_spiritual_roots" },
    ],
    simulationHooks: ["cultivation", "ecology", "perception"],
    version: "0.2.0",
  },
];
