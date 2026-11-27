"""
Splits a MakeHuman / MPFB2 human into runner pain zones and exports a compressed .glb
for the Thunder app.

Works on the active mesh object of a human created with the MPFB2 add-on (Blender 4.2+)
or with build_basemesh.py (any Blender 4.x). It relies on MakeHuman's basemesh vertex
groups — "body" and the "joint-*" helper cubes — which both keep.

Run from Blender's Scripting tab (select the human body first), or headless:

    blender human.blend -b -P scripts/blender/split_body_zones.py -- --out body-male.glb

Zones (one material per zone and side, named zone_<region>_<side>; the app picks by name):
    foot, ankle, shin, calf, achilles, knee, quadriceps (front thigh), hamstring (back
    thigh), it_band (outer thigh), hip — left and right — and lower_back (center).
Everything else stays in the neutral "body" material and is not tappable.

Compression: the mesh is welded and quantized (KHR_mesh_quantization) with gltf-transform
(`npx @gltf-transform/cli`, needs Node). Draco/meshopt are NOT used on purpose: they need
WebAssembly decoders, which React Native's Hermes engine doesn't have.
"""

import argparse
import math
import os
import shutil
import subprocess
import sys

import bmesh
import bpy
from mathutils import Vector

SKIN = (0.80, 0.62, 0.52, 1.0)  # neutral skin tone; the app recolors zones at runtime

LEG_REGIONS = (
    'foot', 'ankle', 'achilles', 'shin', 'calf', 'knee',
    'quadriceps', 'hamstring', 'it_band', 'hip',
)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='//body.glb', help='output .glb ("//" = next to .blend)')
    parser.add_argument('--subdivide', type=int, default=1,
                        help='Catmull-Clark levels before export (0 = base mesh, ~26k triangles)')
    parser.add_argument('--no-compress', action='store_true', help='skip gltf-transform')
    args, _ = parser.parse_known_args(argv)
    return args


# --------------------------------------------------------------------------- helpers

def find_human():
    obj = bpy.context.view_layer.objects.active
    candidates = [obj] if obj else []
    candidates += [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for candidate in candidates:
        if candidate and candidate.type == 'MESH' and 'body' in candidate.vertex_groups:
            return candidate
    raise SystemExit(
        '[split_body_zones] No MakeHuman body found: select the human\'s body mesh '
        '(it must have the "body" and "joint-*" vertex groups from MPFB2).'
    )


def baked_copy(obj):
    """Copy of the human with shape keys/modifiers applied and vertex groups kept."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(
        evaluated, preserve_all_data_layers=True, depsgraph=depsgraph
    )
    mesh.transform(obj.matrix_world)  # work in world space
    copy = bpy.data.objects.new('ThunderBody', mesh)
    bpy.context.scene.collection.objects.link(copy)
    for name in (g.name for g in obj.vertex_groups):
        copy.vertex_groups.new(name=name)
    return copy


def group_vertices(obj, name, threshold=0.5):
    index = obj.vertex_groups[name].index
    return [
        v.index for v in obj.data.vertices
        if any(g.group == index and g.weight >= threshold for g in v.groups)
    ]


def joint(obj, name):
    """Centre of a MakeHuman joint cube (vertex group "joint-…")."""
    if name not in obj.vertex_groups:
        raise SystemExit(f'[split_body_zones] Missing vertex group "{name}".')
    verts = group_vertices(obj, name)
    total = Vector()
    for i in verts:
        total += obj.data.vertices[i].co
    return total / len(verts)


def lerp(a, b, t):
    return a + (b - a) * t


# --------------------------------------------------------------------------- zones

class Leg:
    """Joint landmarks of one leg. Blender convention: Z up, front = -Y."""

    def __init__(self, obj, side, sign):
        prefix = 'l' if side == 'left' else 'r'
        self.side = side
        self.sign = sign  # +1: character's left is +X
        self.ankle = joint(obj, f'joint-{prefix}-ankle')
        self.knee = joint(obj, f'joint-{prefix}-knee')
        self.hip = joint(obj, f'joint-{prefix}-upper-leg')
        self.shank = self.knee.z - self.ankle.z
        self.thigh = self.hip.z - self.knee.z

    def axis_at(self, z):
        """Point on the bone axis (ankle→knee→hip) at height z."""
        if z <= self.knee.z:
            t = (z - self.ankle.z) / self.shank
            return lerp(self.ankle, self.knee, max(0.0, min(1.0, t)))
        t = (z - self.knee.z) / self.thigh
        return lerp(self.knee, self.hip, max(0.0, min(1.0, t)))


def classify(center, normal, legs, pelvis, spine2):
    """Zone name for a face (or None for the neutral body)."""
    side = 'left' if center.x >= 0 else 'right'
    leg = legs[side]
    z = center.z
    axis = leg.axis_at(z)
    front = center.y < axis.y  # front = -Y
    outward = leg.sign * normal.x  # > 0 faces the outside of the leg
    back_facing = normal.y > 0.3

    # Lower back: back-facing torso between the pelvis and the lower ribs, near the spine.
    if pelvis.z <= z <= spine2.z and abs(center.x) < 0.6 * abs(leg.hip.x) and back_facing:
        return 'lower_back', 'center'

    ankle_low = leg.ankle.z - 0.08 * leg.shank
    ankle_high = leg.ankle.z + 0.12 * leg.shank
    knee_low = leg.knee.z - 0.12 * leg.shank
    knee_high = leg.knee.z + 0.12 * leg.thigh
    thigh_top = leg.hip.z - 0.08 * leg.thigh

    # Below the hip joint the face must belong to a leg (not the other leg / crotch).
    if z < thigh_top and abs(center.x - axis.x) > 0.5 * leg.shank:
        return None

    if z < ankle_low:
        return 'foot', side
    if z < leg.ankle.z + 0.02 * leg.shank and -center.y > -leg.ankle.y + 0.15 * leg.shank:
        return 'foot', side  # instep in front of the ankle

    # Achilles: back strip from the heel up to the lower calf.
    if (z < leg.ankle.z + 0.30 * leg.shank and not front
            and abs(center.x - axis.x) < 0.09 * leg.shank):
        return 'achilles', side
    if z < ankle_high:
        return 'ankle', side
    if z < knee_low:
        return ('shin' if front else 'calf'), side
    if z < knee_high:
        return 'knee', side
    if z < thigh_top:
        if outward > 0.7:
            return 'it_band', side
        return ('quadriceps' if front else 'hamstring'), side

    # Hip: the outer side around the hip joint up to the iliac crest (buttocks stay neutral).
    # (the hands hang at this height in A-pose: stay close to the hip joint)
    if (z < pelvis.z + 0.25 * (spine2.z - pelvis.z)
            and 0.7 * abs(leg.hip.x) < leg.sign * center.x < 1.9 * abs(leg.hip.x)
            and not back_facing):
        return 'hip', side
    return None


def material(name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = SKIN
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = SKIN
        bsdf.inputs['Roughness'].default_value = 0.6
    return mat


# --------------------------------------------------------------------------- main

def main():
    args = parse_args()
    source = find_human()
    obj = baked_copy(source)

    legs = {'left': Leg(obj, 'left', 1), 'right': Leg(obj, 'right', -1)}
    pelvis = joint(obj, 'joint-pelvis')
    spine2 = joint(obj, 'joint-spine-2')

    # Keep only the skin ("body" group): drop eyes, teeth, helper geometry, joint cubes.
    body = set(group_vertices(obj, 'body'))
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in body], context='VERTS')

    obj.data.materials.clear()
    slots = {'body': 0}
    obj.data.materials.append(material('body'))
    zone_names = [f'zone_{r}_{s}' for r in LEG_REGIONS for s in ('left', 'right')]
    zone_names.append('zone_lower_back_center')
    for name in zone_names:
        slots[name] = len(obj.data.materials)
        obj.data.materials.append(material(name))

    counts = {}
    for face in bm.faces:
        zone = classify(face.calc_center_median(), face.normal, legs, pelvis, spine2)
        name = f'zone_{zone[0]}_{zone[1]}' if zone else 'body'
        face.material_index = slots[name]
        face.smooth = True
        counts[name] = counts.get(name, 0) + 1
    bm.to_mesh(obj.data)
    bm.free()

    missing = [n for n in zone_names if not counts.get(n)]
    if missing:
        raise SystemExit(f'[split_body_zones] Empty zones (check the joints): {missing}')
    for name in sorted(counts):
        print(f'[split_body_zones] {name}: {counts[name]} faces')

    # Smooth surface; keeps the zone materials (face attributes survive subdivision).
    obj.vertex_groups.clear()
    if args.subdivide > 0:
        modifier = obj.modifiers.new('Subdivision', 'SUBSURF')
        modifier.levels = modifier.render_levels = args.subdivide

    # Origin at the feet, centred on the body, so the app can spin it around the Y axis.
    for other in list(bpy.context.selected_objects):
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    out = bpy.path.abspath(args.out)
    os.makedirs(os.path.dirname(os.path.abspath(out)) or '.', exist_ok=True)
    raw = out if args.no_compress else out.replace('.glb', '.raw.glb')
    bpy.ops.export_scene.gltf(
        filepath=raw,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_skins=False,
        export_morph=False,
        export_animations=False,
        export_draco_mesh_compression_enable=False,
    )
    print(f'[split_body_zones] exported {raw} ({os.path.getsize(raw) // 1024} KB)')

    if args.no_compress:
        return
    npx = shutil.which('npx')
    if not npx:
        print('[split_body_zones] npx not found: run these to compress:\n'
              f'  npx @gltf-transform/cli weld "{raw}" "{raw}"\n'
              f'  npx @gltf-transform/cli quantize "{raw}" "{out}"')
        return
    cli = [npx, '--yes', '@gltf-transform/cli']
    subprocess.run(cli + ['weld', raw, raw], check=True)
    subprocess.run(cli + ['quantize', raw, out], check=True)
    os.remove(raw)
    print(f'[split_body_zones] compressed {out} ({os.path.getsize(out) // 1024} KB)')


main()
