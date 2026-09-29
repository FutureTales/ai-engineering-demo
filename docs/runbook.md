# Runbook — Innova Copilot en producción

Qué hacer cuando algo sale mal. Escrito para quien opere la app, incluida una demo en vivo.

| Dato | Valor |
|---|---|
| URL de producción | https://innova-copilot.vercel.app |
| Proyecto Vercel | `fernando-9971s-projects/ai-engineering-demo` (región `iad1`) |
| Base de datos | Supabase `tpgnyqzcebcatmxmbycj` (`us-east-1`) |
| Salud del asistente | https://innova-copilot.vercel.app/panel/salud (requiere login) |
| Logs | `vercel logs innova-copilot.vercel.app` o el dashboard de Vercel → Logs |

---

## 0. Quién paga cada respuesta

La producción **no tiene clave del modelo** ([ADR 0006](adr/0006-trae-tu-propia-clave.md)). Sin clave, la app responde en **modo demo** (costo cero). Con la clave de cada persona, el costo va a su cuenta. Para una demo en vivo, quien presenta pega **su propia** clave en `/copilot`, como cualquier usuario.

## 1. La API del modelo falla o está lenta (demo en vivo)

**Síntomas:** el chat muestra "El copiloto tuvo un problema al responder"; en `/panel/salud` sube la tasa de errores; en los logs aparece `[chat] stream error`.

**Acción inmediata (plan B, < 2 minutos):**

```bash
# Local, sin red ni claves: la demo completa del hotel funciona igual
AI_MODE=mock ANTHROPIC_API_KEY= pnpm dev
# abrir http://localhost:3000/copilot → "Hotel con filas en el check-in"
```

**En producción** (si la caída dura más que unos minutos):

```bash
printf 'mock' | vercel env add AI_MODE production --force --yes
vercel deploy --prod   # desde la raíz del repo; toma las variables nuevas
# volver a live:
printf 'live' | vercel env add AI_MODE production --force --yes && vercel deploy --prod   # desde la raíz del repo; toma las variables nuevas
```

En modo mock el copiloto **solo reproduce el caso del hotel**, y la pre-propuesta no se guarda (la tarjeta dice "Demo (no guardada)").

**Verificar:** estado de la API en https://status.anthropic.com.

## 2. La búsqueda vectorial (Voyage) falla o limita

**Síntomas:** en "Bajo el capó" o en los logs aparece el modo `fts` con motivo `Voyage 429`.

**No requiere acción:** la búsqueda cae automáticamente a texto completo (FTS). La calidad baja un poco con paráfrasis (6/8 frente a 8/8 en la prueba del paso 05).

**Causa conocida:** la cuenta de Voyage **no tiene método de pago** y está limitada a 3 solicitudes por minuto. **Solución definitiva:** agregar un método de pago en https://dashboard.voyageai.com (los 200M tokens gratis siguen aplicando).

## 3. Se dispara el costo (copias con clave del servidor)

> En la app pública esto ya no aplica: no hay clave del servidor. Aplica si despliegas tu propia copia con `ANTHROPIC_API_KEY`.

**Síntomas:** en `/panel/salud` sube el costo del día; en console.anthropic.com → Usage.

**Controles que ya existen:**
- Límite de gasto mensual en la consola de Anthropic (**configúralo si no lo hiciste**).
- Rate limit: 20 mensajes cada 10 minutos **por sesión** y 200 **por IP** (en el Wi-Fi del campus, toda la sala comparte una IP).
- Tope diario: `DAILY_CONVERSATION_CAP` (por defecto 300 conversaciones nuevas por día).

**Acción:** bajar el tope diario y volver a desplegar:

```bash
printf '50' | vercel env add DAILY_CONVERSATION_CAP production --force --yes
vercel deploy --prod   # desde la raíz del repo; toma las variables nuevas
```

Referencia para decidir el tope: cada caso de la eval del paso 06 costó en promedio **US$ 0,018**, así que 300 conversaciones cuestan del orden de US$ 5–10 (depende de cuántos turnos tengan).

## 4. Abuso por el QR (muchas solicitudes, texto basura, intentos de inyección)

**Síntomas:** muchos 429 en los logs; conversaciones raras en `/panel`.

**Controles automáticos:** rate limit por sesión (20 cada 10 min) y por IP (200 cada 10 min), tope diario, largo máximo de 2.000 caracteres, fallo cerrado si no se puede verificar el límite (503), inyección resistida (evals adversariales 2/2), y aprobación del usuario para guardar.

**Acción si hace falta:** bajar `RATE_LIMIT_MAX_MESSAGES` (por ejemplo, a 8) o `RATE_LIMIT_IP_MAX` o activar el modo mock (sección 1). Para bloquear IPs concretas: Vercel → Firewall.

**Limitación conocida:** el límite por IP usa ventanas fijas de 10 minutos; en el borde de una ventana alguien puede enviar hasta el doble.

## 5. Un deploy rompió algo → rollback

```bash
vercel ls ai-engineering-demo            # lista de deploys; elegir el último que funcionaba
vercel rollback <url-del-deploy-bueno>   # o desde el dashboard: Deployments → ⋯ → Promote
```

Después: `git revert` del commit culpable y push (CI debe quedar en verde antes de volver a desplegar).

## 6. Supabase pausado o caído

**Síntomas:** el chat responde 503 ("El servicio no está disponible"), porque el rate limit falla cerrado; el panel no carga.

**Causa probable:** el plan gratuito **pausa el proyecto tras un periodo sin actividad**. **Acción:** Supabase dashboard → Restore project, o `supabase projects list` para ver el estado. Mientras tanto: modo mock (sección 1).

## 7. Cambié el prompt: ¿cómo sé que no empeoró? (regresión)

**Regla:** ningún cambio de prompt, modelo o herramientas se publica sin evals.

```bash
pnpm eval --label <nombre-del-cambio>        # en vivo (~US$ 0,75, 30 casos)
pnpm eval:compare paso-06-agente <nombre-del-cambio>
```

Criterio para publicar: **no bajar** en "casos que pasan todo" ni en "sin precios fuera de catálogo" frente a la última versión publicada. El CI corre `pnpm eval --mock` en cada push (verifica el runner y los chequeos con las respuestas grabadas), pero **no** llama al modelo. La eval en vivo es un paso manual obligatorio antes de mergear cambios de prompt (ver [paso 09](pasos/paso-09-produccion.md)).

## 8. Datos personales

Si alguien escribe datos sensibles (cédula, cuenta bancaria) en el chat: el copiloto pide que no lo haga y no los repite (eval `adv-05`). Pero el mensaje **sí queda** en los registros del proveedor del modelo. Si una persona pide borrar sus datos (Ley 1581): borrar su fila en `requests` desde el dashboard de Supabase.

## 9. Riesgo con fecha: retiro de Haiku 4.5

Según la documentación de Anthropic (consultada el 2026-09-29), `claude-haiku-4-5` se retira "no antes del 15 de octubre de 2026". Lo usa **solo el juez de las evals** y el notebook del paso 07, no el chat. Para migrar: cambiar `MODELS.fast` en `lib/ai/models.ts`, volver a correr las evals y comparar el acuerdo del juez.
