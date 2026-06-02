const API = 'https://ruyatabirim-api.hguencavdi.workers.dev';

// Oturum: token tabanlı (sessionStorage)
const session = {
  get userId(){ return sessionStorage.getItem('rt_uid'); },
  get email(){ return sessionStorage.getItem('rt_email'); },
  get token(){ return sessionStorage.getItem('rt_token'); },
  set(uid,email,token){ sessionStorage.setItem('rt_uid',uid); sessionStorage.setItem('rt_email',email); if(token) sessionStorage.setItem('rt_token',token); },
  clear(){ sessionStorage.removeItem('rt_uid'); sessionStorage.removeItem('rt_email'); sessionStorage.removeItem('rt_token'); }
};
// Token varsa Authorization header'ı döndür
function authHeaders(extra){ const h=extra||{}; if(session.token) h['Authorization']='Bearer '+session.token; return h; }

function fmtDate(ts){
  const d = new Date(ts*1000);
  return d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
}
function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const app = document.getElementById('app');

// ---- ROUTES ----
async function route(){
  const hash = location.hash.slice(1) || '/';
  updateNav(hash);
  window.scrollTo(0,0);

  if(hash === '/' ) return renderHome();
  if(hash.startsWith('/ruya/')) return renderDream(hash.split('/')[2]);
  if(hash === '/sozluk') return renderDictionary();
  if(hash.startsWith('/sozluk/')) return renderDictWord(hash.split('/')[2]);
  if(hash === '/topluluk') return renderCommunity();
  if(hash === '/gecmis') return renderHistory();
  if(hash === '/giris') return renderAuth();
  if(hash === '/gizlilik') return renderPrivacy();
  return renderHome();
}

function updateNav(hash){
  document.querySelectorAll('.nav-links a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === '#'+hash);
  });
  const authLink = document.getElementById('authLink');
  if(authLink){
    authLink.textContent = session.userId ? 'Çıkış' : 'Giriş';
    authLink.setAttribute('href', session.userId ? '#/' : '#/giris');
    authLink.onclick = session.userId ? (e)=>{e.preventDefault();fetch(API+'/api/logout',{method:'POST',headers:authHeaders()}).catch(()=>{});session.clear();location.hash='/';route();} : null;
  }
  const histLink = document.getElementById('histLink');
  if(histLink) histLink.style.display = session.userId ? '' : 'none';
}

// ---- HOME ----
function renderHome(){
  app.innerHTML = `
  <div class="hero">
    <div class="container">
      <h1>Rüyanı Anlat,<br><span class="em">anlamını keşfet</span></h1>
      <p>Gördüğün rüyayı yaz; hem geleneksel tabir hem de modern psikolojik bakışla, sana özel yorumlayalım.</p>
    </div>
  </div>
  <div class="container">
    <div class="dreambox">
      <textarea id="dreamInput" placeholder="Rüyanı buraya anlat... Örnek: Berrak bir suda yüzdüğümü ve bir yılan gördüğümü hatırlıyorum."></textarea>
      <div class="dreambox-foot">
        <label class="checkbox"><input type="checkbox" id="pubChk"> Toplulukta paylaş (isimsiz)</label>
        <button class="btn" id="goBtn" onclick="doInterpret()">✨ Yorumla</button>
      </div>
    </div>
    <div class="loader" id="loader"><div class="spinner"></div><p>Rüyan yorumlanıyor...</p></div>
    <div id="resultArea"></div>
    <div class="ad-slot" id="ad-home">Reklam alanı</div>
  </div>
  <section class="block container">
    <h2>Sık Görülen Rüyalar</h2>
    <p class="sub">En çok merak edilen sembollerin anlamlarını keşfet.</p>
    <div class="grid" id="featured"></div>
  </section>
  <section class="block container">
    <h2>Nasıl Çalışır?</h2>
    <p class="sub">Üç adımda rüyanın anlamına ulaş.</p>
    <div class="steps-grid">
      <div class="step-card"><span class="step-num">1</span><h3>Anlat</h3><p>Rüyanı kendi cümlelerinle yaz.</p></div>
      <div class="step-card"><span class="step-num">2</span><h3>Eşleştir</h3><p>Sembolleri rüya sözlüğümüzle buluruz.</p></div>
      <div class="step-card"><span class="step-num">3</span><h3>Yorumla</h3><p>Geleneksel + psikolojik yorum sunarız.</p></div>
    </div>
  </section>`;
  loadFeatured();
}

async function loadFeatured(){
  try{
    const list = await (await fetch(API+'/api/featured')).json();
    const el = document.getElementById('featured');
    if(el && list.length){
      el.innerHTML = list.map(w=>`<a class="card" href="/sozluk/${esc(w.slug)}/"><h3>${esc(w.keyword)}</h3><div class="views">Anlamına bak →</div></a>`).join('');
    }
  }catch(e){}
}

async function doInterpret(){
  const text = document.getElementById('dreamInput').value.trim();
  if(text.length < 10){ alert('Lütfen rüyanı biraz daha detaylı anlat.'); return; }
  const btn = document.getElementById('goBtn');
  const loader = document.getElementById('loader');
  const result = document.getElementById('resultArea');
  btn.disabled = true; loader.classList.add('show'); result.innerHTML='';
  try{
    const res = await fetch(API+'/api/interpret',{
      method:'POST',headers:authHeaders({'Content-Type':'application/json'}),
      body:JSON.stringify({
        dream:text,
        is_public:document.getElementById('pubChk').checked
      })
    });
    const data = await res.json();
    if(data.error){ result.innerHTML=`<div class="msg err">${esc(data.error)}</div>`; }
    else{ renderResultCard(result, data, text); }
  }catch(e){
    result.innerHTML=`<div class="msg err">Bağlantı hatası. Lütfen tekrar dene.</div>`;
  }finally{
    btn.disabled=false; loader.classList.remove('show');
  }
}

function renderResultCard(el, data, dreamText){
  const tags = (data.keywords||[]).map(k=>`<a class="tag" href="/sozluk/${esc(k)}/">${esc(k)}</a>`).join('');
  const shareUrl = location.origin + '/#/ruya/' + data.share_id;
  el.innerHTML = `
    <div class="result">
      ${tags?`<div class="kw">${tags}</div>`:''}
      <div class="result-text">${esc(data.interpretation)}</div>
      <div class="result-actions">
        <button class="btn btn-ghost" onclick="copyShare('${shareUrl}')">🔗 Bağlantıyı Kopyala</button>
        <a class="btn btn-ghost" href="#/">Yeni Rüya</a>
      </div>
    </div>`;
}
function copyShare(url){ navigator.clipboard.writeText(url).then(()=>alert('Bağlantı kopyalandı!')); }

// ---- SINGLE DREAM (share page) ----
async function renderDream(sid){
  app.innerHTML = `<div class="container block"><div class="loader show"><div class="spinner"></div></div></div>`;
  try{
    const res = await fetch(API+'/api/dream/'+sid);
    const d = await res.json();
    if(d.error){ app.innerHTML=`<div class="container block"><div class="msg err">${esc(d.error)}</div></div>`; return; }
    const tags=(d.matched_keywords||'').split(',').filter(Boolean).map(k=>`<a class="tag" href="/sozluk/${esc(k)}/">${esc(k)}</a>`).join('');
    app.innerHTML = `<div class="container block">
      <h2>Rüya Yorumu</h2>
      <p class="sub">${fmtDate(d.created_at)}</p>
      <div class="result">
        <div class="dt" style="font-style:italic;color:var(--muted);margin-bottom:14px">"${esc(d.dream_text)}"</div>
        ${tags?`<div class="kw">${tags}</div>`:''}
        <div class="result-text">${esc(d.interpretation)}</div>
        <div class="result-actions"><a class="btn" href="#/">Kendi Rüyanı Yorumlat</a></div>
      </div>
    </div>`;
  }catch(e){ app.innerHTML=`<div class="container block"><div class="msg err">Rüya yüklenemedi.</div></div>`; }
}

// ---- DICTIONARY ----
async function renderDictionary(){
  app.innerHTML=`<div class="container block"><h2>Rüya Sözlüğü</h2><p class="sub">Sembollerin geleneksel ve psikolojik anlamları.</p>
    <input id="dictSearch" placeholder="Kelime ara..." style="width:100%;border:1.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:18px;font-size:15px">
    <div class="grid" id="dictGrid"><div class="loader show"><div class="spinner"></div></div></div></div>`;
  const res = await fetch(API+'/api/dictionary');
  const words = await res.json();
  const grid=document.getElementById('dictGrid');
  function draw(list){
    grid.innerHTML = list.length ? list.map(w=>`<div class="card" onclick="location.hash='/sozluk/${esc(w.slug)}'">
      <h3>${esc(w.keyword)}</h3><div class="views">👁 ${w.views} görüntülenme</div></div>`).join('') : '<p class="sub">Sonuç yok.</p>';
  }
  draw(words);
  document.getElementById('dictSearch').oninput=(e)=>{
    const q=e.target.value.toLocaleLowerCase('tr-TR');
    draw(words.filter(w=>w.keyword.toLocaleLowerCase('tr-TR').includes(q)));
  };
}

async function renderDictWord(slug){
  app.innerHTML=`<div class="container block"><div class="loader show"><div class="spinner"></div></div></div>`;
  const res=await fetch(API+'/api/dictionary/'+slug);
  const w=await res.json();
  if(w.error){ app.innerHTML=`<div class="container block"><div class="msg err">${esc(w.error)}</div></div>`; return; }
  app.innerHTML=`<div class="container block">
    <a href="#/sozluk" style="font-size:14px">← Sözlüğe dön</a>
    <h2 style="margin-top:12px;text-transform:capitalize">Rüyada ${esc(w.keyword)} Görmek</h2>
    <div class="result">
      <h3 style="color:var(--brand-dark);margin-bottom:8px">📜 Geleneksel Tabir</h3>
      <div class="result-text">${esc(w.classic_meaning)}</div>
      ${w.psychological_meaning?`<h3 style="color:var(--brand-dark);margin:20px 0 8px">🧠 Psikolojik Bakış</h3><div class="result-text">${esc(w.psychological_meaning)}</div>`:''}
      <div class="result-actions"><a class="btn" href="#/">Rüyanı Yorumlat</a></div>
    </div>
  </div>`;
}

// ---- COMMUNITY ----
async function renderCommunity(){
  app.innerHTML=`<div class="container block"><h2>Topluluk Rüyaları</h2><p class="sub">Kullanıcıların paylaştığı rüyalar ve yorumları.</p><div id="commList"><div class="loader show"><div class="spinner"></div></div></div></div>`;
  const res=await fetch(API+'/api/community');
  const list=await res.json();
  const el=document.getElementById('commList');
  el.innerHTML = list.length ? list.map(d=>{
    const tags=(d.matched_keywords||'').split(',').filter(Boolean).map(k=>`<span class="tag">${esc(k)}</span>`).join(' ');
    return `<div class="dream-card">
      <div class="dt">"${esc(d.dream_text.slice(0,180))}${d.dream_text.length>180?'...':''}"</div>
      ${tags?`<div class="kw" style="margin-bottom:10px">${tags}</div>`:''}
      <div class="it">${esc(d.interpretation.slice(0,260))}...</div>
      <a href="#/ruya/${esc(d.share_id)}" style="font-size:14px;display:inline-block;margin-top:8px">Devamını oku →</a>
    </div>`;
  }).join('') : '<p class="sub">Henüz paylaşılan rüya yok. İlk paylaşan sen ol!</p>';
}

// ---- HISTORY ----
async function renderHistory(){
  if(!session.userId){ location.hash='/giris'; return; }
  app.innerHTML=`<div class="container block"><h2>Geçmiş Rüyalarım</h2><p class="sub">${esc(session.email)}</p><div id="histList"><div class="loader show"><div class="spinner"></div></div></div></div>`;
  const res=await fetch(API+'/api/my-dreams',{headers:authHeaders()});
  const list=await res.json();
  const el=document.getElementById('histList');
  el.innerHTML = list.length ? list.map(d=>`<div class="dream-card">
    <div class="dt">${fmtDate(d.created_at)} • "${esc(d.dream_text.slice(0,140))}${d.dream_text.length>140?'...':''}"</div>
    <div class="it">${esc(d.interpretation.slice(0,200))}...</div>
    <a href="#/ruya/${esc(d.share_id)}" style="font-size:14px;display:inline-block;margin-top:8px">Tam yorum →</a>
  </div>`).join('') : '<p class="sub">Henüz kayıtlı rüyan yok.</p>';
}

// ---- AUTH ----
function renderAuth(){
  app.innerHTML=`<div class="container">
    <div class="auth-card">
      <h2 id="authTitle" style="text-align:center;margin-bottom:6px">Giriş Yap</h2>
      <p class="sub" style="text-align:center">Geçmiş rüyaların kaydedilsin.</p>
      <div id="authMsg"></div>
      <div class="field"><label>E-posta</label><input id="aEmail" type="email" placeholder="ornek@mail.com"></div>
      <div class="field"><label>Şifre</label><input id="aPass" type="password" placeholder="En az 6 karakter"></div>
      <button class="btn" style="width:100%" id="authBtn" onclick="doAuth()">Giriş Yap</button>
      <p style="text-align:center;margin-top:16px;font-size:14px">
        <span id="authSwitch"><a href="#" onclick="toggleAuth(event)">Hesabın yok mu? Kayıt ol</a></span>
      </p>
    </div></div>`;
  window._authMode='login';
}
function toggleAuth(e){
  e.preventDefault();
  window._authMode = window._authMode==='login'?'register':'login';
  const reg = window._authMode==='register';
  document.getElementById('authTitle').textContent = reg?'Kayıt Ol':'Giriş Yap';
  document.getElementById('authBtn').textContent = reg?'Kayıt Ol':'Giriş Yap';
  document.getElementById('authSwitch').innerHTML = reg
    ? '<a href="#" onclick="toggleAuth(event)">Zaten hesabın var mı? Giriş yap</a>'
    : '<a href="#" onclick="toggleAuth(event)">Hesabın yok mu? Kayıt ol</a>';
}
async function doAuth(){
  const email=document.getElementById('aEmail').value.trim();
  const password=document.getElementById('aPass').value;
  const msg=document.getElementById('authMsg');
  const ep = window._authMode==='register'?'/api/register':'/api/login';
  try{
    const res=await fetch(API+ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const d=await res.json();
    if(d.error){ msg.innerHTML=`<div class="msg err">${esc(d.error)}</div>`; return; }
    session.set(d.user_id,d.email,d.token);
    location.hash='/gecmis'; route();
  }catch(e){ msg.innerHTML=`<div class="msg err">Bir hata oluştu.</div>`; }
}

// ---- PRIVACY / KVKK ----
function renderPrivacy(){
  app.innerHTML=`<div class="container block">
    <h2>Gizlilik ve KVKK</h2>
    <div class="result-text" style="margin-top:14px">
Rüyatabirim olarak gizliliğinize önem veriyoruz.

Topladığımız veriler: Yorumlanması için girdiğiniz rüya metni ve (kayıt olduysanız) e-posta adresiniz. Rüyalarınız varsayılan olarak gizlidir; yalnızca siz "toplulukta paylaş" seçeneğini işaretlerseniz isimsiz olarak yayınlanır.

Kullanılan hizmetler: Yorumlar yapay zeka desteğiyle üretilir. Veriler Cloudflare altyapısında saklanır.

Haklarınız (KVKK kapsamında): Verilerinize erişme, düzeltilmesini veya silinmesini talep etme hakkına sahipsiniz. Talepleriniz için bizimle iletişime geçebilirsiniz.

Önemli not: Bu sitedeki rüya yorumları eğlence ve kişisel farkındalık amaçlıdır; tıbbi, psikolojik veya finansal tavsiye yerine geçmez.
    </div>
  </div>`;
}

// init
window.addEventListener('hashchange',route);
window.addEventListener('DOMContentLoaded',route);
// menü toggle
window.toggleMenu=()=>document.querySelector('.nav-links').classList.toggle('open');
