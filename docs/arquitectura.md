# Arquitectura

> Este documento se actualiza a medida que avanzan los pasos. Los componentes marcados como *(paso XX)* todavía no existen en ese punto del historial.

## 1. Contexto: quién usa el sistema y con qué habla

```mermaid
flowchart LR
    MIPYME([👤 Dueña de MIPYME<br/>celular o computador])
    STAFF([👤 Coordinador del centro])
    subgraph IC[Innova Copilot]
        APP[App web Next.js<br/>en Vercel]
    end
    CLAUDE[(API de Claude<br/>Anthropic)]
    VOYAGE[(Voyage AI<br/>embeddings)]
    SB[(Supabase<br/>Postgres + pgvector + Auth)]
    MIPYME -->|conversa en /copilot| APP
    STAFF -->|revisa en /panel| APP
    APP -->|prompt + herramientas| CLAUDE
    APP -->|embedding de la consulta| VOYAGE
    APP -->|SQL con service role| SB
    STAFF -.->|magic link| SB
```

## 2. Componentes

```mermaid
flowchart TB
    subgraph Browser[Navegador]
        UI[/copilot: chat con streaming<br/>tarjetas de herramientas, gráfico/]
        PANEL[/panel: solicitudes, KPIs, salud/]
    end
    subgraph Vercel[Vercel · iad1]
        API[app/api/chat<br/>route handler]
        GUARD[lib/guardrails<br/>longitud, rate limit, tope diario]
        AGENT[lib/ai<br/>modelos, prompt, loop del agente]
        TOOLS[lib/tools<br/>search_services · simulate_queue · create_request]
        RAG[lib/rag<br/>búsqueda híbrida]
        TEL[lib/telemetry<br/>tokens, costo, latencia]
        MOCK[modo mock<br/>respuestas grabadas]
    end
    subgraph Supabase[Supabase · us-east-1]
        T1[(services · documents · chunks)]
        T2[(conversations · messages · requests)]
        T3[(interactions · eval_runs · eval_results)]
        T4[(rate_limits)]
    end
    UI --> API --> GUARD --> AGENT
    AGENT --> TOOLS
    TOOLS --> RAG --> T1
    TOOLS -->|create_request| T2
    AGENT --> TEL --> T3
    GUARD --> T4
    API -. AI_MODE=mock .-> MOCK
    PANEL -->|RLS: solo staff| T2
    PANEL --> T3
```

| Componente | Paso en que aparece |
|---|---|
| Landing, esquema de datos, seed, despliegue | 02 |
| Chat con streaming, un solo prompt, "Bajo el capó" | 03 |
| Evals | 04 |
| RAG híbrido (`lib/rag`, `match_chunks`) | 05 |
| Herramientas, loop del agente, guardrails, rate limit, modo mock | 06 |
| Clasificador clásico (`ml/`) | 07 |
| Panel con login, tests e2e, CI completo | 08 |
| Telemetría en el panel, drift, runbook | 09 |

## 3. Secuencia de una conversación con herramientas (caso del hotel)

```mermaid
sequenceDiagram
    autonumber
    actor U as Marcela (hotel)
    participant W as /copilot (navegador)
    participant A as API /api/chat
    participant G as Guardrails
    participant L as Claude (agente)
    participant T as Herramientas
    participant D as Supabase
    U->>W: "Tengo filas de 40 min en el check-in..."
    W->>A: POST mensaje (streaming)
    A->>G: longitud, rate limit, tope diario
    G->>D: hit_rate_limit(ip, sesión)
    D-->>G: permitido
    A->>L: prompt de sistema + historial + herramientas
    L->>T: search_services("filas check-in hotel")
    T->>D: búsqueda híbrida en chunks
    D-->>T: ficha simulacion-operaciones
    T-->>L: fragmentos + fuente
    L->>T: simulate_queue([2, 3, 4 recepcionistas, check-in digital])
    T-->>L: espera media, p90, utilización (calculado, no inventado)
    L-->>W: texto en streaming + tarjetas + gráfico
    U->>W: "Sí, guarden la solicitud"
    L->>T: create_request(...)
    T->>D: insert en requests
    L-->>W: tarjeta de pre-propuesta
    A->>D: insert en interactions (tokens, costo, latencia)
```

## 4. Compensaciones (trade-offs) aterrizadas al proyecto

Estas son las compensaciones que el mapa de habilidades destaca en el pilar 2. Ninguna decisión es "la mejor" en abstracto: cada una gana algo y paga algo.

| Atributo | Qué significa aquí | Qué decidimos | Qué pagamos |
|---|---|---|---|
| **Latencia** | Tiempo hasta ver la respuesta | Streaming (se ve el texto mientras se genera); Vercel `iad1` junto a Supabase `us-east-1`; modelo pequeño (Haiku) para clasificar y evaluar | Los usuarios en Colombia están lejos de `iad1` (~decenas de ms de red, pequeño frente a los segundos del LLM) |
| **Disponibilidad** | Que la app responda aunque falle algo | `AI_MODE=mock` si la API del LLM falla; búsqueda por texto completo si Voyage falla | El modo mock solo cubre el caso del hotel |
| **Consistencia** | Que todos vean los mismos datos | Una sola base de datos (Postgres) para todo; transacciones para el rate limit | Nada relevante a esta escala |
| **Fiabilidad** | Que haga lo correcto una y otra vez | El LLM no calcula: `simulate_queue` es determinista y con tests; evals en cada cambio; validación zod de las herramientas | Más código que "pedirle todo al modelo" |
| **Mantenibilidad** | Que otro pueda cambiarlo sin romperlo | Un solo repo y lenguaje; ADRs; IDs de modelo en un solo archivo; cada paso documentado | Documentar toma tiempo |
| **Simplicidad** | Menos piezas móviles | Sin base vectorial aparte, sin colas, sin microservicios, sin grafo de conocimiento | Si el sistema creciera mucho, habría que separar piezas |
| **Costo** | Dinero por conversación y fijo al mes | Planes gratuitos (Vercel Hobby, Supabase Free); Haiku para tareas simples; prompt caching; rate limit y tope diario | Límites de los planes gratuitos (pausa por inactividad, cuotas) |

## 5. Seguridad (resumen)

- **RLS en todas las tablas.** El rol `anon` (la clave pública) no puede leer ni escribir nada: se verificó en el paso 02 con `curl` (respuesta `42501 permission denied`).
- El servidor usa la **service role** solo en código de servidor (`lib/supabase/admin.ts`).
- El personal del centro lee a través de políticas RLS que verifican su correo contra una allowlist en un esquema privado (`private.is_staff()`).
- Las funciones de rate limit y de allowlist solo las puede ejecutar la service role.
- Secretos: `.env.local` (ignorado por git), variables de Vercel marcadas como *sensitive*, hook anti-secretos y gitleaks en CI.
