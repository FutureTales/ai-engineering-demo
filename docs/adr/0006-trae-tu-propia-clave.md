# ADR 0006 — "Trae tu propia clave": la app pública no paga el uso de nadie

**Estado:** aceptada (después del paso 10)

## Contexto

La app es pública y se comparte con un código QR. Hasta ahora, cada conversación en producción usaba la clave de API del proyecto: cualquiera que la probara gastaba el crédito del autor. Los límites de uso acotaban el daño, pero la regla que queremos es otra: **cada quien paga su propio uso**.

## Decisión

1. **La producción no tiene clave del modelo** (se quitaron `ANTHROPIC_API_KEY` y `VOYAGE_API_KEY` de Vercel). Así, subsidiar el uso por accidente es imposible.
2. **Sin clave, la app funciona en modo demo:** respuestas grabadas del caso del hotel, con las herramientas reales (simulación, búsqueda offline, aprobación). Costo cero.
3. **Con clave propia**, el modelo real responde. La persona pega su clave de Anthropic (y, si quiere, la de Voyage) en `/copilot`:
   - Se guarda **solo en esa pestaña del navegador** (`sessionStorage`) y se borra al cerrarla.
   - Viaja por HTTPS en un encabezado (`x-anthropic-key`) **en cada solicitud**, nunca en el cuerpo ni en el historial.
   - El servidor la usa para esa respuesta y **no la guarda ni la registra**: los errores del proveedor se registran solo como tipo y código HTTP, y la telemetría no la incluye.
   - Si la persona no da su clave de Voyage, la búsqueda usa texto completo; **nunca** se usa la clave de Voyage del servidor para una persona con clave propia.
4. **Para control total**, cada quien puede desplegar su propia copia (botón "Deploy" en el README y [`setup.md`](../setup.md)), con sus claves en sus propias variables de entorno.

La lógica vive en [`lib/ai/credentials.ts`](../../lib/ai/credentials.ts) (con tests) y en [`components/chat/api-key-panel.tsx`](../../components/chat/api-key-panel.tsx).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener la clave del proyecto con límites más estrictos | Sigue siendo un subsidio; el límite solo decide cuánto |
| Llamar a Anthropic **directo desde el navegador** con la clave del usuario | La clave no pasaría por nuestro servidor, pero el agente necesita el servidor (herramientas, base de datos, rate limit); habría que partir la arquitectura en dos |
| Login con cuenta y clave guardada en la base de datos | Guardar claves ajenas es una responsabilidad (cifrado, rotación, filtraciones) desproporcionada para una demo |
| Solo modo demo, sin opción de clave | Quien quiere probar su propio caso tendría que desplegar una copia completa |

## Consecuencias

- ✅ El proyecto no paga el uso de nadie; cada persona ve el costo real en su propia cuenta (y en "Bajo el capó").
- ✅ La demo sin clave funciona siempre, incluso sin red hacia la API.
- ⚠️ **Confianza:** la clave pasa por el servidor de la demo. Mitigaciones: HTTPS, no se guarda ni se registra, código abierto para verificarlo, y la recomendación de crear una clave dedicada con límite de gasto y borrarla después. Quien no quiera confiar, despliega su copia.
- ⚠️ Las solicitudes de personas con clave propia siguen pasando por el rate limit y pueden guardar pre-propuestas en la base de datos del proyecto (plan gratuito de Supabase).
- ⚠️ En modo demo, el copiloto **siempre** responde con el caso del hotel, aunque se le escriba otra cosa; la interfaz lo dice.
