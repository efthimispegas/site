"""Author model marking textures; never open or edit the accepted image."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / '../../../review/fonts'
OUT = ROOT / 'markings'
OUT.mkdir(exist_ok=True)
CARBON, SILVER, BLUE, YELLOW = '#11151B', '#DCE3EA', '#147DFF', '#F2C230'
records = []

def font(size, mono=False):
    return ImageFont.truetype(str(FONTS / ('ibmplexmono.ttf' if mono else 'manrope.ttf')), size)

def save(name, image, purpose):
    image.save(OUT / (name + '.png'))
    (OUT / (name + '.rgba')).write_bytes(image.tobytes())
    records.append(dict(name=name, width=image.width, height=image.height, purpose=purpose))

im = Image.new('RGBA', (256, 256), YELLOW)
d = ImageDraw.Draw(im)
for x in range(-512, 512, 64):
    d.polygon([(x,0),(x+32,0),(x+288,256),(x+256,256)], fill=CARBON)
save('corner-warning', im, 'Diagonal yellow/carbon safety paint on both top front castings; apertures remain open.')

im = Image.new('RGBA', (512, 512), SILVER)
d = ImageDraw.Draw(im)
d.polygon([(256,35),(475,441),(37,441)], fill=CARBON)
d.polygon([(256,73),(437,420),(75,420)], fill=YELLOW)
d.rounded_rectangle((239,177,273,318), radius=10, fill=CARBON)
d.ellipse((237,345,275,383), fill=CARBON)
save('caution', im, 'Left-door caution symbol.')

im = Image.new('RGBA', (256, 256), BLUE)
d = ImageDraw.Draw(im)
d.rectangle((8,8,248,248), outline=SILVER, width=7)
d.ellipse((107,38,149,80), fill=SILVER)
d.rounded_rectangle((117,98,139,210), radius=4, fill=SILVER)
d.line((96,209,160,209), fill=SILVER, width=14)
save('information', im, 'Left-door blue information sticker.')

im = Image.new('RGBA', (1024, 640), CARBON)
d = ImageDraw.Draw(im)
d.rectangle((18,18,1006,622), outline=SILVER, width=3)
d.text((58,54), 'PEGASOFT', font=font(102), fill=SILVER)
d.text((60,196), 'C01 / CONCEPT ASSET', font=font(55, True), fill=SILVER)
for x in range(62, 964, 14):
    d.rectangle((x,304,x+4+(x//14)%3*2,465), fill=SILVER)
d.text((60,514), 'VISUAL DEMO', font=font(57, True), fill=SILVER)
save('asset-sticker', im, 'Left-door demo asset sticker; decorative bars are not a shipping identifier.')

im = Image.new('RGBA', (768, 1280), SILVER)
d = ImageDraw.Draw(im)
d.rectangle((15,15,753,1265), outline=CARBON, width=4)
d.text((54,57), 'PEGASOFT', font=font(99), fill=CARBON)
d.text((58,202), 'C01', font=font(130, True), fill=CARBON)
d.text((58,407), "40' HIGH CUBE", font=font(72, True), fill=CARBON)
d.line((58,523,710,523), fill=CARBON, width=4)
for i, text in enumerate(['L  12.192 M','W   2.438 M','H   2.896 M']):
    d.text((58,589+i*140), text, font=font(77, True), fill=CARBON)
d.line((58,1045,710,1045), fill=CARBON, width=4)
d.text((58,1120), 'VISUAL DEMO', font=font(65, True), fill=CARBON)
save('door-data', im, 'Right-door identity/type and agreed external dimensions; no registration or load-weight claims.')

(OUT / 'manifest.json').write_text(json.dumps(dict(status='authored_external_model_markings', textures=records, colors=dict(carbon=CARBON, silver=SILVER, blue=BLUE, safety_yellow=YELLOW), source='build-markings.py; local fonts retained in review/fonts', accepted_image_modified=False), indent=2) + '\n')
print(json.dumps(dict(textures=len(records), output=str(OUT))))
