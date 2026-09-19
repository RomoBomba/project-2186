"""Build the registered THEMIS transmit-a frame from neutral.

Authoring-only Pillow utility. Neutral remains the registration master. Both
open-eye interiors move one source pixel toward a direct outward gaze; every
pixel outside the eye apertures remains byte-identical to neutral.
"""

from math import sin, pi
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "src/assets/portraits/themis"

neutral = Image.open(ASSETS / "neutral.png").convert("RGB")
transmit_a = neutral.copy()


def align_open_eye(bounds: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = bounds
    for y in range(top + 1, bottom):
        for x in range(left + 1, right):
            horizontal = sin(pi * (x - left) / (right - left))
            vertical = sin(pi * (y - top) / (bottom - top))
            displacement = round(horizontal * vertical)
            transmit_a.putpixel(
                (x, y), neutral.getpixel((x + displacement, y))
            )


# Opposite the two-pixel thinking vector, but only by one pixel: this brings
# attention back toward the terminal without producing an aggressive stare.
align_open_eye((50, 61, 68, 70))
align_open_eye((78, 60, 96, 69))

transmit_a.save(ASSETS / "transmit-a.png")
print(
    "transmit-a",
    transmit_a.size,
    "changed bounds:",
    ImageChops.difference(neutral, transmit_a).getbbox(),
)
