# Bitácora del agente — Paso 02

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

> "continua autonomo y con full permisos hasta el final"

Más la spec del paso 02 (scaffold, Supabase, Vercel, ADRs, arquitectura, punto de control c y primer push).

## Lo que hice

1. **Scaffold** con `pnpm create next-app@latest` en una carpeta temporal (el repo ya tenía archivos) y copia al repo. Versiones instaladas: Next.js 16.3.7, React 19.2.8, AI SDK `ai` 7.0.122, `@ai-sdk/anthropic` 4.0.68, `@supabase/ssr` 0.12.7, zod 4.6.5, Recharts 3.10.1.
2. El scaffold trae un **`AGENTS.md`** que dice: *"This is NOT the Next.js you know… Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* Lo conservé y lo importé desde `CLAUDE.md`. Es un ejemplo real de un framework que le habla directamente a los agentes de código.
3. shadcn/ui (`init` + 11 componentes).
4. Cargué la skill de buenas prácticas de Postgres de Supabase **antes** de escribir el esquema, y apliqué sus reglas: `(select auth.jwt())` dentro de las políticas, helper `security definer` en un esquema no expuesto, índices en todas las FK.
5. `supabase projects create ai-engineering-demo --region us-east-1` → ref `tpgnyqzcebcatmxmbycj`, `ACTIVE_HEALTHY`. La contraseña de la base se generó al azar y solo vive en `.env.local`.
6. Dos migraciones aplicadas con `supabase db push`. Seed: `Seeded remote: 10 services, 6 demo requests, 1 staff emails`.
7. Catálogo ficticio (10 servicios, 3 políticas) y 6 MIPYMES ficticias.
8. Vercel: `vercel link`, variables por CLI (producción y preview), `vercel.json` con `iad1`, dominio `innova-copilot.vercel.app`.
9. ADRs 0001–0004, `docs/arquitectura.md`, `docs/setup.md`, script `scripts/check-mermaid.sh`.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| `pnpm test` | ✅ 5 passed |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | ✅ sin errores |
| `anon` → `GET /rest/v1/requests`, `services`, `rate_limits`, `interactions` | ✅ `42501` (sin permiso) en las 4 |
| `anon` → RPC `hit_rate_limit` y `sync_staff_allowlist` | ✅ `permission denied for function` |
| `service_role` → contar `requests` | ✅ `content-range: 0-5/6` |
| Supabase advisors de seguridad | ✅ solo 3 avisos INFO "RLS sin políticas" en `chunks`, `rate_limits` y `staff_allowlist`: **intencional** (solo servidor) |
| Supabase advisors de rendimiento | ✅ solo "índice sin usar" (base recién creada) |
| `pnpm check:mermaid` | ✅ todos los diagramas compilan |
| Deploy de producción en Vercel | ✅ `● Ready`, funciones en `iad1` |
| `curl https://innova-copilot.vercel.app` | ✅ 200, título "Innova Copilot — demo educativa de AI Engineering" |
| Captura de la landing a 390 px de ancho (celular) | ✅ revisada visualmente: sin desbordes, aviso de datos ficticios visible |

### Punto de control (c): secretos antes del primer push público

El humano autorizó ejecutar este punto de control de forma autónoma. Resultado:

| Chequeo | Resultado |
|---|---|
| Archivos sensibles en stage (`.env`, `.env.local`, `.vercel/`, archivo de claves) | ✅ ninguno |
| `gitleaks git --redact` (historial completo) | ✅ `no leaks found` |
| `gitleaks dir --redact .` (working tree) | ⚠️ 7 hallazgos, **todos en `.env.local`**, que está en `.gitignore` y es exactamente donde deben estar las claves |
| Búsqueda de prefijos de claves en el diff en stage | ✅ 0 coincidencias |

Conclusión: seguro publicar. Primer push: `main` + tags `paso-00` y `paso-01`.

## Lo que decidió el humano

- Autonomía total hasta el final, incluido el punto de control (c).

## Lo que salió mal y cómo lo corregí

1. **`LayoutProps` no existía para `tsc`.** Next 16 genera esos tipos (`next typegen`) y el archivo generado está en `.gitignore`. Arreglo: `"typecheck": "next typegen && tsc --noEmit"`.
2. **El JSON del CLI de Supabase venía precedido de texto** (`Cannot find project ref...`) y `jq` fallaba. El proyecto sí se había creado; lo confirmé con `supabase projects list`.
3. **Vercel rechazó `NEXT_PUBLIC_SUPABASE_ANON_KEY`** porque "parece una credencial y `NEXT_PUBLIC_` la expone". La anon key es pública por diseño (quien protege es el RLS, verificado arriba). La agregué como variable *Config* con `--no-sensitive`.
4. **`vercel link` agregó `.env*` al `.gitignore`**, lo que anulaba la excepción `!.env.example`. Lo detecté con `git diff` y quité esas líneas; verifiqué con `git check-ignore`.
5. **El dominio `ai-engineering-demo.vercel.app` ya es de otra persona** (devuelve un sitio en coreano). Usé `innova-copilot.vercel.app`.
6. **La URL del equipo en Vercel devolvía 302** (protección de despliegues: pide login). El dominio de producción del proyecto sí es público. Esto importa para el QR.
7. **Mi primera validación de Mermaid siempre decía "FAIL"**: el `| head` hacía que el código de salida fuera siempre 0 y la lógica quedaba invertida. La rehíce con el código de salida real de `mmdc` y la convertí en el script `scripts/check-mermaid.sh`.
