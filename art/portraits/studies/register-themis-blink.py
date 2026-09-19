"""Build the registered THEMIS blink from neutral and generated eyelids.

Authoring-only Pillow utility. Neutral owns every pixel outside the two compact
eye patches, so the frame cannot move the face, shoulders, crop or background.
"""

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / "src/assets/portraits/themis"
SOURCE = Path(__file__).parent / "themis-sources/blink-generated.png"

neutral = Image.open(ASSETS / "neutral.png").convert("RGB")
generated = Image.open(SOURCE).convert("RGB").resize(
    neutral.size, Image.Resampling.LANCZOS
)
blink = neutral.copy()

# The source supplies only relaxed closed eyelids. Patch edges taper into the
# neutral master; eyebrows, cheeks and outer eye corners remain neutral.
for left, top, right, bottom in [(43, 61, 69, 73), (75, 60, 101, 73)]:
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            weight = min(
                1,
                (x - left) / 2,
                (right - x) / 2,
                (y - top) / 2,
                (bottom - y) / 2,
            )
            base = neutral.getpixel((x, y))
            lid = generated.getpixel((x, y))
            blink.putpixel(
                (x, y),
                tuple(
                    round(base[channel] * (1 - weight) + lid[channel] * weight)
                    for channel in range(3)
                ),
            )

blink.save(ASSETS / "blink.png")
print("blink", blink.size, ImageChops.difference(neutral, blink).getbbox())
