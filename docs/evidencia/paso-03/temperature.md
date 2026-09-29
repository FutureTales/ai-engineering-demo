# Prueba: ¿el modelo acepta `temperature`?

Fecha: 2026-09-29. Llamada directa a `POST /v1/messages` con `"temperature": 0.2` y `max_tokens: 5`.

| Modelo | Resultado |
|---|---|
| `claude-sonnet-5-5` | `error`: "`temperature` is deprecated for this model." |
| `claude-haiku-4-5-20251001` | `message` (aceptado) |
