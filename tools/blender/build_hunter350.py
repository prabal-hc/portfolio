"""
Procedural Royal Enfield Hunter 350 (Dapper Grey) for Blender.

    blender -b -P tools/blender/build_hunter350.py -- \
        --out public/models/hunter350.glb --preview tools/blender/preview

Proportions follow the real bike: 1370 mm wheelbase, 17" alloys (110/70 front, 140/70 rear),
790 mm seat, ~27 deg rake, air-oil-cooled single with a forward-inclined finned barrel.

Coordinates are written in *site space* (the space the R3F scene uses):
x = forward, y = up, z = the bike's right side, ground at y = 0, metres.
`P()` converts to Blender's Z-up space; the glTF exporter converts back, so the exported
file loads in three.js facing +X with no extra rotation.
"""

import math
import sys
import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


OUT = arg("--out", "hunter350.glb")
PREVIEW = arg("--preview")

# ----------------------------------------------------------------------------
# key dimensions
# ----------------------------------------------------------------------------
RF, RR = 0.300, 0.315  # tyre outer radius, front / rear
RIM = 0.216  # 17" rim radius
FX, RX = 0.685, -0.685  # axle x
RAKE = math.radians(27)
FORK_DIR = (-math.sin(RAKE), math.cos(RAKE))  # up the fork, from the front axle


def fork_pt(t, z=0.0):
    return (FX + FORK_DIR[0] * t, RF + FORK_DIR[1] * t, z)


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def P(x, y, z):
    """site space -> Blender space"""
    return Vector((x, -z, y))


def S(x, y, z):
    return (x, z, y)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
created = []


def set_input(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return


def make_mat(name, color, metallic=0.0, roughness=0.5, coat=0.0, emissive=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    rgba = (*color, 1.0)
    set_input(b, ["Base Color"], rgba)
    set_input(b, ["Metallic"], metallic)
    set_input(b, ["Roughness"], roughness)
    if coat:
        set_input(b, ["Coat Weight", "Clearcoat"], coat)
        set_input(b, ["Coat Roughness", "Clearcoat Roughness"], 0.12)
    if emissive:
        set_input(b, ["Emission Color", "Emission"], (*emissive, 1.0))
        set_input(b, ["Emission Strength"], strength)
    m.diffuse_color = rgba
    return m


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(lin(v) for v in c)


M = {
    "paint": make_mat("DapperGrey", srgb("8a8d90"), 0.35, 0.42, coat=1.0),
    "exhaust": make_mat("ExhaustBlack", srgb("1c1d20"), 0.6, 0.5),
    "orange": make_mat("Reflector", srgb("e8781a"), 0.1, 0.4),
    "panel": make_mat("PanelDark", srgb("1b1c1f"), 0.4, 0.5, coat=0.5),
    "accent": make_mat("Red", srgb("c8102e"), 0.2, 0.4),
    "black": make_mat("BlackMetal", srgb("0c0c0e"), 0.5, 0.45),
    "plastic": make_mat("BlackPlastic", srgb("101113"), 0.0, 0.6),
    "rubber": make_mat("Rubber", srgb("050506"), 0.0, 0.92),
    "alloy": make_mat("Alloy", srgb("232427"), 0.9, 0.32),
    "engine": make_mat("EngineCase", srgb("16171a"), 0.85, 0.42),
    "silver": make_mat("CastSilver", srgb("8d9198"), 0.9, 0.4),
    "disc": make_mat("BrakeDisc", srgb("a9adb3"), 1.0, 0.35),
    "chrome": make_mat("Chrome", srgb("d9dce1"), 1.0, 0.1),
    "seat": make_mat("Seat", srgb("0e0e10"), 0.0, 0.8),
    "lamp": make_mat("Lamp", srgb("fff3d6"), 0.0, 0.2, emissive=srgb("ffd9a0"), strength=3.0),
    "amber": make_mat("Indicator", srgb("ff9a1a"), 0.0, 0.2, emissive=srgb("ff9a1a"), strength=1.5),
    "tail": make_mat("TailLight", srgb("ff1c1c"), 0.0, 0.2, emissive=srgb("ff1c1c"), strength=3.0),
    "glass": make_mat("MirrorGlass", srgb("c8ccd2"), 1.0, 0.05),
    "display": make_mat("Display", srgb("9fd7ff"), 0.0, 0.3, emissive=srgb("9fd7ff"), strength=0.6),
}


def finish(obj, mat, smooth=True):
    obj.data.materials.clear()
    obj.data.materials.append(M[mat])
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    created.append((obj, mat))
    return obj


def active():
    return bpy.context.active_object


def mesh_obj(verts, faces, mat, name="part", smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(o)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return finish(o, mat, smooth)


def tube(a, b, r, mat, verts=12):
    a, b = P(*a), P(*b)
    d = b - a
    if d.length < 1e-6:
        return None
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = active()
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")
    return finish(o, mat)


def ball(c, size, mat, rot=(0, 0, 0), seg=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=P(*c))
    o = active()
    o.scale = S(*size)
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, mat)


def box(c, size, mat, rot=(0, 0, 0), bevel=0.18):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(*c))
    o = active()
    o.scale = S(*size)
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = min(size) * bevel
        b.segments = 3
        bpy.ops.object.modifier_apply(modifier="bevel")
    return finish(o, mat)


def cyl(c, radius, depth, mat, rot=(0, 0, 0), verts=32):
    """Cylinder whose axis is Blender Z rotated by `rot`."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=P(*c))
    o = active()
    o.rotation_euler = rot
    return finish(o, mat)


def axle_cyl(c, radius, depth, mat, verts=32):
    """Cylinder along the site z axis (wheel axle)."""
    return cyl(c, radius, depth, mat, rot=(math.pi / 2, 0, 0), verts=verts)


def fwd_cyl(c, radius, depth, mat, verts=32):
    """Cylinder along the site x axis (pointing forward)."""
    return cyl(c, radius, depth, mat, rot=(0, math.pi / 2, 0), verts=verts)


def torus(c, major, minor, mat, rot=(math.pi / 2, 0, 0), zscale=1.0, maj_seg=72, min_seg=20):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=maj_seg, minor_segments=min_seg, location=P(*c)
    )
    o = active()
    if zscale != 1.0:
        o.scale = (1, 1, zscale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = rot
    return finish(o, mat)


def loft(sections, mat, n=32, caps=True, name="loft"):
    """
    Skin a shape along the x axis. Each section is (x, cy, cz, half_height, half_width, squareness).
    squareness 2 = ellipse, 3+ = rounded box.
    """
    verts, faces = [], []
    for (x, cy, cz, hh, hw, pw) in sections:
        for k in range(n):
            a = math.tau * k / n
            s, c = math.sin(a), math.cos(a)
            verts.append(P(x, cy + hh * math.copysign(abs(s) ** (2 / pw), s), cz + hw * math.copysign(abs(c) ** (2 / pw), c)))
    for i in range(len(sections) - 1):
        for k in range(n):
            a = i * n + k
            b = i * n + (k + 1) % n
            faces.append((a, b, b + n, a + n))
    if caps:
        faces.append(tuple(range(n))[::-1])
        faces.append(tuple(range((len(sections) - 1) * n, len(sections) * n)))
    return mesh_obj(verts, faces, mat, name)


def slab(poly, z0, z1, mat):
    """Extrude a 2D polygon given in site (x, y) between z0 and z1."""
    n = len(poly)
    verts = [P(x, y, z0) for x, y in poly] + [P(x, y, z1) for x, y in poly]
    faces = [tuple(range(n))[::-1], tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    return mesh_obj(verts, faces, mat, "slab")


def annulus(c, r_in, r_out, thick, mat, n=72):
    """Flat ring with its axis along the site z axis (brake disc)."""
    cx, cy, cz = c
    verts, faces = [], []
    for k in range(n):
        a = math.tau * k / n
        ca, sa = math.cos(a), math.sin(a)
        for r in (r_in, r_out):
            for side in (-1, 1):
                verts.append(P(cx + ca * r, cy + sa * r, cz + side * thick / 2))
    for k in range(n):
        b, m = k * 4, ((k + 1) % n) * 4
        # per step: 0 in-, 1 in+, 2 out-, 3 out+
        faces += [(b + 1, b + 3, m + 3, m + 1), (b, m, m + 2, b + 2), (b + 2, m + 2, m + 3, b + 3), (b, b + 1, m + 1, m)]
    return mesh_obj(verts, faces, mat, "disc")


def arc_strip(center, radius, a0, a1, width, thick, mat, steps=32):
    """Fender: curved plate in the wheel plane, from a0 to a1 degrees (0 = +x)."""
    cx, cy = center
    verts, faces = [], []
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        for rr in (radius, radius + thick):
            for side in (-1, 1):
                verts.append(P(cx + rr * math.cos(a), cy + rr * math.sin(a), side * width / 2))
    for i in range(steps):
        b, n = i * 4, i * 4 + 4
        faces += [(b, b + 1, n + 1, n), (b + 2, n + 2, n + 3, b + 3), (b, n, n + 2, b + 2), (b + 1, b + 3, n + 3, n + 1)]
    faces += [(0, 2, 3, 1), (steps * 4, steps * 4 + 1, steps * 4 + 3, steps * 4 + 2)]
    return mesh_obj(verts, faces, mat, "fender")


def catmull(points, per=8):
    pts = [Vector(p) for p in points]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for j in range(per):
            t = j / per
            out.append(
                0.5
                * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            )
    out.append(pts[-1])
    return [tuple(v) for v in out]


def path_tube(points, r, mat, per=8, verts=12):
    pts = catmull(points, per)
    for a, b in zip(pts, pts[1:]):
        tube(a, b, r, mat, verts)


# ----------------------------------------------------------------------------
# wheels
# ----------------------------------------------------------------------------
def wheel(x, R, width, front):
    c = (x, R, 0)
    minor = (R - RIM) / 2
    torus(c, (R + RIM) / 2, minor, "rubber", zscale=(width / 2) / minor, min_seg=24)  # tyre
    torus(c, RIM - 0.006, 0.014, "alloy", zscale=1.6, min_seg=14)  # rim barrel
    for side in (-1, 1):  # red rim decal
        torus((x, R, side * 0.046), RIM + 0.004, 0.0035, "accent", min_seg=6, maj_seg=72)
    for i in range(5):  # split five-spoke alloy: two spokes fanning out per arm
        base = i / 5 * math.tau
        for off in (-0.125, 0.125):
            a = base + off
            d = (math.cos(a), math.sin(a))
            nrm = (-d[1], d[0])
            r0, r1, w0, w1 = 0.045, RIM - 0.01, 0.014, 0.02
            poly = []
            for (r, w) in ((r0, w0), (r1, w1)):
                poly.append((x + d[0] * r + nrm[0] * w, R + d[1] * r + nrm[1] * w))
            for (r, w) in ((r1, w1), (r0, w0)):
                poly.append((x + d[0] * r - nrm[0] * w, R + d[1] * r - nrm[1] * w))
            slab(poly, -0.03, 0.03, "alloy")
    axle_cyl(c, 0.062, 0.09, "alloy", 32)  # hub
    for side in (-1, 1):
        axle_cyl((x, R, side * 0.07), 0.028, 0.025, "chrome", 20)  # axle nut
    disc_r = 0.15 if front else 0.12
    annulus((x, R, 0.05), disc_r - 0.05, disc_r, 0.007, "disc")  # brake disc (flat ring)
    axle_cyl((x, R, 0.05), 0.05, 0.012, "silver", 24)  # disc carrier
    for i in range(6):  # carrier arms out to the disc
        a = i / 6 * math.tau
        tube((x + math.cos(a) * 0.05, R + math.sin(a) * 0.05, 0.05), (x + math.cos(a) * (disc_r - 0.06), R + math.sin(a) * (disc_r - 0.06), 0.05), 0.006, "silver", 6)


wheel(FX, RF, 0.11, True)
wheel(RX, RR, 0.14, False)

# fenders
arc_strip((FX, RF), RF + 0.032, 24, 140, 0.13, 0.012, "plastic")
arc_strip((RX, RR), RR + 0.04, 34, 154, 0.17, 0.012, "plastic")

# ----------------------------------------------------------------------------
# front end: fork, clamps, bars, lamp, cluster, mirrors
# ----------------------------------------------------------------------------
for s in (-1, 1):
    z = s * 0.105
    tube(fork_pt(0, z), fork_pt(0.26, z), 0.03, "alloy", 16)  # lower leg
    for i in range(8):  # concertina gaiter
        t = 0.27 + i * 0.03
        tube(fork_pt(t, z), fork_pt(t + 0.018, z), 0.031 if i % 2 == 0 else 0.026, "rubber", 14)
    tube(fork_pt(0.5, z), fork_pt(0.74, z), 0.021, "chrome", 14)  # stanchion
    tube(fork_pt(0.04, z), (FX, RF, s * 0.075), 0.014, "alloy", 10)  # axle lug
    tube(fork_pt(0.1, s * 0.135), fork_pt(0.2, s * 0.135), 0.008, "orange", 8)  # fork reflector

# axle-side caliper on the right
box((FX - 0.07, RF + 0.09, 0.065), (0.07, 0.06, 0.035), "black")

head = fork_pt(0.66)
tube(fork_pt(0.68, -0.105), fork_pt(0.68, 0.105), 0.028, "black")  # upper clamp
tube(fork_pt(0.5, -0.105), fork_pt(0.5, 0.105), 0.022, "black")  # lower clamp
tube((head[0] + 0.02, head[1] - 0.14, 0), (head[0] - 0.02, head[1] + 0.06, 0), 0.032, "black", 16)  # head tube

bar_y = 0.965
bar = [(0.33, bar_y - 0.005, -0.36), (0.315, bar_y, -0.22), (0.335, bar_y + 0.005, 0), (0.315, bar_y, 0.22), (0.33, bar_y - 0.005, 0.36)]
path_tube(bar, 0.0115, "black", per=6, verts=10)
tube((0.335, bar_y + 0.005, 0), (0.365, bar_y - 0.04, 0), 0.02, "black")  # riser stub
for s in (-1, 1):
    tube((0.325, bar_y, s * 0.26), (0.33, bar_y - 0.005, s * 0.36), 0.0185, "rubber", 14)  # grips
    box((0.335, bar_y - 0.005, s * 0.235), (0.06, 0.03, 0.04), "plastic")  # switch cube
    path_tube([(0.35, bar_y - 0.005, s * 0.22), (0.28, bar_y - 0.012, s * 0.28), (0.25, bar_y - 0.01, s * 0.335)], 0.004, "chrome", per=5, verts=6)  # lever
    path_tube([(0.325, bar_y + 0.01, s * 0.33), (0.31, bar_y + 0.07, s * 0.355), (0.29, bar_y + 0.14, s * 0.385)], 0.0065, "black", per=5, verts=8)  # tall mirror stalk
    m = (0.285, bar_y + 0.195, s * 0.395)
    fwd_cyl((m[0], m[1], m[2]), 0.058, 0.024, "black", 36)  # mirror shell (round)
    fwd_cyl((m[0] - 0.013, m[1], m[2]), 0.05, 0.006, "glass", 36)

# headlamp: bowl + lens + bezel
HL = 0.875  # headlamp centre height
loft(
    [
        (0.395, HL, 0, 0.045, 0.045, 2),
        (0.43, HL, 0, 0.08, 0.08, 2),
        (0.50, HL, 0, 0.092, 0.092, 2),
        (0.565, HL, 0, 0.092, 0.092, 2),
        (0.59, HL, 0, 0.085, 0.085, 2),
    ],
    "black",
    n=40,
    name="headlamp",
)
fwd_cyl((0.593, HL, 0), 0.08, 0.012, "lamp", 40)
for i in range(2):
    torus((0.595 + i * 0.003, HL, 0), 0.089, 0.006, "chrome", rot=(0, math.pi / 2, 0), min_seg=10)
# lamp brackets + front indicators (orange bulbs on short stalks either side)
for s in (-1, 1):
    tube((0.43, HL, s * 0.07), fork_pt(0.62, s * 0.095), 0.008, "black", 8)
    tube((0.5, HL, s * 0.09), (0.53, HL + 0.01, s * 0.17), 0.006, "black", 8)
    ball((0.545, HL + 0.01, s * 0.18), (0.034, 0.03, 0.024), "amber")

# instrument pods: round speedo + small round secondary, sitting on the top clamp
cyl((0.315, 1.0, 0), 0.055, 0.045, "black", rot=(0, 0.55, 0), verts=32)
cyl((0.301, 1.007, 0), 0.042, 0.006, "display", rot=(0, 0.55, 0), verts=32)
cyl((0.33, 0.985, -0.085), 0.03, 0.03, "black", rot=(0, 0.55, 0), verts=24)

# ----------------------------------------------------------------------------
# frame, swingarm, suspension
# ----------------------------------------------------------------------------
tube((head[0] + 0.005, head[1] - 0.02, 0), (0.05, 0.71, 0), 0.03, "black", 14)  # top tube
tube((head[0] - 0.01, head[1] - 0.07, 0), (0.05, 0.71, 0), 0.026, "black", 14)  # tank spine
for s in (-1, 1):
    z = s * 0.095
    path_tube([(head[0] - 0.02, head[1] - 0.09, s * 0.02), (0.30, 0.55, z), (0.26, 0.32, z), (0.18, 0.235, z), (-0.05, 0.225, z), (-0.20, 0.27, z)], 0.017, "black", per=6)  # cradle
    path_tube([(-0.20, 0.27, z), (-0.16, 0.5, z * 0.9), (-0.06, 0.68, z * 0.85)], 0.017, "black", per=6)  # seat post
    tube((-0.06, 0.685, s * 0.085), (-0.88, 0.75, s * 0.105), 0.016, "black")  # subframe upper
    tube((-0.16, 0.5, s * 0.095), (-0.60, 0.71, s * 0.11), 0.014, "black")  # subframe brace
    tube((-0.20, 0.34, s * 0.125), (RX, RR, s * 0.105), 0.026, "alloy", 14)  # swingarm
    # shocks: coil spring + damper body
    top = (-0.50, 0.70, s * 0.165)
    bot = (-0.645, 0.345, s * 0.135)
    turns, steps_per = 9, 8
    helix = []
    for k in range(turns * steps_per + 1):
        u = k / (turns * steps_per)
        ang = u * turns * math.tau
        cx = top[0] + (bot[0] - top[0]) * (0.18 + 0.66 * u)
        cy = top[1] + (bot[1] - top[1]) * (0.18 + 0.66 * u)
        cz = top[2] + (bot[2] - top[2]) * (0.18 + 0.66 * u)
        # offset perpendicular to the shock axis, mostly across x/z
        helix.append((cx + math.cos(ang) * 0.026, cy, cz + math.sin(ang) * 0.026))
    for a, b in zip(helix, helix[1:]):
        tube(a, b, 0.0042, "black", 6)
    tube(top, (top[0] - 0.02, top[1] - 0.06, top[2] - s * 0.005), 0.014, "chrome", 12)
    tube(bot, (bot[0] + 0.03, bot[1] + 0.05, bot[2] + s * 0.004), 0.017, "black", 12)
    tube(top, bot, 0.006, "chrome", 8)

tube((-0.20, 0.34, -0.125), (-0.20, 0.34, 0.125), 0.022, "black")  # swingarm pivot
tube((RX + 0.02, RR + 0.02, -0.105), (RX + 0.02, RR + 0.02, 0.105), 0.014, "alloy")  # swingarm brace

# ----------------------------------------------------------------------------
# tank, seat, panels, tail
# ----------------------------------------------------------------------------
loft(
    [
        (0.41, 0.79, 0, 0.055, 0.055, 2.2),
        (0.35, 0.805, 0, 0.09, 0.105, 2.5),
        (0.22, 0.81, 0, 0.10, 0.145, 2.6),
        (0.08, 0.795, 0, 0.10, 0.15, 2.6),
        (-0.03, 0.775, 0, 0.085, 0.115, 2.5),
        (-0.10, 0.755, 0, 0.055, 0.06, 2.2),
    ],
    "paint",
    n=40,
    name="tank",
)
# fuel cap: raised oval boss on top of the tank
cyl((0.19, 0.905, 0), 0.036, 0.014, "chrome", verts=32)
cyl((0.19, 0.913, 0), 0.026, 0.008, "silver", verts=32)

loft(  # rider + pillion seat: dished for the rider, raised and kicked up for the pillion
    [
        (-0.03, 0.715, 0, 0.04, 0.06, 3),
        (-0.09, 0.725, 0, 0.04, 0.12, 3),
        (-0.28, 0.705, 0, 0.045, 0.155, 3),
        (-0.52, 0.73, 0, 0.048, 0.145, 3),
        (-0.72, 0.752, 0, 0.045, 0.12, 3),
        (-0.85, 0.77, 0, 0.035, 0.08, 3),
    ],
    "seat",
    n=32,
    name="seat",
)
loft(  # seat base / tray
    [(-0.04, 0.70, 0, 0.02, 0.10, 3), (-0.4, 0.695, 0, 0.02, 0.13, 3), (-0.84, 0.715, 0, 0.02, 0.09, 3)],
    "plastic",
    n=16,
    name="seatbase",
)

# side panels (left = air box, right = tool box with roundel)
for s in (-1, 1):
    loft(
        [
            (-0.05, 0.615, s * 0.125, 0.05, 0.02, 3),
            (-0.12, 0.585, s * 0.138, 0.095, 0.028, 3),
            (-0.32, 0.585, s * 0.138, 0.095, 0.028, 3),
            (-0.44, 0.615, s * 0.125, 0.055, 0.02, 3),
        ],
        "panel",
        n=24,
        name="sidepanel",
    )
# round badge with a red ring on the right side panel
torus((-0.21, 0.585, 0.168), 0.05, 0.006, "accent", min_seg=8, maj_seg=48)
axle_cyl((-0.21, 0.585, 0.166), 0.048, 0.006, "black", 40)
box((-0.21, 0.59, 0.171), (0.07, 0.016, 0.004), "chrome", bevel=0)
box((-0.21, 0.568, 0.171), (0.035, 0.011, 0.004), "chrome", bevel=0)

# tail: lamp, indicators, plate, grab rail
box((-0.9, 0.79, 0), (0.05, 0.035, 0.13), "tail")
box((-1.0, 0.52, 0), (0.012, 0.11, 0.2), "silver", rot=(0, -0.12, 0))
tube((-0.45, 0.80, -0.11), (-0.88, 0.805, -0.09), 0.011, "black")
tube((-0.45, 0.80, 0.11), (-0.88, 0.805, 0.09), 0.011, "black")
path_tube([(-0.88, 0.805, -0.09), (-0.93, 0.805, -0.045), (-0.93, 0.805, 0.045), (-0.88, 0.805, 0.09)], 0.011, "black", per=4)
for s in (-1, 1):
    tube((-0.9, 0.72, s * 0.09), (-0.94, 0.7, s * 0.17), 0.006, "black", 8)
    ball((-0.945, 0.7, s * 0.185), (0.025, 0.022, 0.03), "amber")

# ----------------------------------------------------------------------------
# engine, exhaust, drivetrain, controls
# ----------------------------------------------------------------------------
box((0.06, 0.36, 0), (0.44, 0.26, 0.2), "engine", bevel=0.12)  # crankcase
box((-0.13, 0.32, 0), (0.22, 0.2, 0.2), "engine", bevel=0.12)  # gearbox
axle_cyl((0.14, 0.37, 0.105), 0.075, 0.035, "silver", 36)  # alternator cover
axle_cyl((0.14, 0.37, 0.126), 0.05, 0.012, "engine", 28)
axle_cyl((0.01, 0.36, -0.105), 0.088, 0.035, "silver", 36)  # clutch cover
axle_cyl((0.01, 0.36, -0.126), 0.05, 0.012, "engine", 28)
for s in (-1, 1):
    axle_cyl((-0.13, 0.30, s * 0.106), 0.05, 0.02, "silver", 28)  # gearbox covers

# inclined finned barrel + head
base = Vector((0.19, 0.46, 0))
axis = Vector((0.04, 0.26, 0)).normalized()
tilt = math.atan2(axis.x, axis.y)


def along(t, z=0.0):
    p = base + axis * t
    return (p.x, p.y, z)


for i in range(9):
    cyl(along(0.03 + i * 0.024), 0.088 if i % 2 == 0 else 0.082, 0.011, "engine", rot=(0, tilt, 0), verts=40)
cyl(along(0.13), 0.062, 0.22, "engine", rot=(0, tilt, 0), verts=32)  # barrel core
box(along(0.28), (0.15, 0.09, 0.19), "engine", rot=(0, tilt, 0), bevel=0.2)  # head
box(along(0.335), (0.17, 0.045, 0.13), "black", rot=(0, tilt, 0), bevel=0.25)  # rocker cover

# exhaust: header, catalytic box, muffler
path_tube(  # matte-black header down the front of the engine, under it and back
    [(0.315, 0.63, 0.065), (0.345, 0.5, 0.115), (0.35, 0.34, 0.15), (0.30, 0.23, 0.17), (0.12, 0.2, 0.18), (-0.1, 0.22, 0.185)],
    0.024,
    "exhaust",
    per=8,
    verts=16,
)
loft(  # short, fat "cannon" muffler tucked under the engine, rising toward the rear
    [
        (-0.10, 0.22, 0.185, 0.04, 0.04, 2),
        (-0.16, 0.232, 0.185, 0.062, 0.062, 2),
        (-0.34, 0.262, 0.185, 0.07, 0.07, 2),
        (-0.50, 0.298, 0.185, 0.068, 0.068, 2),
        (-0.57, 0.318, 0.185, 0.055, 0.055, 2),
    ],
    "exhaust",
    n=40,
    name="muffler",
)
loft(  # lighter heat-guard band along the outer face
    [(-0.18, 0.245, 0.238, 0.045, 0.012, 3), (-0.34, 0.272, 0.253, 0.05, 0.012, 3), (-0.5, 0.305, 0.25, 0.048, 0.012, 3)],
    "engine",
    n=12,
    name="heatguard",
)
fwd_cyl((-0.572, 0.32, 0.185), 0.048, 0.008, "chrome", 28)  # end cap ring
fwd_cyl((-0.578, 0.32, 0.185), 0.036, 0.006, "black", 24)

# chain drive (left side)
fs = (-0.20, 0.30, -0.115)  # engine sprocket
rs = (RX, RR, -0.085)  # rear sprocket
axle_cyl(fs, 0.032, 0.014, "silver", 24)
axle_cyl(rs, 0.075, 0.012, "silver", 40)
cz = -0.1
tube((fs[0], fs[1] + 0.034, cz), (rs[0], rs[1] + 0.077, cz), 0.006, "alloy", 8)
tube((fs[0], fs[1] - 0.034, cz), (rs[0], rs[1] - 0.077, cz), 0.006, "alloy", 8)
tube((-0.2, 0.34, -0.122), (RX + 0.02, RR + 0.05, -0.122), 0.006, "black", 8)  # chain guard hint

# rear brake caliper + pegs + levers + stand
box((RX + 0.09, RR - 0.05, 0.068), (0.07, 0.05, 0.035), "black")
for s in (-1, 1):
    tube((-0.02, 0.29, s * 0.10), (-0.02, 0.29, s * 0.235), 0.011, "black", 10)  # rider pegs
    tube((-0.02, 0.29, s * 0.235), (-0.02, 0.29, s * 0.255), 0.016, "rubber", 12)
    tube((-0.56, 0.33, s * 0.115), (-0.56, 0.33, s * 0.215), 0.01, "black", 10)  # pillion pegs
tube((0.02, 0.27, 0.13), (0.10, 0.27, 0.225), 0.008, "chrome", 8)  # brake pedal
box((0.105, 0.27, 0.24), (0.06, 0.012, 0.04), "rubber", bevel=0.2)
tube((0.10, 0.31, -0.115), (0.19, 0.31, -0.215), 0.008, "chrome", 8)  # gear lever
tube((0.0, 0.285, -0.125), (0.055, 0.075, -0.2), 0.009, "black", 10)  # side stand
box((0.06, 0.06, -0.205), (0.07, 0.02, 0.04), "rubber", bevel=0.2)

# ----------------------------------------------------------------------------
# join by material, then preview + export
# ----------------------------------------------------------------------------
by_mat = {}
for obj, mat in created:
    by_mat.setdefault(mat, []).append(obj)

bpy.ops.object.select_all(action="DESELECT")
for mat, objs in by_mat.items():
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    active().name = f"hunter_{mat}"
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38))  # smooth curves, keep hard edges
    bpy.ops.object.select_all(action="DESELECT")

if PREVIEW:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    world = bpy.data.worlds.new("w")
    world.color = (0.02, 0.02, 0.025)
    scene.world = world
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 60
    scene.collection.objects.link(cam)
    scene.camera = cam
    views = {
        "side": ((0, 0.5, 4.4), (0, 0.5, 0)),
        "sideL": ((0, 0.5, -4.4), (0, 0.5, 0)),
        "front34": ((3.0, 1.2, 3.2), (0, 0.5, 0)),
        "rear34": ((-3.0, 1.2, 3.2), (0, 0.5, 0)),
        "engine": ((1.3, 0.55, 1.6), (0.05, 0.42, 0.05)),
        "wheel": ((0.9, 0.32, 1.3), (0.685, 0.3, 0.0)),
    }
    for name, (pos, tgt) in views.items():
        cam.location = P(*pos)
        cam.rotation_euler = (P(*tgt) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = f"{PREVIEW}_{name}.png"
        bpy.ops.render.render(write_still=True)

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    use_selection=False,
    export_cameras=False,
    export_lights=False,
)
print("EXPORTED", OUT)
