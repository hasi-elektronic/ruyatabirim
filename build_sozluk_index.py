#!/usr/bin/env python3
import json, html

rows = json.load(open('databank/dict_cat.json'))
esc = lambda s: html.escape(s or '')

CAT_LABELS = {
  'su-ve-doga':'🌊 Su & Doğa','hayvanlar':'🐾 Hayvanlar','insan-ve-vucut':'🧍 İnsan & Vücut',
  'para-esya':'💰 Para & Eşya','mekan':'🏛️ Mekanlar','aile-iliski':'👨‍👩‍👧 Aile & İlişki',
  'yiyecek':'🍞 Yiyecek','din-maneviyat':'🕌 Din & Maneviyat','korku-olaganustu':'😨 Korku & Olağandışı',
  'duygu-durum':'💭 Duygu & Durum','giyim':'👗 Giyim','diger':'✨ Diğer'
}

# Kategori sayıları
cats = {}
for r in rows:
    cats[r['category']] = cats.get(r['category'], 0) + 1

# Kategori butonları (sayıya göre sıralı)
cat_btns = '<button class="cat-btn active" data-c="all">Tümü ('+str(len(rows))+')</button>'
for c, n in sorted(cats.items(), key=lambda x:-x[1]):
    label = CAT_LABELS.get(c, c)
    cat_btns += f'<button class="cat-btn" data-c="{c}">{label} ({n})</button>'

# Kelime kartları (data-cat ile)
cards = ''.join(
    f'<a class="card" data-cat="{r["category"]}" href="/sozluk/{r["slug"]}/"><h3>{esc(r["keyword"])}</h3></a>'
    for r in rows
)

page = f'''<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rüya Sözlüğü — {len(rows)} Sembol ve Anlamı | Rüya Tabirim</title>
<meta name="description" content="Rüya sözlüğü: su, yılan, diş, para ve yüzlerce rüya sembolünün geleneksel ve psikolojik anlamı. Kategorilere göre {len(rows)} rüya tabiri.">
<link rel="canonical" href="https://ruyatabirim.pages.dev/sozluk">
<meta property="og:title" content="Rüya Sözlüğü — {len(rows)} Sembol ve Anlamı">
<meta property="og:description" content="Yüzlerce rüya sembolünün geleneksel ve psikolojik anlamı.">
<meta property="og:locale" content="tr_TR">
<meta property="og:image" content="https://ruyatabirim.pages.dev/og.png">
<link rel="stylesheet" href="/style.css">
<style>
.cat-bar{{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}}
.cat-btn{{padding:8px 15px;border-radius:30px;background:rgba(182,156,240,.08);color:var(--text-soft);border:1px solid var(--border-soft);cursor:pointer;font-size:13.5px;font-family:var(--sans);transition:.2s}}
.cat-btn:hover{{background:rgba(182,156,240,.16);color:var(--moon)}}
.cat-btn.active{{background:rgba(182,156,240,.22);color:var(--moon);border-color:var(--border)}}
</style>
</head>
<body>
<header><div class="container-wide nav">
<a class="logo" href="/"><img src="/logo.svg" alt=""> Rüya Tabirim</a>
<button class="nav-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
<nav class="nav-links"><a href="/">Yorumla</a><a href="/sozluk/">Sözlük</a><a href="/#/topluluk">Topluluk</a><a href="/#/giris">Giriş</a></nav>
</div></header>
<main><div class="container block">
<h2>Rüya Sözlüğü</h2>
<p class="sub">{len(rows)} sembolün geleneksel ve psikolojik anlamı. Kategori seç veya ara.</p>
<input id="q" placeholder="Kelime ara..." style="width:100%;background:rgba(10,14,31,.5);border:1px solid var(--border);border-radius:12px;padding:13px;margin-bottom:18px;font-size:15px;color:var(--text);font-family:var(--sans)">
<div class="cat-bar" id="catBar">{cat_btns}</div>
<div class="grid" id="g">{cards}</div>
<p id="noRes" class="sub hidden">Sonuç bulunamadı.</p>
</div></main>
<footer><div class="container-wide"><div class="fcols">
<div><div class="fbrand"><img src="/logo.svg" alt=""> Rüya Tabirim</div><div>Rüyanı anlat, anlamını keşfet.</div></div>
<div><a href="/sozluk/">Rüya Sözlüğü</a><br><a href="/#/topluluk">Topluluk</a><br><a href="/#/gizlilik">Gizlilik & KVKK</a></div>
</div><div class="disclaimer">Bu sitedeki rüya yorumları eğlence ve kişisel farkındalık amaçlıdır. © 2026 Rüya Tabirim · Hasi Elektronic</div></div></footer>
<script>
var curCat='all';
function applyFilter(){{
  var q=document.getElementById('q').value.toLocaleLowerCase('tr-TR');
  var shown=0;
  document.querySelectorAll('#g .card').forEach(function(c){{
    var t=c.querySelector('h3').textContent.toLocaleLowerCase('tr-TR');
    var okCat=(curCat==='all'||c.dataset.cat===curCat);
    var okQ=t.indexOf(q)>-1;
    var vis=okCat&&okQ;
    c.style.display=vis?'':'none';
    if(vis)shown++;
  }});
  document.getElementById('noRes').classList.toggle('hidden',shown>0);
}}
document.getElementById('q').oninput=applyFilter;
document.querySelectorAll('.cat-btn').forEach(function(b){{
  b.onclick=function(){{
    document.querySelectorAll('.cat-btn').forEach(function(x){{x.classList.remove('active')}});
    b.classList.add('active');curCat=b.dataset.c;applyFilter();
  }};
}});
</script>
</body></html>'''

open('public/sozluk/index.html', 'w').write(page)
print(f'Kategori filtreli sözlük index hazır ({len(rows)} kelime, {len(cats)} kategori)')
