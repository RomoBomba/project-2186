"""Build the registered THEMIS transmit-b frame from neutral.

Authoring-only Pillow utility. It retains transmit-a's direct horizontal
alignment and adds a one-pixel coherent vertical iris adjustment only at the
centre of both open eye apertures. Everything outside the eyes stays neutral.
"""

from math import sin, pi
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "src/assets/portraits/themis"

neutral = Image.open(ASSETS / "neutral.png").convert("RGB")
transmit_b = neutral.copy()


def alternate_open_eye(bounds: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = bounds
    for y in range(top + 1, bottom):
        for x in range(left + 1, right):
            horizontal = sin(pi * (x - left) / (right - left))
            vertical = sin(pi * (y - top) / (bottom - top))
            weight = horizontal * vertical
            dx = round(weight)
            dy = -round(0.7 * weight)
            transmit_b.putpixel((x, y), neutral.getpixel((x + dx, y + dy)))


alternate_open_eye((50, 61, 68, 70))
alternate_open_eye((78, 60, 96, 69))

transmit_b.save(ASSETS / "transmit-b.png")
print(
    "transmit-b",
    transmit_b.size,
    "changed bounds:",
    ImageChops.difference(neutral, transmit_b).getbbox(),
)
