#!/usr/bin/env python3
"""
build_asset.py — the deterministic Blender asset generator (GATE 3).

Headless Blender 4.2: same seed -> same asset, every run. Materials are
the art bible palette (linear working space). Every builder module
registers one asset and exports a GLB.

Usage:
  blender --background --python tools/blender/build_asset.py -- --asset sacred_pine --out src/engine/game/assets/models/sacred_pine.glb --seed 7
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
    rng = Seeded(seed)
    skin = make_material('char_skin', PALETTE['skin'], roughness=0.78)
    hair = make_material('char_hair', PALETTE['hair'], roughness=0.9)
    eye = make_material('char_eye', (0.015, 0.015, 0.015), roughness=0.2)
    brow = make_material('char_brow', (0.06, 0.05, 0.045), roughness=0.9)
    linen = make_material('char_linen', PALETTE['linen'], roughness=0.95)

    objects = []

    def spawn(mesh_op, name, mat):
        mesh_op()
        obj = bpy.context.object
        obj.name = name
        if mat:
            assign(obj, mat)
        objects.append(obj)
        return obj

    def bake(obj, location=True, rotation=True, scale=True):
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=location, rotation=rotation, scale=scale)

    def sph(name, mat, radius, loc, verts=12, rings=9, squash=None, zone=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=verts, ring_count=rings,
                                                                 location=loc), zone or name, mat)
        if squash:
            obj.scale = squash
        obj.data.polygons[0].use_smooth = True
        bake(obj)
        return obj

    def cyl(name, mat, radius, depth, loc, verts=10, rot=None, zone=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts,
                                                                location=loc), zone or name, mat)
        if rot:
            obj.rotation_euler = rot
        obj.data.polygons[0].use_smooth = True
        bake(obj)
        return obj

    def cube(name, mat, loc, scale, zone=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cube_add(size=1, location=loc), zone or name, mat)
        obj.scale = scale
        bake(obj)
        return obj

    def box(name, mat, w, h, d, loc, zone=None):
        obj = spawn(lambda: bpy.ops.mesh.primitive_cube_add(size=1, location=loc), zone or name, mat)
        obj.scale = (w, d, h)
        bake(obj)
        return obj

    # ---- pelvis + glute (hip width 0.34) ----
    sph('pelvis', skin, 0.17, (0, 0, 1.00), verts=14, rings=10, squash=(1.0, 0.82, 0.86), zone=ZONE['pelvis'])
    sph('glute_l', skin, 0.105, (-0.115, -0.06, 0.99), verts=10, rings=7, squash=(1.0, 0.8, 0.9), zone=ZONE['glute'])
    sph('glute_r', skin, 0.105, (0.115, -0.06, 0.99), verts=10, rings=7, squash=(1.0, 0.8, 0.9), zone=ZONE['glute'])

    # ---- torso: gentle taper so the silhouette reads smooth, not blocky ----
    cyl('waist', skin, 0.155, 0.30, (0, 0, 1.15), verts=12, zone=ZONE['chest_lo'])
    cyl('chest', skin, 0.175, 0.34, (0, 0, 1.42), verts=12, zone=ZONE['chest_up'])
    cyl('back_lo', skin, 0.16, 0.26, (0, -0.02, 1.13), verts=12, rot=(math.pi / 2, 0, 0), zone=ZONE['back_lo'])
    cyl('back_up', skin, 0.18, 0.30, (0, -0.02, 1.40), verts=12, rot=(math.pi / 2, 0, 0), zone=ZONE['back_up'])

    # ---- shoulders (acromion-acromion 0.46) ----
    sph('shoulder_l', skin, 0.075, (-0.23, 0.02, 1.52), verts=10, rings=7, zone=ZONE['shl'])
    sph('shoulder_r', skin, 0.075, (0.23, 0.02, 1.52), verts=10, rings=7, zone=ZONE['shr'])

    # ---- arms: upper + forearm with a knee-style elbow bulge, hands ----
    cyl('upper_arm_l', skin, 0.052, 0.30, (-0.24, 0.03, 1.36), verts=8, zone=ZONE['armu_l'])
    cyl('upper_arm_r', skin, 0.052, 0.30, (0.24, 0.03, 1.36), verts=8, zone=ZONE['armu_r'])
    cyl('forearm_l', skin, 0.042, 0.28, (-0.245, 0.05, 1.10), verts=8, zone=ZONE['armf_l'])
    cyl('forearm_r', skin, 0.042, 0.28, (0.245, 0.05, 1.10), verts=8, zone=ZONE['armf_r'])

    # hands: palm + 4 fingers + thumb (hand length 0.19)
    box('hand_l', skin, 0.075, 0.05, 0.11, (-0.25, 0.05, 0.965), zone=ZONE['hand_l'])
    box('hand_r', skin, 0.075, 0.05, 0.11, (0.25, 0.05, 0.965), zone=ZONE['hand_r'])
    for f, zbase, side in [(0, -0.265, -1), (1, -0.265, 1)]:
        pass
    for k, dx in enumerate([-0.028, -0.009, 0.009, 0.028]):
        box(f'finger_l_{k}', skin, 0.016, 0.05, 0.05, (dx - 0.25, 0.04, 0.925), zone=ZONE['hand_l'])
        box(f'finger_r_{k}', skin, 0.016, 0.05, 0.05, (dx + 0.25, 0.04, 0.925), zone=ZONE['hand_r'])
    box('thumb_l', skin, 0.017, 0.045, 0.045, (-0.30, 0.0, 0.95), zone=ZONE['hand_l'])
    box('thumb_r', skin, 0.017, 0.045, 0.045, (0.30, 0.0, 0.95), zone=ZONE['hand_r'])

    # ---- legs: thigh + knee + calf (feet on the ground) ----
    cyl('thigh_l', skin, 0.082, 0.40, (-0.095, 0.0, 0.74), verts=10, zone=ZONE['thigh_l'])
    cyl('thigh_r', skin, 0.082, 0.40, (0.095, 0.0, 0.74), verts=10, zone=ZONE['thigh_r'])
    sph('knee_l', skin, 0.055, (-0.10, 0.02, 0.52), verts=8, rings=6, squash=(1.0, 1.15, 0.8), zone=ZONE['thigh_l'])
    sph('knee_r', skin, 0.055, (0.10, 0.02, 0.52), verts=8, rings=6, squash=(1.0, 1.15, 0.8), zone=ZONE['thigh_r'])
    cyl('calf_l', skin, 0.06, 0.42, (-0.095, 0.0, 0.28), verts=10, zone=ZONE['calf_l'])
    cyl('calf_r', skin, 0.06, 0.42, (0.095, 0.0, 0.28), verts=10, zone=ZONE['calf_r'])
    sph('ankle_l', skin, 0.042, (-0.095, 0.02, 0.075), verts=8, rings=6, zone=ZONE['calf_l'])
    sph('ankle_r', skin, 0.042, (0.095, 0.02, 0.075), verts=8, rings=6, zone=ZONE['calf_r'])

    # ---- feet: 0.27 long wedges with a toe hint, ground at y=0 ----
    box('foot_l', skin, 0.09, 0.07, 0.27, (-0.095, 0.0, 0.075), zone=ZONE['foot_l'])
    box('foot_r', skin, 0.09, 0.07, 0.27, (0.095, 0.0, 0.075), zone=ZONE['foot_r'])
    box('toe_l', skin, 0.075, 0.03, 0.05, (-0.095, 0.0, 0.205), zone=ZONE['foot_l'])
    box('toe_r', skin, 0.075, 0.03, 0.05, (0.095, 0.0, 0.205), zone=ZONE['foot_r'])

    # ---- neck + head (0.235, eye line 1.70) ----
    cyl('neck', skin, 0.052, 0.10, (0, 0, 1.585), verts=10, zone=ZONE['neck'])
    sph('head', skin, 0.1175, (0, 0, 1.715), verts=16, rings=12, squash=(0.94, 0.92, 1.0), zone='char_head')
    sph('ear_l', skin, 0.022, (-0.115, 0.01, 1.70), verts=8, rings=5, zone='char_head')
    sph('ear_r', skin, 0.022, (0.115, 0.01, 1.70), verts=8, rings=5, zone='char_head')
    # jaw + chin hint
    sph('chin', skin, 0.05, (0, 0.085, 1.635), verts=8, rings=6, squash=(1.0, 0.7, 0.8), zone='char_head')

    # eyes: dark almonds + brows + nose + mouth (stylized — features must
    # READ at gameplay distance, so they are larger than real anatomy)
    sph('eye_l', eye, 0.019, (-0.04, 0.104, 1.71), verts=8, rings=5, squash=(0.75, 1.0, 0.65), zone='char_face')
    sph('eye_r', eye, 0.019, (0.04, 0.104, 1.71), verts=8, rings=5, squash=(0.75, 1.0, 0.65), zone='char_face')
    box('brow_l', brow, 0.038, 0.009, 0.009, (-0.04, 0.117, 1.716), zone='char_face')
    box('brow_r', brow, 0.038, 0.009, 0.009, (0.04, 0.117, 1.716), zone='char_face')
    box('nose', skin, 0.026, 0.03, 0.018, (0, 0.105, 1.678), zone='char_face')
    box('mouth', brow, 0.032, 0.008, 0.008, (0, 0.088, 1.665), zone='char_face')

    # the scalp cap: the HEAD_SCALP zone (hair itself is a wearable) —
    # a standardized hairline ring + the cap
    sph('scalp', hair, 0.118, (0, 0, 1.745), verts=14, rings=8, squash=(1.0, 0.98, 0.72), zone=ZONE['scalp'])
    bpy.ops.mesh.primitive_torus_add(major_radius=0.105, minor_radius=0.012, major_segments=14,
                                     minor_segments=5, location=(0, 0.075, 1.70))
    hairline = bpy.context.object
    hairline.name = ZONE['scalp']
    hairline.rotation_euler.x = math.pi / 2 + 0.35
    assign(hairline, brow)
    objects.append(hairline)
    bake(hairline)

    # ---- the modest undergarments (no genitals, no nipples) ----
    # briefs: a short tapered shell over the pelvis/glute
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.175, radius2=0.165, depth=0.20,
                                    location=(0, 0, 0.99))
    briefs = bpy.context.object
    briefs.name = 'underwear_briefs'
    briefs.scale = (1.0, 0.85, 1.0)
    briefs.data.polygons[0].use_smooth = True
    assign(briefs, linen)
    objects.append(briefs)
    bake(briefs)
    # chest band (binding cloth) — INNER_TORSO layer, modest
    bpy.ops.mesh.primitive_cylinder_add(radius=0.178, depth=0.14, vertices=12, location=(0, 0, 1.37))
    band = bpy.context.object
    band.name = 'underwear_chest_band'
    band.data.polygons[0].use_smooth = True
    assign(band, linen)
    objects.append(band)
    bake(band)

    # group the exports
    return objects


# ---------------------------------------------------------------------------
# The robe — a WEARABLE (slot OUTER_ROBE), built separately so equipment
# can be swapped on and off the base body
# ---------------------------------------------------------------------------

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
