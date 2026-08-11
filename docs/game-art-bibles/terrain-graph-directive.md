# Terrain Graph Directive — Semantic Landforms, Not Noise

> **Status:** Authoritative engineering directive (2026-08-10, user-authored)
> **Replaces:** the noise-driven height function + per-chunk marching-tetrahedra "soup" in `src/world/terrain.js` / `src/world/world.js`

---

## 0. The central rule

**Noise must never be responsible for the major shape of the landscape.**
Noise can roughen a cliff. It should never decide that a cliff exists.
A mountain exists because the generator decided "there is a mountain range
here", not because noise happened to be 0.83 here.

## 1. Five scales of generation

```
PLANETARY FORM          tectonic/crust provinces, continents, ocean basins,
                        uplift zones, impact basins, volcanic provinces,
                        spirit-vein regions, major drainage basins
    ↓
SEMANTIC LANDFORMS      MountainRangeNode, RidgeNode, PeakNode, PlateauNode,
                        MesaNode, EscarpmentNode, ValleyNode, CanyonNode,
                        RiverNode, LakeBasinNode, CraterNode, VolcanoNode,
                        KarstNode, DuneFieldNode, GlacierNode,
                        CaveNetworkNode, CliffBandNode, NaturalArchNode
    ↓
AUTHORED 3D FEATURES    Terrain Feature Stamps (authored meshes → SDF /
                        implicit volumes → graph nodes → blend → final mesh)
    ↓
GEOMORPHOLOGY/PHYSICS   erosion, fracture, collapse, sediment, drainage
    ↓
MICRO DETAIL            rock roughness, soil irregularity, small noise
```

Noise budget philosophy: MACRO 0–5% noise, MESO 5–20% stochastic variation,
MICRO lots of stochastic variation.

## 2. Semantic landform nodes

Each node has meaningful designer parameters, not hidden noise:

```ts
MountainRangeNode {
  spine: Spline;            // where the range IS
  width: 18_000;            // meters
  peakHeight: 4_200;
  asymmetry: 0.32;
  ridgeSharpness: 0.74;
  secondaryRidges: 7;
  erosionAge: 0.63;
  rockType: 'granite';
}
```

## 3. Terrain Feature Stamps (not tiles)

Authored forms (sharp immortal peak, granite wall, cave mouth, sinkhole,
tribulation crater, sword-cleaved mountain, giant footprint...) are stored as
shape information — SDF / implicit volume / profile — NOT static decorative
meshes. They participate in the terrain field so you can tunnel through them,
cut them, excavate under them, destroy them. No decorative cliff floating
over destroyed voxel dirt.

## 4. The Terrain Node Graph

```
PlanetSphere → ContinentalProvince → MountainRange(RidgeSpline, PeakStamp,
CliffBands) → RiverNetwork(ValleyCarve, SedimentDeposit) → CaveNetwork →
GeologicalStrata → Erosion → RuntimeTerraforming → SurfaceDetail
                        ↓
                   Terrain SDF
                        ↓
                      Mesher
                        ↓
              Three.js BufferGeometry
```

Every node outputs fields, not just geometry:
`distanceField, materialField, hardnessField, moistureField, ageField,
fractureField, biomeField, vegetationMask, resourceField, erosionMask`.

## 5. Semantic terraforming (smart edit nodes)

No `SDF -= sphere`. Edits are semantic operations with material response:

- **ImpactNode** → impact depression + radial fracturing + raised rim +
  broken rock + ejecta + exposed geology + dust
- **SwordCleaveNode** → very sharp clean cut plane + fracture zone + material
  separation + falling unsupported rock + debris (do NOT smooth a sword cut)
- **CraterNode** → excavation bowl + fractured walls + upturned rim +
  ejecta distribution + material-dependent breakage
- **ExcavationNode** → rougher tool-dependent hole
- **RaiseMountainNode** → real mountain (ridge + secondary ridges + cliffs +
  drainage + talus + rock exposure), not stretched noise

Then a localized geomorphology/healing pass: exact intended deformation →
material response → fracture → gravity/collapse → talus/debris → water
rerouting → erosion → vegetation succession. Only where necessary (a 2 m hole
does not rerun continental geology).

## 6. Protect the player's artistic intent

Every edit carries an intent mask:

```
LOCKED SHAPE | TRANSITION ZONE | PHYSICAL RESPONSE ZONE | NATURALIZATION ZONE
```

A perfectly square sect courtyard stays square. Naturalization only touches
the surroundings.

## 7. World-space materials + 3D strata

Material = f(geology, elevation, slope, curvature, moisture, biome, depth,
exposedStratum, weathering, editHistory). Triplanar projection, world-space
textures, macro variation, detail normals, slope blending. Strata are 3D:
topsoil → weathered rock → limestone → granite intrusion → spirit vein →
deep crust. Slicing a mountain reveals structure — no texture stretching into
holes.

## 8. Rivers from the landform graph

uplift → watershed → drainage network → valley carving → river → sediment →
floodplain → vegetation. Destroying a mountain can redirect a watershed and
change a river's course.

## 9. Terrain Style DNA + scoring

Every region has a `TerrainStyle` (mountainFamily, ridgeSharpness,
cliffProfiles, strataPatterns, erosionAge, rainfall, riverMeander,
caveStyle, boulderFamilies, vegetationFamilies, supernaturalFeatures,
colorLanguage, materialLanguage). Immortal-mountain regions and ancient
wastelands use the same engine with different DNA.

Generated terrain is SCORED: reject excessive uniform noise, no readable
silhouette, equal-sized features, impossible drainage, repetitive stamps,
tiling, cliff spam, unnatural isolated spikes, frequency soup, too much
surface roughness, no quiet regions. Measure silhouette complexity, ridge
hierarchy, feature scale distribution, slope/curvature histograms, drainage
connectivity, feature repetition, landmark spacing, open/closed rhythm. The
VLM is the final aesthetic critic, never the geometry generator.

## 10. Three.js is the consumer

```
TerrainGraph/OperationGraph → SpatialFieldEvaluator
  → (procedural base + persistent edits) → sparse SDF bricks → MESHER
  → typed vertex buffers → THREE.BufferGeometry
  → terrain mesh + detail instances (InstancedMesh)
```

Not Three's built-in MarchingCubes addon (generic resolution-based scalar
field). Dual-contouring / surface-nets family preferred for sharp cliffs and
supernatural planar cuts. Terrain generation (field eval, meshing, erosion,
collision gen, LOD, edit propagation) runs on workers/WASM/GPU; the main
thread does input/orchestration/submission.

## 11. The one-sentence architecture

> Build a semantic, node-based, editable implicit terrain system in which
> authored 3D landform stamps and parametric feature nodes establish
> macro/meso shapes, geology and geomorphology make them coherent, noise is
> restricted primarily to microdetail, and all terraforming is recorded as
> semantic operations that receive material-aware fracture, collapse, erosion,
> sediment, dressing, and LOD reconstruction before being rendered as
> generated Three.js BufferGeometry.
