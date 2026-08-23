# BioLink — Fondasi (Tahap 1)

Fondasi project BioLink. Scope tahap ini **hanya**: setup project, Firebase init,
komponen shadcn/ui dasar, dan alur autentikasi (Google + Email) menuju
`/dashboard` yang masih kosong. Fitur microsite/blocks/public page/rules
**belum** dibangun di tahap ini — lihat `PROJECT_HANDOFF.md`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v3 + shadcn/ui (manual setup, bukan CLI)
- React Router v6
- Firebase SDK v11 (modular) — Auth + Firestore
- lucide-react, sonner

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env   # isi dengan konfigurasi Firebase project kamu
npm run dev
```

## ⚠️ WAJIB sebelum auth bisa jalan (Firebase Console)

1. **Authorized domains** — Buka
   `Firebase Console > Authentication > Settings > Authorized domains`,
   lalu tambahkan domain Netlify project ini, contoh: `xxx.netlify.app`
   (dan custom domain jika ada). Tanpa ini, login Google/Email akan gagal
   di production dengan error `auth/unauthorized-domain`.
2. **Aktifkan Sign-in provider**:
   - `Authentication > Sign-in method > Google` → Enable.
   - `Authentication > Sign-in method > Email/Password` → Enable.
3. Isi semua `VITE_FIREBASE_*` di Environment Variables Netlify
   (Site settings > Environment variables) — nilainya sama seperti di `.env`.

## Deploy ke Netlify

Project sudah punya `netlify.toml` (build command, publish dir, SPA redirect)
dan `public/_redirects` sebagai fallback. Cukup connect repo ke Netlify,
isi environment variables di atas, lalu deploy.

## Struktur folder penting

```
src/
  components/ui/   # shadcn/ui primitives (button, input, card, dialog, label, textarea, avatar)
  context/         # AuthContext (Firebase auth state)
  lib/             # firebase.ts, reservedSlugs.ts, utils.ts (cn helper)
  pages/           # Login.tsx, Dashboard.tsx (kosong, placeholder)
  routes/          # ProtectedRoute.tsx
```

## Aturan versi

**Jangan mengubah versi package** yang sudah ditentukan di `package.json`
tanpa koordinasi. Lihat `PROJECT_HANDOFF.md` untuk daftar versi resolved
lengkap. Ini penting supaya akun/agent berikutnya tidak menghasilkan kode
yang mengasumsikan API dari versi library yang berbeda (terutama Tailwind
v3 vs v4, dan Firebase v11 vs v12 yang API-nya bisa berbeda).
