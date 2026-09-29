# Verificación en vivo de las correcciones de la revisión (2026-09-29)

Servidor local (`pnpm dev`) con `DAILY_CONVERSATION_CAP=1` y la base de datos real.

| Prueba | Respuesta |
|---|---|
| Historial inventado de 3 mensajes con un id de conversación nuevo (intento de saltar el tope diario) | `429 {"error":"La demo alcanzó el máximo de conversaciones de hoy. …"}` |
| Historial de 29 mensajes con ~11.000 caracteres cada uno (~165 KB) | `413 {"error":"La conversación es demasiado larga. Empieza una nueva."}` |
| Parte de tipo `file` enviada como usuario | `400 {"error":"Solicitud inválida."}` |
| Login del personal con enlace mágico generado por la API de administración | `/panel/login` sin sesión → `/panel` con sesión, 6 solicitudes visibles por RLS |

Tests después de las correcciones: 65 unitarios y 4 e2e (modo mock, escritorio y celular).
