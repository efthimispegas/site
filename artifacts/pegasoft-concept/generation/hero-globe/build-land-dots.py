"""Derive equal-distance geographic dots from the pinned local Natural Earth file.

No network, executable provider output or copied reference globe textures.
Run here with Python 3; re-pin derived_sha256 if sampling inputs change.
"""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / "ne_110m_land.geojson").read_text())
polygons = []
for feature in data["features"]:
    geometry = feature["geometry"]
    arrays = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    for rings in arrays:
        shell = rings[0]
        xs, ys = [p[0] for p in shell], [p[1] for p in shell]
        polygons.append((min(xs), max(xs), min(ys), max(ys), rings))


def inside(x, y, ring):
    hit = False
    previous = ring[-1]
    for point in ring:
        x1, y1 = previous
        x2, y2 = point
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
        previous = point
    return hit


def is_land(x, y):
    return any(a <= x <= b and c <= y <= d and inside(x, y, rings[0])
               and not any(inside(x, y, hole) for hole in rings[1:])
               for a, b, c, d, rings in polygons)


points = []
for row in range(105):
    latitude = -88 + row * 1.7
    step = 1.7 / max(.05, math.cos(math.radians(latitude)))
    count = round(360 / step)
    for column in range(count):
        longitude = -180 + (column + .5 * (row % 2)) * 360 / count
        if is_land(longitude, latitude):
            points.extend([round(longitude, 4), round(latitude, 4)])
(ROOT / "land-dots.json").write_text(json.dumps(
    {"spacing_degrees": 1.7, "land_lon_lat": points}, separators=(",", ":")))
print(f"Derived {len(points) // 2} land dots from the pinned local polygons.")
