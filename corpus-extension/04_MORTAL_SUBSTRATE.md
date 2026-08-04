# 04 — The Cangli Riverlands (沧篱江乡)

**Status:** `[CANON]` Candidate canon. The base region where the player begins.
**Date:** 2026-08-03
**Truth level:** Canonical invariant (regional identity) + Derived (measurements)
**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md`, `corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md`, `corpus-extension/52_MEASUREMENT_AND_SCALE_SYSTEM.md`, `corpus-extension/53_STYLE_GRAMMARS.md` §2 (Cangli Riverlands grammar)
**Style grammar:** `cangli-riverlands`
**Implementation status:** `[SPEC]` — fully specified, implementation in progress

---

## Ground-Truth Specification Summary

> `[CANON]` The Cangli Riverlands occupy a basin approximately 120 km north-south and 60 km east-west at the widest point, on a coastal plain backed by low mountains (Cangwu range, 1–3 km relief).

> `[CANON]` Wang Family Bend has a population of ~180 souls across 31 households.

> `[DERIVED]` All buildings in the mortal substrate use the Cangli Riverlands style grammar (doc 53 §2): low and wide, timber-frame, lime-washed walls, grey clay tile, no curved eaves, no gold, no red pillars.

> `[DERIVED]` Walking speed for mortal villagers: 1.3 m/s typical (range 1.1–1.5 m/s). Travel time to the market town (8 km / 15 li): ~1.7 hours at typical pace.

> `[PROC]` Village populations range from 40 to 380 souls depending on seed. Wang Family Bend is the canonical instance at ~180.

> `[UNRESOLVED]` Whether the southern ridge contains a dormant spirit-vein node — see `/questions/mortal-substrate.yaml#spirit-vein-south-ridge`.

### PhysicalSpecification — Region

```json
{
  "id": "region-cangli-riverlands",
  "dimensions": {
    "widthMeters": { "min": 40000, "max": 80000, "typical": 60000 },
    "heightMeters": { "min": 100000, "max": 140000, "typical": 120000 }
  },
  "measurementConfidence": "estimated",
  "rationale": "Basin dimensions estimated from river-course and mountain-range descriptions in §1–§2"
}
```

### PhysicalSpecification — Wang Family Bend village

```json
{
  "id": "village-wang-family-bend",
  "dimensions": {
    "widthMeters": { "min": 250, "max": 400, "typical": 320 },
    "heightMeters": { "min": 200, "max": 350, "typical": 280 }
  },
  "population": { "typical": 180, "min": 160, "max": 200 },
  "householdCount": { "typical": 31 },
  "measurementConfidence": "exact",
  "rationale": "Explicitly stated in §1"
}
```

### PhysicalSpecification — Household compound

```json
{
  "id": "arch-village-household-cangli",
  "dimensions": {
    "widthMeters": { "min": 5, "max": 10, "typical": 7 },
    "depthMeters": { "min": 4, "max": 8, "typical": 6 },
    "heightMeters": { "min": 3.5, "max": 5.0, "typical": 4.2 }
  },
  "doorDimensions": {
    "heightMeters": { "typical": 2.05 },
    "widthMeters": { "typical": 0.95 }
  },
  "roofPitch": { "min": 25, "max": 38, "typical": 30 },
  "measurementConfidence": "derived",
  "rationale": "Sized for mortal occupation (1.68m avg) with 2× ceiling clearance"
}
```

### Forbidden interpretations

- `[FORBIDDEN]` Curved temple eaves on household buildings (reserved for shrines and sects per style grammar §2)
- `[FORBIDDEN]` Red pillars (reserved for official/sect buildings)
- `[FORBIDDEN]` Gold leaf or gilding of any kind
- `[FORBIDDEN]` Glowing runes or formation marks on civilian structures
- `[FORBIDDEN]` Floating elements or supernatural lighting on mortal buildings
- `[FORBIDDEN]` Modern materials (concrete, steel, glass)
- `[FORBIDDEN]` Buildings exceeding 5m height without explicit sect/official justification

### Acceptance tests

- `cangli.scale.village-within-region` — village fits within region
- `cangli.style.no-forbidden-motifs` — no curved eaves, gold, or red pillars on civilian buildings
- `cangli.economy.population-can-be-fed` — arable land produces enough rice for 180 people
- `cangli.travel.wang-to-town-time-consistent` — 8km at 1.3 m/s = ~1.7h, not "2 hours"

---

## 0. What this document is for

This is the mortal substrate. It is written so that someone who has never seen a Chinese village could envision one in detail, and so that a procedural generator could produce one lawfully. Every named element is a generator input. Every material practice is a player-facing verb or constraint. Every social institution is a persistent entity with state.

The Cangli Riverlands is not "generic ancient China." It is a specific place: a wet-rice lowland in the lower reaches of the Cangli River (沧篱江), a major river flowing east to the sea through a coastal plain backed by low mountains. The climate is subtropical monsoon: hot wet summers, cool dry winters, a plum-rain (梅雨, *méiyǔ*) season in early summer that can flood the paddies. The soil is alluvial silt, heavy and fertile. The dominant crop is wet rice (水稻, *shuǐdào*), with winter wheat (小麥, *xiǎomài*) or rapeseed (油菜, *yóucài*) in the dry season where water permits.

The player begins in a village called **Wang Family Bend (王 家彎, *Wángjiāwān*)**, pop. ~180, one of seven villages in the lower Cangli watershed that together form the **Bend Township (彎鄉, *Wānxiāng*)**, pop. ~1200.

---

## 1. The village: Wang Family Bend (王 家彎)

### 1.1 Layout

The village sits on a gentle bend of the Cangli River, on the north bank, where the land rises slightly above the flood line. From above (which the player cannot see, but the generator must produce):

- **The river** runs along the south edge, ~40m wide at the bend, fordable in dry season, impassable in flood. A wooden dock (木埠頭, *mùbùtóu*) extends 8m into the current, where salt-merchant boats and passenger ferries tie up.
- **The levee (垾, *hàn*)** is a low earth embankment, 1.5m high, between the village and the river, maintained by communal labor. It fails in major floods. The last failure was 11 years ago; the village still remembers it.
- **The main path (大路, *dàlù*)** runs east-west along the north side of the levee, compacted earth, ~2m wide, passable by handcart but not wagon. It connects to the next village (Li Family Creek, 李家溪, *Lǐjiāxī*, 4 li / ~2km east) and eventually to the market town (鎮, *zhèn*) at the river crossing, 15 li / ~8km east.
- **The lineage hall (祠堂, *cítáng*)** sits on the highest ground, ~50m north of the levee, oriented south-facing (the auspicious direction). It is a single-courtyard building: front gate, open courtyard, main hall with the ancestor tablets (神主牌, *shénzhǔpái*), side rooms for storage and the lineage school. It is the largest structure in the village. It belongs to the Wang lineage.
- **The households (家, *jiā*)** cluster along two paths branching north from the main path: East Lane (東巷, *dōngxiàng*) and West Lane (西巷, *xīxiàng*). There are 31 households. Each is a walled compound (院, *yuàn*) with a gate, a courtyard, a main house (正房, *zhèngfáng*), and depending on wealth, side houses (廂房, *xiāngfáng*), a kitchen (廚房, *chúfáng*), a pigsty-latrine (豬廁, *zhūcè*), and a private well (井, *jǐng*) or shared access to a neighbor's.
- **The communal well (公井, *gōngjǐng*)** is at the junction of East and West Lanes, ~30m north of the main path. It is stone-lined, ~6m deep, with a wooden windlass (轆轤, *lùlú*). It is the social center of the village; women gather here to draw water and exchange news in the early morning.
- **The threshing ground (打穀場, *dǎgǔchǎng*)** is a flat compacted-earth area ~80m north of the lineage hall, used for threshing rice in autumn and for festivals. It is the second social center.
- **The mill (碾房, *niǎnfáng*)** is a small building at the east edge of the village, with a water-powered rice mill (水碾, *shuǐniǎn*) driven by a minor offshoot of the river. It is owned by the Wang lineage and operated by a lineage member; villagers pay a milling fee (a small fraction of the grain milled).
- **The spirit shrine (土地廟, *tǔdìmiào*)** is a tiny building (~2m square) at the west entrance of the village, dedicated to the local earth god (土地公, *tǔdìgōng*). It is maintained by the village as a whole, not by the lineage. Incense is burned on the 1st and 15th of each lunar month.
- **The paddies (田, *tián*)** extend north and west from the village, terraced slightly to retain water. They are divided into ~180 small plots (畝, *mǔ*, ~0.06 hectare each), each owned or tenanted by a specific household. The plots are bounded by low earth bunds (田埂, *tiángěng*), ~30cm high, which also serve as paths.
- **The dryland gardens (地, *dì*)** are on the slightly higher ground south of the levee and north of the village, growing vegetables (cabbage, radish, beans, gourds), hemp (麻, *má*) for cloth, and mulberry (桑, *sāng*) for silkworms where the household can afford them.
- **The ancestral graveyard (祖墳, *zǔfén*)** is on the low hill (~1km north) above the flood line, oriented to face the village. It is Wang lineage property; other lineages bury their dead elsewhere.

### 1.2 Procedural generator implications

The village generator must produce:
- A river segment with bend geometry, fordability, flood history
- A levee with maintenance state and failure history
- A path network connecting to neighboring settlements
- A lineage hall with orientation, ownership, and sub-rooms
- 20-40 households with compounds, each with specific structures
- 1-3 communal wells with depth and water quality
- A threshing ground
- A mill with power source and ownership
- 1-2 spirit shrines with dedicated deity and maintenance schedule
- 100-300 paddy plots with ownership, tenancy, and crop state
- Dryland gardens with crops
- A graveyard with orientation and ownership

Each element is a persistent entity with state that changes over time. The generator produces the initial state; the simulation develops it.

### 1.3 Three.js / rendering implications

- The village is a small scene (~200m × 200m) renderable at full fidelity on the reference hardware.
- Buildings are modular: gate, courtyard, main house, side house, kitchen, pigsty-latrine, well. Each is a glTF asset, instanced with per-instance variation (roof color, wall material, weathering).
- The river is a plane with shader-based flow animation; fordability is a render-time effect, not a geometry change.
- Paddies are instanced planes with water-level state and crop-growth state.
- The lineage hall is a hero asset (higher detail, custom geometry) because it is the social center.
- NPC density: ~180 villagers, but only ~30-50 visible at any time (others are indoors or in fields). Use InstancedMesh for distant NPCs, full skinned meshes for interactable ones.

---

## 2. The households

### 2.1 The Wang lineage (王氏)

The Wang lineage is the dominant lineage in the village. Of the 31 households, 22 are Wang. The lineage traces its origin to a founder who settled the bend ~9 generations ago, during a period of land reclamation. The lineage hall bears his tablet as the founding ancestor (始祖, *shǐzǔ*).

**Lineage structure:**
- **The lineage head (族長, *zúzhǎng*)** is Wang Shouzheng (王守正, *Wáng Shǒuzhèng*), 58, the senior male of the senior branch. He is the village's de facto leader on matters concerning lineage land, internal disputes, and representation to the magistrate. He is not the wealthiest man in the village (the salt merchant is), but he is the most authoritative on matters of custom.
- **The lineage elder council (長老會, *zhǎnglǎohuì*)** is 5 men: the lineage head, the two senior males of the next two branches, the lineage school teacher (塾師, *shúshī*), and the lineage's most prosperous farmer. They meet in the lineage hall on the 1st and 15th of each lunar month to hear disputes and manage lineage affairs.
- **The lineage fields (族田, *zútián*)** are ~8 mu of paddy owned collectively by the lineage, the produce of which funds the lineage school, the lineage hall maintenance, and the spring and autumn ancestor rites. They are farmed by rotation among lineage members, who owe the lineage a fixed rent.
- **The lineage school (義學, *yìxué*)** is held in the side room of the lineage hall. It teaches basic literacy (三字經, 百家姓, 千字文 — Three Character Classic, Hundred Family Surnames, Thousand Character Classic) to Wang boys aged 6-12. Girls are not formally taught but may listen from the courtyard. The teacher is Wang Lun (王倫, *Wáng Lún*), 41, a failed county exam candidate who holds the post as a lineage obligation.
- **The lineage genealogy (族譜, *zúpǔ*)** is a hand-copied document stored in the lineage hall. It records every Wang birth, marriage, and death for 9 generations. It is updated annually at the winter solstice rite. It is the lineage's most precious object; in a fire, it would be rescued before the silver.

### 2.2 The five named households

For the player's purposes, five households matter most:

**Household 1: The Wang Senior Household (王正房, *Wáng Zhèngfáng*)**
- Head: Wang Shouzheng (王守正), 58, lineage head
- Wife: Lady Chen (陳氏, *Chén shì*), 54
- Sons: Wang Zongxian (王宗顯, 32, married, 2 children), Wang Zongwen (王宗文, 27, married, 1 child, at the lineage school as assistant teacher)
- Daughter: Wang Sanniang (王三娘, 22, betrothed to a Li family in the next village, to marry in autumn)
- Father (deceased): Wang Tianlu (王天祿), died 6 years ago, tablet in the hall
- Holding: 12 mu paddy (owned subsoil, farmed surface), 3 mu dryland, 1 pig, 8 chickens, a shared well, a walled compound with main house, side house, kitchen, pigsty-latrine
- This is the household the player is born into if they choose the "lineage member" origin

**Household 2: The Wang Tenant Household (王佃房, *Wáng Diànfáng*)**
- Head: Wang Shouye (王守業, 52), a cousin of Shouzheng, tenant farmer
- Wife: Lady Zhao (趙氏, 49)
- Sons: Wang Zongwu (王宗武, 28, married, 3 children, 2 surviving), Wang Zongde (王宗德, 24, unmarried, "bare stick" risk)
- Holding: 0 mu owned, 8 mu tenanted (subsoil owned by a landlord in the market town, surface right held heritably by Shouye's family for 3 generations), 1 mu dryland, 1 pig (shared with Shouzheng), 6 chickens
- This is the household the player is born into if they choose the "poor lineage member" origin

**Household 3: The Salt Merchant Household (鹽商, *Yánshāng*)**
- Head: Master Hu (胡老爺, *Hú Lǎoyé*), 47, not a Wang, resident at the dock
- Wife: Lady Wang (王氏, 43, née Wang, Wang Shouzheng's younger sister)
- Children: Hu Bao (胡寶, 18, apprentice to his father), Hu Ying (胡瑩, 15, betrothed to a county clerk's son)
- Holding: a large compound at the dock (the only two-story building in the village, the second story being a warehouse for salt and goods), a warehouse, a small boat, no farmland
- He holds a salt license (鹽引, *yányǐn*) issued by the county, buys salt from the official depot in the market town, and sells it to villages up and down the river. He is wealthier than any Wang. He is not a Wang and has no voice in lineage affairs, but he is treated with care because he controls access to salt and to the river trade.
- This is the household the player may interact with if they seek money, goods, or passage out of the village

**Household 4: The Lin Household (林家, *Lín jiā*)**
- Head: Lin Aqiao (林阿巧, 38), a non-Wang, carpenter
- Wife: Lady Wang (王氏, 35, a Wang who married out — she is Shouzheng's niece)
- Children: Lin Gensheng (林根生, 16, apprentice to his father), Lin Xiaomei (林小妹, 12, helps her mother with weaving)
- Holding: a compound with workshop, no farmland
- Lin Aqiao is the village carpenter — he builds and repairs the houses, the boats, the mill machinery, the coffins. He is paid in grain, cash, or labor-exchange. He is not wealthy but is respected for his skill. He is the player's likely source of craft training if they seek it.

**Household 5: The Widow's Household (寡婦家, *Guǎfù jiā*)**
- Head: Widow Xu (許寡婦, *Xǔ Guǎfù*, 61), a non-Wang widow
- Son: Xu Erniu (許二牛, 19, her only surviving child; her husband and two older sons died)
- Holding: 2 mu dryland (owned), 0 mu paddy, 4 chickens, no pig
- She survives by weaving, by her dryland garden, and by the charity of the lineage (Wang Shouzheng ensures she receives a share of the autumn ancestor rite distribution). Her son works as a day laborer for the wealthier Wang households.
- This is the household the player may help if they choose a compassionate path; it is also the household that demonstrates the village's social safety net and its limits.

### 2.3 The household model (generator-facing)

Every household is a persistent entity with state:
- **Members:** named individuals with age, sex, kinship relations, health, skills, obligations
- **Holding:** owned/tenanted farmland, dryland, animals, buildings, objects, cash/grain reserves
- **Obligations:** tax, rent, corvée, lineage dues, debts, ritual obligations
- **Production:** crops grown, goods made, labor available
- **Consumption:** food, fuel, cloth, salt, tools, ritual needs
- **Strategy:** the household's plan for the year — what to plant, what to sell, what to buy, who to marry off, who to send to school, who to apprentice

The household is not an "inventory AI." It is a small polity with contested priorities: the head wants to maximize grain reserves, the wife wants to marry the daughter well, the eldest son wants his own land, the youngest son wants to leave. These contests produce the village's internal drama.

---

## 3. The agricultural year

### 3.1 The 24 solar terms (二十四節氣)

The agricultural calendar is not optional decoration. It is the spine of village life. Every term has agricultural, ritual, and (later) cultivation implications. The generator must produce weather, labor, and ritual events keyed to the terms.

| # | Term | Hanzi | Pinyin | Approx. date | What happens |
|---:|---|---|---|---|---|
| 1 | Beginning of Spring | 立春 | *Lìchūn* | Feb 3-5 | Ritual: spring welcoming. Planning: decide what to plant, where, how much. Households finalize tenancy and labor contracts. |
| 2 | Rain Water | 雨水 | *Yǔshuǐ* | Feb 18-20 | Snow ends, rain begins. Paddies checked for winter damage. Bunds repaired. |
| 3 | Awakening of Insects | 驚蟄 | *Jīngzhé* | Mar 5-7 | First thunder. Hibernating animals emerge. Paddies plowed for the first time. Seed rice soaked in water to germinate. |
| 4 | Spring Equinox | 春分 | *Chūnfēn* | Mar 20-22 | Day and night equal. Transplanting begins for early rice. Qingming preparations. |
| 5 | Clear and Bright | 清明 | *Qīngmíng* | Apr 4-6 | Tomb-sweeping. Villagers visit the ancestral graveyard, clean the tombs, offer food and paper money. The lineage holds the spring ancestor rite at the hall. |
| 6 | Grain Rain | 穀雨 | *Gǔyǔ* | Apr 19-21 | Last chance for early rice transplanting. Mulberry leaves picked for spring silkworms. |
| 7 | Beginning of Summer | 立夏 | *Lìxià* | May 5-7 | Early rice growing. Weeding begins. First assessment of the harvest's likely yield — and of whether the household will eat. |
| 8 | Grain Full | 小滿 | *Xiǎomǎn* | May 20-22 | Early rice grains filling. Plum rain season approaches. Pest pressure begins. |
| 9 | Grain in Ear | 芒種 | *Mángzhòng* | Jun 5-7 | The busiest two weeks of the year. Early rice harvested, late rice transplanted. Every hand is in the paddies. Children are pulled from school. The elderly and the childless are called to help. |
| 10 | Summer Solstice | 夏至 | *Xiàzhì* | Jun 21-22 | Longest day. Late rice growing. Plum rain at its peak — flood risk highest. The levee is watched at night. |
| 11 | Minor Heat | 小暑 | *Xiǎoshǔ* | Jul 6-8 | Plum rain ends. Heat begins. Weeding continues. Schistosomiasis exposure peaks (those who wade in paddies develop fever, rash — the village calls it "paddy itch" 田癢, *tiányǎng*). |
| 12 | Major Heat | 大暑 | *Dàshǔ* | Jul 22-24 | Hottest. Work slowed to dawn and dusk. Midday rest. Fruit picked. |
| 13 | Beginning of Autumn | 立秋 | *Lìqiū* | Aug 7-9 | Late rice heading. The harvest's shape is now visible. Households begin to estimate tax and rent obligations. |
| 14 | End of Heat | 處暑 | *Chǔshǔ* | Aug 22-24 | Heat breaks. Late rice filling. Preparations for the autumn ancestor rite begin. |
| 15 | White Dew | 白露 | *Báilù* | Sep 7-9 | Dew forms. Nights cool. Late rice begins to yellow. |
| 16 | Autumn Equinox | 秋分 | *Qiūfēn* | Sep 22-24 | Late rice ready. Harvest begins. The threshing ground is in continuous use. The mill runs day and night. Tax and rent are due after harvest. |
| 17 | Cold Dew | 寒露 | *Hánlù* | Oct 8-9 | Harvest continues. Winter crops (wheat, rapeseed) planted in harvested paddies where water permits. |
| 18 | Frost's Descent | 霜降 | *Shuāngjiàng* | Oct 23-24 | First frost. Harvest ends. The lineage holds the autumn ancestor rite. |
| 19 | Beginning of Winter | 立冬 | *Lìdōng* | Nov 7-8 | Winter crops growing. Firewood gathered. Houses winterized. |
| 20 | Minor Snow | 小雪 | *Xiǎoxuě* | Nov 22-23 | First snow (light). Winter weaving intensifies — cloth is the household's main winter cash source. |
| 21 | Major Snow | 大雪 | *Dàxuě* | Dec 6-8 | Snow. Travel limited. The village turns inward. |
| 22 | Winter Solstice | 冬至 | *Dōngzhì* | Dec 21-23 | The lineage updates the genealogy. The winter ancestor rite. The longest night. Households eat dumplings (餃子, *jiǎozi*) if they can afford the flour. |
| 23 | Minor Cold | 小寒 | *Xiǎohán* | Jan 5-7 | Coldest period begins. Paddies lie fallow under ice. |
| 24 | Major Cold | 大寒 | *Dàhán* | Jan 20-21 | Coldest. Spring preparations begin under cover — seed rice selected, tools repaired, contracts renegotiated. |

### 3.2 Procedural implications

- The calendar is the simulation clock's ritual layer. Every term triggers agricultural, labor, ritual, and economic events.
- The generator must produce weather, pest pressure, and flood risk keyed to the terms, with deterministic variation.
- The player's verbs change with the season: transplanting in Mangzhong, harvesting in Autumn Equinox, tomb-sweeping in Qingming. The world is not a static backdrop; it is a calendar that constrains action.

### 3.3 The festival calendar

Layered on the solar terms are the major festivals, which are ritual and economic events:

- **Spring Festival (春節, *Chūnjié*):** New Year, late January / early February (lunar). The lineage holds a communal meal. Households settle debts. Firecrackers (if the village can afford them) drive off the year's misfortune. Children receive red envelopes (紅包, *hóngbāo*).
- **Lantern Festival (元宵, *Yuánxiāo*):** 15th day of the 1st lunar month. Lanterns at the lineage hall and the spirit shrine. Sweet dumplings (湯圓, *tāngyuán*).
- **Qingming (清明):** see term 5 above. The most important ancestral rite.
- **Dragon Boat (端午, *Duānwǔ*):** 5th day of the 5th lunar month. The river is the center — boat races (if the village can field a crew), zongzi (粽子, glutinous rice dumplings wrapped in bamboo leaves). Commemorates Qu Yuan (屈原). Also a pest-control rite: mugwort (艾草, *àicǎo*) hung over doors to repel insects and evil.
- **Spirit Festival / Ghost Festival (中元, *Zhōngyuán*):** 15th day of the 7th lunar month. The dead are believed to visit the living. Offerings at the spirit shrine and at the graveyard. The lineage holds a rite for unburied or unremembered dead. It is an inauspicious day for travel or major undertakings.
- **Mid-Autumn (中秋, *Zhōngqiū*):** 15th day of the 8th lunar month. Mooncakes (月餅, *yuèbǐng*). Families gather. The salt merchant receives gifts from his customers. A night of socializing under the moon.
- **Double Ninth (重陽, *Chóngyáng*):** 9th day of the 9th lunar month. Climbing hills (the graveyard hill, if no other). Chrysanthemum wine. A day for the elderly.
- **Winter Solstice (冬至, *Dōngzhì*):** see term 22. Genealogy update.
- **Laba (臘八, *Làbā*):** 8th day of the 12th lunar month. Laba porridge (臘八粥), a mix of grains, beans, and nuts. Buddhist temples (the nearest is 30 li away) distribute porridge. The village's few Buddhists make a point of attending.

### 3.4 Three.js implications

- Day/night cycle: the sun's arc changes with the solar term (short in winter, long in summer). The generator must produce sun angles, moon phases, and star positions keyed to the date.
- Weather: rain (with the plum-rain season's intensity), snow (winter), fog (autumn mornings), thunderstorms (summer afternoons). Each is a particle/post-processing system.
- The village's visual character changes with the season: flooded paddies (spring), green rice (summer), gold harvest (autumn), fallow brown (winter). The generator must produce crop-growth state and reflect it in the instanced paddy geometry.

---

## 4. Material practices

### 4.1 Wet-rice agriculture (水稻)

**The cycle:**
1. **Plowing (犁田, *lítián*):** the paddy is plowed with a water buffalo (水牛, *shuǐniú*) or — for the poorest — by human labor with a spade. The Wang lineage collectively owns 3 water buffalo, shared among the 22 Wang households by a rotation. Plowing happens in Awakening of Insects (term 3) for early rice, and in Grain in Ear (term 9) for late rice.
2. **Puddling (耙田, *bàtián*):** the plowed paddy is flooded and the soil broken into a muddy suspension. This is backbreaking labor, done with a harrow (耙, *bà*) drawn by the buffalo. The result is the paddy's standing water — the signature visual of wet-rice agriculture.
3. **Seedbed (秧田, *yāngtián*):** seed rice is soaked and germinated in a small flooded plot, then transplanted.
4. **Transplanting (插秧, *chāyāng*):** the seedlings are pulled from the seedbed and transplanted into the puddled paddy in rows. This is the second busiest period (after harvest). It is gendered: women transplant, men plow. The village's transplanting teams are organized by the lineage.
5. **Weeding and water management (耘田, 水管理):** the paddy is weeded (by hand or with a hoe) and water levels maintained (by opening and closing the paddy's inlet and outlet). Water management is the source of most intra-village water disputes.
6. **Harvest (收割, *shōugē*):** the rice is cut with a sickle (鐮刀, *liándāo*), bound into sheaves, and carried to the threshing ground.
7. **Threshing (打穀, *dǎgǔ*):** the sheaves are threshed (beaten against a threshold or trodden by the buffalo) to separate the grain from the straw.
8. **Milling (碾米, *niǎnmǐ*):** the unhulled grain is milled at the water mill to remove the husk. The milling fee is ~5% of the grain.
9. **Storage (倉, *cāng*):** the milled rice is stored in earthen jars (缸, *gāng*) in the household, rationed through the winter, sold or bartered as needed.

**Health consequences:**
- Schistosomiasis (血吸蟲病, *xuèxīchóng bìng*): a parasitic disease acquired by wading in water contaminated with the parasite's larvae, which breed in the snails that live in paddies. Endemic in the Cangli lowlands. Symptoms: fever, rash, abdominal pain, chronic liver damage, stunted growth in children. The village calls it "paddy itch" (田癢) for the early rash, and "water disease" (水病) for the chronic form. There is no cure in the mortal world; a Qi Condensation cultivator could treat it, but no such cultivator lives in the Bend Township.
- Back injury: plowing, puddling, transplanting, and harvesting are all backbreaking. A 50-year-old farmer's spine is visibly compressed.
- Skin disease: standing water and humid heat produce fungal infections.

### 4.2 The pigsty-latrine (豬廁)

The pigsty-latrine is a single structure: a pig pen with a latrine above or beside it, arranged so that human waste falls into the pig pen and is consumed by the pigs, then mixed with pig manure, collected, fermented in a pit (糞坑, *fènkēng*), and applied to the paddies as fertilizer.

This is not a quaint custom. It is the nitrogen-maintenance system of the entire agricultural economy. Without the night-soil cycle, the paddies would exhaust within a generation. The village's pigs are not just meat animals; they are nitrogen converters.

**Procedural implication:** every household with a pigsty-latrine is a node in a nitrogen cycle. The generator must produce the cycle's state (pig population, manure production, pit fermentation stage, field application schedule). Disruption of the cycle (pig disease, latrine collapse, pit contamination) is a household-level crisis.

**Player-facing verb:** a player who lives in the village will, at some point, empty the latrine pit and carry the night-soil to the paddies. This is real labor, with real smell, real weight, and real consequence. It is also the first time many players will understand how pre-modern agriculture actually worked.

### 4.3 Salt (鹽)

Salt is a state monopoly. The salt merchant (Master Hu) holds a license (鹽引, *yányǐn*) issued by the county, buys salt from the official depot in the market town, and sells it to villages up and down the river at a markup. The price of salt is therefore both a market price and a political price — it reflects the state's fiscal needs as much as supply and demand.

A household in Wang Family Bend consumes ~1 jin (斤, ~600g) of salt per person per month, for cooking, preservation, and (in small quantities) for animal feed. A household of 5 spends ~5 jin/month, which at the typical price of ~30 cash/fen (分, 1/10 of a tael of silver) is a real cash expense. Salt is the main reason households need cash, which is the main reason they sell grain, which is the main reason they are exposed to the silver-grain price ratio.

**Smuggling:** salt smuggling is a real crime, investigated by the county, punished by flogging or worse. But the price incentive is strong, and a poor household may buy smuggled salt from a peddler at half the licensed price. This is a player-facing choice with legal and economic consequences.

### 4.4 Cloth and weaving (布, 織)

Every household weaves. The women spin hemp (麻) into thread and weave it into cloth on a backstrap loom (腰機, *yāojī*). The wealthier Wang households also raise silkworms (蠶, *cán*) on mulberry leaves and reel silk (繅絲, *sāosī*), which is sold to a traveling buyer for cash. Cloth is the household's main winter cash source and its main non-food asset — it can be stored, traded, used as a gift, used as a burial shroud, or pawned.

**Gendered labor:** weaving is women's work. The phrase "men plow, women weave" (男耕女織, *nángēng nǚzhī*) is both prescription and description. The household's economy depends on both: the men's grain and the women's cloth. A household with no adult woman is economically crippled, not just domestically. This is one reason widowers remarry quickly and widows are pressured to stay in their late husband's household (the "chaste widow" 節婦 ideal, reinforced by the state and the lineage, conflicts with the household's practical need for a weaver).

### 4.5 Fuel (柴, 炭)

Fuel is firewood (柴, *chái*) gathered from the hills and charcoal (炭, *tàn*) bought from charcoal burners in the uplands. The lower Cangli hills were deforested generations ago; firewood is gathered from coppiced trees (柳, willow; 槐, locust) and from crop residue (rice straw, hemp stalks). Charcoal is a cash purchase, used by the wealthier households for cooking and heating.

Fuel shortage cascades: undercooked food causes digestive disease; cold housing causes respiratory disease; the smoke from damp straw in unventilated kitchens causes eye disease and chronic bronchitis. The poorest households (the Widow Xu, the Wang tenant households) burn damp straw and have eye and lung problems.

---

## 5. The social institutions

### 5.1 The lineage (宗族)

The Wang lineage is a corporate body. It owns land (the lineage fields), maintains buildings (the hall, the school), holds records (the genealogy), enforces rules (the lineage rules, which cover marriage, inheritance, dispute resolution, and member conduct), and represents its members to the state.

**Internal dispute resolution:** most disputes within the lineage are handled by the elder council, not by the county magistrate. A tenant who owes rent, a husband who beats his wife, a son who disrespects his father, a widow who wishes to remarry out of the lineage — these are first heard by the council, which may impose fines, labor, or expulsion. The county magistrate is invoked only when the lineage cannot or will not resolve the matter, or when the state's interests are directly involved (a murder, a tax default, a bandit report).

**Marriage:** the lineage controls its members' marriages. A Wang who wishes to marry must have the lineage's approval; a Wang who wishes to marry a non-Wang must negotiate the betrothal gifts and dowry through the lineage. A Wang woman who marries out joins her husband's lineage; a Wang man who marries in (uxorilocal) is unusual and marks the household as one without sons.

**Inheritance:** land passes to sons, divided equally in principle but often unequally in practice (the eldest son may receive a larger share for maintaining the ancestral rites; the youngest may receive the parental house). Daughters do not inherit land; they receive a dowry. Widows have a life-estate in their husband's land, reverting to the sons on the widow's death or remarriage.

### 5.2 The state

The state is distant but real. The county magistrate (縣令, *xiànlìng*) sits in the county seat, 60 li (~30km) east, reachable by river boat in a day. The village's direct contact with the state is through:

- **The tax collector (里長, *lǐzhǎng*):** the village is part of a *li* (里), a fiscal unit of 110 households. The *li* head, currently Wang Shouzheng (who holds the post as lineage head), is responsible for collecting the land tax and organizing corvée. He is the village's interface with the state.
- **The baojia (保甲):** the village is organized into *jia* (甲) of 10 households each, mutually responsible for each other's conduct. The *bao* head (保長, *bǎozhǎng*) is currently Lin Aqiao (the carpenter), a non-Wang, a deliberate balance to the Wang-dominated *li* head. The baojia system is the state's surveillance and mutual-policing mechanism.
- **The yamen runners (衙役, *yáyì*):** when the state's presence is required (a murder, a bandit, a tax default, a salt smuggling accusation), yamen runners come from the county seat. They are feared and disliked — they extort food and lodging, and they are the visible face of state coercion.

**Tax:** the land tax is denominated in silver (post-Single-Whip), collected twice yearly (after the early and late harvests). A household with 10 mu of paddy owes ~0.3 taels of silver per year — which requires selling ~150 jin of rice for silver, exposing the household to the silver-grain price ratio. Silver scarcity in a bad harvest year (when grain prices fall) is the classic peasant crisis.

**Corvée:** commuted to silver by the Single Whip reform, but ad-hoc labor levies still occur (river works, road repair, post station service). The *li* head can assign these; he assigns them to households that can spare the labor or that he wishes to favor/punish.

### 5.3 Religion

The village's religious life is layered, not syncretic in the "ancient Eastern" sense. The layers are distinct and the villagers know the difference:

- **Ancestor veneration (祭祖, *jìzǔ*):** the most important. Every household has a small altar with the tablets of recent ancestors (parents, grandparents). The lineage hall holds the tablets of the deeper ancestors. Rites at the hall (spring and autumn) and at the graveyard (Qingming) are lineage obligations, not optional.
- **The earth god (土地公, *tǔdìgōng*):** the village's local tutelary deity, shrined at the west entrance. He is a low-ranking spirit (not an ancestor, not a god) responsible for the village's boundary, its weather, and its minor misfortunes. Incense on the 1st and 15th of each lunar month.
- **The river god (河神, *héshén*):** shrined at a small temple on the south bank, across the ford. Responsible for the river's floods, fish, and boats. A plaque in the lineage hall records a flood 40 years ago that the village's elders attribute to the river god's anger at a broken oath.
- **Buddhism:** the nearest Buddhist temple (佛寺, *fósì*) is 30 li away. The village's few Buddhists (mostly older women, plus the Widow Xu, who is devout) walk there for major festivals. A traveling monk (雲遊僧, *yúnyóu sēng*) passes through the village once or twice a year, accepting food and lodging, chanting for the dead.
- **Daoism:** the nearest Daoist priest (道士, *dàoshi*) lives in the market town. He is summoned for major rites (funerals, exorcisms, the consecration of a new building). He is a Zhengyi (正一) priest — married, household-based, not monastic. He charges fees.
- **Divination (卜, *bǔ*):** the village's diviner is Wang Lun (the lineage school teacher), who casts hexagrams (卦, *guà*) from yarrow stalks (蓍草, *shīcǎo*) for supplicants who ask about marriage, travel, illness, or harvest. He is not always right. He knows this.

---

## 6. The economy

### 6.1 Money and prices

The economy runs on three currencies:
- **Copper cash (文, *wén*):** the daily currency. 1 string of 1000 cash = 1 tael of silver (nominal; the ratio fluctuates).
- **Silver (銀, *yín*):** the tax and large-transaction currency. Most households rarely see silver; they see cash.
- **Grain (穀, *gǔ*):** the reserve currency. Rice is hoarded, lent, and used to pay labor. A household's grain reserves are its real wealth.

**Typical prices (in copper cash):**
- 1 jin of rice: 8-12 cash (good year) to 20-30 cash (bad year)
- 1 jin of salt: 30 cash
- 1 jin of pork: 60-80 cash
- 1 bolt of hemp cloth (20 chi): 200-300 cash
- 1 pig (grown): 3000-5000 cash
- 1 mu of paddy (subsoil right): 5000-10000 cash (a once-in-a-lifetime purchase)
- 1 day of agricultural labor: 20-30 cash + a meal
- A ferry crossing to the market town: 5 cash

### 6.2 The market

The market town (鎮, *zhèn*) at the river crossing, 15 li east, holds a market on the 1st, 5th, 10th, 15th, 20th, and 25th of each lunar month (a "1-6" market). Villagers walk or boat there to sell grain, cloth, and pigs, and to buy salt, iron tools, needles, thread, paper, incense, and (rarely) luxury goods. The market is also the news network — what happened in the county, who raised an army, which magistrate was dismissed.

### 6.3 The household budget

A typical Wang tenant household (8 mu tenanted paddy, 1 mu dryland, 1 pig, 6 chickens, 5 people) in a normal year:
- **Income:** ~3200 jin of unhulled rice from 8 mu (at ~400 jin/mu), minus ~1600 jin rent (50% to the subsoil landlord), leaving ~1600 jin hulled = ~960 jin milled. Plus dryland vegetables (no cash value, consumed). Plus pig sale (if sold): 3000-5000 cash. Plus weaving: 4-6 bolts/year = 1000-1800 cash.
- **Cash income:** ~4000-6800 cash/year.
- **Expenses:** salt (5 jin/month × 12 × 30 cash = 1800 cash), tax (~0.2 tael = ~200 cash equivalent, paid in silver obtained by selling rice), tools and iron (300-500 cash/year), clothing and cloth not self-woven (200-400 cash), ritual obligations (200-500 cash), medical (variable, 0-2000 cash), school fees if a child attends (200 cash/year for brush, paper, ink).
- **Grain balance:** 960 jin milled rice, minus 5 people × ~300 jin/year consumption = 1500 jin. Deficit of ~540 jin, which must be covered by selling labor, selling the pig, or borrowing.

This is a **subsistence deficit in a normal year.** The household survives by the pig sale, the weaving, and by the husband's day labor during the off-season. In a bad year (flood, drought, pest), the household goes hungry, borrows grain at 50-100% annual interest, and may lose its surface rights to the tenanted paddy if it cannot pay rent. This is the engine of rural poverty and the reason most households are one bad harvest from crisis.

---

## 7. Health, disease, and death

### 7.1 The disease regime

- **Child mortality:** ~40% of live births die before age 5. The main killers are infant diarrhea, measles, smallpox, and respiratory infections. The village has no inoculation against smallpox (variolation 種痘 is known in the county but not practiced in the Bend Township).
- **Schistosomiasis:** endemic. Chronic form causes liver damage, stunted growth, and premature death. The Widow Xu's late husband likely died of it.
- **Malaria:** present in the lowlands in summer. The village calls it "the shakes" (發擺子, *fābǎizi*). Treated with qinghao (青蒿, sweet wormwood) tea, which is mildly effective.
- **Tuberculosis:** present. Called "lung disease" (肺癆, *fèiláo*). Incurable in the mortal world; slowly fatal.
- **Childbirth:** dangerous. ~1 in 10 women die in or after childbirth. The village's midwife (穩婆, *wěnpó*) is Old Lady Zhou (周老婆子, 66), a non-Wang widow who learned the trade from her mother. She is competent but not miracle-working.
- **Old age:** those who survive childhood and childbirth and do not contract schistosomiasis or TB can live to 60-70. The village's oldest resident is Wang Tianming (王天明, 73), Shouzheng's uncle, who is frail but lucid.

### 7.2 Medical care

- **The village's herbalist (草藥郎中, *cǎoyào lángzhōng*):** Wang Zongwen (the assistant teacher, 27) has some knowledge of herbs, learned from his grandmother. He can treat cuts, fevers, and digestive complaints with common herbs (ginger, licorice, skullcap, rhubarb). He cannot treat serious illness.
- **The market town doctor (郎中, *lángzhōng*):** a more serious practitioner, reachable by boat in a day, who charges fees and can treat a wider range of complaints. He is summoned for difficult childbirths, persistent fevers, and broken bones.
- **The Daoist priest:** summoned for spiritual afflictions — what the village calls "fright disease" (驚病, *jīngbìng*, what we might call PTSD or anxiety), "demon possession" (中邪, *zhòngxié*), and unexplained deaths. He performs exorcisms (驅邪, *qūxié*), which may or may not help.

### 7.3 Death and funerals

A death triggers the funeral rite (喪禮, *sānglǐ*), which is the household's most expensive ritual event after a marriage. The body is washed, dressed in a burial shroud (壽衣, *shòuyī*), laid in a coffin (棺材, *guāncai* — built by Lin Aqiao, the carpenter), kept in the household for 3-7 days while mourners visit, then carried to the graveyard and buried. A Daoist priest is summoned if the household can afford it. The mourners wear undyed hemp (white, the color of mourning). The sons observe a 3-year mourning period (守孝, *shǒuxiào*), during which they do not marry, do not attend festivals, and wear rough hemp.

The funeral is also a social event: the lineage, the neighbors, and the deceased's affinal kin gather, eat, and settle accounts. The deceased's tablet is installed in the household altar; after the 3-year mourning, it may be moved to the lineage hall if the deceased was a lineage member of standing.

---

## 8. What this document enables

Every element above is a procedural generator input and a player-facing verb. The player who begins in Wang Family Bend can:

- Carry water from the well
- Transplant rice in Mangzhong
- Harvest rice in Autumn Equinox
- Empty the latrine pit and carry night-soil to the paddies
- Weave cloth on a backstrap loom
- Buy salt from Master Hu at the dock
- Sell grain at the market town
- Sweep the tombs at Qingming
- Attend the spring ancestor rite at the lineage hall
- Learn to read at the lineage school
- Apprentice to Lin Aqiao the carpenter
- Help Widow Xu with her dryland garden
- Cast a hexagram with Wang Lun
- Ferry across the river to the spirit shrine
- Listen to Old Lady Zhou's stories of her youth
- Watch Wang Tianming, the oldest man, fade toward death
- Mourn a sibling who died of fever
- Sit in the lineage elder council's hearing of a dispute
- Hide a salt smuggler from the yamen runners
- Lose the harvest to a flood and borrow grain at 80% interest

These are the mortal verbs. They are the engine of the first 10-50 hours of play. They must feel like *life*, not *tutorial*. If they feel like tutorial, the design has failed.

The next documents specify how cultivation emerges from this substrate, what each realm feels like from the inside, and how the first golden scenes unfold in this specific village.
