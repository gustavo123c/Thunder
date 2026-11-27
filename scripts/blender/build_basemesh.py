"""
Builds a MakeHuman human directly from MPFB2's CC0 data files — no add-on needed.

Use this when the MPFB2 add-on isn't available (e.g. Blender < 4.2 or a headless machine).
With MPFB2 installed, create the human with the add-on instead and run only
split_body_zones.py.

    blender -b -P scripts/blender/build_basemesh.py -P scripts/blender/split_body_zones.py -- \
        --mpfb-data /path/to/mpfb2/src/mpfb/data --sex male --out assets/models/body-male.glb

What it does:
  * reads data/3dobjs/base.obj keeping MakeHuman's vertex order (targets and groups rely on it);
  * applies the "young adult" macro targets for the chosen sex (race mix 1/3 each, as the
    MakeHuman default), plus a little extra muscle for a runner build;
  * converts to MPFB's Blender convention: Z up, facing -Y, metres, feet on the ground;
  * adds MakeHuman's basemesh vertex groups ("body", "joint-*", "Left"/"Right"...) so that
    split_body_zones.py can find the joints exactly as on an MPFB human.

The MakeHuman base mesh and targets are CC0 (see mpfb2/LICENSE.ASSETS.md).
"""

import argparse
import gzip
import json
import os
import sys

import bpy

SCALE = 0.1  # MakeHuman units are decimetres
RACES = ('african', 'asian', 'caucasian')


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    parser.add_argument('--mpfb-data', required=True, help='path to mpfb2/src/mpfb/data')
    parser.add_argument('--sex', choices=('male', 'female'), default='male')
    parser.add_argument('--muscle', type=float, default=0.25,
                        help='0 = average muscle, 1 = max muscle (default 0.25: runner build)')
    args, _ = parser.parse_known_args(argv)
    return args


def read_obj(path):
    """Vertices and faces in file order (faces as 0-based vertex index tuples)."""
    vertices, faces = [], []
    with open(path, encoding='utf8') as handle:
        for line in handle:
            if line.startswith('v '):
                vertices.append([float(v) for v in line.split()[1:4]])
            elif line.startswith('f '):
                faces.append(tuple(int(part.split('/')[0]) - 1 for part in line.split()[1:]))
    return vertices, faces


def read_target(path):
    deltas = {}
    with gzip.open(path, 'rt', encoding='utf8') as handle:
        for line in handle:
            if not line.strip() or line.startswith('#'):
                continue
            index, dx, dy, dz = line.split()
            deltas[int(index)] = (float(dx), float(dy), float(dz))
    return deltas


def apply_target(vertices, path, weight):
    if weight == 0 or not os.path.exists(path):
        return
    for index, (dx, dy, dz) in read_target(path).items():
        vertex = vertices[index]
        vertex[0] += dx * weight
        vertex[1] += dy * weight
        vertex[2] += dz * weight


def vertex_ranges(ranges):
    for start, end in ranges:
        yield from range(start, end + 1)


def main():
    args = parse_args()
    data = args.mpfb_data
    vertices, faces = read_obj(os.path.join(data, '3dobjs', 'base.obj'))

    macro = os.path.join(data, 'targets', 'macrodetails')
    for race in RACES:  # MakeHuman default: equal race mix
        apply_target(vertices, os.path.join(macro, f'{race}-{args.sex}-young.target.gz'), 1 / 3)
    muscle = min(1.0, max(0.0, args.muscle))
    prefix = f'universal-{args.sex}-young'
    apply_target(vertices, os.path.join(macro, f'{prefix}-averagemuscle-averageweight.target.gz'),
                 1 - muscle)
    apply_target(vertices, os.path.join(macro, f'{prefix}-maxmuscle-averageweight.target.gz'),
                 muscle)

    groups = json.load(open(os.path.join(data, 'mesh_metadata', 'basemesh_vertex_groups.json')))

    # MakeHuman: Y up, facing +Z, decimetres → Blender/MPFB: Z up, facing -Y, metres.
    ground_y = min(vertices[i][1] for i in vertex_ranges(groups['body']))
    converted = [(x * SCALE, -z * SCALE, (y - ground_y) * SCALE) for x, y, z in vertices]

    mesh = bpy.data.meshes.new(f'Human_{args.sex}')
    mesh.from_pydata(converted, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(f'Human_{args.sex}', mesh)
    bpy.context.scene.collection.objects.link(obj)

    for name, ranges in groups.items():
        group = obj.vertex_groups.new(name=name)
        group.add(list(vertex_ranges(ranges)), 1.0, 'REPLACE')

    for other in list(bpy.context.selected_objects):
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    print(f'[build_basemesh] {obj.name}: {len(converted)} vertices, {len(faces)} faces')


main()
