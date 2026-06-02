#!/usr/bin/env python3
import json, urllib.request, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

API = 'https://ruyatabirim-api.hguencavdi.workers.dev/api/admin/generate'
DICT = 'https://ruyatabirim-api.hguencavdi.workers.dev/api/dictionary'
ADMIN = 'Ruya@2026Admin'

def slugify(s):
    tr = {'ç':'c','ş':'s','ı':'i','ö':'o','ü':'u','ğ':'g','İ':'i','Ç':'c','Ş':'s','Ö':'o','Ü':'u','Ğ':'g'}
    s = s.lower().strip(); out = ''
    for ch in s:
        if ch in tr: out += tr[ch]
        elif ch == ' ': out += '-'
        elif ch.isalnum() or ch == '-': out += ch
    while '--' in out: out = out.replace('--','-')
    return out.strip('-')

# Mevcut sluglar
existing = set()
try:
    r = urllib.request.urlopen(DICT, timeout=30)
    for row in json.loads(r.read()): existing.add(row['slug'])
except Exception as e:
    print('dict fetch fail:', e)
print(f'DB de mevcut: {len(existing)}')

# Sembolleri oku, eksikleri bul
todo = []; seen = set()
with open('symbols.txt') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        slug = slugify(line)
        if slug and slug not in seen:
            seen.add(slug)
            if slug not in existing: todo.append((line, slug))
print(f'Uretilecek (eksik): {len(todo)}')

import time, random
def gen(item):
    kw, slug = item
    time.sleep(random.uniform(0, 1.5))  # jitter, eşzamanlı dalgayı kır
    payload = json.dumps({'keyword': kw, 'slug': slug}).encode()
    req = urllib.request.Request(API, data=payload,
        headers={'Authorization': 'Bearer '+ADMIN, 'Content-Type':'application/json'}, method='POST')
    for attempt in range(3):
        try:
            r = urllib.request.urlopen(req, timeout=90)
            res = json.loads(r.read())
            if res.get('ok'): return ('ok', slug)
            if res.get('skipped'): return ('skip', slug)
            return ('err', slug + ':' + str(res)[:60])
        except urllib.error.HTTPError as e:
            if e.code == 403:
                time.sleep(5 + attempt*5)  # blok: bekle, retry
                continue
            return ('err', slug + ':' + str(e)[:50])
        except Exception as e:
            time.sleep(3); continue
    return ('err', slug + ':retry-exhausted')

ok=skip=err=0; errlist=[]
# 2 paralel worker (CF bot korumasına takılmamak için nazik)
with ThreadPoolExecutor(max_workers=2) as ex:
    futures = {ex.submit(gen, it): it for it in todo}
    done = 0
    for fut in as_completed(futures):
        st, info = fut.result()
        if st=='ok': ok+=1
        elif st=='skip': skip+=1
        else: err+=1; errlist.append(info)
        done += 1
        if done % 25 == 0 or done == len(todo):
            print(f'  [{done}/{len(todo)}] ok={ok} skip={skip} err={err}'); sys.stdout.flush()

print(f'\nBITTI: yeni={ok} atlandi={skip} hata={err}')
for e in errlist[:20]: print('  ', e)
