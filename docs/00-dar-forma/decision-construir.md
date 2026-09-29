# Decisión: ¿prototipo, MVP o sistema empresarial?

## Las tres opciones

| | Prototipo | **MVP** ✅ | Sistema empresarial |
|---|---|---|---|
| **Objetivo** | Probar si la idea funciona | Probar con usuarios reales si aporta valor | Operar a escala con garantías |
| **Tiempo** | Horas | Días | Meses |
| **Datos** | Inventados, en el código | Catálogo en base de datos, RAG | Integración con sistemas del centro (CRM, facturación) |
| **Calidad** | "Se ve bien" | Evals automáticas + revisión humana | Evals + monitoreo continuo + SLAs |
| **Seguridad** | Ninguna | RLS, rate limit, guardrails, sin secretos | Auditorías, SSO, cumplimiento formal |
| **Operación** | Laptop | Vercel + Supabase, telemetría, runbook | Multi-región, on-call, soporte |
| **Costo** | Casi cero | Bajo, con topes | Alto |

## Qué elegimos y por qué

**Elegimos un MVP con sesgo a la acción.**

1. **Un prototipo no basta.** La pregunta importante no es "¿un LLM puede hablar de servicios?" (sí puede), sino "¿recomienda **bien**, sin inventar, a un costo razonable?". Eso solo se responde con datos reales, evals y telemetría, que son parte del MVP.
2. **Un sistema empresarial es prematuro.** No sabemos todavía si las MIPYMES lo usarían ni si el centro confiaría en él. Construir integraciones y SLAs antes de validar sería invertir en lo desconocido.
3. **Sesgo a la acción.** Es mejor tener algo funcionando en producción pronto y medirlo, que discutir semanas sobre el diseño perfecto. Cada paso del proyecto termina con algo desplegado y verificable.

## Qué cosas son "puertas de dos vías" y cuáles no

Una idea útil para decidir rápido: separar las decisiones fáciles de revertir de las difíciles.

| Decisión | ¿Reversible? | Cómo la tratamos |
|---|---|---|
| Prompt de sistema, modelo, número de chunks | Sí, fácil | Decidir rápido, medir con evals, ajustar |
| Framework (Next.js), hosting (Vercel) | Sí, con esfuerzo moderado | ADR corto y seguir |
| Esquema de base de datos | Parcialmente (migraciones) | Pensar un poco más; migraciones versionadas |
| Publicar la URL con una API key de pago | Riesgo de costo | Topes y rate limit **antes** de publicar |
| Datos personales | Difícil de revertir (Ley 1581) | Minimizar desde el diseño: solo contacto comercial |

## Criterios para pasar del MVP a un piloto

Ver `docs/memo-stakeholders.md` (paso 10). En resumen: evals por encima del objetivo, costo por conversación dentro del objetivo y validación con un grupo pequeño de MIPYMES reales.
