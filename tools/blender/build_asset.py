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
