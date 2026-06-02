#!/usr/bin/env python3
import json, urllib.request, time, sys

API = 'https://ruyatabirim-api.hguencavdi.workers.dev/api/admin/generate'
ADMIN = 'Ruya@2026Admin'

def slugify(s):
    tr = {'ç':'c','ş':'s','ı':'i','ö':'o','ü':'u','ğ':'g','İ':'i','Ç':'c','Ş':'s','Ö':'o','Ü':'u','Ğ':'g'}
    s = s.lower().strip()
    out = ''
    for ch in s:
        if ch in tr: out += tr[ch]
        elif ch == ' ': out += '-'
        elif ch.isalnum() or ch == '-': out += ch
    while '--' in out: out = out.replace('--','-')
    return out.strip('-')

# Sembolleri oku
symbols = []
seen = set()
with open('symbols.txt') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        slug = slugify(line)
        if slug and slug not in seen:
            seen.add(slug)
            symbols.append((line, slug))

print(f'Toplam {len(symbols)} sembol islenecek')

ok, skip, err = 0, 0, 0
errors = []
for i, (kw, slug) in enumerate(symbols, 1):
    payload = json.dumps({'keyword': kw, 'slug': slug}).encode()
    req = urllib.request.Request(API, data=payload,
        headers={'Authorization': 'Bearer '+ADMIN, 'Content-Type':'application/json'}, method='POST')
    try:
        r = urllib.request.urlopen(req, timeout=60)
        res = json.loads(r.read())
        if res.get('skipped'): skip += 1
        elif res.get('ok'): ok += 1
        else: err += 1; errors.append((slug, str(res)[:80]))
    except Exception as e:
        err += 1; errors.append((slug, str(e)[:80]))
        time.sleep(2)  # hata olursa biraz bekle
    if i % 25 == 0 or i == len(symbols):
        print(f'  [{i}/{len(symbols)}] ok={ok} skip={skip} err={err}')
    sys.stdout.flush()

print(f'\nBITTI: yeni={ok} atlandi={skip} hata={err}')
if errors:
    print('Hatalar (ilk 15):')
    for s, e in errors[:15]: print(f'  {s}: {e}')
