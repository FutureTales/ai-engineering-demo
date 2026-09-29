# Bitácora del agente — Paso 01

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

1. > "approved, keep messages exact, go to step 01"
2. Pregunta del agente sobre la identidad de git para el repo público → respuesta: **"Fernando López <fernando@futuretales.ai>"**
3. Mensaje recibido mientras trabajaba: > "continua autonomo y con full permisos hasta el final"

## Lo que hice

1. `git init -b main`; identidad local del repo (no global) `Fernando López <fernando@futuretales.ai>`.
2. Commit de los documentos del paso 00 y tag `paso-00-dar-forma`.
3. `gh repo create FutureTales/ai-engineering-demo --public` (vacío) y `git remote add origin`. **Sin push** hasta el punto de control (c).
4. Escribí `.gitignore`, `.env.example`, `LICENSE` (MIT), `CLAUDE.md`, `.claude/settings.json`, 2 hooks, 3 skills, el subagente `code-reviewer`, la plantilla de pasos, el CI con gitleaks y `.gitleaks.toml`.
5. Escribí `docs/03-agentes-de-codigo.md` y este paso.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| Hook anti-secretos con una clave falsa en `lib/ai.ts` (Write) | ✅ exit 2, `BLOCKED` |
| Mismo hook con código normal (`process.env...`) | ✅ exit 0 |
| Mismo hook escribiendo en `.env.local` (permitido) | ✅ exit 0 |
| Mismo hook con Edit (clave en `new_string`) | ✅ exit 2 |
| Hook aplicado a su propio código fuente (contiene los patrones como regex) | ✅ exit 0, no se bloquea a sí mismo |
| Hook de formato sin `node_modules` | ✅ exit 0, no hace nada |
| `gitleaks dir --redact -v .` y `gitleaks git --redact -v` | ✅ `no leaks found` |
| gitleaks con una clave falsa **bien formada** en una carpeta temporal | ✅ `leaks found: 1` |
| URL de descarga de gitleaks 8.30.1 usada en CI | ✅ responde (302 a la descarga) |
| Comandos de prueba documentados en `docs/03-agentes-de-codigo.md` | ✅ ejecutados tal cual, salida idéntica a la documentada |

## Lo que decidió el humano

| Decisión | Resultado |
|---|---|
| Autor de los commits en el repo público | Fernando López <fernando@futuretales.ai> (la cuenta global del equipo tenía un correo personal; se configuró solo para este repo) |
| Autonomía | "continua autonomo y con full permisos hasta el final": el agente sigue sin detenerse. El punto de control (c) lo ejecuta el agente: corre gitleaks, registra el resultado en la bitácora del paso 02 y lo reporta al final |

## Lo que salió mal y cómo lo corregí

1. **Una prueba del hook falló por culpa de la prueba, no del hook.** En zsh, `echo` convierte `\n` dentro del JSON en saltos de línea reales y `jq` rechaza el JSON (`control characters ... must be escaped`). Lo repetí con `printf`/tubería directa desde `jq` y pasó. Lo documenté como advertencia en `docs/03-agentes-de-codigo.md`.
2. **gitleaks no detectó mi primera clave falsa.** Había puesto un guion antes del sufijo `AA`, y la regla de Anthropic de gitleaks exige el formato exacto (93 caracteres + `AA`). Con el formato correcto la detectó. No es un error de gitleaks, pero muestra que **sus reglas son específicas**: por eso el hook usa patrones más amplios.
3. **Creé por error una carpeta `.venv-tools-tmp`** dentro del proyecto al lanzar las instalaciones. La borré antes del primer commit.
4. **Un diagrama Mermaid no compilaba y lo taggeé igual.** Encadené `mmdc` (validación) con `git commit` usando `;` en lugar de `&&`, así que el commit se hizo aunque la validación falló. Causa del error: en un `sequenceDiagram`, el `;` separa instrucciones y yo lo usé dentro de un mensaje. Lo cambié por comas, rehice el commit (`--amend`) y moví el tag; era seguro porque aún no había push. *Lección: las verificaciones deben cortar la cadena (`&&`).*
