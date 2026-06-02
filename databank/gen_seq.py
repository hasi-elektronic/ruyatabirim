#!/usr/bin/env python3
# Sıralı + dayanıklı. Argüman: işlenecek max sembol sayısı (parça parça çalıştırmak için)
import json, urllib.request, time, sys

API = 'https://ruyatabirim-api.hguencavdi.workers.dev/api/admin/generate'
DICT = 'https://ruyatabirim-api.hguencavdi.workers.dev/api/dictionary'
ADMIN = 'Ruya@2026Admin'
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 60

def slugify(s):
    tr={'ç':'c','ş':'s','ı':'i','ö':'o','ü':'u','ğ':'g','İ':'i','Ç':'c','Ş':'s','Ö':'o','Ü':'u','Ğ':'g'}
    s=s.lower().strip(); out=''
    for ch in s:
        if ch in tr: out+=tr[ch]
        elif ch==' ': out+='-'
        elif ch.isalnum() or ch=='-': out+=ch
    while '--' in out: out=out.replace('--','-')
    return out.strip('-')

def get_existing():
    for _ in range(5):
        try:
            r=urllib.request.urlopen(DICT, timeout=20)
            return {row['slug'] for row in json.loads(r.read())}
        except Exception:
            time.sleep(8)
    return set()

existing = get_existing()
print(f'DB mevcut: {len(existing)}')

todo=[]; seen=set()
with open('symbols.txt') as f:
    for line in f:
        line=line.strip()
        if not line or line.startswith('#'): continue
        slug=slugify(line)
        if slug and slug not in seen:
            seen.add(slug)
            if slug not in existing: todo.append((line,slug))

print(f'Toplam eksik: {len(todo)} | bu calismada en fazla: {BATCH}')
todo = todo[:BATCH]

ok=err=0
for i,(kw,slug) in enumerate(todo,1):
    payload=json.dumps({'keyword':kw,'slug':slug}).encode()
    req=urllib.request.Request(API,data=payload,
        headers={'Authorization':'Bearer '+ADMIN,'Content-Type':'application/json'},method='POST')
    success=False
    for attempt in range(4):
        try:
            r=urllib.request.urlopen(req,timeout=90)
            res=json.loads(r.read())
            if res.get('ok') or res.get('skipped'): ok+=1; success=True; break
            print(f'  ! {slug}: {str(res)[:70]}'); break
        except urllib.error.HTTPError as e:
            if e.code==403:
                time.sleep(8+attempt*7); continue
            print(f'  ! {slug}: HTTP{e.code}'); break
        except Exception as e:
            time.sleep(4); continue
    if not success and attempt==3: err+=1; print(f'  !! {slug}: vazgecildi')
    if i%20==0 or i==len(todo): print(f'  [{i}/{len(todo)}] ok={ok} err={err}', flush=True)
    time.sleep(0.4)  # nazik aralık

print(f'BITTI: ok={ok} err={err}')
