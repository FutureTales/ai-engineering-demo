# ADR 0003 — Recuperación híbrida: vectores + texto completo

**Estado:** aceptada y **confirmada con datos** en el paso 05: híbrido 8/8 frente a FTS 6/8 en paráfrasis; 100 % frente a 96,7 % sin precios inventados en la eval completa ([paso 05](../pasos/paso-05-rag.md))

## Contexto

Las MIPYMES describen su problema con sus palabras ("se me forman filas", "los camiones esperan"), no con el nombre del servicio ("simulación de eventos discretos"). Pero a veces usan términos exactos ("registro de marca", "SIC", "ISO 9001") que una búsqueda semántica puede diluir.

## Decisión

Recuperación **híbrida**:
1. **Vectorial** (embeddings de Voyage `voyage-3.5-lite`, multilingüe, 1024 dimensiones): encuentra significado aunque cambien las palabras.
2. **Texto completo de Postgres** (`to_tsvector('spanish', ...)`, índice GIN): encuentra términos exactos y maneja plurales y conjugaciones en español.
3. **Fusión RRF** (*Reciprocal Rank Fusion*): combina las dos listas por posición, sin tener que calibrar puntajes de naturaleza distinta.

**Si no hay `VOYAGE_API_KEY`**, el sistema funciona solo con texto completo y lo indica. Las evals del paso 05 comparan ambos modos con números reales.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Solo vectores | Falla con siglas y términos exactos (SIC, ISO) |
| Solo texto completo | Falla cuando el usuario usa otras palabras |
| Reranker con un LLM | Más latencia y costo; innecesario con 13 documentos. Se reconsidera si las evals lo piden |
| Meter todo el catálogo en el prompt | Con 13 documentos sería posible, pero no escala y no enseña RAG. Se discute en el paso 05 |

## Consecuencias

- ✅ Robustez ante distintas formas de preguntar.
- ✅ Degradación elegante: sin clave de embeddings, la app sigue funcionando.
- ⚠️ Una dependencia más (Voyage) y un paso de ingesta que hay que repetir cuando cambie el catálogo.
