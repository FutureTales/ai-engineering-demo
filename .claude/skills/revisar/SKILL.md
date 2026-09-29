---
name: revisar
description: Review the current changes before closing a step. Runs lint, typecheck, tests and gitleaks, then delegates a security/correctness/test review to the code-reviewer subagent. Use when the user types /revisar or before tagging a step.
argument-hint: "[rango de git, ej.: paso-04-evals..HEAD]"
---

# /revisar — revisión antes de cerrar un paso

## Pasos

1. Determina qué revisar: el rango de `$ARGUMENTS` si viene, o si no el último tag `paso-*` hasta el working tree (`git describe --tags --match 'paso-*' --abbrev=0`).
2. Corre los chequeos automáticos y guarda la salida:
   - `pnpm lint`, `pnpm typecheck`, `pnpm test` (si existe `package.json`)
   - `gitleaks git --redact -v` y `gitleaks dir --redact -v .`
3. Delega la revisión humana-simulada al subagente **code-reviewer** con el rango de cambios. Pídele hallazgos priorizados (seguridad, correctitud, pruebas).
4. Presenta en español:
   - Tabla de chequeos automáticos: ✅ / ❌ con el comando.
   - Hallazgos del subagente, del más grave al menos grave, con `archivo:línea`.
5. **No corrijas nada automáticamente.** Pregunta qué hallazgos corregir. Lo que se corrija y lo que se descarte (con el motivo) va a la bitácora del paso.
