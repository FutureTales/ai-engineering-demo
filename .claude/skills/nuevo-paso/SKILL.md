---
name: nuevo-paso
description: Scaffold the docs for a new project step (docs/pasos/paso-XX-name.md and docs/bitacora/paso-XX.md) from the repo template. Use when the user types /nuevo-paso or starts a new step.
argument-hint: "<XX> <nombre-con-guiones>   (ej.: 03 primer-llm)"
disable-model-invocation: true
---

# /nuevo-paso — crear la documentación de un paso

Argumentos: `$ARGUMENTS` → número de dos dígitos y nombre en minúsculas con guiones. Ejemplo: `03 primer-llm`.

## Pasos

1. Valida los argumentos. Si faltan, pregunta. El tag será `paso-XX-nombre`.
2. Comprueba que no exista ya `docs/pasos/paso-XX-*.md` ni el tag (`git tag -l "paso-XX-*"`). Si existe, detente y avisa.
3. Copia `docs/pasos/_plantilla.md` a `docs/pasos/paso-XX-nombre.md` y reemplaza `XX`, el título y el tag.
4. Crea `docs/bitacora/paso-XX.md` con estas secciones vacías: *Lo que me pidieron* (mensajes exactos del humano), *Lo que hice*, *Lo que verifiqué* (comandos y resultados), *Lo que decidió el humano*, *Lo que salió mal y cómo lo corregí*.
5. Agrega la fila del paso a la tabla de pasos del `README.md`.
6. Muestra las rutas creadas. **No** hagas commit ni tag: eso ocurre al cerrar el paso, cuando todo está verificado.
