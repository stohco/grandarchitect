#!/usr/bin/env python3
"""
build_asset.py — the deterministic Blender asset generator (GATE 3).

Headless Blender 4.2: same seed -> same asset, every run. Materials are
the art bible palette (linear working space). Every builder module
registers one asset and exports a GLB.

Usage:
  blender --background --python tools/blender/build_asset.py -- --asset sacred_pine --out src/engine/game/assets/models/ENV_Tree_Pine_Sacred_A01.glb --seed 7
"""

import argparse
import math
import os
import sys

import bpy  # noqa: F401  (Blender's API)

# ---------------------------------------------------------------------------
# Art bible palette (linear working space, matching the game's materials)
# ---------------------------------------------------------------------------

PALETTE = {
    'bark': (0.19, 0.12, 0.07),          # #7a5238-ish dark timber (linear) — readable, not black
    'moss': (0.09, 0.17, 0.09),          # #3a6a30 moss green (linear)
    'needle': (0.11, 0.21, 0.10),        # brighter needle green
    'jade': (0.10, 0.36, 0.30),          # #2f9a8a spirit jade (linear)
    'stone': (0.22, 0.21, 0.18),         # #6d6a64 cool grey rock
    'glow': (0.15, 0.85, 0.60),          # #7ae8d0 spirit glow (emissive)
    'lime': (0.30, 0.29, 0.27),          # #8b8a80 lime-washed wall
    'slate': (0.17, 0.18, 0.19),         # #4a5054 grey clay tile
    'lantern': (0.95, 0.45, 0.10),       # #ff8a26 warm spirit lantern (emissive)
    'bronze': (0.28, 0.20, 0.10),        # #5e4b2a bronze incense tripod
    'smoke': (0.75, 0.74, 0.72),         # pale incense smoke ribbon
    'indigo': (0.13, 0.175, 0.26),      # #4a6a94 hemp robe, indigo-dyed (reads at distance)
    'skin': (0.62, 0.45, 0.36),          # #d6a87a weathered farmer skin
    'hair': (0.11, 0.09, 0.085),         # #2a2622 ink-black hair
    'straw': (0.46, 0.37, 0.24),         # #a8885a straw sandals
    'linen': (0.36, 0.32, 0.26),         # #8a7a64 unbleached linen undergarments
}


def make_material(name, base, roughness=0.9, metalness=0.0, emissive=None, emissive_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    if emissive:
        bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emissive_strength
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def assign(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)


# ---------------------------------------------------------------------------
# Seedable deterministic RNG (the asset is reproducible)
# ---------------------------------------------------------------------------

class Seeded:
    def __init__(self, seed):
        self.state = seed & 0xFFFFFFFF

    def next(self):
        self.state = (self.state * 1664525 + 1013904223) & 0xFFFFFFFF
        return self.state / 4294967296.0

    def range(self, a, b):
        return a + self.next() * (b - a)


# ---------------------------------------------------------------------------
# The sacred pine (the first asset through the pipeline)
# ---------------------------------------------------------------------------
# Wind-bent pine at a spirit node: twisted bark trunk with root flare,
# layered flattened canopy plates, moss + jade needle tint, faint glow.

def build_sacred_pine(seed):
    rng = Seeded(seed)
    bark = make_material('pine_bark', PALETTE['bark'], roughness=0.95)
    needle = make_material('pine_needle', PALETTE['needle'], roughness=0.85, emissive=PALETTE['glow'], emissive_strength=0.15)
    jade = make_material('pine_jade', PALETTE['jade'], roughness=0.4, metalness=0.1)

    # ---- trunk: a stack of tapered cylinders, spiralling and leaning ----
    segs = 14
    base_r = 0.34
    top_r = 0.10
    total_h = 4.6
    trunk_lean_x = 0.45   # the wind bends it east
    prev = None
    for i in range(segs):
        u = i / (segs - 1)
        h_seg = total_h / (segs - 1)
        r = base_r * (1 - u * 0.78) + top_r * u
        # spiral twist + lean
        ang = u * 1.9 + rng.range(0, 0.3)
        bx = trunk_lean_x * u + math.sin(u * 7.0 + seed) * 0.06 * (1 - u)
        bz = math.cos(u * 6.0 + seed * 1.3) * 0.06 * (1 - u)
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h_seg, vertices=7, location=(bx, bz, u * total_h + h_seg / 2))
        cyl = bpy.context.object
        cyl.name = f'trunk_{i}'
        cyl.rotation_euler.z = ang
        cyl.data.polygons[0].use_smooth = True
        assign(cyl, bark)
        if prev is not None:
            bpy.ops.object.select_all(action='DESELECT')
            prev.select_set(True)
            cyl.select_set(True)
            bpy.context.view_layer.objects.active = cyl
            bpy.ops.object.join()
        prev = cyl

    trunk = prev
    trunk.name = 'sacred_pine_trunk'

    # ---- root flare: 5 short bent roots at the base ----
    for k in range(5):
        ang = k * (2 * math.pi / 5) + rng.range(0, 0.4)
        r0 = rng.range(0.16, 0.3)
        bpy.ops.mesh.primitive_cylinder_add(radius=r0 * 0.55, depth=r0 * 1.6, vertices=6,
                                            location=(math.cos(ang) * r0 * 0.7, math.sin(ang) * r0 * 0.7, r0 * 0.55))
        root = bpy.context.object
        root.name = f'root_{k}'
        root.rotation_euler = (math.sin(ang) * 0.55, -math.cos(ang) * 0.55, ang)
        assign(root, bark)
        bpy.ops.object.select_all(action='DESELECT')
        root.select_set(True)
        trunk.select_set(True)
        bpy.context.view_layer.objects.active = trunk
        bpy.ops.object.join()

    # ---- canopy: 5 flattened plates, stacked and tapering ----
    for k in range(5):
        u = k / 4
        r = 1.9 * (1 - u * 0.55)
        plate_h = 0.55 * (1 - u * 0.3)
        y = 3.1 + u * 1.9 + math.sin(seed + k) * 0.08
        bx = trunk_lean_x * (0.55 + u * 0.45) + math.sin(k * 1.7 + seed) * 0.12
        bz = math.cos(k * 2.3 + seed) * 0.12
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r, radius2=r * 0.25, depth=plate_h,
                                        location=(bx, bz, y))
        plate = bpy.context.object
        plate.name = f'canopy_{k}'
        plate.rotation_euler.z = k * 1.3 + seed
        plate.data.polygons[0].use_smooth = True
        assign(plate, needle if k % 2 == 0 else jade)
        bpy.ops.object.select_all(action='DESELECT')
        plate.select_set(True)
        trunk.select_set(True)
        bpy.context.view_layer.objects.active = trunk
        bpy.ops.object.join()

    # ---- a stone ring at the root (the shrine's base) ----
    bpy.ops.mesh.primitive_torus_add(major_radius=0.85, minor_radius=0.09, major_segments=12, minor_segments=6,
                                     location=(0, 0, 0.12))
    ring = bpy.context.object
    ring.name = 'sacred_pine_stone_ring'
    ring.rotation_euler.x = math.pi / 2
    assign(ring, make_material('pine_stone', PALETTE['stone'], roughness=0.95))

    trunk.name = 'sacred_pine'
    return trunk


# ---------------------------------------------------------------------------
# The family shrine (祠) — the second asset through the pipeline
# ---------------------------------------------------------------------------
# The Wang lineage's ancestor shrine at the village heart: two-step stone
# plinth, lime-washed timber walls, dark doorway to the tablets, and the
# one curved roof a mortal building may wear (style grammar §2 — curved
# eaves belong to shrines and sects alone). A spirit lantern hangs at the
# gable; a bronze tripod holds incense before the door.

def build_family_shrine(seed):
    rng = Seeded(seed)
    lime = make_material('shrine_lime', PALETTE['lime'], roughness=0.95)
    timber = make_material('shrine_timber', PALETTE['bark'], roughness=0.9)
    slate = make_material('shrine_slate', PALETTE['slate'], roughness=0.8)
    stone = make_material('shrine_stone', PALETTE['stone'], roughness=0.95)
    lantern = make_material('shrine_lantern', PALETTE['lantern'], roughness=0.35,
                            emissive=PALETTE['lantern'], emissive_strength=1.6)
    bronze = make_material('shrine_bronze', PALETTE['bronze'], roughness=0.6, metalness=0.5)
    smoke = make_material('shrine_smoke', PALETTE['smoke'], roughness=1.0)
    interior = make_material('shrine_interior', (0.05, 0.04, 0.03), roughness=1.0)
    lichen_mat = make_material('shrine_lichen', PALETTE['moss'], roughness=1.0)

    parts = []

    def spawn(mesh_op, name, mat):
        mesh_op()
        obj = bpy.context.object
        obj.name = name
        if mat:
            assign(obj, mat)
        parts.append(obj)
        return obj

    def bake(obj, location=True, rotation=True, scale=True):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=location, rotation=rotation, scale=scale)

    def cube(name, mat, loc, scale):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cube_add(size=1, location=loc), name, mat)
        obj.scale = scale
        bake(obj)
        return obj

    def cyl(name, mat, radius, depth, loc, verts=10, rot=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts,
                                                                location=loc), name, mat)
        if rot:
            obj.rotation_euler = rot
        obj.data.polygons[0].use_smooth = True
        bake(obj)
        return obj

    # ---- two-step stone plinth (2.6 x 2.2 m, 0.34 m total) ----
    cube('shrine_plinth_lower', stone, (0, 0, 0.08), (1.35, 1.15, 0.08))
    cube('shrine_plinth_upper', stone, (0, 0, 0.22), (1.15, 0.95, 0.09))
    # ---- walls: the hall body (2.1 x 1.5 m footprint, 1.7 m tall) ----
    cube('shrine_walls', lime, (0, 0, 0.98), (1.05, 0.75, 0.8))
    # ---- the dark doorway on the +Y face (the tablets inside) ----
    cube('shrine_doorway', interior, (0, 0.62, 0.95), (0.42, 0.02, 0.6))
    # ---- the one curved roof: 8 flat discs, upturned eave tips ----
    # Blender cylinders are Z-axis = thin in depth already: unrotated, each
    # is a flat plate spanning X (the ridge) and Y (the eave depth); only
    # the ridge cap rolls over Y to lie along the spine.
    half = 0.95
    for s in range(8):
        t = s / 7.0
        curl = math.sin(t * math.pi) * 0.10 + (0.05 if t < 0.2 else 0.0) + (0.05 if t > 0.8 else 0.0)
        cyl(f'shrine_eave_{s}', slate, 0.92, 0.12, (-half + t * 2 * half, 0, 1.95 + curl), verts=10)
    cyl('shrine_ridge', slate, 0.09, 2.0, (0, 0, 2.14), verts=10, rot=(0, math.radians(90), 0))
    # ---- a tiny ridge fin: the mountain dao's marker ----
    fin = spawn(lambda: bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.09, radius2=0.02, depth=0.16,
                                                        location=(0, 0, 2.3)),
                'shrine_fin', stone)
    # ---- the spirit lantern: hangs under the ridge, warm and lit ----
    cyl('shrine_lantern', lantern, 0.11, 0.22, (0, 0, 1.72), verts=12)
    cyl('shrine_lantern_cord', timber, 0.012, 0.5, (0, 0, 2.02), verts=6)
    # ---- the bronze tripod before the door ----
    cyl('shrine_tripod', bronze, 0.16, 0.13, (0, 0.78, 0.32), verts=10)
    # ---- lichen weathering on the plinth ----
    for k in range(3):
        ang = rng.range(0, 2 * math.pi)
        rad = rng.range(0.9, 1.2)
        lichen = spawn(lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, segments=6, ring_count=4,
                                                                    location=(0, 0, 0)),
                       f'shrine_lichen_{k}', lichen_mat)
        lichen.location = (math.cos(ang) * rad, math.sin(ang) * rad, 0.06)
        lichen.scale = (1.0, 1.0, 0.4)
        bake(lichen)

    # ---- the smoke ribbon: separate object (the animation lifts it) ----
    bpy.ops.mesh.primitive_plane_add(size=0.5, location=(0, 0.76, 1.55))
    ribbon = bpy.context.object
    ribbon.name = 'shrine_smoke'
    assign(ribbon, smoke.copy())
    ribbon.scale = (0.16, 1.0, 1.0)
    ribbon.rotation_euler.x = -math.pi / 2  # vertical plane facing +Y (the door side)
    bake(ribbon, location=False, scale=True)  # keep its rotation a node transform
    ribbon.select_set(False)

    # ---- join every part except the smoke ribbon into one shrine mesh ----
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = 'family_shrine'
    joined.select_set(True)
    ribbon.select_set(True)  # the smoke ribbon rides along in the export
    return joined


# ---------------------------------------------------------------------------
# The villager (the third asset through the pipeline) — the player's body
# ---------------------------------------------------------------------------
# Per the style bible §3: standing height 1.82 m, 7.75 heads, healthy and
# elegant, never exaggerated. A mortal villager of the Wang valley: an
# indigo hemp robe with a rope sash, a topknot pinned with a wooden pin,
# straw sandals. Silhouette-first — the robe is the shape; the head reads
# the bun; the feet peek.

def build_villager(seed):
    rng = Seeded(seed)
    indigo = make_material('villager_robe', PALETTE['indigo'], roughness=0.9)
    skin = make_material('villager_skin', PALETTE['skin'], roughness=0.8)
    hair = make_material('villager_hair', PALETTE['hair'], roughness=0.95)
    straw = make_material('villager_straw', PALETTE['straw'], roughness=0.95)
    dark = make_material('villager_eye', (0.02, 0.02, 0.02), roughness=0.3)

    parts = []

    def spawn(mesh_op, name, mat):
        mesh_op()
        obj = bpy.context.object
        obj.name = name
        if mat:
            assign(obj, mat)
        parts.append(obj)
        return obj

    def bake(obj, location=True, rotation=True, scale=True):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=location, rotation=rotation, scale=scale)

    def sph(name, mat, radius, loc, verts=12, rings=10, squash=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=verts, ring_count=rings,
                                                                 location=loc), name, mat)
        if squash:
            obj.scale = squash
        obj.data.polygons[0].use_smooth = True
        bake(obj)
        return obj

    def cyl(name, mat, radius, depth, loc, verts=10, rot=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts,
                                                                location=loc), name, mat)
        if rot:
            obj.rotation_euler = rot
        obj.data.polygons[0].use_smooth = True
        bake(obj)
        return obj

    def cube(name, mat, loc, scale):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cube_add(size=1, location=loc), name, mat)
        obj.scale = scale
        bake(obj)
        return obj

    # ---- the robe: the silhouette. A tapered torso from the shoulders
    # (0.44 wide) flaring to the hem (0.58) at the ankles, a rope sash at
    # the waist, a dark collar at the neckline. The hem sits ~0.2 above
    # the ground so the sandals peek.
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.26, radius2=0.30, depth=1.22,
                                    location=(0, 0, 0.97))
    robe = bpy.context.object
    robe.name = 'villager_robe'
    robe.scale = (1.0, 0.78, 1.0)
    robe.data.polygons[0].use_smooth = True
    assign(robe, indigo)
    parts.append(robe)
    bake(robe)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.155, minor_radius=0.018, major_segments=12,
                                     minor_segments=6, location=(0, 0, 0.82))
    sash = bpy.context.object
    sash.name = 'villager_sash'
    sash.rotation_euler.x = math.pi / 2
    assign(sash, straw)
    parts.append(sash)
    bake(sash)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.02, major_segments=10,
                                     minor_segments=5, location=(0, 0, 1.52))
    collar = bpy.context.object
    collar.name = 'villager_collar'
    collar.rotation_euler.x = math.pi / 2
    assign(collar, dark)
    parts.append(collar)
    bake(collar)

    # ---- the head: ~0.235 m (7.75 heads in 1.82 m). A stylized
    # weathered face: squashed sphere, hair cap, topknot bun + pin, and
    # two dark eye inlays on the front (+Y).
    sph('villager_head', skin, 0.118, (0, 0, 1.665), verts=14, rings=11, squash=(0.95, 0.88, 1.0))
    sph('villager_haircap', hair, 0.121, (0, 0, 1.685), verts=14, rings=8, squash=(1.0, 1.0, 0.8))
    sph('villager_bun', hair, 0.055, (0, 0, 1.82), verts=10, rings=7)
    cyl('villager_pin', straw, 0.008, 0.16, (0.06, 0.0, 1.82), verts=6, rot=(0, 0, math.pi / 4))
    sph('villager_eye_l', dark, 0.011, (-0.035, 0.105, 1.68), verts=6, rings=4)
    sph('villager_eye_r', dark, 0.011, (0.035, 0.105, 1.68), verts=6, rings=4)

    # ---- the arms: sleeves hanging from the shoulders, hands peeking ----
    cyl('villager_arm_l', indigo, 0.042, 0.55, (-0.24, 0.06, 1.42), verts=8, rot=(0, 0.35, 0))
    cyl('villager_arm_r', indigo, 0.042, 0.55, (0.24, 0.06, 1.42), verts=8, rot=(0, -0.35, 0))
    sph('villager_hand_l', skin, 0.033, (-0.27, 0.14, 1.14), verts=8, rings=6)
    sph('villager_hand_r', skin, 0.033, (0.27, 0.14, 1.14), verts=8, rings=6)

    # ---- the straw sandals: flattened wedges ----
    cube('villager_sandal_l', straw, (-0.11, 0.0, 0.05), (0.09, 0.16, 0.045))
    cube('villager_sandal_r', straw, (0.11, 0.0, 0.05), (0.09, 0.16, 0.045))

    # ---- join every part into one villager mesh ----
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = 'villager'
    return joined


# ---------------------------------------------------------------------------
# The character BASE BODY (bible §4) — nothing equipped
# ---------------------------------------------------------------------------
# Per the style bible §4: a complete, modestly-clad base body so every
# equipment slot can be equipped/removed/hidden later. Proportions §3:
# 1.82 m male, 7.75 heads, shoulders 0.46, hips 0.34, hand 0.19, foot
# 0.27, eye line ~1.70, root origin at the ground center between feet.
# Healthy, elegant, capable — never exaggerated.
#
# The body is NOT joined: every part is a NAMED node = a body-hide zone
# (the bible's exact zone IDs), so equipment can hide/show by name. The
# scalp cap is the HEAD_SCALP zone (hair is a wearable); the briefs and
# chest band are the modest undergarments.

ZONE = {
    'scalp': 'zone_HEAD_SCALP',
    'neck': 'zone_NECK',
    'chest_up': 'zone_CHEST_UPPER',
    'chest_lo': 'zone_CHEST_LOWER',
    'back_up': 'zone_BACK_UPPER',
    'back_lo': 'zone_BACK_LOWER',
    'shl': 'zone_SHOULDER_L',
    'shr': 'zone_SHOULDER_R',
    'armu_l': 'zone_UPPER_ARM_L',
    'armu_r': 'zone_UPPER_ARM_R',
    'armf_l': 'zone_FOREARM_L',
    'armf_r': 'zone_FOREARM_R',
    'hand_l': 'zone_HAND_L',
    'hand_r': 'zone_HAND_R',
    'pelvis': 'zone_PELVIS',
    'glute': 'zone_GLUTE',
    'thigh_l': 'zone_THIGH_L',
    'thigh_r': 'zone_THIGH_R',
    'calf_l': 'zone_CALF_L',
    'calf_r': 'zone_CALF_R',
    'foot_l': 'zone_FOOT_L',
    'foot_r': 'zone_FOOT_R',
}


def build_character_base(seed):
    import bmesh

    rng = Seeded(seed)
    skin = make_material('char_skin', (0.64, 0.39, 0.23), roughness=0.68)  # the measured tan (208,166,131)
    hair = make_material('char_hair', PALETTE['hair'], roughness=0.9)
    eye = make_material('char_eye', (0.015, 0.015, 0.015), roughness=0.2)
    brow = make_material('char_brow', (0.06, 0.05, 0.045), roughness=0.9)
    under = make_material('char_underwear', (0.05, 0.05, 0.06), roughness=0.9)  # matte black
    linen = make_material('char_under', (0.014, 0.013, 0.012), roughness=0.85)  # matte black briefs

    objects = []
    name_counts = {}

    def loft(name, mat, slices, segments=16, half=None, xo=0.0):
        """A smooth parametric body part: elliptical profile rings lofted
        together. slices: [(y, rx, rdepth, yf)] bottom→top; yf shifts the
        ring forward (+Y, the face direction) so feet, knees and chests
        lean naturally. half: None | 'front' | 'back' — the torso splits
        into chest (front) and back halves. Winding is checked by signed
        volume and flipped if inside-out."""
        n = name_counts.get(name, 0) + 1
        name_counts[name] = n
        objname = name if n == 1 else f'{name}.{n:03d}'
        me = bpy.data.meshes.new(objname)
        bm = bmesh.new()
        if half is None:
            idx = list(range(segments))
        elif half == 'front':
            # one ring vertex PAST the mid-line on each side: the halves
            # overlap and the side seam reads continuous
            idx = list(range(segments // 2 + 2))
        else:
            idx = list(range(segments // 2 - 1, segments)) + [0, 1]
        rings = []
        for (y, rx, rd, yf) in slices:
            ring = []
            for i in idx:
                a = (i / segments) * 2.0 * math.pi
                ring.append(bm.verts.new((xo + rx * math.cos(a), yf + rd * math.sin(a), y)))
            rings.append(ring)
        for k in range(len(rings) - 1):
            lo, hi = rings[k], rings[k + 1]
            for i in range(len(lo) - 1):
                bm.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
        # caps: fan-triangulated (no ngons in deform areas)
        for ring, (y, rx, rd, yf) in [(rings[0], slices[0]), (rings[-1], slices[-1])]:
            pole = bm.verts.new((xo, yf, y))
            if half is None:
                rev = list(reversed(ring))
                for i in range(len(rev) - 1):
                    bm.faces.new((pole, rev[i], rev[i + 1]))
            else:
                for i in range(len(ring) - 1):
                    bm.faces.new((pole, ring[i], ring[i + 1]))
        obj = bpy.data.objects.new(objname, me)
        bm.to_mesh(me)
        bm.free()
        assign(obj, mat)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        # signed volume: negative = inside-out → flip
        vol = 0.0
        for p in me.polygons:
            vs = p.vertices
            if len(vs) >= 3:
                a = me.vertices[vs[0]].co
                b = me.vertices[vs[1]].co
                c = me.vertices[vs[2]].co
                vol += a.dot(b.cross(c)) / 6.0
        if vol < 0:
            me.flip_normals()
        bpy.context.collection.objects.link(obj)
        objects.append(obj)
        return obj

    def sph(name, mat, radius, loc, verts=12, rings=9, squash=None):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=verts, ring_count=rings,
                                             location=loc)
        obj = bpy.context.object
        obj.name = name
        if squash:
            obj.scale = squash
        obj.data.polygons[0].use_smooth = True
        assign(obj, mat)
        objects.append(obj)
        return obj

    def cyl(name, mat, radius, depth, loc, verts=8, rot=None):
        bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts,
                                            location=loc)
        obj = bpy.context.object
        obj.name = name
        if rot:
            obj.rotation_euler = rot
        obj.data.polygons[0].use_smooth = True
        assign(obj, mat)
        objects.append(obj)
        return obj

    def box(name, mat, w, h, d, loc):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.object
        obj.name = name
        obj.scale = (w, d, h)
        assign(obj, mat)
        objects.append(obj)
        return obj

    S = 0.095  # leg half-spacing (hip width 0.34 → ±0.095)
    A = 0.235  # shoulder half-spacing (acromion 0.46 → ±0.23)

    # ---- feet: sloped wedges, toes forward ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_FOOT_{side}', skin, [
            (0.0, 0.046, 0.036, 0.16), (0.03, 0.048, 0.040, 0.10),
            (0.06, 0.050, 0.042, 0.05), (0.09, 0.046, 0.040, 0.0)], xo=sgn * S)
    # ---- calves: the bulge, then the ankle ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_CALF_{side}', skin, [
            (0.09, 0.042, 0.038, 0.0), (0.28, 0.058, 0.052, 0.0),
            (0.52, 0.066, 0.060, 0.0)], xo=sgn * S)
    # ---- thighs: knee to hip ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_THIGH_{side}', skin, [
            (0.50, 0.058, 0.052, 0.0), (0.74, 0.080, 0.074, 0.0),
            (0.94, 0.098, 0.090, 0.0)], xo=sgn * S)
    # the calves OVERLAP the thighs at the knee — no seam spheres; the
    # overlap band hides the zone boundary
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_CALF_{side}', skin, [
            (0.09, 0.044, 0.040, 0.0), (0.26, 0.060, 0.054, 0.0),
            (0.55, 0.058, 0.052, 0.0)], xo=sgn * S)

    # ---- pelvis (hip 0.34/0.30) ----
    loft('zone_PELVIS', skin, [
        (0.85, 0.140, 0.130, 0.0), (0.95, 0.148, 0.136, 0.0),
        (1.04, 0.172, 0.155, 0.0)])
    # ---- glutes: the pelvis's back mass ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        sph(f'zone_GLUTE_{side}', skin, 0.105, (sgn * 0.115, -0.06, 0.99),
            verts=10, rings=7, squash=(1.0, 0.8, 0.9))

    # ---- torso: front (chest) + back halves, waist pinch, chest flare ----
    loft('zone_CHEST_LOWER', skin, [
        (1.04, 0.150, 0.136, 0.0), (1.15, 0.125, 0.112, 0.0),
        (1.26, 0.155, 0.136, 0.0)], half='front')
    loft('zone_BACK_LOWER', skin, [
        (1.04, 0.150, 0.136, 0.0), (1.15, 0.125, 0.112, 0.0),
        (1.26, 0.155, 0.136, 0.0)], half='back')
    loft('zone_CHEST_UPPER', skin, [
        (1.26, 0.160, 0.140, 0.0), (1.38, 0.176, 0.148, 0.0),
        (1.49, 0.180, 0.150, 0.0)], half='front')
    loft('zone_BACK_UPPER', skin, [
        (1.26, 0.160, 0.140, 0.0), (1.38, 0.176, 0.148, 0.0),
        (1.49, 0.180, 0.150, 0.0)], half='back')

    # ---- shoulders (deltoid spheres + traps bridging torso and arms) ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        sph(f'zone_SHOULDER_{side}', skin, 0.082, (sgn * A, 0.02, 1.50),
            verts=10, rings=7)
        sph(f'zone_BACK_UPPER.trap{side}', skin, 0.055, (sgn * 0.135, -0.05, 1.545),
            verts=10, rings=6, squash=(1.1, 0.8, 0.7))

    # ---- arms: shoulder → elbow → wrist, hanging slightly forward; the
    # forearm OVERLAPS the upper arm at the elbow (no seam spheres) ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_UPPER_ARM_{side}', skin, [
            (1.20, 0.046, 0.042, 0.03), (1.36, 0.056, 0.052, 0.02),
            (1.52, 0.058, 0.054, 0.02)], xo=sgn * A)
        loft(f'zone_FOREARM_{side}', skin, [
            (1.00, 0.034, 0.030, 0.05), (1.12, 0.044, 0.040, 0.05),
            (1.24, 0.046, 0.042, 0.04)], xo=sgn * (A + 0.012))

    # ---- hands: palm loft + rounded fingers + thumb ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        loft(f'zone_HAND_{side}', skin, [
            (0.94, 0.038, 0.028, 0.06), (1.02, 0.036, 0.026, 0.07)],
            xo=sgn * (A + 0.012))
        for k, dx in enumerate([-0.026, -0.008, 0.008, 0.026]):
            cyl(f'zone_HAND_{side}.finger{k}', skin, 0.010, 0.055,
                (sgn * (A + 0.012) + dx, 0.115, 0.92), verts=6)
        cyl(f'zone_HAND_{side}.thumb', skin, 0.011, 0.05,
            (sgn * (A + 0.012) + sgn * 0.045, 0.05, 0.95), verts=6, rot=(0, math.pi / 2, 0))

    # ---- neck ----
    loft('zone_NECK', skin, [
        (1.56, 0.055, 0.050, 0.0), (1.62, 0.050, 0.046, 0.0)])

    # ---- the head: a smooth lathe profile (jaw taper + skull) ----
    loft('char_head', skin, [
        (1.50, 0.046, 0.042, 0.0), (1.58, 0.058, 0.052, 0.0),
        (1.66, 0.105, 0.098, 0.0), (1.72, 0.112, 0.108, 0.0),
        (1.78, 0.104, 0.100, 0.0), (1.83, 0.085, 0.082, 0.0)], segments=20)
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        sph(f'char_head.ear{side}', skin, 0.022, (sgn * 0.112, 0.0, 1.68), verts=8, rings=5)

    # eyes: dark almonds + brows + nose + mouth (stylized, must READ)
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        sph(f'char_face.eye{side}', eye, 0.024, (sgn * 0.040, 0.104, 1.71),
            verts=8, rings=5, squash=(0.75, 1.0, 0.65))
        box(f'char_face.brow{side}', brow, 0.038, 0.009, 0.009,
            (sgn * 0.040, 0.117, 1.716))
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.014, radius2=0.007, depth=0.03,
                                    location=(0, 0.106, 1.678))
    nose = bpy.context.object
    nose.name = 'char_face.nose'
    nose.rotation_euler = (math.pi / 2, 0, 0)
    nose.data.polygons[0].use_smooth = True
    assign(nose, skin)
    objects.append(nose)
    box('char_face.mouth', brow, 0.036, 0.008, 0.007, (0, 0.088, 1.665))

    # the scalp cap (HEAD_SCALP zone — hair itself is a wearable)
    sph('zone_HEAD_SCALP', hair, 0.113, (0, -0.01, 1.745), verts=14, rings=8,
        squash=(1.0, 0.98, 0.72))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.100, minor_radius=0.012, major_segments=14,
                                     minor_segments=5, location=(0, 0.075, 1.70))
    hairline = bpy.context.object
    hairline.name = 'zone_HEAD_SCALP.hairline'
    hairline.rotation_euler.x = math.pi / 2 + 0.35
    assign(hairline, brow)
    objects.append(hairline)

    # ---- the athletic chest + abdomen definition (the reference: lean,
    # defined, not bulky) ----
    for side, sgn in [('L', -1.0), ('R', 1.0)]:
        sph(f'zone_CHEST_UPPER.pec{side}', skin, 0.052, (sgn * 0.078, 0.10, 1.395),
            verts=10, rings=7, squash=(1.0, 0.55, 0.78))
        sph(f'zone_BACK_UPPER.blade{side}', skin, 0.045, (sgn * 0.095, -0.085, 1.40),
            verts=10, rings=6, squash=(1.0, 0.6, 0.75))
    for k, zy in enumerate([1.30, 1.24, 1.18, 1.12]):
        box(f'zone_CHEST_LOWER.ab{k}', skin, 0.085, 0.011, 0.030, (0, 0.132, zy))

    # ---- the modest undergarments (the reference: matte black,
    # form-fitting boxer shorts) ----
    loft('underwear_boxers', under, [
        (0.62, 0.150, 0.128, 0.0), (0.80, 0.162, 0.142, 0.0),
        (0.95, 0.172, 0.152, 0.0), (1.06, 0.174, 0.154, 0.0)])

    # group the exports
    return objects


# ---------------------------------------------------------------------------
# The hair — a WEARABLE (slot HAIR): long black, tied at the nape, flowing
# down the back (the reference base body wears its hair)
# ---------------------------------------------------------------------------

def build_hair(seed):
    rng = Seeded(seed)
    hair = make_material('hair_black', PALETTE['hair'], roughness=0.88)
    tie = make_material('hair_tie', (0.25, 0.10, 0.08), roughness=0.7)
    objects = []
    name_counts = {}

    def loft(name, mat, slices, segments=16, xo=0.0):
        import bmesh
        n = name_counts.get(name, 0) + 1
        name_counts[name] = n
        objname = name if n == 1 else f'{name}.{n:03d}'
        me = bpy.data.meshes.new(objname)
        bm = bmesh.new()
        rings = []
        for (y, rx, rd, yf) in slices:
            ring = []
            for i in range(segments):
                a = (i / segments) * 2.0 * math.pi
                ring.append(bm.verts.new((xo + rx * math.cos(a), yf + rd * math.sin(a), y)))
            rings.append(ring)
        for k in range(len(rings) - 1):
            lo, hi = rings[k], rings[k + 1]
            for i in range(len(lo) - 1):
                bm.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
        for ring, (y, rx, rd, yf) in [(rings[0], slices[0]), (rings[-1], slices[-1])]:
            pole = bm.verts.new((xo, yf, y))
            rev = list(reversed(ring))
            for i in range(len(rev) - 1):
                bm.faces.new((pole, rev[i], rev[i + 1]))
        obj = bpy.data.objects.new(objname, me)
        bm.to_mesh(me)
        bm.free()
        assign(obj, mat)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        bpy.context.collection.objects.link(obj)
        objects.append(obj)
        return obj

    # the scalp cap (covers the head top — hides the base's HEAD_SCALP)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.112, segments=16, ring_count=10,
                                         location=(0, -0.01, 1.75))
    cap = bpy.context.object
    cap.name = 'hair_cap'
    cap.scale = (1.0, 0.98, 0.72)
    cap.data.polygons[0].use_smooth = True
    assign(cap, hair)
    objects.append(cap)

    # the reference: a COMPACT topknot bun at the crown (not a long tail)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.042, segments=12, ring_count=8,
                                         location=(0, -0.02, 1.855))
    bun = bpy.context.object
    bun.name = 'hair_topknot'
    bun.scale = (0.85, 0.9, 1.0)
    bun.data.polygons[0].use_smooth = True
    assign(bun, hair)
    objects.append(bun)

    # the tie around the bun
    bpy.ops.mesh.primitive_torus_add(major_radius=0.028, minor_radius=0.008, major_segments=10,
                                     minor_segments=6, location=(0, -0.03, 1.82))
    tie_obj = bpy.context.object
    tie_obj.name = 'hair_tie'
    tie_obj.rotation_euler.x = math.pi / 2
    assign(tie_obj, tie)
    objects.append(tie_obj)

    return objects


def build_robe(seed):
    rng = Seeded(seed)
    indigo = make_material('robe_indigo', PALETTE['indigo'], roughness=0.9)
    straw = make_material('robe_straw', PALETTE['straw'], roughness=0.95)
    dark = make_material('robe_dark', (0.02, 0.02, 0.02), roughness=0.3)

    parts = []

    def spawn(mesh_op, name, mat):
        mesh_op()
        obj = bpy.context.object
        obj.name = name
        if mat:
            assign(obj, mat)
        parts.append(obj)
        return obj

    def bake(obj):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # the robe: tapered from the shoulders to the hem, hem at the ankles
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.26, radius2=0.30, depth=1.22,
                                    location=(0, 0, 0.97))
    robe = bpy.context.object
    robe.name = 'robe_hem'
    robe.scale = (1.0, 0.78, 1.0)
    robe.data.polygons[0].use_smooth = True
    assign(robe, indigo)
    parts.append(robe)
    bake(robe)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.155, minor_radius=0.018, major_segments=12,
                                     minor_segments=6, location=(0, 0, 0.82))
    sash = bpy.context.object
    sash.name = 'robe_sash'
    sash.rotation_euler.x = math.pi / 2
    assign(sash, straw)
    parts.append(sash)
    bake(sash)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.13, minor_radius=0.02, major_segments=10,
                                     minor_segments=5, location=(0, 0, 1.52))
    collar = bpy.context.object
    collar.name = 'robe_collar'
    collar.rotation_euler.x = math.pi / 2
    assign(collar, dark)
    parts.append(collar)
    bake(collar)

    # sleeves hanging from the shoulders (the arms' zone, hidden by the robe)
    for side, sx in [('l', -0.24), ('r', 0.24)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.042, depth=0.55, vertices=8,
                                            location=(sx, 0.06, 1.42))
        sleeve = bpy.context.object
        sleeve.name = f'robe_sleeve_{side}'
        sleeve.rotation_euler = (0, 0.35 if side == 'l' else -0.35, 0)
        sleeve.data.polygons[0].use_smooth = True
        assign(sleeve, indigo)
        parts.append(sleeve)
        bake(sleeve)

    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = 'robe'
    return joined


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--asset', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--seed', type=int, default=7)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args, _ = parser.parse_known_args(argv)

    clear_scene()
    if args.asset == 'sacred_pine':
        root = build_sacred_pine(args.seed)
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
    elif args.asset == 'family_shrine':
        root = build_family_shrine(args.seed)
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
    elif args.asset == 'villager':
        root = build_villager(args.seed)
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
    elif args.asset == 'character_base':
        roots = build_character_base(args.seed)
        for root in roots:
            root.select_set(True)
    elif args.asset == 'robe':
        root = build_robe(args.seed)
        root.select_set(True)
        bpy.context.view_layer.objects.active = root
    elif args.asset == 'hair':
        roots = build_hair(args.seed)
        for root in roots:
            root.select_set(True)
    else:
        raise SystemExit(f'unknown asset: {args.asset}')

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
    )
    print(f'[pipeline] built {args.asset} -> {args.out}')


if __name__ == '__main__':
    main()
