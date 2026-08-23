# BioLink — Final: Public Page + Rules (Akun 3)

## Yang berubah vs project Akun 2

| File | Aksi |
|---|---|
| `src/pages/Public.tsx` | **BARU** — halaman publik `/:slug` |
| `src/App.tsx` | **PATCH MINIMAL** — cuma tambah `import Public from './pages/Public'` + `<Route path="/:slug" element={<Public />} />`. Semua route lama (`/login`, `/dashboard`, `/`) tidak diubah. |
| `firestore.rules` | **BARU/FINAL** |
| `storage.rules` | **BARU/FINAL** |
| `netlify.toml`, `public/_redirects`, `firestore.indexes.json` | **TIDAK DIUBAH** — sudah benar dari Akun 2, tinggal pastikan ke-deploy. |

Cara pasang: copy `src/pages/Public.tsx` ke project kamu, timpa `src/App.tsx` dengan
versi yang saya kirim (isinya identik dengan punya Akun 2 + 2 baris tambahan),
lalu copy `firestore.rules` dan `storage.rules` ke root project.

---

## 1. Asumsi field yang perlu kamu cek

`Public.tsx` mengasumsikan field ini di dokumen `microsites/{slug}` (di luar
`userId` dan `views` yang sudah pasti dari handoff):

- `displayName` (fallback ke `title`) — nama yang tampil di halaman publik
- `bio`, `avatarUrl`, `metaDescription` (opsional, untuk og:description share WA)
- `theme.bgColor` / `theme.textColor` / `theme.buttonColor` / `theme.buttonTextColor`

Kalau `ThemeEditor.tsx` kamu simpan nama field beda (misal `theme.background`
bukan `theme.bgColor`), tinggal sesuaikan di bagian `const theme = ...` di
`Public.tsx` — tidak perlu ubah file lain.

Field `blocks/{id}` (`type`, `order`, `title`, `url`, `isActive`, `clicks`)
sudah pasti sesuai handoff, jadi query & render block sudah cocok tanpa perlu
disesuaikan.

Kalau `reservedSlugs.ts` kamu export sebagai `export default [...]` (bukan
`export const RESERVED_SLUGS = [...]`), ganti baris import di `Public.tsx`:
```ts
import RESERVED_SLUGS from '../lib/reservedSlugs';
```

---

## 2. Index Firestore

`firestore.indexes.json` dari Akun 2 sudah menyiapkan index untuk query
`where('isActive','==',true).orderBy('order','asc')` di `blocks` — cocok
persis dengan yang dipakai `Public.tsx`. Kamu tinggal deploy:

```bash
firebase deploy --only firestore:indexes
```

Kalau nanti tetap muncul error di browser console seperti:
```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/...
```
klik link tersebut → Firebase auto-generate index yang pas → klik **Create
Index** → tunggu status jadi **Enabled** (~1-2 menit).

---

## 3. Deploy rules

```bash
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

## 4. Deploy ke Netlify (Free tier)

`netlify.toml` kamu sudah set `NODE_VERSION=20` dan build config — tidak perlu
diubah. Langkah:

1. Push ke GitHub.
2. Netlify → **Add new site → Import an existing project** → pilih repo.
3. Build command & publish dir akan auto-terbaca dari `netlify.toml`.
4. Set environment variables (samakan nama dengan `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. Deploy → dapat domain gratis `namakamu.netlify.app`.

`public/_redirects` (`/* /index.html 200`) kamu sudah benar, ini yang bikin
route `/:slug` dan `/dashboard` di-handle React Router, bukan 404 dari Netlify.

## 5. Authorized domains di Firebase (WAJIB)

Firebase Console → **Authentication → Settings → Authorized domains** → Add:
- `namakamu.netlify.app`
- Domain custom kamu kalau ada

Tanpa ini, Google Sign-In di `Login.tsx` akan gagal dengan
`auth/unauthorized-domain` setelah deploy.

## 6. Checklist akhir

- [ ] `firestore.rules` & `storage.rules` di-deploy (bukan cuma tersimpan lokal)
- [ ] `firestore.indexes.json` di-deploy dan status index **Enabled**
- [ ] Authorized domain Netlify sudah ditambah di Firebase Auth
- [ ] Buka `https://namakamu.netlify.app/slug-testing` di incognito → cek title
      tab & preview share WA (og:description) — test pakai
      https://www.opengraph.xyz/ atau paste link ke chat WA sendiri
- [ ] Buka `/dashboard` dan `/login` langsung dari luar → pastikan tetap ke
      halaman itu, bukan ke-capture `Public.tsx` (React Router v6 rank
      static path lebih tinggi dari `/:slug`, jadi harusnya aman, tapi tetap
      dites manual)
- [ ] Buka slug yang termasuk reserved (`/admin`, `/settings`, dll) →
      pastikan 404, bukan crash

## 7. Catatan keamanan

> Anonymous increment spammable in pure SPA, enable App Check reCAPTCHA
> Enterprise for production hardening.

Siapa pun bisa spam increment `views`/`clicks` langsung lewat Firestore API
(bukan cuma lewat UI), karena rule cuma validasi struktur perubahan, bukan
apakah request berasal dari browser asli. Acceptable untuk MVP. Kalau sudah
ada traffic nyata, aktifkan Firebase App Check dengan reCAPTCHA Enterprise.
