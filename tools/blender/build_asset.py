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
