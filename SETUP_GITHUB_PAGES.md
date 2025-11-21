# 🚀 Setup GitHub Pages - Step by Step

## Langkah 1: Aktifkan GitHub Pages

1. **Di halaman Settings yang sedang Anda buka:**
   - Lihat sidebar kiri, scroll ke bawah
   - Cari bagian **"Code and automation"**
   - Klik **"Pages"** (ada di bawah "Actions", "Webhooks", dll)

2. **Atau langsung akses:**
   - Buka: https://github.com/Lfridyans/NexsusAuto/settings/pages

## Langkah 2: Konfigurasi GitHub Pages

Setelah masuk ke halaman **Pages**:

1. **Di bagian "Source":**
   - Pilih: **"GitHub Actions"** (bukan "Deploy from a branch")
   - Klik **"Save"**

2. **Tunggu beberapa detik:**
   - GitHub akan otomatis mendeteksi workflow file yang sudah ada
   - Workflow akan mulai berjalan

## Langkah 3: Cek Deployment Status

1. **Klik tab "Actions"** di bagian atas repository
2. Anda akan melihat workflow **"Deploy to GitHub Pages"** sedang berjalan
3. Tunggu sampai status berubah menjadi **hijau (✓)** dengan tulisan "Deploy to GitHub Pages"

## Langkah 4: Akses Aplikasi Online

Setelah deployment selesai (biasanya 1-2 menit):

**Aplikasi Anda bisa diakses di:**
```
https://lfridyans.github.io/NexsusAuto
```

## ⚠️ Catatan Penting

- Pastikan file sudah di-push ke GitHub dulu
- Jika belum push, ikuti instruksi di `GITHUB_PUSH_INSTRUCTIONS.md`
- Workflow akan otomatis deploy setiap kali ada push ke branch `main`

## 🔍 Troubleshooting

**Jika Pages tidak muncul:**
- Pastikan repository sudah public (atau Anda punya akses)
- Pastikan workflow file sudah ada di `.github/workflows/deploy.yml`

**Jika deployment gagal:**
- Cek tab "Actions" untuk melihat error message
- Pastikan `vite.config.ts` sudah di-set dengan `base: '/NexsusAuto/'`

---

**Quick Link:**
- Settings Pages: https://github.com/Lfridyans/NexsusAuto/settings/pages
- Actions: https://github.com/Lfridyans/NexsusAuto/actions

