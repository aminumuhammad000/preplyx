import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PRE = os.path.join(ROOT, 'previews')

expressions = [
    'neutral', 'happy', 'very_happy', 'sad',
    'angry', 'surprised', 'confused', 'worried',
    'shy', 'sleepy', 'thinking', 'excited',
    'laughing', 'crying', 'proud', 'wink'
]

cols = 4
rows = 4
tile_w, tile_h = 480, 480
header_h = 32
margin = 8

sheet_w = cols * (tile_w + margin) + margin
sheet_h = rows * (tile_h + header_h + margin) + margin

sheet = Image.new('RGBA', (sheet_w, sheet_h), (24, 26, 32, 255))
draw = ImageDraw.Draw(sheet)

for idx, label in enumerate(expressions):
    c = idx % cols
    r = idx // cols
    x = margin + c * (tile_w + margin)
    y = margin + r * (tile_h + header_h + margin)
    
    img_path = os.path.join(PRE, f'swa_expression_{label}.png')
    if os.path.exists(img_path):
        img = Image.open(img_path).convert('RGBA')
        # paste image
        sheet.paste(img, (x, y + header_h), img)
    
    # draw label
    label_text = label.upper().replace('_', ' ')
    draw.text((x + 10, y + 8), label_text, fill=(230, 235, 245, 255))

out_path = os.path.join(PRE, 'swa_expression_contact_sheet.png')
sheet.save(out_path)
print("CONTACT_SHEET_CREATED", out_path)
