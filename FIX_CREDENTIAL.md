# 🔧 Fix Credential untuk Push

## Masalah
Git menggunakan credential "Lintarf" yang tidak punya akses ke repository "Lfridyans/NexsusAuto".

## Solusi: Update Credential

### Cara 1: Update via Windows Credential Manager

1. **Buka Windows Credential Manager:**
   - Tekan `Windows + R`
   - Ketik: `control /name Microsoft.CredentialManager`
   - Enter

2. **Cari GitHub credential:**
   - Klik "Windows Credentials"
   - Cari entry yang berisi "github.com" atau "git:https://github.com"
   - Klik entry tersebut

3. **Edit credential:**
   - Klik "Edit"
   - Username: masukkan `Lfridyans` (atau username GitHub Anda)
   - Password: masukkan **Personal Access Token** (bukan password biasa!)
   - Klik "Save"

4. **Buat Personal Access Token (jika belum):**
   - Buka: https://github.com/settings/tokens
   - Generate new token (classic)
   - Nama: "NexsusAuto Push"
   - Centang: `repo` (full control)
   - Generate dan **COPY TOKEN**

5. **Coba push lagi:**
   ```bash
   git push -u origin main
   ```

---

### Cara 2: Gunakan Token Langsung di URL

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/Lfridyans/NexsusAuto.git
git push -u origin main
```

Ganti `YOUR_TOKEN` dengan Personal Access Token Anda.

---

### Cara 3: Clear Credential dan Login Ulang

```bash
git credential-manager erase
```

Kemudian coba push lagi, Windows akan meminta login baru.

---

**Pilih salah satu cara di atas untuk fix credential!**

