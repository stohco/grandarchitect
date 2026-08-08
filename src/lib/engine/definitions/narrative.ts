/**
 * Narrative definitions extracted from the corpus-extension docs:
 * doc 26 (Narrative Spine), doc 06 (Golden Scenes), doc 28 (The Village In Medias Res).
 *
 * Only things NAMED in the docs: the three acts, the protagonist's want
 * (Wang Xiaodi back), the three endings, the five golden scenes, the named
 * session beats (the first awe, the first return), the named Act 2/3 beats
 * (Pei Liang's introduction, Old Chen's death, Liang Zhu's death, the
 * revelation, the choice), the Exchange of Cuts (交劍), the resonances, the
 * Residual Error Sense (遺錯之覺), the lineage elder council, and the named
 * village tensions and anchored verbs of the in-medias-res week.
 *
 * Characters and institutions that already exist in the database
 * (npc.wang_lun, npc.old_chen, npc.pei_liang, npc.scribe_yan, event.qingming,
 * event.winter_solstice, event.bardo_harvest_loophole_amendment,
 * custom.demonic_cultivation, etc.) are referenced by relation, never duplicated.
 */
import type { Definition } from '../definitions';

export const NARRATIVE_DEFINITIONS: Definition[] = [
  // ============================ DOC 26 — THE THREE ACTS ============================

  {
    id: "custom.narrative_act_1",
    kind: "custom",
    name: "Act 1 — Mortal to Foundation Establishment",
    tags: ["arc","act_1","sessions_1_100","golden_scenes"],
    description: "Act 1 of the narrative spine: ages 16-23, sessions 1-100, from Mortal to Foundation Establishment. Contains the five golden scenes (the First Teacher, the Fraudulent Manual, the First Duel, the Failed Breakthrough, the Genuine Success). Thesis: cultivation is becoming less limited — the player understands it is not about becoming powerful but about becoming less limited. Joy: the first awe (session ~10). Ends with Foundation Establishment; the first return to the village (session 100) is the threshold to Act 2.",
    source: "doc 26 §4.1",
    relations: [
      { type: "PRECEDES", target: "custom.narrative_act_2" },
      { type: "CONTAINS", target: "event.scene_first_teacher" },
      { type: "CONTAINS", target: "event.scene_fraudulent_manual" },
      { type: "CONTAINS", target: "event.scene_first_duel" },
      { type: "CONTAINS", target: "event.scene_failed_breakthrough" },
      { type: "CONTAINS", target: "event.scene_genuine_success" },
      { type: "CONTAINS", target: "event.first_awe" },
      { type: "CONTAINS", target: "event.verb_carry_water", note: "session 1, the first verb" },
    ],
    simulationHooks: ["history","social","cultivation","perception"],
    version: "0.1.0",
  },
  {
    id: "custom.narrative_act_2",
    kind: "custom",
    name: "Act 2 — Foundation Establishment to Core Formation",
    tags: ["arc","act_2","sessions_100_500","time_debt"],
    description: "Act 2 of the narrative spine: ages 23 to ~150, sessions 100-500, from Foundation Establishment to Core Formation. Key beats: joining the Cangwu Sect (session ~120), the first return (session ~150), Pei Liang's introduction (session ~200), meeting Liang Zhu (session ~250), Wang Meili's joining (session ~400), Old Chen's death (session ~450), Core Formation (session ~500). Thesis: power costs time and the time costs love. Joy: the first return — the recognition that the village is the same and the player is the one who changed.",
    source: "doc 26 §4.2",
    relations: [
      { type: "PRECEDED_BY", target: "custom.narrative_act_1" },
      { type: "PRECEDES", target: "custom.narrative_act_3" },
      { type: "CONTAINS", target: "event.first_return" },
      { type: "CONTAINS", target: "event.pei_liang_introduction" },
      { type: "CONTAINS", target: "event.old_chen_death" },
    ],
    simulationHooks: ["history","social","politics","cultivation","aging"],
    version: "0.1.0",
  },
  {
    id: "custom.narrative_act_3",
    kind: "custom",
    name: "Act 3 — Core Formation to endgame",
    tags: ["arc","act_3","sessions_500_1500","endings"],
    description: "Act 3 of the narrative spine: sessions 500 to ~1500+, from Core Formation to endgame. Key beats: the revelation (session ~550), the pursuit (sessions ~600-1000, during which Liang Zhu dies), the Nascent Soul breakthrough (sessions ~1000-1200), and the choice (sessions ~1200-1500) — the final confrontation with Pei Liang offering three paths: Confront, Accommodate, or Transcend. Thesis: the world's law is not fixed, but authoring it costs everything. Joy: the law-authorship moment (Transcend path only) — the deepest form of the first awe.",
    source: "doc 26 §4.3",
    relations: [
      { type: "PRECEDED_BY", target: "custom.narrative_act_2" },
      { type: "CONTAINS", target: "event.the_revelation" },
      { type: "CONTAINS", target: "event.liang_zhu_death" },
      { type: "CONTAINS", target: "event.the_final_choice" },
      { type: "CONTAINS", target: "custom.ending_found_lineage" },
      { type: "CONTAINS", target: "custom.ending_cross_tribulation" },
      { type: "CONTAINS", target: "custom.ending_final_death" },
    ],
    simulationHooks: ["history","social","politics","cultivation","combat","perception"],
    version: "0.1.0",
  },

  // ============================ DOC 26 — THE CENTRAL CONFLICT ============================

  {
    id: "custom.central_want",
    kind: "custom",
    name: "The Want — Wang Xiaodi Back",
    nameHanzi: "王小弟",
    tags: ["central_conflict","want","grief","absence"],
    description: "The protagonist's want: Wang Xiaodi (王小弟, the protagonist's younger brother) died of fever at age 7, two years before game start, while the protagonist was studying with Old Chen at Li Family Creek and did not return in time. The guilt of absence is the engine of Scene 4 (the failed breakthrough) and of the entire game. Not initially conscious — the first 100 sessions are about learning to cultivate while failing to integrate because the grief is unprocessed; Scene 5 requires mourning first. The want is forbidden by the law of the cosmos (the bardo window has closed; a dispersed anchor cannot be recovered by any means, doc 00 §2) — the character-level confrontation of the genre tension.",
    source: "doc 26 §2.1, §2.2",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_xiaodi" },
      { type: "OPPOSED_BY", target: "npc.pei_liang", note: "the dark mirror — he breaks the law to take the anchor anyway" },
      { type: "FORBIDDEN_BY", target: "custom.bardo", note: "Wang Xiaodi's bardo window has closed; the anchor is either dispersed or reborn and not retrievable" },
    ],
    simulationHooks: ["history","social","cultivation","perception","deviation"],
    version: "0.1.0",
  },

  // ============================ DOC 26 — THE ENDINGS ============================

  {
    id: "custom.ending_found_lineage",
    kind: "custom",
    name: "Ending 1 — Found a Lineage",
    tags: ["ending","true_ending","mortal_time","lineage"],
    description: "The true ending (doc 26 §7.4). Reachable via the Confront path if the protagonist wins and survives. The protagonist, at Core Formation or Nascent Soul, returns to Wang Family Bend (or Old Chen's hermitage at Li Family Creek) and founds the Wang lineage's cultivation school; the first disciple is Wang Meili (by then Foundation Establishment). The last act: writing the character 修 (xiu, 'cultivate') next to their own name in the Wang lineage genealogy (族譜, zupu). The protagonist dies of old age at ~500; their anchor enters bardo and is reborn, lawfully, into the lineage they founded. Resolves the central conflict by sublimation: the grief becomes the lineage's first teaching.",
    source: "doc 26 §7.1, §7.4",
    relations: [
      { type: "REACHABLE_FROM", target: "event.the_final_choice", note: "Confront path, if the protagonist wins and survives" },
      { type: "CENTERED_ON", target: "npc.wang_meili", note: "the first disciple" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
    ],
    simulationHooks: ["history","social","ritual","reproduction","aging"],
    version: "0.1.0",
  },
  {
    id: "custom.ending_cross_tribulation",
    kind: "custom",
    name: "Ending 2 — Cross the Tribulation",
    tags: ["ending","precelestial","time_debt","law_author"],
    description: "Reachable via the Transcend path only: requires Tribulation Crossing (most die) and law-authorship. The protagonist, having authored the law that closes the bardo-harvest loophole, perceives Wang Xiaodi's anchor disperse lawfully — going to its next rebirth — and weeps from recognition, not grief. Then the time-debt becomes absolute: 1 day above = 1 year below (doc 00 §1). The Great Yan Dynasty falls; Wang Family Bend becomes a memory, then a name, then nothing. The protagonist, alone in the Precelestial, perceives the qi of a mortal world they no longer belong to. The genre-conventional ending, respected but not endorsed.",
    source: "doc 26 §7.2",
    relations: [
      { type: "REACHABLE_FROM", target: "event.the_final_choice", note: "Transcend path only" },
      { type: "REQUIRES", target: "event.bardo_harvest_loophole_amendment", note: "the law-authorship the ending completes" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
    ],
    simulationHooks: ["history","politics","ritual","perception","cultivation"],
    version: "0.1.0",
  },
  {
    id: "custom.ending_final_death",
    kind: "custom",
    name: "Ending 3 — Final Death",
    tags: ["ending","final_death","bardo","tragedy"],
    description: "Reachable via: the Confront path if the protagonist loses; the Accommodate path, via karmic tribulation (the protagonist cannot sustain the ledger — a corrupted variant); the Transcend path if the Tribulation Crossing or the law-authorship fails. The specific scene is the same in all three variants: the protagonist's anchor is dispersed (寂滅, jimie), and the protagonist perceives their own anchor beginning to dissolve. The world does not end; the simulation continues. The surviving companion returns to Wang Family Bend and reports the death; a tablet is added to the lineage hall. The final image is a slow zoom out from the empty practice room — the village continuing, the river flowing, the protagonist's qi-residue fading over the following days and weeks, then gone. The world goes on; the protagonist is not in it.",
    source: "doc 26 §7.3",
    relations: [
      { type: "REACHABLE_FROM", target: "event.the_final_choice", note: "Confront loss, Accommodate karmic tribulation, or Transcend failure" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
    ],
    simulationHooks: ["history","social","ritual","perception","cultivation"],
    version: "0.1.0",
  },

  // ============================ DOC 26 — ROMANCE, SIDE CONTENT, THE ADVANTAGE ============================

  {
    id: "custom.exchange_of_cuts",
    kind: "custom",
    name: "The Exchange of Cuts",
    nameHanzi: "交劍",
    tags: ["courtship","duel","truth_debt","romance"],
    description: "The courtship verb (交劍, jiaojian) between the protagonist and Leng Qingxue. Two cultivators spar; the loser owes the winner a truthful answer to one question; questions cannot be about combat, only about the self. Three bouts (three questions, three answers) = courtship acknowledged; seven bouts = betrothal; either party may decline, and declining three times ends the courtship. The truth-debt is enforced by the simulation: a lie in an answer registers as a karmic trace, perceivable at Core Formation by the wronged party. The arc: the first bout (session ~300, after the Cangli spirit vein dispute) is antagonistic; the third bout (session ~500, after Core Formation) is the courtship acknowledgment — they spar to a draw, exchange no questions, and sit in silence; the seventh bout, before the final confrontation with Pei Liang, asks: 'Will you come back?'",
    source: "doc 26 §10.2",
    relations: [
      { type: "CENTERED_ON", target: "npc.leng_qingxue" },
      { type: "OPPOSES", target: "custom.demonic_cultivation", note: "exchanges truth with consent — the opposite pole of Pei Liang's crime of harvesting anchors without consent" },
    ],
    simulationHooks: ["combat","social","ritual","perception"],
    version: "0.1.0",
  },
  {
    id: "custom.resonances",
    kind: "custom",
    name: "Resonances",
    tags: ["side_content","generated","world_state","optional"],
    description: "The side-content structure: no quest-givers, no exclamation marks, no quest log. At each solar term (二十四節氣, doc 00 §4) the simulation samples world-state (qi tides, sect movements, beast migrations, lineage events, market shortages, weather, festivals, magistrate edicts, spirit-vein fluctuations) and cross-references it with the protagonist's realm, capabilities, relationships, and residue-traces, producing 3-7 resonances — situations the protagonist could plausibly perceive and plausibly act on. Resonances are perceived, not assigned; optional; their resolutions feed back into world-state. The main narrative is not a series of resonances — it is a smaller set of scripted beats (the golden scenes, the key Act 2 and Act 3 beats) flagged as narrative-critical.",
    source: "doc 26 §11.1",
    relations: [],
    simulationHooks: ["history","ecology","weather","economy","politics","migration","social"],
    version: "0.1.0",
  },
  {
    id: "custom.residual_error_sense",
    kind: "custom",
    name: "Residual Error Sense",
    nameHanzi: "遺錯之覺",
    tags: ["protagonist","advantage","perception","residue"],
    description: "The protagonist's advantage (遺錯之覺, yicuo zhi jue — doc 00 §5): perceiving residue — their own and, increasingly, others'. Bounded to the protagonist's own residue at Foundation Establishment; extended at Core Formation to perceive others' anchors; at Nascent Soul, to perceive the residue-traces of past anchor-interactions. Confirms Wang Xiaodi's anchor was harvested (the signature matches residue-traces decades old); reads the teaching of the dead — Liang Zhu's last note on the xiao, Old Chen's last practice route. The narrative function: Wang Xiaodi's trace is in the protagonist's residue permanently, as the first loss.",
    source: "doc 26 §0, §5, §3.4, §9.2",
    relations: [
      { type: "EXTENDS_AT", target: "realm.core_formation", note: "perceive others' anchors" },
      { type: "EXTENDS_AT", target: "realm.nascent_soul", note: "perceive residue-traces of past anchor-interactions" },
    ],
    simulationHooks: ["perception","cultivation","history"],
    version: "0.1.0",
  },

  // ============================ DOC 28 — THE LINEAGE ELDER COUNCIL ============================

  {
    id: "institution.lineage_elder_council",
    kind: "institution",
    name: "The Lineage Elder Council",
    tags: ["village","lineage","adjudication","five_elders"],
    description: "The Wang lineage's elder council: meets in the lineage hall's side room with the five elders sitting on low stools, presided over by Wang Shouzheng as lineage head. On the 15th day of the third month its matter is Xu Erniu's disappearance — the council debates searching the upper slopes (beast territory in spring) versus declaring him a fugitive. The player may attend: speaking for search impresses Shouzheng (courage), speaking for waiting impresses Wang Tianming (caution), speaking for fugitive shames Widow Xu, silence is safe but mildly disappoints Shouzheng.",
    source: "doc 28 §4.4",
    relations: [
      { type: "LOCATED_IN", target: "location.wang_family_bend" },
      { type: "PRESIDED_BY", target: "npc.wang_shouzheng" },
      { type: "MEMBER_OF", target: "npc.wang_tianming", note: "the senior elder after Shouzheng, argues for waiting" },
      { type: "ADJUDICATES", target: "event.widow_xu_missing_son" },
    ],
    simulationHooks: ["social","politics","ritual","history"],
    version: "0.1.0",
  },

  // ============================ DOC 06 — THE FIVE GOLDEN SCENES ============================

  {
    id: "event.scene_first_teacher",
    kind: "event",
    name: "Scene 1 — The First Teacher (Wang Lun's Hexagram)",
    tags: ["golden_scene","act_1","session_5","qingming"],
    description: "The first golden scene: spring (Qingming), the player's 16th year, the lineage hall's side room (the school). Wang Lun (41) — who perceived qi once in his youth and never again — has noticed the player's faint, unnamed qi perceptions; he casts the hexagram (卦, deterministic from seed + player state) and gives the direction: seek Old Chen on the hill above Li Family Creek. If the player speaks honestly, Wang Lun writes a letter of introduction. The player learns the words qi (氣) and cultivator (修士).",
    source: "doc 06 Scene 1, doc 26 §4.1",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_lun" },
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "OCCURS_ON", target: "event.qingming" },
      { type: "DIRECTS_TO", target: "npc.old_chen" },
    ],
    simulationHooks: ["perception","social","ritual","history"],
    version: "0.1.0",
  },
  {
    id: "event.scene_fraudulent_manual",
    kind: "event",
    name: "Scene 2 — The Fraudulent Manual (Old Chen's Test)",
    tags: ["golden_scene","act_1","session_15","old_chen"],
    description: "The second golden scene: winter, the player's 16th year, Old Chen's hermitage above Li Family Creek. Old Chen (82) tests the player before teaching: a hand-copied manual (功法) that is fraudulent — 2 accurate observations, 1 harmless exercise, 1 mistranscribed route, 1 fabricated claim, and 1 omitted dangerous stop condition (practicing it as described produces a false circuit, 假周天). The test is not whether the player detects the fraud but how they respond to uncertainty; passing earns Old Chen as teacher. The player learns to investigate a teaching before practicing it.",
    source: "doc 06 Scene 2, doc 26 §4.1",
    relations: [
      { type: "CENTERED_ON", target: "npc.old_chen" },
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "PRECEDED_BY", target: "event.scene_first_teacher" },
    ],
    simulationHooks: ["cultivation","perception","deviation","social"],
    version: "0.1.0",
  },
  {
    id: "event.scene_first_duel",
    kind: "event",
    name: "Scene 3 — The First Duel (Zongde's Challenge)",
    tags: ["golden_scene","act_1","session_40","first_combat"],
    description: "The third golden scene: late summer, the player's 18th year, the threshing ground at night during the Autumn Equinox harvest festival. Wang Zongde (24), the resentful 'bare stick' who studied with a traveling hustler, publicly challenges the player to 'first yield' — the first to yield or acknowledge inferiority loses. The player's first combat against a peer, witnessed by the lineage head and Old Chen. The outcome sets Zongde's trajectory (enemy, reluctant ally, or friend) and the player's standing in the lineage.",
    source: "doc 06 Scene 3, doc 26 §4.1",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_zongde" },
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "PRECEDED_BY", target: "event.scene_fraudulent_manual" },
    ],
    simulationHooks: ["combat","social","cultivation","deviation"],
    version: "0.1.0",
  },
  {
    id: "event.scene_failed_breakthrough",
    kind: "event",
    name: "Scene 4 — The Failed Breakthrough",
    tags: ["golden_scene","act_1","session_70","foundation_establishment","heart_demon"],
    description: "The fourth golden scene: winter, the player's 21st year, the hermitage's practice room, at night while Old Chen sleeps. Against Old Chen's assessment ('not yet stable' — unprocessed grief over the younger sibling), the player attempts Foundation Establishment and fails. The player learns that Foundation Establishment cannot be forced, that psychospiritual state matters as much as qi-state, and that grief unprocessed becomes 心魔 (Heart Demons). The player must mourn before attempting again. The first failure that teaches (doc 26 §13.3).",
    source: "doc 06 Scene 4, doc 26 §4.1",
    relations: [
      { type: "CENTERED_ON", target: "npc.old_chen" },
      { type: "CENTERED_ON", target: "npc.wang_xiaodi", note: "the unprocessed grief over his death drives the premature attempt" },
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "PRECEDED_BY", target: "event.scene_first_duel" },
      { type: "PRECEDED_BY", target: "event.verb_xiaodi_grave", note: "the grief anchored at the Qingming grave surfaces here" },
    ],
    simulationHooks: ["cultivation","deviation","perception","social","ritual"],
    version: "0.1.0",
  },
  {
    id: "event.scene_genuine_success",
    kind: "event",
    name: "Scene 5 — The Genuine Success",
    tags: ["golden_scene","act_1","session_100","foundation_establishment"],
    description: "The fifth golden scene: autumn, the player's 23rd year, Old Chen's hermitage. Having mourned Wang Xiaodi, balanced phase-affinities, and resolved the guilt, the player attempts Foundation Establishment again — this time with Old Chen present and supervising. Success: body, qi, and spirit integrate; lifespan extends to ~200 years; the player crosses from mortal-time to cultivator-time. Old Chen, for the first time, is proud. The player gains the verb 'integrate a practice' (合修) and is now, by the reckoning of the cultivation world, a cultivator.",
    source: "doc 06 Scene 5, doc 26 §4.1",
    relations: [
      { type: "CENTERED_ON", target: "npc.old_chen" },
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "PRECEDED_BY", target: "event.scene_failed_breakthrough" },
      { type: "RESULTED_IN", target: "realm.foundation_establishment", note: "the protagonist's own breakthrough" },
    ],
    simulationHooks: ["cultivation","perception","aging","ritual"],
    version: "0.1.0",
  },

  // ============================ DOC 26 — SESSION BEATS ============================

  {
    id: "event.first_awe",
    kind: "event",
    name: "Session 10 — The First Awe",
    tags: ["session_beat","act_1","qi_perception","third_perception"],
    description: "Session 10: the third qi perception arrives and holds for thirty seconds. The world gains its second layer (doc 05 §4.2) — the river's sound has a voice beneath it, the sun's warmth has a direction and a weight, the player's own hands have an interior. The qualities were always there; the world did not change, the player did. The player weeps — not from sadness but from recognition — at being smaller in a larger world, and the smallness being relieving. The gate from Mortal to Qi Induction. The first awe (doc 26 §13.2).",
    source: "doc 26 §5.2, §13.2",
    relations: [
      { type: "PART_OF", target: "custom.narrative_act_1" },
      { type: "PRECEDED_BY", target: "event.scene_first_teacher", note: "session ~5" },
    ],
    simulationHooks: ["perception","cultivation","history"],
    version: "0.1.0",
  },
  {
    id: "event.first_return",
    kind: "event",
    name: "The First Return",
    tags: ["viral_moment","act_2","session_100","grief","graveyard"],
    description: "The viral moment and the joy of Act 2: the first return to Wang Family Bend after Foundation Establishment (threshold at session ~100, the joy-of-Act-2 return at session ~150). The village is the same; the people are older — the father Wang Shouzheng has gray hair, the graveyard has three new tablets, including Wang Lun (died of pneumonia the previous winter at 47 while the player practiced at the hermitage and did not return in time). The player perceives the qi of the place: denser than remembered; in the lineage hall, the residue of Wang Lun's last lesson fading; at Wang Xiaodi's tablet, a faint residue almost gone. The player weeps. The recognition that power costs time and the time costs love.",
    source: "doc 26 §8, §5.3, §4.2",
    relations: [
      { type: "PART_OF", target: "custom.narrative_act_2" },
      { type: "CENTERED_ON", target: "npc.wang_lun", note: "his tablet is among the three new ones" },
      { type: "LOCATED_IN", target: "location.wang_family_bend" },
    ],
    simulationHooks: ["perception","history","social","ritual","aging"],
    version: "0.1.0",
  },

  // ============================ DOC 26 — ACT 2/3 BEATS ============================

  {
    id: "event.pei_liang_introduction",
    kind: "event",
    name: "Pei Liang's Introduction",
    tags: ["act_2","session_200","antagonist","cangwu_sect","anchor_records"],
    description: "Session ~200, Act 2: the antagonist's scene of introduction. Pei Liang (Nascent Soul, ~180 years old, appears ~35) raids the Cangwu Sect's outer hall at night to steal the sect's anchor-records — the catalog he uses to select harvest targets. The protagonist, present by chance at ~50 (Foundation Establishment, appears ~30), survives because Pei Liang does not consider a Foundation Establishment cultivator worth killing, and perceives Pei Liang's qi-signature: stained, corrupted by the residue of dozens of harvested anchors, registering as wrong and borrowed. Wu Changqing reports the raid to the Azure Sword Sect, which sends Leng Qingxue to investigate — the protagonist's first meeting with her.",
    source: "doc 26 §3.3, §4.2",
    relations: [
      { type: "CENTERED_ON", target: "npc.pei_liang" },
      { type: "PART_OF", target: "custom.narrative_act_2" },
      { type: "LOCATED_IN", target: "location.cangwu_sect", note: "raid on the outer hall" },
      { type: "INTRODUCES", target: "npc.leng_qingxue", note: "sent by the Azure Sword Sect to investigate; the protagonist's first meeting" },
    ],
    simulationHooks: ["politics","cultivation","combat","perception","history"],
    version: "0.1.0",
  },
  {
    id: "event.old_chen_death",
    kind: "event",
    name: "Old Chen's Death",
    tags: ["act_2","session_450","time_debt","teacher","winter_solstice"],
    description: "Session ~450: Old Chen dies in his sleep at his hermitage on the hill above Li Family Creek, on the winter solstice (冬至, Dongzhi). Old Chen is ~165 (appears ~95), extended by his partial Foundation Establishment integration; his wife Lady Chen of the hermitage died years before. The protagonist (~130, appears ~45), traveling to consult him about Pei Liang's traces, arrives the next morning and perceives the faint residue of Old Chen's last practice — the slow Qi Condensation route he practiced every morning for sixty years, traced in the qi of the practice room, fading. A whole death, after a long life, is the teacher's last lesson. The protagonist buries him next to Lady Chen and adds his tablet to the hermitage's shrine; the desire to perceive his anchor — and Wang Xiaodi's — drives the protagonist toward Core Formation.",
    source: "doc 26 §12",
    relations: [
      { type: "CENTERED_ON", target: "npc.old_chen" },
      { type: "PART_OF", target: "custom.narrative_act_2" },
      { type: "OCCURS_ON", target: "event.winter_solstice" },
      { type: "PRECEDES", target: "event.the_revelation", note: "Core Formation (session ~500) follows" },
    ],
    simulationHooks: ["aging","disease","ritual","perception","history","cultivation"],
    version: "0.1.0",
  },
  {
    id: "event.liang_zhu_death",
    kind: "event",
    name: "Liang Zhu's Death",
    tags: ["act_3","session_800","companion","ambush","final_lesson"],
    description: "Session ~800, in the pursuit of Pei Liang: Liang Zhu (Foundation Establishment, ~110, appears ~50) dies in Pei Liang's ambush, killed protecting the protagonist's retreat; his anchor disperses (final death). This is the second grief that mirrors the first — this time the protagonist was present, so the grief is not the guilt of absence but the grief of presence. His death scene: mortally wounded, he plays one last note on the xiao — a qi-residue trace, a technique he developed — which the protagonist recognizes as his teaching and carries for the rest of the game. His death is the engine of the protagonist's Nascent Soul breakthrough.",
    source: "doc 26 §9.2, §4.3",
    relations: [
      { type: "CENTERED_ON", target: "npc.liang_zhu" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
      { type: "PRECEDED_BY", target: "event.pei_liang_introduction" },
    ],
    simulationHooks: ["combat","perception","audio","cultivation","history"],
    version: "0.1.0",
  },
  {
    id: "event.the_revelation",
    kind: "event",
    name: "The Revelation",
    tags: ["act_3","session_550","wang_xiaodi","harvest_store"],
    description: "Session ~550: at Core Formation, the protagonist perceives Wang Xiaodi's anchor in Pei Liang's harvest-store. The Residual Error Sense, extended at Core Formation to perceive others' anchors, confirms the signature: it matches the residue-traces Wang Xiaodi left in the protagonist's own practice decades ago. The protagonist fears the worst and it is true — the anchor was not dispersed and was not reborn; it was harvested, and it is being used as fuel. The moment the personal conflict and the antagonist merge; the endgame begins.",
    source: "doc 26 §4.3, §5.4, §3.4",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_xiaodi" },
      { type: "CENTERED_ON", target: "npc.pei_liang" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
      { type: "PRECEDED_BY", target: "event.old_chen_death" },
    ],
    simulationHooks: ["perception","cultivation","politics","history"],
    version: "0.1.0",
  },
  {
    id: "event.the_final_choice",
    kind: "event",
    name: "The Choice (The Final Confrontation)",
    tags: ["act_3","session_1200_1500","final_confrontation","three_paths"],
    description: "Sessions ~1200-1500: the final confrontation. The protagonist, now Nascent Soul or Spirit Severance, tracks Pei Liang to the Cangwu Mountains' latent spirit vein — the site Pei Liang has claimed for his Spirit Severance breakthrough — and perceives Wang Xiaodi's anchor in his harvest-store. The protagonist must choose: Confront (kill Pei Liang, free the harvested anchors; Wang Xiaodi's anchor disperses lawfully), Accommodate (share the anchor, become complicit, gain protection — the karmic tribulation cannot be sustained), or Transcend (pursue Mahayana law-authorship to close the bardo-harvest loophole). The game's final decision.",
    source: "doc 26 §4.3, §3.4",
    relations: [
      { type: "CENTERED_ON", target: "npc.pei_liang" },
      { type: "PART_OF", target: "custom.narrative_act_3" },
      { type: "PRECEDED_BY", target: "event.the_revelation" },
      { type: "LEADS_TO", target: "custom.ending_found_lineage", note: "Confront path, wins and survives" },
      { type: "LEADS_TO", target: "custom.ending_cross_tribulation", note: "Transcend path" },
      { type: "LEADS_TO", target: "custom.ending_final_death", note: "Confront loss, Accommodate, or Transcend failure" },
    ],
    simulationHooks: ["combat","politics","cultivation","perception","history"],
    version: "0.1.0",
  },

  // ============================ DOC 28 — THE THREE CURRENT TENSIONS ============================

  {
    id: "event.salt_license_tension",
    kind: "event",
    name: "The Salt Merchant's License",
    nameHanzi: "鹽引",
    tags: ["village_tension","salt_license","bribe","politics"],
    description: "The first current tension of the in-medias-res week: Master Hu's salt license (鹽引) is up for renewal at the autumn equinox. A yamen runner visited ostensibly to check the baojia registers but spent an hour at Hu's warehouse and left with a silk-wrapped gift. Rumor: a competing merchant from Cangli County Seat has bid for the license. The player-facing verbs: buy salt from Master Hu, overhear the argument, and choose to tell Wang Shouzheng, keep the secret, or ask Hu directly. (Underlying secret, doc 28 §3.4: Hu has paid an autumn bribe to the county magistrate's secretary for six years — and the new secretary wants double.)",
    source: "doc 28 §2.1, §3.4",
    relations: [
      { type: "CENTERED_ON", target: "npc.master_hu" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
      { type: "LOCATED_IN", target: "location.wang_family_bend" },
    ],
    simulationHooks: ["economy","trade","politics","social"],
    version: "0.1.0",
  },
  {
    id: "event.widow_xu_missing_son",
    kind: "event",
    name: "The Widow Xu's Missing Son",
    tags: ["village_tension","disappearance","search","elder_council"],
    description: "The second current tension: Xu Erniu (Widow Xu's only surviving son, 19) has not been seen for three days — he left to cut firewood in the Cangwu foothills and did not return. The search party found his axe and a bundle of cut wood near the Black Creek but no sign of him. The elder council meets on the 15th to decide: search the upper slopes (dangerous — beast territory) or declare him a fugitive (which would strip Widow Xu of her last means of support). The truth the player may discover: Erniu found a cave entrance that wasn't there before and entered it. The player's first encounter with the fact that the world has hidden layers.",
    source: "doc 28 §2.2",
    relations: [
      { type: "CENTERED_ON", target: "npc.xu_erniu" },
      { type: "CENTERED_ON", target: "npc.widow_xu" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
      { type: "RESULTED_IN", target: "event.xu_erniu_cache" },
      { type: "ADJUDICATED_BY", target: "institution.lineage_elder_council" },
    ],
    simulationHooks: ["social","perception","migration","politics"],
    version: "0.1.0",
  },
  {
    id: "event.unaffordable_betrothal",
    kind: "event",
    name: "The Betrothal That Cannot Be Afforded",
    tags: ["village_tension","betrothal","bride_price","sanniang"],
    description: "The third current tension: Wang Sanniang (22, the player's aunt, Wang Shouzheng's youngest daughter) is betrothed to Li Zongwen of Li Family Creek — a good match arranged three years ago with a bride-price of 40 taels of silver. The Senior Household has saved 28 taels; the remaining 12 must come from this autumn's harvest surplus, threatened by the early plum rain. The Li family has hinted that if the marriage is delayed again they will look elsewhere. Sanniang does not want the marriage but does not want to shame her father, and has told no one; her suppressed-tears grief-trace at the lineage hall altar at dawn is perceivable in Qi Induction mode.",
    source: "doc 28 §2.3",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_sanniang" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
      { type: "LOCATED_IN", target: "location.wang_family_bend" },
    ],
    simulationHooks: ["economy","social","ritual","reproduction"],
    version: "0.1.0",
  },

  // ============================ DOC 28 — THE ANCHORED VERBS ============================

  {
    id: "event.verb_carry_water",
    kind: "event",
    name: "Carry Water at Dawn",
    tags: ["anchored_verb","first_verb","session_1","well"],
    description: "The first verb of the game (doc 26 §13.1): the morning of the 13th day, session 1. The player wakes at dawn (卯時); Lady Chen is already at the stove. The player takes the bucket to the communal well, where Widow Xu — coming before dawn since Erniu disappeared, unable to sleep — is drawing water mechanically with red eyes. She asks: 'Have you heard anything? Shouzheng says the council meets tomorrow.' The windlass creaks; the plum rain's early mist sits in the paddies; the player carries the water back, the bucket heavy on the muddy path. Not a tutorial — a morning in a village where a woman's son is missing.",
    source: "doc 28 §4.1, doc 26 §13.1",
    relations: [
      { type: "PART_OF", target: "custom.narrative_act_1", note: "session 1" },
      { type: "CENTERED_ON", target: "npc.widow_xu" },
    ],
    simulationHooks: ["social","perception","weather","history"],
    version: "0.1.0",
  },
  {
    id: "event.verb_xiaodi_grave",
    kind: "event",
    name: "Visit Xiaodi's Grave",
    tags: ["anchored_verb","qingming","unmarked_grave","grief"],
    description: "Qingming, the 15th day: the village walks to the graveyard on the hill after the spring ancestor rite. The player's grandfather Wang Tianlu has a tombstone; the player's brother Wang Xiaodi does not — children are buried without markers. His grave is a small, unmarked, overgrown mound next to Tianlu's. Lady Chen kneels at the mound and pulls the weeds with her hands; she does not speak, she does not weep. The player can help (Lady Chen's hand touches theirs briefly), stand and watch, or walk away (Lady Chen stays alone for another hour). The grief that will surface in the failed breakthrough (doc 06 Scene 4), felt not as a cutscene but as a verb.",
    source: "doc 28 §4.3",
    relations: [
      { type: "CENTERED_ON", target: "npc.wang_xiaodi" },
      { type: "CENTERED_ON", target: "npc.lady_chen" },
      { type: "OCCURS_ON", target: "event.qingming" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
      { type: "PRECEDES", target: "event.scene_failed_breakthrough", note: "the grief anchored here surfaces there" },
    ],
    simulationHooks: ["ritual","social","perception","history"],
    version: "0.1.0",
  },
  {
    id: "event.verb_elder_council",
    kind: "event",
    name: "Attend the Elder Council",
    tags: ["anchored_verb","elder_council","erniu","choices"],
    description: "The 15th day, afternoon: the lineage elder council meets in the lineage hall's side room — five elders on low stools, Wang Shouzheng presiding, Wang Lun reporting the search party's findings (the axe, the bundle of wood, no sign of struggle). The matter: Xu Erniu's disappearance — search the upper slopes (Shouzheng argues for search; Wang Tianming argues for waiting — beast territory in spring; a third elder argues for declaring fugitive). The player may attend and speak for search, speak for waiting, speak for declaring fugitive, or remain silent — each choice has consequences.",
    source: "doc 28 §4.4",
    relations: [
      { type: "HELD_BY", target: "institution.lineage_elder_council" },
      { type: "CENTERED_ON", target: "npc.wang_shouzheng" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
      { type: "ADJUDICATES", target: "event.widow_xu_missing_son" },
    ],
    simulationHooks: ["social","politics","ritual","history"],
    version: "0.1.0",
  },

  // ============================ DOC 28 — THE CULTIVATOR'S CACHE ============================

  {
    id: "event.xu_erniu_cache",
    kind: "event",
    name: "The Cultivator's Cache",
    tags: ["hidden_layer","foothills","formation","erniu"],
    description: "What Erniu found: a cave entrance in the Cangwu foothills that wasn't there before, sealed by a stone that crumbled when he leaned on it. Inside: the faint glow of qi, the smell of old incense, the remnants of a formation that hasn't activated in centuries — a cultivator's cache, left by someone centuries ago, too small to be a real grotto-heaven. Erniu, a mortal with no cultivation, triggered the formation's last defense and is trapped inside, unconscious but alive, his body's qi slowly drained by the cache's maintenance system. Old Chen sealed it 40 years ago when he was still a roaming cultivator; he did not take the contents because the formation was too degraded to safely deactivate. The player's first encounter with a cultivator's legacy.",
    source: "doc 28 §2.2, §3.5",
    relations: [
      { type: "CENTERED_ON", target: "npc.xu_erniu" },
      { type: "SEALED_BY", target: "npc.old_chen", note: "collapsed the entrance 40 years ago; did not take the contents" },
      { type: "LOCATED_IN", target: "region.cangli_riverlands", note: "Cangwu foothills above Black Creek" },
      { type: "PART_OF", target: "custom.narrative_act_1", note: "the game-start week" },
    ],
    simulationHooks: ["perception","ecology","physics","history","ritual"],
    version: "0.1.0",
  },
];
