# Bitácora del agente — Paso 05

**Fecha:** 2026-09-29
**Agente:** Claude Code (modelo `claude-opus-5-5`)

## Lo que me pidieron

Paso 05 de la spec (autonomía total vigente): ingesta con chunking y embeddings, función SQL híbrida con RRF, respuestas con citas, documentar qué va en el prompt y qué en recuperación (y por qué no hace falta un grafo), y volver a correr las evals comparando con la línea base (FTS contra híbrido).

## Lo que hice

1. Migración `match_chunks`: FTS en español con **OR** entre términos + pgvector, fusionados con RRF; `security invoker` y ejecución solo para `service_role`.
2. Ingesta con checksums y chunking por sección; recuperación "small-to-big".
3. Prompt `v2-rag`: políticas e índice de servicios en el prompt con caché; fichas por recuperación en un segundo bloque de sistema, después del punto de caché.
4. Evals: chequeo `cites_catalog`, registro del modo de recuperación por turno, script `eval:compare` que re-califica todas las versiones con los chequeos actuales, y métrica `simulationRecall`.
5. Experimentos del recuperador: recall@3 en el dataset y prueba de paráfrasis.
6. Gráfico de evolución con matplotlib y la paleta de la presentación.

## Lo que verifiqué

| Prueba | Resultado |
|---|---|
| Ingesta | ✅ 13 documentos, 71 chunks, 71 con embedding |
| Recall@3 del recuperador (27 casos) | ✅ FTS 27/27 (p50 189 ms) · híbrido 27/27 (p50 441 ms) |
| Paráfrasis (8 casos) | ✅ FTS 6/8 · híbrido **8/8** |
| Eval completa FTS | ✅ 23/30; sin precios inventados 96,7 % |
| Eval completa híbrida | ✅ 24/30; sin precios inventados **100 %** |
| Tests unitarios | ✅ 35 passed (incluye chunking) |

## Lo que decidió el humano

Nada nuevo. Decisión del agente, **basada en los datos** anteriores: híbrido en producción con respaldo a FTS.

## Lo que salió mal y cómo lo corregí

1. **Voyage respondió 429 a la tercera solicitud.** Sin método de pago, la cuenta permite 3 solicitudes/min y 10K tokens/min (el mensaje lo dice). Soluciones: reintentos con espera en ingesta y evals; en el chat, **respaldo inmediato a FTS**. *Recomendación al humano: agregar un método de pago en Voyage; los 200M tokens gratis siguen aplicando.*
2. **La ingesta marcaba documentos como procesados antes de tener sus embeddings.** Cuando falló el 429, el documento `formulacion-proyectos-idi` quedó con checksum pero sin chunks, y la siguiente corrida se lo saltó. Lo detecté contando documentos (12 de 13). Corrección: calcular embeddings **antes** de guardar el documento, y re-ingestar con `--force`.
3. **El gráfico mostraba 83 % en "simula cuando corresponde" para una versión sin herramientas.** La métrica premia "no simuló" en los 25 casos que no son de filas. Agregué `simulationRecall` (solo los 5 casos de filas) y el gráfico pasó a mostrar 0 %, que es la verdad.
4. **Mezcla de pasos en el working tree.** Mientras corría la eval híbrida (lenta por el límite de Voyage), empecé el código del paso 06. Para que el tag `paso-05-rag` tenga solo el paso 05, guardé el trabajo del paso 06 con `git stash push -u -- <rutas>` y lo recuperé después del tag.
5. **Un script de prueba falló por `await` en el nivel superior** (tsx compila a CJS). Lo convertí en un script permanente con `main()`: la eval del recuperador.
6. **Estimé mal un número en el doc.** Escribí "unos 4.000 tokens" para el catálogo completo; al medirlo con `count_tokens` dio **5.989**. Lo corregí antes de publicar. *Lección: incluso una estimación "razonable" se mide.*

## Costo de API de este paso

Desde los archivos de resultados: eval FTS US$ 0,70 + eval híbrida US$ 0,73 + prueba de 3 casos US$ 0,10 ≈ **US$ 1,53** en Claude. Voyage: dentro de los tokens gratuitos.
