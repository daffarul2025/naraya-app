# 🚀 Naraya One – Content Management Tracker

Platform pelaporan & pelacakan konten untuk tim freelancer Naraya.

---

## 📋 LANGKAH DEPLOY (Ikuti Urutan Ini!)

### STEP 1 – Setup Supabase (Database)

1. Buka **https://supabase.com** → klik **Start your project**
2. Login/daftar dengan akun GitHub
3. Klik **New Project**, isi:
   - **Name**: `naraya-app`
   - **Database Password**: buat password yang kuat (simpan!)
   - **Region**: pilih **Southeast Asia (Singapore)**
4. Tunggu project selesai dibuat (~1–2 menit)

#### Buat Tabel di Supabase

5. Di sidebar kiri klik **SQL Editor**
6. Klik **New query**, paste SQL berikut, lalu klik **Run**:

```sql
-- Buat tabel untuk menyimpan semua data Naraya
CREATE TABLE IF NOT EXISTS naraya_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert baris pertama (data awal kosong)
INSERT INTO naraya_settings (id, content)
VALUES (1, '{
  "posts": [],
  "monthlyTarget": 1500,
  "creators": ["Arya","Darul","Revi","Vika","Nessa","Khaira"],
  "accounts": ["WiFicerdas","NarayaConnect","Curhat.santui","SobatNgadu","Mbokdewor","GA.naratelgroup"],
  "themes": ["Edukasi","Promosi","Hiburan","Informasi","Tutorial","Motivasi","Lifestyle","Review"]
}')
ON CONFLICT (id) DO NOTHING;

-- Izinkan akses publik (anon key)
ALTER TABLE naraya_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON naraya_settings
  FOR ALL USING (true) WITH CHECK (true);
```

7. Setelah berhasil, pergi ke **Settings → API**
8. Salin dua nilai ini (akan dipakai di Step 3 & 4):
   - **Project URL** → contoh: `https://abcdefgh.supabase.co`
   - **anon public** key → string panjang dimulai dengan `eyJ...`

---

### STEP 2 – Upload ke GitHub

1. Buka **https://github.com** → login
2. Klik **+** (pojok kanan atas) → **New repository**
3. Nama: `naraya-app`, set **Private**, klik **Create repository**
4. Di komputer kamu, buka terminal di folder `naraya-app` ini:

```bash
git init
git add .
git commit -m "first commit: Naraya One App"
git branch -M main
git remote add origin https://github.com/USERNAME/naraya-app.git
git push -u origin main
```

> Ganti `USERNAME` dengan username GitHub kamu

---

### STEP 3 – Deploy ke Vercel

1. Buka **https://vercel.com** → login dengan akun GitHub
2. Klik **Add New Project**
3. Pilih repository `naraya-app` → klik **Import**
4. Di bagian **Environment Variables**, tambahkan 2 variabel:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | URL dari Supabase (Step 1, no.8) |
   | `VITE_SUPABASE_ANON_KEY` | anon key dari Supabase (Step 1, no.8) |

5. Klik **Deploy** → tunggu ~2 menit
6. Selesai! Website kamu live di `https://naraya-app.vercel.app` (atau URL yang diberikan Vercel)

---

### STEP 4 – Tes Lokal (Opsional)

Jika ingin menjalankan di komputer sendiri:

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env dari template
cp .env.example .env

# 3. Edit .env, isi URL dan KEY Supabase kamu
# (pakai Notepad / VS Code)

# 4. Jalankan
npm run dev
```

Buka browser ke `http://localhost:5173`

---

## 🔐 Akun Login

| Role | Username | Password |
|------|----------|----------|
| Admin | `kontennarayaoneAI` | `#adminnarayaone_AI` |
| Freelancer | `kontennarayaoneAI` | `#gunakan_AI` |

> ⚠️ Untuk keamanan production, pertimbangkan untuk mengganti password di file `src/App.jsx` bagian `USERS`

---

## 📁 Struktur File

```
naraya-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx        ← Entry point React
│   └── App.jsx         ← Seluruh aplikasi
├── .env.example        ← Template environment variables
├── .gitignore
├── index.html
├── package.json
├── vercel.json         ← Config routing untuk Vercel
└── vite.config.js
```

---

## 🛠️ Teknologi

- **React 18** + Vite
- **Supabase** (PostgreSQL database)
- **Vercel** (hosting)
- Tidak ada CSS framework external — semua inline styles

---

## ❓ Troubleshooting

**Website loading tapi data tidak muncul?**
→ Cek Environment Variables di Vercel sudah benar, lalu **Redeploy**

**Error "relation naraya_settings does not exist"?**
→ Ulangi Step 1 bagian SQL Editor

**Refresh halaman langsung ke login?**
→ Sudah diperbaiki — session tersimpan di browser (localStorage)

**Perubahan data tidak tersimpan?**
→ Cek di Supabase → Table Editor → naraya_settings apakah data ada
