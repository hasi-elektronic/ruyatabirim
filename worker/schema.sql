-- ruyatabirim D1 şeması

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_premium INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  dream_text TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  matched_keywords TEXT,
  is_public INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  views INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  classic_meaning TEXT NOT NULL,
  psychological_meaning TEXT,
  views INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dreams_share ON dreams(share_id);
CREATE INDEX IF NOT EXISTS idx_dreams_user ON dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_public ON dreams(is_public, is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_dict_keyword ON dictionary(keyword);
CREATE INDEX IF NOT EXISTS idx_dict_slug ON dictionary(slug);

-- Başlangıç sözlüğü (en çok aranan rüya sembolleri)
INSERT OR IGNORE INTO dictionary (keyword, slug, classic_meaning, psychological_meaning, created_at) VALUES
('su', 'su', 'Rüyada berrak su görmek; bereket, rızık ve huzura işaret eder. Bulanık su ise sıkıntı ve geçici zorlukların habercisidir.', 'Su bilinçaltının ve duyguların sembolüdür. Berrak su zihinsel açıklığı, bulanık su bastırılmış duyguları temsil edebilir.', unixepoch()),
('yilan', 'yilan', 'Rüyada yılan görmek; gizli bir düşmana, kıskanç bir kişiye ya da beklenmedik bir mala işaret eder. Yılanı öldürmek düşmana galip gelmek demektir.', 'Jung''a göre yılan dönüşümün ve içsel enerjinin sembolüdür. Korkulan ama aynı zamanda iyileştirici bir gücü temsil eder.', unixepoch()),
('dis', 'dis', 'Rüyada diş görmek aile bireylerine işaret eder. Diş düşmesi bir yakının hastalığı veya ayrılık endişesiyle yorumlanır.', 'Diş kaybı genellikle kontrol kaybı, güçsüzlük korkusu veya hayatta bir değişim kaygısıyla ilişkilendirilir.', unixepoch()),
('para', 'para', 'Rüyada para görmek genellikle rızık, değer ve emeğin karşılığına işaret eder. Para bulmak beklenmedik bir kazanç olabilir.', 'Para öz değer ve güç duygusunun sembolüdür. Para kaybı kendine güven eksikliğini yansıtabilir.', unixepoch()),
('ucmak', 'ucmak', 'Rüyada uçmak; mertebenin yükselmesine, hedeflere ulaşmaya ve özgürleşmeye işaret eder.', 'Uçmak özgürlük arzusunu, kısıtlamalardan kurtulma isteğini ve özgüveni temsil eder.', unixepoch()),
('bebek', 'bebek', 'Rüyada bebek görmek; hayırlı haberler, yeni başlangıçlar ve bereket olarak yorumlanır.', 'Bebek yeni bir başlangıcı, masumiyeti veya henüz gelişmemiş bir potansiyeli simgeler.', unixepoch()),
('olum', 'olum', 'Rüyada ölüm görmek çoğunlukla uzun ömür, bir devrin kapanması ve yeni bir başlangıç olarak yorumlanır; gerçek ölüm anlamı taşımaz.', 'Ölüm psikolojik olarak bir dönüşümü, eski bir benliğin sonunu ve yeniden doğuşu simgeler.', unixepoch()),
('ev', 'ev', 'Rüyada ev görmek; güvenlik, aile ve içinde bulunulan hayat düzenine işaret eder. Yeni ev hayırlı değişimdir.', 'Ev benliğin sembolüdür. Evin odaları kişiliğin farklı yönlerini temsil eder.', unixepoch()),
('ates', 'ates', 'Rüyada ateş görmek; tutkuya, öfkeye ya da arınmaya işaret eder. Kontrollü ateş bereket, yangın ise kavga habercisidir.', 'Ateş tutku, dönüşüm ve bastırılmış öfke enerjisinin sembolüdür.', unixepoch()),
('kopek', 'kopek', 'Rüyada köpek görmek; sadık bir dosta ya da bazı durumlarda düşmana işaret eder. Köpeğin tavrı yoruma yön verir.', 'Köpek sadakat, içgüdüler ve korunma ihtiyacının sembolüdür.', unixepoch());

-- Oturum token'ları (giriş sonrası, 30 gün)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);
