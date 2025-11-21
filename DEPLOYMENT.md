# Deployment Guide - NEXUS // SWARM

## ✅ Setup Selesai!

Proyek sudah siap untuk dipublish ke GitHub. Berikut yang sudah dilakukan:

1. ✅ Dependencies diinstall (`npm install`)
2. ✅ `package.json` diupdate (removed `private: true`, added metadata)
3. ✅ `README.md` diupdate dengan dokumentasi lengkap
4. ✅ `vite.config.ts` diupdate dengan build optimization
5. ✅ `.gitignore` diperbarui
6. ✅ `LICENSE` file dibuat (MIT License)
7. ✅ GitHub Actions workflow dibuat untuk auto-deployment
8. ✅ Build test berhasil

## 🚀 Langkah Selanjutnya untuk Publish ke GitHub

### 1. Inisialisasi Git Repository (jika belum)

```bash
git init
git add .
git commit -m "Initial commit: NEXUS // SWARM trading bot simulator"
```

### 2. Buat Repository di GitHub

1. Buka https://github.com/new
2. Buat repository baru dengan nama `nexus-swarm` (atau nama lain)
3. **JANGAN** centang "Initialize with README" (karena kita sudah punya)
4. Klik "Create repository"

### 3. Update Repository URL di package.json

Edit `package.json` dan ganti:
- `YOUR_USERNAME` dengan username GitHub Anda
- Atau hapus bagian repository jika tidak ingin menggunakan GitHub Pages

### 4. Push ke GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/nexus-swarm.git
git branch -M main
git push -u origin main
```

### 5. Deploy ke GitHub Pages (Opsional)

#### Opsi A: Menggunakan GitHub Actions (Otomatis)

1. Buka repository di GitHub
2. Pergi ke **Settings** → **Pages**
3. Di bagian **Source**, pilih **GitHub Actions**
4. Setiap kali push ke `main` branch, akan auto-deploy

**PENTING:** Update `vite.config.ts` dengan base path:
```typescript
base: '/nexus-swarm/', // Ganti dengan nama repo Anda
```

#### Opsi B: Manual Deploy dengan gh-pages

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Update `package.json` scripts:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### 6. Deploy ke Platform Lain

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Atau connect GitHub repo di vercel.com

#### Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Atau drag & drop folder `dist` ke netlify.com

## 📝 Checklist Sebelum Publish

- [ ] Update `package.json` dengan repository URL yang benar
- [ ] Update `vite.config.ts` base path jika pakai GitHub Pages
- [ ] Test build: `npm run build`
- [ ] Test preview: `npm run preview`
- [ ] Commit semua perubahan
- [ ] Push ke GitHub

## 🔧 Troubleshooting

### Build Error
- Pastikan semua dependencies terinstall: `npm install`
- Hapus `node_modules` dan `package-lock.json`, lalu install ulang

### GitHub Pages 404
- Pastikan base path di `vite.config.ts` sesuai nama repository
- Pastikan GitHub Actions workflow berjalan dengan sukses

### CORS Error
- Aplikasi menggunakan Binance public API yang tidak memerlukan CORS setup
- Jika ada masalah, pastikan menggunakan HTTPS

## 📚 Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)

## 🎉 Selesai!

Setelah deploy, aplikasi Anda akan bisa diakses secara online dan publik!

---

**Note:** Pastikan untuk mengganti `YOUR_USERNAME` di semua file dengan username GitHub Anda yang sebenarnya.

