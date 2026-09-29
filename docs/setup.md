# Cómo reproducir el proyecto desde cero

Guía para quien quiera reproducir el proyecto en su propia máquina y con sus propias cuentas. Hay dos caminos:

- **Rápido (5 min, sin claves):** correr la app en modo mock. Disponible desde el paso 06.
- **Completo (~1 h):** crear tus propias cuentas y desplegar tu copia.

## Requisitos

| Herramienta | Versión | Instalación (macOS) |
|---|---|---|
| Node.js | ≥ 20 | `brew install node` |
| pnpm | ≥ 10 | `npm i -g pnpm` |
| Git | cualquiera reciente | viene con Xcode CLT |
| Python | ≥ 3.11 (solo para `ml/`) | `brew install python@3.12` |
| Supabase CLI | ≥ 2 | `brew install supabase/tap/supabase` |
| Vercel CLI | reciente | `npm i -g vercel` |
| gitleaks | ≥ 8 | `brew install gitleaks` |
| mermaid-cli (opcional) | | `npm i -g @mermaid-js/mermaid-cli` |

En Windows, usa WSL2 y los mismos comandos con `apt` o los instaladores oficiales.

## Camino completo

### 1. Clonar e instalar

```bash
git clone https://github.com/FutureTales/ai-engineering-demo.git
cd ai-engineering-demo
pnpm install
cp .env.example .env.local
```

### 2. Claves de API

| Variable | Dónde se obtiene | ¿Obligatoria? |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys. **Fija un límite de gasto** | Sí, para `AI_MODE=live` |
| `VOYAGE_API_KEY` | dashboard.voyageai.com | No (sin ella, búsqueda solo por texto) |
| `GEMINI_API_KEY` | aistudio.google.com | No (solo para regenerar ilustraciones) |

Pégalas en `.env.local`. **Nunca** en otro archivo.

### 3. Base de datos (Supabase)

```bash
supabase login                      # abre el navegador; hazlo en tu terminal
supabase projects create mi-innova-copilot --region us-east-1 --db-password "<una contraseña larga>"
supabase projects list              # copia el REFERENCE ID
supabase link --project-ref <REF>
supabase db push                    # aplica supabase/migrations/
supabase projects api-keys --project-ref <REF>
```

Copia a `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` la clave `anon`
- `SUPABASE_SERVICE_ROLE_KEY=` la clave `service_role` (**secreta**)
- `STAFF_EMAILS=` tu correo (para entrar a `/panel`)
- `TOOL_APPROVAL_SECRET=` y `RATE_LIMIT_SALT=`: secretos aleatorios (`openssl rand -hex 32`) para firmar las aprobaciones y anonimizar las IP

Carga los datos ficticios:

```bash
pnpm seed      # → Seeded remote: 10 services, 6 demo requests, 1 staff emails
pnpm ingest    # → 13 documents · 71 chunks (catálogo para la búsqueda)
pnpm tsx scripts/create-staff-users.mts   # cuentas del personal (el registro público está desactivado)
```

### 4. Correr localmente

```bash
pnpm dev       # → http://localhost:3000
pnpm test      # tests unitarios
```

### 5. Desplegar tu copia en Vercel

```bash
vercel login
vercel link --yes --project mi-innova-copilot
# agrega cada variable (repite para "preview"):
printf '%s' "<valor>" | vercel env add ANTHROPIC_API_KEY production --sensitive --yes
vercel deploy --prod
```

> **Revisa el `.gitignore` después de `vercel link`:** el CLI puede agregar `.env*`, que ignoraría también `.env.example`.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `supabase login` falla con "non-TTY" | Lo corriste dentro de un agente o un script | Córrelo en una terminal normal |
| `Cannot find name 'LayoutProps'` | Faltan los tipos que genera Next | `pnpm typecheck` ya corre `next typegen`; o ejecuta `pnpm dev` una vez |
| `permission denied for table ...` desde el navegador | Es lo esperado: RLS bloquea a `anon` | Las lecturas se hacen desde el servidor |
| La URL `*-<equipo>.vercel.app` pide login | Protección de despliegues de Vercel | Usa el dominio de producción del proyecto |
