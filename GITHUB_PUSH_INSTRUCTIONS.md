# Instruksi Push ke GitHub

## ⚠️ Masalah Authentication

Git memerlukan autentikasi untuk push ke GitHub. Berikut beberapa cara untuk menyelesaikannya:

## 🚀 Opsi 1: Menggunakan GitHub Desktop (Paling Mudah)

1. **Download GitHub Desktop:**
   - https://desktop.github.com/
   - Install aplikasinya

2. **Setup:**
   - Buka GitHub Desktop
   - Login dengan akun GitHub Anda (Lfridyans)
   - File → Add Local Repository
   - Pilih folder: `C:\Users\Lintar\Downloads\nexus`
   - Klik "Publish repository"
   - Centang "Keep this code private" jika ingin private, atau biarkan kosong untuk public
   - Klik "Publish Repository"

## 🔑 Opsi 2: Menggunakan Personal Access Token (PAT)

1. **Buat Personal Access Token:**
   - Buka: https://github.com/settings/tokens
   - Klik "Generate new token" → "Generate new token (classic)"
   - Beri nama: "NexsusAuto Push"
   - Centang scope: `repo` (full control)
   - Klik "Generate token"
   - **COPY TOKEN** (hanya muncul sekali!)

2. **Push dengan Token:**
   ```bash
   git push https://YOUR_TOKEN@github.com/Lfridyans/NexsusAuto.git main
   ```
   Ganti `YOUR_TOKEN` dengan token yang sudah dicopy.

3. **Atau simpan credential:**
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/Lfridyans/NexsusAuto.git
   git push -u origin main
   ```

## 🔐 Opsi 3: Menggunakan SSH (Recommended untuk Long-term)

1. **Generate SSH Key (jika belum punya):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   Tekan Enter untuk semua pertanyaan (default location, no passphrase)

2. **Copy Public Key:**
   ```bash
   type %USERPROFILE%\.ssh\id_ed25519.pub
   ```
   Copy semua output

3. **Add SSH Key ke GitHub:**
   - Buka: https://github.com/settings/keys
   - Klik "New SSH key"
   - Title: "NexsusAuto"
   - Key: Paste public key yang sudah dicopy
   - Klik "Add SSH key"

4. **Update Remote URL:**
   ```bash
   git remote set-url origin git@github.com:Lfridyans/NexsusAuto.git
   git push -u origin main
   ```

## 📝 Opsi 4: Manual Upload via GitHub Web

Jika semua opsi di atas tidak berhasil:

1. Buka: https://github.com/Lfridyans/NexsusAuto
2. Klik "uploading an existing file"
3. Drag & drop semua file dari folder `nexus` (kecuali `node_modules` dan `dist`)
4. Commit changes

## ✅ Setelah Push Berhasil

1. **Aktifkan GitHub Pages:**
   - Buka: https://github.com/Lfridyans/NexsusAuto/settings/pages
   - Source: Pilih "GitHub Actions"
   - Save

2. **Tunggu Deployment:**
   - Buka tab "Actions" di repository
   - Workflow akan otomatis berjalan
   - Setelah selesai, aplikasi bisa diakses di:
     **https://lfridyans.github.io/NexsusAuto**

## 🎯 Quick Command (Setelah Setup Authentication)

```bash
git push -u origin main
```

---

**Note:** Repository sudah dikonfigurasi dengan benar. Tinggal masalah authentication saja yang perlu diselesaikan.

