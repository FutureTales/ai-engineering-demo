# Presentación

| Archivo | Qué es |
|---|---|
| [`AI_Engineering_Skills_Caso_Practico.pptx`](AI_Engineering_Skills_Caso_Practico.pptx) | Deck completo (31 slides): los 16 del mapa conceptual + **14 del caso práctico (17–30)** + referencias |
| [`AI_Engineering_Skills_Caso_Practico.pdf`](AI_Engineering_Skills_Caso_Practico.pdf) | El mismo deck en PDF (renderizado con LibreOffice) |
| [`build_deck.py`](build_deck.py) | Genera el deck desde una **copia** del original; el original nunca se modifica |
| [`datos-salud.json`](datos-salud.json) | Instantánea real de la salud del asistente usada en el slide 28 |
| [`qr/`](qr/) | Códigos QR del repo y de la app (verificados decodificándolos) |
| [`img/`](img/) | Diagrama de arquitectura (Mermaid → PNG) y recortes de capturas |

## Cómo se construyó

1. Se inspeccionó el deck original con python-pptx: tamaño (20 × 11,25 pulgadas), fuentes (Arial y Courier New), colores y posiciones exactas de encabezados, títulos, tarjetas y pies.
2. `build_deck.py` abre una copia, agrega los slides nuevos con **los mismos estilos** y los mueve después del slide 16 ("Aprendizaje continuo"). El slide de referencias pasa a ser el 31.
3. **Todos los números se leen de archivos del repo** (`evals/results/comparacion.json`, `ml/results/comparacion.json`, `docs/evidencia/…`, `datos-salud.json`). Ninguno se escribió a mano.
4. Se renderizó a PDF con LibreOffice y se revisó cada slide nuevo: se corrigieron títulos de dos líneas, una tabla que chocaba con la nota al pie, una captura ilegible y el espaciado del slide de QR.

```bash
.venv/bin/python scripts/charts/make_charts.py      # gráficos desde los resultados
pnpm tsx scripts/export-health.ts                   # instantánea de salud
.venv/bin/python presentacion/build_deck.py         # deck
soffice --headless --convert-to pdf --outdir presentacion presentacion/AI_Engineering_Skills_Caso_Practico.pptx
```
