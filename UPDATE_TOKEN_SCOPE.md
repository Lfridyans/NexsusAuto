# 🔑 Update Token Scope

## Masalah
Token Anda tidak punya scope `workflow`, jadi tidak bisa push file `.github/workflows/deploy.yml`.

## Solusi: Buat Token Baru dengan Scope Workflow

1. **Buka:** https://github.com/settings/tokens
2. **Generate new token** → "Generate new token (classic)"
3. **Nama:** "NexsusAuto Full Access"
4. **Centang scope:**
   - ✅ `repo` (full control)
   - ✅ `workflow` (update GitHub Action workflows)
5. **Generate token**
6. **COPY TOKEN BARU** (hanya muncul sekali!)

## Setelah Dapat Token Baru

Jalankan command ini dengan token baru:

```bash
git remote set-url origin https://TOKEN_BARU@github.com/Lfridyans/NexsusAuto.git
git push -u origin main
```

---

**Atau alternatif:** Push tanpa workflow file dulu, lalu tambahkan workflow file via GitHub web interface.

