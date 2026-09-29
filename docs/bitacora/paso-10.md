# Bitácora del agente — Paso 10

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Memo para la dirección, retrospectiva, roadmap v2, slides del caso práctico integrados al deck existente (sin modificarlo) con QR doble, guion de ~60 minutos con plan B, y la portada del repo.

## Lo que hice

1. Inspeccioné el deck original con python-pptx y lo renderizé para ver su estilo; extraje paleta, fuentes y posiciones exactas.
2. `presentacion/build_deck.py`: 14 slides nuevos (17–30) desde una copia, con todos los números leídos de archivos. Referencias pasa al slide 31.
3. Diagrama de arquitectura con Mermaid → PNG; gráficos con matplotlib en la paleta del deck; QR con la librería `qrcode`.
4. Instantánea de salud real (`scripts/export-health.ts`) para el slide de producción.
5. Memo, retrospectiva, roadmap, guion, matriz, glosario y README.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| El deck original no cambió | ✅ mismo tamaño (383.729 bytes) y fecha (09:24) |
| QR decodificados desde el PNG | ✅ ambos |
| QR decodificados **desde el slide renderizado** | ✅ ambos (repo y app) |
| Revisión visual de los 14 slides nuevos | ✅ tras corregir 6 defectos (ver abajo) |
| Enlaces a la serie de *The Batch* | ✅ los 5 responden 200 |

## Lo que salió mal y cómo lo corregí

1. **Primer render del deck:** dos títulos en dos líneas que pisaban el contenido, la tabla de ML chocando con la nota al pie, un título de tarjeta en dos líneas, una captura ilegible y el aviso del slide de QR encima de una URL. Corregí y volví a renderizar hasta dejarlo limpio.
2. **El enlace "con errata" de la spec era el correcto.** La URL de la Parte 2 empieza con `he-ai-engineering…` (sin "t"). La "corregí" mentalmente, la probé y la versión corregida da **500**; la original da 200. Dejé la original.
3. **Números sin verificar en mis borradores:** en el memo escribí un costo de infraestructura de memoria (planes pagos); lo quité porque no lo verifiqué. En la retrospectiva escribí "8 cambios de API" y, al contarlos, eran al menos 10.

## Costo de API de la app durante el desarrollo

Suma de los costos registrados en `evals/results/`, `docs/evidencia/` y los scripts, con los precios públicos: **≈ US$ 4,6 en Claude**. No incluye la sesión del agente de código (Claude Code) que construyó el proyecto; ese costo se consulta con `/cost` en Claude Code o en console.anthropic.com → Usage. Gemini: 5 imágenes (no convertidas a dólares; tarifa no verificada). Voyage: dentro de los tokens gratuitos.

## Revisión final antes de reportar

Una última revisión independiente del trabajo completo encontró:

1. **El límite por IP habría bloqueado la charla.** La IP y la sesión tenían el mismo límite (20 cada 10 min), y en el Wi-Fi del campus toda la sala comparte una IP. Corregido: `RATE_LIMIT_IP_MAX = 200` (configurado en Vercel), la sesión sigue en 20, y el guion indica hacer la demo desde la red del celular. Ninguna de mis pruebas podía verlo: todas salían de una sola máquina.
2. **Una evidencia citada había sido sobrescrita.** La segunda corrida en producción pisó `resultado.json`, que el memo y el paso 09 citaban con otras cifras. Recuperé la primera desde git, guardé cada corrida con su fecha y el script ya no sobrescribe.
3. **El costo estaba mal rotulado.** Los US$ 4,6 son el uso de API **de la app** durante el desarrollo. No incluyen la sesión del agente de código que construyó el proyecto; ahora README, memo y guion lo dicen.
4. **Los slides de los pasos no mostraban su tag de git** (lo pide la spec). Agregado en el pie de los slides 20–28; deck re-renderizado y revisado.
5. Chequeos agregados: enlaces relativos, RLS con la clave pública después de los cambios del paso 08, y ausencia de marcas reales en la app ([evidencia](../evidencia/paso-10/verificacion-final.md)).
