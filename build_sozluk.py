#!/usr/bin/env python3
import json, os, html

rows = json.load(open('databank/dict_full.json'))
OUT = 'public/sozluk'
os.makedirs(OUT, exist_ok=True)
BASE = 'https://ruyatabirim.pages.dev'

def esc(s): return html.escape(s or '')

TPL = '''<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rüyada {kw_cap} Görmek — Tabiri ve Anlamı | Rüya Tabirim</title>
<meta name="description" content="Rüyada {kw} görmek ne anlama gelir? {desc_short} Hem geleneksel tabir hem psikolojik yorum.">
<link rel="canonical" href="{base}/sozluk/{slug}">
<meta property="og:type" content="article">
<meta property="og:title" content="Rüyada {kw_cap} Görmek — Tabiri ve Anlamı">
<meta property="og:description" content="{desc_short}">
<meta property="og:locale" content="tr_TR">
<meta property="og:url" content="{base}/sozluk/{slug}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"Article","headline":"Rüyada {kw_cap} Görmek — Tabiri ve Anlamı","inLanguage":"tr-TR","mainEntityOfPage":"{base}/sozluk/{slug}","publisher":{{"@type":"Organization","name":"Rüya Tabirim"}}}}
</script>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header>
  <div class="container-wide nav">
    <a class="logo" href="/"><img src="/logo.svg" alt=""> Rüya Tabirim</a>
    <button class="nav-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
    <nav class="nav-links">
      <a href="/">Yorumla</a>
      <a href="/sozluk/">Sözlük</a>
      <a href="/#/topluluk">Topluluk</a>
      <a href="/#/giris">Giriş</a>
    </nav>
  </div>
</header>
<main>
  <div class="container block">
    <a href="/sozluk/" style="font-size:14px">← Rüya Sözlüğü</a>
    <h2 style="margin-top:14px;text-transform:capitalize">Rüyada {kw_cap} Görmek</h2>
    <p class="sub">Geleneksel tabir ve psikolojik bakış açısıyla.</p>
    <div class="result">
      <h3 style="color:var(--lav-soft);margin-bottom:8px">📜 Geleneksel Tabir</h3>
      <div class="result-text">{classic}</div>
      {psy_block}
      <div class="result-actions">
        <a class="btn" href="/">Kendi Rüyanı Yorumlat</a>
        <a class="btn btn-ghost" href="/sozluk/">Tüm Semboller</a>
      </div>
    </div>
  </div>
</main>
<footer>
  <div class="container-wide">
    <div class="fcols">
      <div><div class="fbrand"><img src="/logo.svg" alt=""> Rüya Tabirim</div><div>Rüyanı anlat, anlamını keşfet.</div></div>
      <div><a href="/sozluk/">Rüya Sözlüğü</a><br><a href="/#/topluluk">Topluluk</a><br><a href="/#/gizlilik">Gizlilik & KVKK</a></div>
    </div>
    <div class="disclaimer">Bu sitedeki rüya yorumları eğlence ve kişisel farkındalık amaçlıdır; tıbbi, psikolojik veya finansal tavsiye niteliği taşımaz. © 2026 Rüya Tabirim · Hasi Elektronic</div>
  </div>
</footer>
</body>
</html>'''

for r in rows:
    kw = r['keyword']
    slug = r['slug']
    classic = r['classic_meaning'] or ''
    psy = r['psychological_meaning'] or ''
    desc_short = (classic[:120] + '...') if len(classic) > 120 else classic
    psy_block = ''
    if psy:
        psy_block = f'<h3 style="color:var(--lav-soft);margin:22px 0 8px">🧠 Psikolojik Bakış</h3><div class="result-text">{esc(psy)}</div>'
    page = TPL.format(
        kw=esc(kw), kw_cap=esc(kw.capitalize()), slug=slug, base=BASE,
        classic=esc(classic), psy_block=psy_block, desc_short=esc(desc_short)
    )
    d = os.path.join(OUT, slug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w') as f:
        f.write(page)

print(f'{len(rows)} sözlük sayfası üretildi -> {OUT}/<slug>/index.html')
