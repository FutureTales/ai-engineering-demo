# Revisión agéntica y auditoría de seguridad (paso 08)

Antes de cerrar el producto, el agente principal delegó la revisión a un **subagente revisor** con las instrucciones de [`.claude/agents/code-reviewer.md`](../.claude/agents/code-reviewer.md): de solo lectura, enfocado en seguridad, correctitud y pruebas, con contexto limpio (no "conoce" las intenciones del autor). Además se le pidió una auditoría de RLS, exposición de claves, inyección y rate limit.

**Veredicto del revisor: `NOT READY`.** Encontró 3 problemas de severidad alta, cada uno barato de explotar con una URL pública en un QR. Este documento registra cada hallazgo, qué hicimos y cómo lo verificamos.

> Esta es la competencia **"Revisar el trabajo"** del pilar 3 en acción. El agente principal había escrito tests, evals, guardrails y una prueba del rate limit… y aun así se le escaparon tres formas de disparar el costo. Una revisión independiente las encontró en 7 minutos.

## Chequeos automáticos del revisor

| Chequeo | Resultado |
|---|---|
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ✅ (55/55 en ese momento) |
| `gitleaks git` (historial) | ✅ sin hallazgos |
| `gitleaks dir` | Solo `.env.local`, `.venv` y `.next` (ignorados por git); los JWT de `.next` son de rol `anon` |
| Búsqueda de `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `createAdminClient`, `sk-ant-` en el bundle del navegador (`.next/static`) | ✅ nada |

## Hallazgos y acciones

| # | Severidad | Hallazgo (resumen del revisor) | Acción | Verificación |
|---|---|---|---|---|
| 1 | **Alta** | **Se puede saltar el tope diario.** La ruta consideraba "conversación nueva" solo si el cliente enviaba exactamente 1 mensaje. Un script con un historial inventado de 2 mensajes nunca incrementaba el contador | **Corregido.** El servidor decide: `registerConversation()` hace un *insert-or-ignore* atómico por id y solo cuenta la primera vez ([`rate-limit.ts`](../lib/guardrails/rate-limit.ts)) | En vivo, con `DAILY_CONVERSATION_CAP=1`: historial falso con id nuevo → **HTTP 429** |
| 2 | **Alta** | **Historial sin límite de tamaño.** El límite de 2.000 caracteres solo aplicaba al último mensaje; 39 mensajes inventados de 100 KB → cientos de miles de tokens facturados por solicitud | **Corregido.** [`validateChatMessages`](../lib/guardrails/input.ts) revisa **todos** los mensajes: 150.000 caracteres en total, 2.000 por mensaje del usuario, solo tipos de parte conocidos y nada de archivos | 7 tests unitarios; en vivo: historial inflado → **413**, parte de archivo → **400** |
| 3 | **Alta** | **DoS con `simulate_queue`.** Los topes permitían 10.000 llegadas/h × 24 h × 200 servidores × 200 réplicas × 6 escenarios (~10¹⁰ operaciones en una llamada) | **Corregido.** Topes en el esquema (≤ 2.000 llegadas/h, ≤ 12 h, ≤ 100 puestos, **≤ 5.000 clientes por escenario**), réplicas adaptativas (presupuesto de 300.000 clientes simulados) y sin `push(...spread)` | Tests: el peor caso permitido termina en < 5 s; el esquema rechaza 2.000/h × 12 h |
| 4 | Media | **Aprobaciones sin firma.** El SDK aceptaba cualquier par solicitud/respuesta de aprobación que el cliente pusiera en el historial: se podía "aprobar" un `create_request` que el modelo nunca propuso | **Corregido.** `experimental_toolApprovalSecret` con un secreto del servidor (`TOOL_APPROVAL_SECRET`): el servidor solo acepta aprobaciones que él emitió | Revisión de código. **No se probó un ataque en vivo** |
| 5 | Media | **Historial falsificado como contexto.** Un cliente puede inventar un resultado de `search_services` ("90 % de descuento") y el modelo podría repetirlo | **Riesgo aceptado, documentado.** El atacante solo engaña **a su propia conversación**: nadie más la ve, el precio de la pre-propuesta lo recalcula el código desde el catálogo y guardar requiere una aprobación firmada. La solución completa (historial solo del lado del servidor) queda en el [roadmap](roadmap-v2.md) | — |
| 6 | Baja | El personal podía editar **cualquier** columna de `requests` (incluido el precio) | **Corregido.** `grant update (status)`: solo el estado ([migración](../supabase/migrations/20260929190000_review_fixes.sql)) | Migración aplicada |
| 7 | Baja | El panel usaba `STAFF_EMAILS` y el RLS la tabla `private.staff_allowlist`: dos fuentes que podían desincronizarse | **Corregido.** El panel llama a `am_i_staff()`, que ejecuta **la misma** verificación que el RLS | Login de punta a punta: sigue entrando y ve las 6 solicitudes |
| 8 | Baja | La IP se tomaba del primer valor de `x-forwarded-for`; IPv6 permite rotar direcciones dentro de un /64 | **Corregido.** `ipAddress()` de `@vercel/functions` y agrupación IPv6 por /64 | Revisión de código |
| 9 | Baja | El hash de IP usaba como sal el id público del proyecto: con acceso a la base, se puede revertir por fuerza bruta | **Corregido.** Sal secreta `RATE_LIMIT_SALT` | Revisión de código |
| 10 | Baja | El formulario de enlace mágico no tenía rate limit | **Corregido.** 5 solicitudes por IP cada 10 minutos. El canal lateral de tiempo (responde distinto si el correo es del personal) queda como riesgo menor | Revisión de código |
| 11 | Baja | Sin `import "server-only"` en el cliente con la service role | **No aplicado, con motivo:** los scripts de Node (`seed`, `ingest`, evals) importan ese módulo, y `server-only` lanza un error fuera del bundler de React. Hoy ningún componente del navegador lo importa (el revisor lo verificó en el bundle) | — |
| 12 | Baja | Faltaban tests de los guardrails de la ruta | **Parcial.** Tests de la validación de entrada y de los topes de la simulación. El rate limit se prueba contra la base real con [`scripts/test-rate-limit.ts`](../scripts/test-rate-limit.ts) | 65 tests |

### Otros puntos menores

| Punto | Acción |
|---|---|
| CI descargaba gitleaks sin verificar el checksum | **Corregido:** hash SHA-256 fijado en el workflow y verificado localmente |
| `settings.json` niega `cat .env*`, pero `head` o `grep` lo evitan | Aceptado: la negación de `Read(./.env.local)` y el hook anti-secretos son la defensa principal. Un deny list de comandos nunca es completo; se documenta como limitación en [agentes de código](03-agentes-de-codigo.md) |
| ¿La configuración de Auth de `config.toml` aplica en el proyecto remoto? | **Verificado:** se subió con `supabase config push` y un segundo `push` reporta *"Remote Auth config is up to date"* |
| MFA TOTP habilitado pero no exigido | Aceptado para la demo (un solo usuario del personal) |

### Lo que el revisor revisó y encontró bien

- **Redirección abierta en `/auth/confirm`:** `next` debe empezar por `/panel` y se resuelve contra el mismo origen.
- **XSS:** `react-markdown` sin `rehype-raw`, con la transformación de URLs por defecto.
- **Inyección de mensajes de sistema:** el SDK rechaza mensajes `system` en el historial.
- **RLS:** activo en todas las tablas; `anon` sin permisos ni políticas; las funciones `SECURITY DEFINER` fijan `search_path = ''` y solo las ejecuta `service_role` (`is_staff` también `authenticated`, como se diseñó).
- **Secretos:** ninguno en el historial de git.

## Lecciones

1. **Revisar con contexto limpio encuentra lo que el autor no ve.** Los tres hallazgos graves venían del mismo supuesto implícito: "el historial que manda el cliente es el que mostró la UI". El autor escribió la UI y la ruta, y por eso no lo cuestionó.
2. **Un hallazgo no es una verdad:** el revisor marcó sus dudas como *needs confirmation*, y cada corrección se verificó (tests y pruebas en vivo) antes de darla por buena.
3. **Aceptar un riesgo también es una decisión**, siempre que quede escrita con su motivo (hallazgos 5 y 11).
