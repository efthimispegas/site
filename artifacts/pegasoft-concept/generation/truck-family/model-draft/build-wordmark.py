from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
font_path=root/'../../../review/fonts/manrope.ttf'
image=Image.new('RGBA',(1024,256),(0,0,0,0))
draw=ImageDraw.Draw(image)
for text,size,y in [('PEGASOFT',126,30),('Solutions',66,163)]:
 font=ImageFont.truetype(str(font_path),size)
 if hasattr(font,'set_variation_by_axes'):
  axes=font.get_variation_axes();font.set_variation_by_axes([650 if a['name']==b'Weight' else a['default'] for a in axes])
 draw.text((512,y),text,font=font,anchor='mt',fill='#B9E7FF')
image.save(root/'wordmark.png')
(root/'wordmark.rgba').write_bytes(image.tobytes())
