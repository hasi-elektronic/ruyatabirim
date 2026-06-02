// ruyatabirim Worker — API + sözlük eşleştirme + Claude AI zenginleştirme

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}

function jsonError(message, status = 400) {
  return json({ error: message }, status);
}

// Basit slug + share id üretici
function shareId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// İstemci IP'sini al
function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

// Rate limit: limit aşıldıysa true döner (engelle)
async function isRateLimited(db, key, limit, windowSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare('SELECT count, window_start FROM rate_limits WHERE rl_key=?').bind(key).first();
  if (!row || now - row.window_start >= windowSec) {
    await db.prepare('INSERT INTO rate_limits (rl_key, count, window_start) VALUES (?,1,?) ON CONFLICT(rl_key) DO UPDATE SET count=1, window_start=?')
      .bind(key, now, now).run();
    return false;
  }
  if (row.count >= limit) return true;
  await db.prepare('UPDATE rate_limits SET count=count+1 WHERE rl_key=?').bind(key).run();
  return false;
}

// PBKDF2 şifre
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

// Rüya metninde sözlük kelimelerini ara
async function matchKeywords(db, text) {
  const lower = text.toLocaleLowerCase('tr-TR');
  const { results } = await db.prepare('SELECT keyword, classic_meaning, psychological_meaning FROM dictionary').all();
  const matched = [];
  for (const row of results) {
    const kw = row.keyword.toLocaleLowerCase('tr-TR');
    if (lower.includes(kw)) matched.push(row);
  }
  return matched;
}

// Claude API ile yorum üret (sözlük context'iyle zenginleştir)
async function interpret(env, dreamText, matched) {
  let context = '';
  if (matched.length) {
    context = '\n\nRüyada tespit edilen sembollerin klasik ve psikolojik anlamları (yorumunda bunları doğal şekilde harmanla):\n';
    for (const m of matched) {
      context += `- ${m.keyword}: Klasik: ${m.classic_meaning}`;
      if (m.psychological_meaning) context += ` | Psikolojik: ${m.psychological_meaning}`;
      context += '\n';
    }
  }

  const systemPrompt = `Sen deneyimli, sıcak ve empatik bir rüya yorumcususun. Türkçe yorum yapıyorsun.
Yorumların hem GELENEKSEL (İbn-i Sîrin tabir geleneği) hem de PSİKOLOJİK (Jung, bilinçaltı) bakışı doğal biçimde birleştirir.
Kurallar:
- Kesin hüküm verme; "işaret ediyor olabilir", "yorumlanabilir" gibi yumuşak ifadeler kullan.
- Tıbbi, finansal veya kader hakkında kesin tahmin YAPMA.
- Batıl inanca saplanma ama geleneği saygıyla kullan.
- 2-3 paragraf, akıcı ve kişisel bir dille yaz. Madde işareti kullanma.
- Yorumun sonunda kısa, olumlu ve düşündürücü bir kapanış cümlesi ekle.`;

  const userPrompt = `Kullanıcının rüyası:\n"${dreamText}"${context}\n\nBu rüyayı yukarıdaki kurallara göre yorumla.`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error('AI hatası: ' + t.slice(0, 200));
  }
  const data = await resp.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });

    try {
      // Kategori listesi (sayılarla)
      if (path === '/api/categories' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT category, COUNT(*) c FROM dictionary GROUP BY category ORDER BY c DESC'
        ).all();
        return json(results);
      }

      // Bir kategorideki kelimeler
      if (path.startsWith('/api/category/') && request.method === 'GET') {
        const cat = decodeURIComponent(path.split('/').pop());
        const { results } = await env.DB.prepare(
          'SELECT keyword, slug FROM dictionary WHERE category=? ORDER BY keyword COLLATE NOCASE'
        ).bind(cat).all();
        return json(results);
      }

      // Öne çıkan / popüler semboller (ana sayfa için)
      if (path === '/api/featured' && request.method === 'GET') {
        // En çok görüntülenen + rastgele karışım
        const { results } = await env.DB.prepare(
          'SELECT keyword, slug, views FROM dictionary ORDER BY views DESC, RANDOM() LIMIT 12'
        ).all();
        return json(results);
      }

      // Dinamik sitemap (tüm sözlük sayfaları dahil)
      if (path === '/sitemap.xml' && request.method === 'GET') {
        const base = 'https://ruyatabirim.pages.dev';
        const { results } = await env.DB.prepare('SELECT slug FROM dictionary ORDER BY keyword').all();
        let urls = `<url><loc>${base}/</loc><priority>1.0</priority></url>`;
        urls += `<url><loc>${base}/sozluk</loc><priority>0.8</priority></url>`;
        urls += `<url><loc>${base}/topluluk</loc><priority>0.6</priority></url>`;
        for (const r of results) {
          urls += `<url><loc>${base}/sozluk/${r.slug}</loc><priority>0.7</priority></url>`;
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, { headers: { 'Content-Type': 'application/xml', ...cors() } });
      }

      // Rüya yorumla
      if (path === '/api/interpret' && request.method === 'POST') {
        const ip = clientIp(request);
        if (await isRateLimited(env.DB, 'interpret:' + ip, 10, 3600)) {
          return jsonError('Saatlik yorum limitine ulaştınız. Lütfen biraz sonra tekrar deneyin.', 429);
        }
        const body = await request.json();
        const dreamText = (body.dream || '').trim();
        if (dreamText.length < 10) return jsonError('Lütfen rüyanızı biraz daha detaylı anlatın.');
        if (dreamText.length > 5000) return jsonError('Rüya metni çok uzun (max 5000 karakter).');

        const matched = await matchKeywords(env.DB, dreamText);
        const interpretation = await interpret(env, dreamText, matched);
        const sid = shareId();
        const kwList = matched.map(m => m.keyword).join(',');
        const isPublic = body.is_public ? 1 : 0;
        const userId = body.user_id || null;

        await env.DB.prepare(
          'INSERT INTO dreams (share_id, user_id, dream_text, interpretation, matched_keywords, is_public, created_at) VALUES (?,?,?,?,?,?,unixepoch())'
        ).bind(sid, userId, dreamText, interpretation, kwList, isPublic).run();

        return json({ share_id: sid, interpretation, keywords: matched.map(m => m.keyword) });
      }

      // Tek rüya getir (paylaşım sayfası)
      if (path.startsWith('/api/dream/') && request.method === 'GET') {
        const sid = path.split('/').pop();
        const row = await env.DB.prepare('SELECT share_id, dream_text, interpretation, matched_keywords, is_public, created_at FROM dreams WHERE share_id=?').bind(sid).first();
        if (!row) return jsonError('Rüya bulunamadı.', 404);
        await env.DB.prepare('UPDATE dreams SET views=views+1 WHERE share_id=?').bind(sid).run();
        return json(row);
      }

      // Sözlük listesi (A-Z)
      if (path === '/api/dictionary' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT keyword, slug, views FROM dictionary ORDER BY keyword COLLATE NOCASE').all();
        return json(results);
      }

      // Tek sözlük kelimesi
      if (path.startsWith('/api/dictionary/') && request.method === 'GET') {
        const slug = path.split('/').pop();
        const row = await env.DB.prepare('SELECT keyword, slug, classic_meaning, psychological_meaning, views FROM dictionary WHERE slug=?').bind(slug).first();
        if (!row) return jsonError('Kelime bulunamadı.', 404);
        await env.DB.prepare('UPDATE dictionary SET views=views+1 WHERE slug=?').bind(slug).run();
        return json(row);
      }

      // Topluluk akışı (herkese açık + onaylı)
      if (path === '/api/community' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT share_id, dream_text, interpretation, matched_keywords, views, created_at FROM dreams WHERE is_public=1 AND is_approved=1 ORDER BY created_at DESC LIMIT 30'
        ).all();
        return json(results);
      }

      // Kayıt
      if (path === '/api/register' && request.method === 'POST') {
        if (await isRateLimited(env.DB, 'auth:' + clientIp(request), 8, 3600)) {
          return jsonError('Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.', 429);
        }
        const { email, password } = await request.json();
        if (!email || !password || password.length < 6) return jsonError('Geçerli e-posta ve en az 6 karakterli şifre girin.');
        const exists = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
        if (exists) return jsonError('Bu e-posta zaten kayıtlı.');
        const salt = crypto.randomUUID();
        const hash = await hashPassword(password, salt);
        const res = await env.DB.prepare('INSERT INTO users (email, password_hash, password_salt, created_at) VALUES (?,?,?,unixepoch())').bind(email, hash, salt).run();
        return json({ user_id: res.meta.last_row_id, email });
      }

      // Giriş
      if (path === '/api/login' && request.method === 'POST') {
        if (await isRateLimited(env.DB, 'auth:' + clientIp(request), 8, 3600)) {
          return jsonError('Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.', 429);
        }
        const { email, password } = await request.json();
        const user = await env.DB.prepare('SELECT id, password_hash, password_salt FROM users WHERE email=?').bind(email).first();
        if (!user) return jsonError('E-posta veya şifre hatalı.', 401);
        const hash = await hashPassword(password, user.password_salt);
        if (hash !== user.password_hash) return jsonError('E-posta veya şifre hatalı.', 401);
        return json({ user_id: user.id, email });
      }

      // Kullanıcının geçmiş rüyaları
      if (path === '/api/my-dreams' && request.method === 'GET') {
        const uid = url.searchParams.get('user_id');
        if (!uid) return jsonError('Giriş gerekli.', 401);
        const { results } = await env.DB.prepare(
          'SELECT share_id, dream_text, interpretation, matched_keywords, is_public, views, created_at FROM dreams WHERE user_id=? ORDER BY created_at DESC'
        ).bind(uid).all();
        return json(results);
      }

      // --- ADMIN ---
      if (path.startsWith('/api/admin/')) {
        const auth = request.headers.get('Authorization') || '';
        if (auth !== 'Bearer ' + env.ADMIN_SECRET) return jsonError('Yetkisiz.', 401);

        if (path === '/api/admin/dictionary' && request.method === 'POST') {
          const { keyword, slug, classic_meaning, psychological_meaning } = await request.json();
          await env.DB.prepare('INSERT INTO dictionary (keyword, slug, classic_meaning, psychological_meaning, created_at) VALUES (?,?,?,?,unixepoch())')
            .bind(keyword, slug, classic_meaning, psychological_meaning || '').run();
          return json({ ok: true });
        }
        if (path === '/api/admin/stats' && request.method === 'GET') {
          const dreams = await env.DB.prepare('SELECT COUNT(*) c FROM dreams').first();
          const users = await env.DB.prepare('SELECT COUNT(*) c FROM users').first();
          const dict = await env.DB.prepare('SELECT COUNT(*) c FROM dictionary').first();
          const pub = await env.DB.prepare('SELECT COUNT(*) c FROM dreams WHERE is_public=1').first();
          return json({ dreams: dreams.c, users: users.c, dictionary: dict.c, public_dreams: pub.c });
        }

        // Toplulukta paylaşılan rüyaları listele (moderasyon)
        if (path === '/api/admin/public-dreams' && request.method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT share_id, dream_text, matched_keywords, is_approved, views, created_at FROM dreams WHERE is_public=1 ORDER BY created_at DESC LIMIT 100'
          ).all();
          return json(results);
        }

        // Rüya onayını değiştir veya sil
        if (path === '/api/admin/dream-action' && request.method === 'POST') {
          const { share_id, action } = await request.json();
          if (action === 'delete') {
            await env.DB.prepare('DELETE FROM dreams WHERE share_id=?').bind(share_id).run();
          } else if (action === 'hide') {
            await env.DB.prepare('UPDATE dreams SET is_approved=0 WHERE share_id=?').bind(share_id).run();
          } else if (action === 'approve') {
            await env.DB.prepare('UPDATE dreams SET is_approved=1 WHERE share_id=?').bind(share_id).run();
          }
          return json({ ok: true });
        }

        // Sözlük: güncelle veya sil
        if (path === '/api/admin/dictionary-edit' && request.method === 'POST') {
          const { slug, classic_meaning, psychological_meaning, action } = await request.json();
          if (action === 'delete') {
            await env.DB.prepare('DELETE FROM dictionary WHERE slug=?').bind(slug).run();
          } else {
            await env.DB.prepare('UPDATE dictionary SET classic_meaning=?, psychological_meaning=? WHERE slug=?')
              .bind(classic_meaning, psychological_meaning || '', slug).run();
          }
          return json({ ok: true });
        }

        // Tek sözlük detayı (admin - düzenleme için)
        if (path === '/api/admin/dict-detail' && request.method === 'GET') {
          const slug = url.searchParams.get('slug');
          const row = await env.DB.prepare('SELECT keyword, slug, classic_meaning, psychological_meaning FROM dictionary WHERE slug=?').bind(slug).first();
          return json(row || { error: 'yok' });
        }
      }

      return jsonError('Endpoint bulunamadı.', 404);
    } catch (err) {
      return jsonError('Sunucu hatası: ' + err.message, 500);
    }
  },
};
