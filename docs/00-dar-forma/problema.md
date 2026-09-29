# El problema

> **Aviso:** el "Centro de Innovación Caribe", sus servicios y todas las MIPYMES de este repositorio son **ficticios**. Este es un proyecto educativo.

## Contexto

Las MIPYMES de Bolívar (hoteles boutique, panaderías, talleres de confección, operadores logísticos cerca del puerto, startups, cooperativas) tienen problemas reales de operación, calidad e innovación. Muchas no saben **qué tipo de ayuda necesitan** ni **a quién pedirla**.

Un centro de innovación universitario tiene justo lo que les falta: simulación de procesos, prototipado, formulación de proyectos, propiedad intelectual, analítica. Pero la puerta de entrada al centro es lenta.

## Cómo funciona hoy (proceso manual)

```mermaid
flowchart LR
    A[Empresa llega<br/>con un problema] --> B[Alguien del centro<br/>lo escucha]
    B --> C[Lo encuadra en<br/>una línea de trabajo]
    C --> D[Decide qué<br/>servicio aplica]
    D --> E[Hace un análisis<br/>'what if' a mano]
    E --> F[Arma una oferta]
```

Cada paso depende de una persona con experiencia. Los problemas que genera:

1. **Cuello de botella humano.** Hay pocos coordinadores y muchas empresas que atender.
2. **Encuadre inconsistente.** El mismo problema puede terminar en líneas distintas según quién lo atienda.
3. **Análisis tardío.** El "what if" (¿y si contrato un recepcionista más?) llega semanas después, cuando la empresa ya perdió el interés.
4. **Oferta genérica.** Sin números del caso concreto, la propuesta no convence.

## Por qué IA

Un modelo de lenguaje es bueno en lo que hoy hace la persona en los primeros pasos:

- **Entender un problema contado en lenguaje natural**, con errores, contexto incompleto y jerga local.
- **Hacer las preguntas correctas** para completar la información.
- **Relacionar el problema con un catálogo** de servicios y explicar por qué aplica.
- **Redactar** una pre-propuesta clara.

## Por qué **no solo** IA

Esta es la idea más importante del proyecto. Hay cosas en las que un LLM **no** es confiable:

| Tarea | ¿LLM solo? | Qué usamos |
|---|---|---|
| Calcular tiempos de espera en una fila | ❌ Puede inventar números plausibles pero falsos | Herramienta determinista `simulate_queue` (teoría de colas Erlang C + simulación) |
| Saber qué servicios y precios tiene el centro | ❌ Los inventa si no los conoce | Recuperación (RAG) sobre el catálogo real |
| Guardar una solicitud | ❌ No tiene memoria ni base de datos | Herramienta `create_request` + Postgres |
| Saber si el sistema funciona bien | ❌ "Se ve bien" no es una métrica | Evals automáticas y revisión humana |
| Decidir si se hace la propuesta | ❌ Es una decisión humana | El coordinador revisa en `/panel` |

> **El LLM no calcula: decide cuándo llamar a una herramienta que sí calcula.**

## El problema en una frase

> Las MIPYMES tardan demasiado en recibir un diagnóstico y una propuesta concreta del centro de innovación, porque el encuadre inicial depende de pocas personas y el análisis cuantitativo llega tarde.

## Qué **no** es este problema

- No reemplazamos al coordinador: le llegan casos mejor encuadrados.
- No vendemos servicios automáticamente: generamos una **pre-propuesta** que un humano revisa.
- No damos asesoría legal ni financiera definitiva.
