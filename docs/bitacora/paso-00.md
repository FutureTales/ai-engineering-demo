# Bitácora del agente — Paso 00

> Esta bitácora registra, sin editar, cómo se trabajó con el agente de código (Claude Code). Es material para el pilar "Uso de agentes de código".

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Mensajes exactos del humano:

1. > "PLease read and let me know the plan "…/PROMPT_CLAUDE_CODE_ai-engineering-demo.md". If you need a gemini API to generate images for the explanations in the repo let me know. It needs to be very instructor friendly to tecah how to do it and how it was done step by step. Ultrathink"
2. > "keys are in "…/api keys""
3. > "What you mean with scope cut 07-09 what is the question?" → tras la explicación: "yes"
4. > "approved, keep messages exact, go to step 01"

El prompt completo del proyecto (la spec para el agente) está en el archivo `PROMPT_CLAUDE_CODE_ai-engineering-demo.md`, fuera de este repo.

## Lo que hice

1. **Leí la spec completa** y presenté un plan antes de tocar nada.
2. **Verifiqué los prerrequisitos** (punto de control a) con comandos de solo lectura:
   - `node -v` → v22.19.0 ✅ · `pnpm` 10.10.0 ✅ · `git` 2.50.1 ✅
   - `python3 --version` → 3.9.6 ❌ (la spec pide ≥ 3.11). Hay 3.12 en Homebrew; uso esa.
   - `gh auth status` → cuenta `FutureTales` activa, con scopes `repo` y `workflow` ✅
   - `vercel whoami` → cuenta correcta (ver "Lo que salió mal")
   - `supabase projects list` → sin sesión ❌ (ver "Lo que salió mal")
   - LibreOffice, gitleaks, jupyter, python-pptx → faltaban; los instalé.
3. **Validé las claves de API sin mostrarlas**: solo imprimí el nombre, la longitud y 4 caracteres del prefijo. Luego hice llamadas mínimas:
   - Anthropic: `GET /v1/models` (gratis) → la clave funciona y confirma los IDs de modelo.
   - Voyage: una llamada de embeddings con la palabra "hola" (2 tokens) → dimensión 1024, coincide con la columna `vector(1024)` de la spec.
   - Gemini: listar modelos → hay modelos de imagen disponibles.
4. **Escribí los 6 documentos de `docs/00-dar-forma/`** y este paso.

## Lo que decidió el humano

| Decisión | Resultado |
|---|---|
| Cuenta de Vercel | Confirmó que es la de Future Tales |
| Recorte de alcance por el plazo de 2 días | **Sí**: pasos 07–09 en versión ligera pero funcional; todo lo demás completo |
| Imágenes con Gemini | **Sí**, solo para ilustraciones conceptuales, siempre marcadas como generadas con IA; **nunca** para gráficos de datos ni capturas |
| Aprobación de la spec (punto de control b) | **Aprobada** sin cambios: "approved, keep messages exact, go to step 01" |
| Mensajes en la bitácora | Se mantienen **exactos**, sin corregir |

## Lo que salió mal y cómo lo corregí

1. **`supabase login` falló dentro del agente.** Error: `Cannot use automatic login flow inside non-TTY environments`. El agente no tiene una terminal interactiva. **Solución:** el humano ejecutó `supabase login` en una terminal aparte; el CLI guarda el token localmente y el agente lo usa. *Lección: los logins interactivos los hace la persona.*
2. **Me equivoqué con un ID de modelo.** Dije que `claude-sonnet-5-5` no existía, basándome en mi información interna. Al listar los modelos con la API real, sí existía. Lo corregí ante el humano. *Lección: verificar contra la fuente (la API), no contra la memoria del modelo. Es la misma regla que aplicamos a la app.*
3. **Un comando falló por comillas.** En zsh, `?` en una URL sin comillas se interpreta como comodín (`no matches found`). Lo repetí con la URL entre comillas simples.
4. **La cuenta de Vercel cambió entre chequeos.** El primer `vercel whoami` mostró una cuenta personal; más tarde, la de Future Tales. Volví a verificar consultando el usuario de la API de Vercel antes de continuar.

## Seguridad

- Las claves están en un archivo fuera del repositorio. Nunca se imprimieron completas.
- Recomendé restringir los permisos de ese archivo (`chmod 600`) y fijar un límite de gasto en la consola de Anthropic, porque la URL de la app será pública.
