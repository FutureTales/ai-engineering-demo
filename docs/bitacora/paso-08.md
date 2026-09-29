# Bitácora del agente — Paso 08

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Paso 08 en su versión ligera acordada: panel con login y KPIs, tests unitarios + e2e en modo mock + accesibilidad básica, CI completo, revisión con el subagente `code-reviewer` y auditoría de seguridad, con hallazgos y correcciones en `docs/revision-agentica.md`.

## Lo que hice

1. Cargué la guía de Supabase y busqué el código **actual** de SSR para Next.js (con `search_docs`): `setAll(cookies, headers)` de `@supabase/ssr` 0.12, `proxy.ts` (Next 16) y `getClaims()` en el servidor.
2. Configuré Auth del proyecto remoto con `supabase config push`: URLs de redirección y **registro desactivado**. Creé la cuenta del personal con la API de administración.
3. Panel, detalle, KPIs y login, todo con la sesión del usuario (RLS).
4. Probé el login de punta a punta **sin enviar correos**: un enlace generado por la API de administración, abierto en un navegador real.
5. Agregué el job de e2e al CI.
6. Lancé el subagente revisor en segundo plano (7 minutos, 25 herramientas), corregí sus hallazgos y verifiqué cada corrección en vivo.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| `/panel` sin sesión | ✅ redirige a `/panel/login` |
| Enlace mágico → `/panel` | ✅ 6 solicitudes visibles por RLS; detalle carga |
| Correcciones de la revisión (en vivo) | ✅ tope diario 429 · historial inflado 413 · archivo 400 |
| Tests | ✅ 65 unitarios · 4 e2e |
| Hash fijado de gitleaks | ✅ `shasum --check` OK sobre la descarga real |

## Lo que decidió el humano

Nada nuevo. Riesgos aceptados **por el agente** (hallazgos 5 y 11 de la revisión), documentados con su motivo para que el humano los revise.

## Lo que salió mal y cómo lo corregí

1. **`supabase config push` cambió más de lo que quería.** Además de desactivar el registro y poner las URLs, el diff mostró que bajaba el OTP de 8 a 6 dígitos, la frecuencia entre correos de 1 min a 1 s, apagaba la confirmación de correo y el TOTP. Eran los valores por defecto de `config.toml` pisando los del proyecto. Los alineé con los del remoto, volví a subir y un segundo `push` confirmó *"Remote Auth config is up to date"*.
2. **El revisor encontró 3 fallas graves en guardrails que yo había probado.** Mis pruebas usaban el cliente "honesto" (la UI). El revisor pensó como un atacante que fabrica el historial. *Lección: probar la API, no solo la interfaz.*
3. **Un reemplazo en `rate-limit.ts` no aplicó** (prettier había cambiado el formato de una función) y el typecheck lo delató (`has no exported member 'registerConversation'`). Lo rehice sobre el contenido real del archivo.
4. **Verificar el checksum contra un archivo descargado del mismo lugar no protege de una release comprometida.** Cambié a un hash fijado en el workflow.

## Costo de API de este paso

Las pruebas en vivo terminaron en 429/413/400 antes de llamar al modelo (≈ US$ 0). El revisor no llamó APIs pagas.
