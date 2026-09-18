"""Build registered AURA micro-expressions from neutral; requires Pillow.
Only interior iris pixels and (for B) the closed mouth corners are resampled.
Eyelid contours, eye aperture, silhouette and all other pixels remain neutral.
Blink is approved independently and is never rewritten here.
"""
from pathlib import Path
from math import floor, sin, pi
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'src/assets/portraits/aura'
neutral = Image.open(ASSETS / 'neutral.png').convert('RGB')

def sample(x, y):
    ix, iy = floor(x), floor(y)
    fx, fy = x-ix, y-iy
    pixels = [neutral.getpixel((ix,iy)), neutral.getpixel((ix+1,iy)),
              neutral.getpixel((ix,iy+1)), neutral.getpixel((ix+1,iy+1))]
    return tuple(round((1-fy)*((1-fx)*pixels[0][c]+fx*pixels[1][c]) +
                       fy*((1-fx)*pixels[2][c]+fx*pixels[3][c])) for c in range(3))

def displace(result, bounds, dx, dy):
    left, top, right, bottom = bounds
    for y in range(top+1, bottom):
        for x in range(left+1, right):
            # Zero displacement on all boundaries. No second superimposed eye.
            weight = sin(pi*(x-left)/(right-left))*sin(pi*(y-top)/(bottom-top))
            result.putpixel((x,y), sample(x-dx*weight, y-dy*weight))

for state, dx, dy in [('thinking', .85, .3), ('transmit-a', -.4, 0), ('transmit-b', -.15, .1)]:
    result = neutral.copy()
    # Interior of each neutral aperture; lash lines/eye corners are excluded.
    displace(result, (52, 62, 66, 68), dx, dy)
    displace(result, (80, 61, 92, 68), dx, dy)
    if state == 'transmit-b':
        # Subpixel softening at the CLOSED lip corners; no eye/cheek lift.
        displace(result, (61, 90, 67, 97), 0, -.35)
        displace(result, (78, 90, 84, 97), 0, -.25)
    result.save(ASSETS / f'{state}.png')
    print(state, result.size, 'changed bounds:', ImageChops.difference(result, neutral).getbbox())
