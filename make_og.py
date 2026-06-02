# OG görseli: SVG -> PNG (1200x630), gece teması
svg = '''<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="bg" cx="50%" cy="30%" r="80%">
<stop offset="0%" stop-color="#1a2147"/><stop offset="60%" stop-color="#121732"/><stop offset="100%" stop-color="#0a0e1f"/>
</radialGradient>
<linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#e9d8ff"/><stop offset="1" stop-color="#8b7bd8"/>
</linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="180" cy="120" r="2" fill="#fff" opacity="0.7"/>
<circle cx="320" cy="80" r="1.5" fill="#d6c8f7" opacity="0.6"/>
<circle cx="1000" cy="150" r="2" fill="#fff" opacity="0.5"/>
<circle cx="1080" cy="90" r="1.5" fill="#b69cf0" opacity="0.6"/>
<circle cx="900" cy="500" r="2" fill="#fff" opacity="0.4"/>
<circle cx="250" cy="520" r="1.5" fill="#d6c8f7" opacity="0.5"/>
<path d="M640 200a70 70 0 1 0 28 99 56 56 0 0 1-28-99Z" fill="url(#m)"/>
<path d="M656 188l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#f4ecff"/>
<text x="600" y="400" font-family="Georgia,serif" font-size="68" font-weight="700" fill="#f4ecff" text-anchor="middle">Rüya Tabirim</text>
<text x="600" y="460" font-family="Georgia,serif" font-style="italic" font-size="34" fill="#d6c8f7" text-anchor="middle">Rüyanı anlat, anlamını keşfet</text>
<text x="600" y="540" font-family="sans-serif" font-size="24" fill="#aeb2cf" text-anchor="middle">Geleneksel tabir + psikolojik yorum · 526 sembollük rüya sözlüğü</text>
</svg>'''
open('/tmp/og.svg','w').write(svg)
print("svg hazir")
