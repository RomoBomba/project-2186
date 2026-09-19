"""Author-approved local eye correction. Pillow; no runtime dependency.
Neutral is the registration master. Only blink/thinking/transmit-a are written.
The generated source supplies relaxed lids, never the surrounding face.
"""
from pathlib import Path
from math import floor
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'src/assets/portraits/aura'
neutral = Image.open(ASSETS / 'neutral.png').convert('RGB')
lids = Image.open(Path(__file__).parent / 'aura-sources/relaxed-blink-source.png').convert('RGB').resize(neutral.size, Image.Resampling.LANCZOS)
blink = neutral.copy()
# Feather only the patch perimeter; brows and cheeks remain untouched.
for left, top, right, bottom in [(49, 59, 69, 70), (77, 58, 96, 70)]:
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            w = min(1, (x-left)/2, (right-x)/2, (y-top)/2, (bottom-y)/2)
            a, b = neutral.getpixel((x,y)), lids.getpixel((x,y))
            blink.putpixel((x,y), tuple(round(v*(1-w)+u*w) for v,u in zip(a,b)))
blink.save(ASSETS / 'blink.png')

def sample(x,y):
    ix,iy = floor(x),floor(y)
    fx,fy = x-ix,y-iy
    a,b,c,d = [neutral.getpixel(p) for p in [(ix,iy),(ix+1,iy),(ix,iy+1),(ix+1,iy+1)]]
    return tuple(round((1-fy)*((1-fx)*a[k]+fx*b[k])+fy*((1-fx)*c[k]+fx*d[k])) for k in range(3))

thinking = neutral.copy()
# Crisp one-source-pixel lateral iris shift, identical in both eyes.
# No fractional resampling: preserves indexed/dithered detail without blur.
# Upper/lower lid rows and eye corners remain the neutral master.
for left, top, right, bottom in [(52,62,66,68), (80,61,92,68)]:
    for y in range(top+1,bottom):
        for x in range(left+1,right):
            thinking.putpixel((x,y), neutral.getpixel((x-1,y)))
thinking.save(ASSETS / 'thinking.png')
transmit = neutral.copy()
for left, top, right, bottom in [(52,62,66,68), (80,61,92,68)]:
    for y in range(top+1,bottom):
        for x in range(left+1,right):
            w = min(1, (x-left)/2, (right-x)/2, (y-top)/1.5, (bottom-y)/1.5)
            transmit.putpixel((x,y), sample(x+.8*w,y))
transmit.save(ASSETS / 'transmit-a.png')
for name,im in [('blink',blink),('thinking',thinking)]:
    print(name, ImageChops.difference(neutral,im).getbbox())
