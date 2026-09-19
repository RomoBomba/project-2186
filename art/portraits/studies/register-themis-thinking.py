"""Build the registered THEMIS thinking frame from neutral.

Authoring-only Pillow utility. Neutral owns the full frame. The only sampled
pixels are inside both open eye apertures, where the iris texture moves two
source pixels laterally at the centre and tapers to zero at every boundary.
"""

from math import sin, pi
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "src/assets/portraits/themis"

neutral = Image.open(ASSETS / "neutral.png").convert("RGB")
thinking = neutral.copy()


def shift_open_eye(bounds: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = bounds
    for y in range(top + 1, bottom):
        for x in range(left + 1, right):
            horizontal = sin(pi * (x - left) / (right - left))
            vertical = sin(pi * (y - top) / (bottom - top))
            displacement = round(2 * horizontal * vertical)
            thinking.putpixel((x, y), neutral.getpixel((x - displacement, y)))


# Matching vectors in both eyes. Lid contours, aperture edges and corners stay
# byte-identical to neutral, preventing narrowed eyes or a second overlaid gaze.
shift_open_eye((50, 61, 68, 70))
shift_open_eye((78, 60, 96, 69))

thinking.save(ASSETS / "thinking.png")
print(
    "thinking",
    thinking.size,
    "changed bounds:",
    ImageChops.difference(neutral, thinking).getbbox(),
)
