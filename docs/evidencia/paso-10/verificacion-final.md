# Verificación final (2026-09-29)

| Chequeo | Resultado |
|---|---|
| Enlaces relativos en README, `docs/`, `presentacion/` y `evals/` (58 archivos) | ✅ 0 rotos |
| `anon` → `GET` de `requests`, `conversations`, `interactions`, `eval_runs` | ✅ `42501` en todas |
| `anon` → `PATCH requests.status` | ✅ `42501` |
| `anon` → RPC `am_i_staff`, `hit_rate_limit`, `sync_staff_allowlist`, `match_chunks` (con argumentos válidos) | ✅ `permission denied for function` en todas |
| Menciones de marcas reales en `app/`, `components/`, `lib/`, `data/` | ✅ ninguna |
| Los 11 tags instalan, compilan y pasan sus tests | ✅ [verificacion-tags.md](../verificacion-tags.md) |
| QR decodificados desde el slide renderizado | ✅ repo y app |
| README en GitHub: imágenes y diagrama Mermaid | ✅ 5/5 imágenes cargan; Mermaid se dibuja |
