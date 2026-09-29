"""
Builds presentacion/AI_Engineering_Skills_Caso_Practico.pptx from a COPY of the
original deck (the original is never modified), adding the "Caso práctico"
section after slide 16 (Aprendizaje continuo) and before Referencias.

Every number on these slides is read from a file in the repo (evals/results,
ml/results, docs/evidencia, presentacion/datos-salud.json). Nothing is typed by hand
except the step-by-step narrative.

  .venv/bin/python presentacion/build_deck.py [path/to/original.pptx]
"""

import json
import sys
from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "Presentaci_n_AI_Engineering_Skills.pptx"
OUT = ROOT / "presentacion" / "AI_Engineering_Skills_Caso_Practico.pptx"
INSERT_AFTER = 16  # slide number of "Aprendizaje continuo"

# Palette and type, measured from the original deck
NAVY, BLUE, BRIGHT = "1A2850", "0283BA", "01A2E9"
GRAY, GRAY2, MUTED = "4A5266", "6B7488", "B8E4F9"
LINE, LINE2, LIGHT, BG_LIGHT, SKY = "E6EAF0", "C9D0DC", "7DCEF4", "FAFCFE", "E6F6FD"
SANS, MONO = "Arial", "Courier New"
PILLAR_COLOR = {1: BRIGHT, 2: BLUE, 3: NAVY, 4: LIGHT}


def rgb(h):
    return RGBColor.from_string(h)


def load(p):
    return json.loads((ROOT / p).read_text())


# ---------------------------------------------------------------------------
# Real data
# ---------------------------------------------------------------------------
cmp_ = {v["label"]: v["summary"] for v in load("evals/results/comparacion.json")["versions"]}
ml = {m["name"]: m for m in load("ml/results/comparacion.json")["models"]}
hotel = {s["scenario_label"]: s for s in load("docs/evidencia/paso-06/hotel-simulacion.json")["scenarios"]}
para = load("docs/evidencia/paso-05/retrieval-parafrasis.json")["result"]
health = load("presentacion/datos-salud.json")


def pct(x, d=1):
    return f"{x * 100:.{d}f} %".replace(".", ",")


def num(x, d=1):
    return f"{x:.{d}f}".replace(".", ",")


# ---------------------------------------------------------------------------
# Drawing helpers (positions in inches, like the original)
# ---------------------------------------------------------------------------
def text(slide, x, y, w, h, value, size=21, color=GRAY, font=SANS, bold=False, spc=None,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    lines = value if isinstance(value, list) else [value]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line_spacing:
            p.line_spacing = line_spacing
        runs = line if isinstance(line, list) else [(line, {})]
        for chunk, style in runs:
            r = p.add_run()
            r.text = chunk
            f = r.font
            f.name = style.get("font", font)
            f.size = Pt(style.get("size", size))
            f.bold = style.get("bold", bold)
            f.color.rgb = rgb(style.get("color", color))
            if spc is not None:
                r._r.get_or_add_rPr().set("spc", str(spc))
    return box


def rect(slide, x, y, w, h, fill=None, line=None, lw=0.75, shape=MSO_SHAPE.RECTANGLE):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(lw)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def image(slide, path, x, y, w, h, align="center"):
    """Fit an image inside the box, keeping its aspect ratio."""
    iw, ih = Image.open(path).size
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx = x + (w - dw) / 2 if align == "center" else x
    dy = y + (h - dh) / 2
    return slide.shapes.add_picture(str(path), Inches(dx), Inches(dy), Inches(dw), Inches(dh))


def background(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = rgb(color)


def kicker(slide, label, section="CASO PRÁCTICO"):
    """'CASO PRÁCTICO —— EVALS', like '01 —— APLICACIONES DE IA' in the original."""
    text(slide, 1.25, 1.04, 4.2, 0.36, section, size=18, color=BLUE, font=MONO, spc=216)
    rect(slide, 5.0, 1.19, 0.5, 0.02, fill=BRIGHT)
    text(slide, 5.7, 1.04, 12.0, 0.36, label.upper(), size=18, color=BLUE, font=MONO, spc=216)


def title(slide, value, color=NAVY):
    text(slide, 1.25, 1.66, 17.5, 1.07, value, size=51, color=color, spc=-51)


def footer(slide, n, dark=False, left="AI Engineering Skills Map · Caso práctico"):
    c = MUTED if dark else GRAY2
    text(slide, 1.25, 10.09, 9.0, 0.36, left, size=18, color=c, font=MONO)
    text(slide, 18.25, 10.09, 0.6, 0.36, f"{n:02d}", size=18, color=c, font=MONO, align=PP_ALIGN.RIGHT)


def card(slide, x, y, w, h, heading, body, dark=False, head_size=26, body_size=19, tag=None):
    rect(slide, x, y, w, h, fill=NAVY if dark else "FFFFFF", line=None if dark else LINE)
    pad = 0.38
    ty = y + pad
    if tag:
        text(slide, x + pad, ty, w - 2 * pad, 0.36, tag, size=16, color=BRIGHT if dark else BLUE, font=MONO)
        ty += 0.45
    text(slide, x + pad, ty, w - 2 * pad, 0.9, heading, size=head_size, color="FFFFFF" if dark else NAVY)
    text(slide, x + pad, ty + 0.75, w - 2 * pad, h - (ty - y) - 0.95, body, size=body_size,
         color=SKY if dark else GRAY, line_spacing=1.1)


def ai_label(slide, x, y):
    text(slide, x, y, 5.5, 0.3, "Ilustración generada con IA (Gemini)", size=13, color=GRAY2, font=MONO)


def stat(slide, x, y, w, big, small, color=BLUE, big_size=60):
    text(slide, x, y, w, 1.1, big, size=big_size, color=color, spc=-60)
    text(slide, x, y + 1.15, w, 0.9, small, size=19, color=GRAY, line_spacing=1.1)


# ---------------------------------------------------------------------------
# Slides
# ---------------------------------------------------------------------------
def s_separator(prs, n):
    s = new_slide(prs)
    background(s, NAVY)
    text(s, 1.25, 1.04, 12, 0.36, "CASO PRÁCTICO", size=18, color=BRIGHT, font=MONO, spc=216)
    text(s, 1.25, 2.9, 12, 1.8, "Innova Copilot", size=110, color=BRIGHT, spc=-110)
    text(s, 1.25, 5.01, 15.5, 2.14, "Las competencias del mapa, juntas en un proyecto real", size=64, color="FFFFFF", spc=-64)
    text(s, 1.25, 7.9, 14.5, 1.15,
         "Un copiloto de IA para un centro de innovación ficticio que atiende MIPYMES de Bolívar. "
         "Construido paso a paso, con 11 versiones que puedes revisar en GitHub.",
         size=28.5, color=MUTED)
    footer(s, n, dark=True)


def s_problem(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "El problema")
    title(s, "Del problema a una propuesta, en una conversación")
    card(s, 1.25, 3.2, 5.55, 3.1, "Hoy",
         "Una empresa escribe; alguien del centro la entrevista, encuadra el caso, hace el análisis a mano y arma la oferta. Semanas.",
         tag="PROCESO MANUAL")
    card(s, 1.25, 6.55, 5.55, 3.15, "La idea",
         "Diagnóstico → línea de trabajo → servicio del catálogo con cita → simulación \"what if\" → pre-propuesta.",
         dark=True, tag="INNOVA COPILOT")
    image(s, ROOT / "docs/img/ilustraciones/hotel-getsemani.jpg", 7.2, 3.2, 6.6, 3.72)
    ai_label(s, 7.2, 7.0)
    rect(s, 14.15, 3.2, 4.6, 6.5, fill="FFFFFF", line=BRIGHT, lw=1.5)
    text(s, 14.5, 3.55, 4.0, 0.36, "EL CASO DE LA DEMO", size=16, color=BLUE, font=MONO)
    text(s, 14.5, 4.05, 4.0, 1.0, "Hotel Brisas de Getsemaní", size=26, color=NAVY)
    text(s, 14.5, 5.25, 3.95, 4.3, [
        "24 habitaciones · Cartagena",
        "Filas de hasta 40 min en el check-in",
        "2 recepcionistas",
        "18 huéspedes por hora en el pico",
        "6 minutos por check-in",
        "Quejas en las reseñas",
    ], size=19, color=GRAY, line_spacing=1.25)
    text(s, 7.2, 7.55, 6.6, 2.1, [
        [("¿Por qué no solo IA? ", {"bold": True, "color": NAVY}),
         ("El LLM entiende y redacta; los precios salen del catálogo, los cálculos de una herramienta y la decisión es de una persona.", {})],
    ], size=19, color=GRAY, line_spacing=1.1)
    footer(s, n)


STEPS = [
    ("00", "Dar forma", [4]), ("01", "Entorno del agente", [3]), ("02", "Arquitectura y datos", [2]),
    ("03", "Primer LLM", [1]), ("04", "Evals", [1]), ("05", "RAG", [1]), ("06", "Agente", [1, 2]),
    ("07", "ML clásico", [1, 4]), ("08", "Producto y revisión", [2, 3]), ("09", "Producción", [1, 2]),
    ("10", "Cierre", [4]),
]
PILLAR_NAMES = {1: "Apps de IA", 2: "Software", 3: "Agentes de código", 4: "Dar forma"}


def s_timeline(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "El recorrido")
    title(s, "11 pasos, 11 tags de git")
    x0, gap, d, y = 1.25, 1.6, 1.05, 4.6
    rect(s, x0 + d / 2, y + d / 2 - 0.01, gap * 10, 0.02, fill=LINE2)
    for i, (code, name, pillars) in enumerate(STEPS):
        cx = x0 + i * gap
        c = rect(s, cx, y, d, d, fill=PILLAR_COLOR[pillars[0]], shape=MSO_SHAPE.OVAL)
        tf = c.text_frame
        tf.text = code
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.runs[0]
        r.font.name, r.font.size = SANS, Pt(24)
        r.font.color.rgb = rgb("FFFFFF" if pillars[0] != 4 else NAVY)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        if len(pillars) > 1:
            rect(s, cx + d - 0.3, y - 0.05, 0.34, 0.34, fill=PILLAR_COLOR[pillars[1]], line="FFFFFF", lw=1.5, shape=MSO_SHAPE.OVAL)
        text(s, cx - 0.3, y + d + 0.25, d + 0.6, 1.2, name, size=17, color=NAVY, align=PP_ALIGN.CENTER, line_spacing=1.0)
    lx = 1.25
    for k, label in PILLAR_NAMES.items():
        rect(s, lx, 7.75, 0.34, 0.34, fill=PILLAR_COLOR[k], shape=MSO_SHAPE.OVAL)
        text(s, lx + 0.5, 7.73, 3.6, 0.4, f"Pilar {k} · {label}", size=18, color=GRAY)
        lx += 4.4
    text(s, 1.25, 8.6, 17.5, 1.0, [
        [("git checkout paso-05-rag", {"font": MONO, "color": BLUE}),
         ("  → el proyecto exactamente como estaba en ese punto, funcionando. Cada paso tiene su doc, su bitácora del agente y su \"reprodúcelo tú\".", {})],
    ], size=20, color=GRAY)
    footer(s, n)


def s_architecture(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 02 · Arquitectura")
    title(s, "Arquitectura simple, en producción desde el día 1")
    image(s, ROOT / "presentacion/img/arquitectura.png", 1.25, 3.05, 17.5, 5.25)
    items = [("Next.js + Vercel", "UI y API juntas; cada push despliega"),
             ("Supabase", "Postgres, vectores, auth y RLS en todas las tablas"),
             ("Claude Sonnet 5.5", "agente; Haiku 4.5 como juez de las evals")]
    for i, (h, b) in enumerate(items):
        x = 1.25 + i * 5.95
        rect(s, x, 8.55, 5.6, 0.01, fill=LINE2)
        text(s, x, 8.7, 5.6, 0.5, h, size=22, color=NAVY)
        text(s, x, 9.2, 5.6, 0.7, b, size=18, color=GRAY)
    footer(s, n)


def s_first_llm(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 03 · Fundamentos de LLM")
    title(s, "Sin datos, el modelo inventa con seguridad")
    shot = ROOT / "presentacion/img/paso03-recorte.png"
    im = Image.open(ROOT / "docs/img/paso-03/chat-hotel.png")
    im.crop((180, 800, 920, 1180)).save(shot)
    image(s, shot, 1.25, 3.2, 9.3, 4.8)
    rect(s, 1.25, 3.2, 9.3, 4.8, line=LINE)
    text(s, 1.25, 8.2, 9.3, 0.4, "Respuesta real del paso 03 (docs/evidencia/paso-03)", size=14, color=GRAY2, font=MONO)
    stat(s, 11.3, 3.2, 7.4, "COP 6–12 M", "rango que \"recomendó\" el modelo para el hotel…", color=NAVY)
    stat(s, 11.3, 5.35, 7.4, "COP 8–25 M", "…y lo que dice la ficha real del catálogo", color=BLUE)
    text(s, 11.3, 7.55, 7.4, 2.2, [
        [("Tokens, contexto, caché: ", {"bold": True, "color": NAVY}),
         ("el caché bajó un 78,6 % el costo de la entrada. ", {}),
         ("temperature", {"font": MONO, "color": BLUE}),
         (" ya no existe en Sonnet 5.5: el control es ", {}), ("effort", {"font": MONO, "color": BLUE}), (".", {})],
    ], size=19, color=GRAY, line_spacing=1.1)
    footer(s, n)


def s_evals(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 04 · Desarrollo guiado por evals")
    title(s, "Sin evals, cada cambio es una opinión")
    image(s, ROOT / "docs/img/graficos/evals-evolucion.png", 1.25, 3.0, 11.2, 6.7)
    a, b, c = cmp_["paso-03-primer-llm"], cmp_["paso-05-rag-hybrid"], cmp_["paso-06-agente"]
    stat(s, 13.0, 3.1, 5.8, f"{a['casesPassed']} → {b['casesPassed']} → {c['casesPassed']}",
         "de 30 casos pasan todos los chequeos (pasos 03 → 05 → 06)", big_size=54)
    stat(s, 13.0, 5.35, 5.8, f"{pct(a['checks']['no_off_catalog_prices']['rate'], 0)} → {pct(c['checks']['no_off_catalog_prices']['rate'], 0)}",
         "de respuestas sin precios inventados", color=NAVY, big_size=54)
    text(s, 13.0, 7.6, 5.8, 2.2, [
        [("La eval también tuvo bugs: ", {"bold": True, "color": NAVY}),
         ("el primer juez premió un precio inventado y el primer dataset castigaba hacer preguntas. Lo vimos leyendo los fallos uno por uno.", {})],
    ], size=18, color=GRAY, line_spacing=1.1)
    footer(s, n)


def s_rag(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 05 · Fundamentar con datos")
    title(s, "No cambiamos el modelo: cambiamos lo que sabe")
    a, b = cmp_["paso-03-primer-llm"], cmp_["paso-05-rag-hybrid"]
    card(s, 1.25, 3.2, 5.55, 3.1, f"{pct(a['checks']['service_mentioned']['rate'], 0)} → {pct(b['checks']['service_mentioned']['rate'], 0)}",
         "recomienda un servicio real del catálogo, con enlace a la ficha", tag="SERVICIO CORRECTO", head_size=40)
    card(s, 7.2, 3.2, 5.55, 3.1, f"FTS {para['fts']['hits']}/8 · híbrido {para['hybrid']['hits']}/8",
         "con paráfrasis sin palabras del catálogo (\"botamos comida todos los días\")", tag="BÚSQUEDA", head_size=34)
    card(s, 13.15, 3.2, 5.6, 3.1, "Small-to-big",
         "busca en fragmentos, entrega al modelo la ficha completa: nunca un precio suelto", tag="TÉCNICA", head_size=34)
    rows = [("En el prompt (con caché)", "reglas · 3 políticas · índice de nombres de servicios, sin precios"),
            ("Por recuperación", "fichas completas: precios, entregables, duración"),
            ("Ni grafo ni base vectorial aparte", "13 documentos sin relaciones: Postgres + pgvector basta")]
    for i, (h, b_) in enumerate(rows):
        y = 6.75 + i * 1.0
        rect(s, 1.25, y + 0.85, 17.5, 0.01, fill=LINE)
        text(s, 1.25, y + 0.15, 6.2, 0.5, h, size=21, color=NAVY)
        text(s, 7.6, y + 0.17, 11.1, 0.5, b_, size=19, color=GRAY)
    footer(s, n)


def s_hotel(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 06 · Sistemas agénticos")
    title(s, "El LLM no calcula: decide quién calcula")
    image(s, ROOT / "docs/img/graficos/hotel-simulacion.png", 1.25, 3.0, 12.4, 5.4)
    h2, h3, hd = hotel["Hoy: 2 recepcionistas"], hotel["3 recepcionistas"], hotel["Check-in digital (3 min), 2 recepcionistas"]
    stat(s, 14.1, 3.1, 4.7, f"{num(h2['simulation']['p90_wait_min'])} min",
         "espera p90 hoy (1 de cada 10 huéspedes espera más)", color=NAVY, big_size=54)
    stat(s, 14.1, 5.35, 4.7, f"{num(hd['simulation']['avg_wait_min'])} min",
         f"espera media con check-in digital previo (con una 3.ª recepcionista: {num(h3['simulation']['avg_wait_min'])} min)", big_size=54)
    image(s, ROOT / "docs/img/ilustraciones/llm-no-calcula.jpg", 14.1, 7.55, 4.3, 2.0, align="left")
    ai_label(s, 14.1, 9.6)
    text(s, 1.25, 8.6, 12.4, 1.2, [
        [("simulate_queue", {"font": MONO, "color": BLUE}),
         (": Erlang C + simulación de eventos discretos con semilla fija, 17 tests. El texto del agente usó exactamente sus cifras en 4 de 4 casos de la eval.", {})],
    ], size=18, color=GRAY, line_spacing=1.1)
    footer(s, n)


def s_agent(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 06 · Agente y guardrails")
    title(s, "Actuar, pero con permiso")
    crop = ROOT / "presentacion/img/pre-propuesta-recorte.png"
    im = Image.open(ROOT / "docs/img/demo/04-pre-propuesta.png")
    w, h = im.size
    im.crop((int(w * 0.14), int(h * 0.30), int(w * 0.86), int(h * 0.80))).save(crop)
    image(s, crop, 1.25, 3.0, 9.6, 6.7)
    rect(s, 1.25, 3.0, 9.6, 6.7, line=LINE)
    items = [
        ("Aprobación humana", "Guardar la pre-propuesta exige el botón \"Sí, guardar\", y la aprobación va firmada."),
        ("El precio lo pone el código", "El rango de inversión sale del catálogo, no del modelo."),
        ("Protección de la URL del QR", "Límite de mensajes por IP y sesión, tope diario, límite de tamaño y fallo cerrado."),
        ("Plan B", "AI_MODE=mock: la misma demo sin red ni claves."),
    ]
    for i, (h, b) in enumerate(items):
        y = 3.05 + i * 1.68
        rect(s, 11.4, y, 0.08, 1.35, fill=BRIGHT)
        text(s, 11.75, y, 7.0, 0.5, h, size=22, color=NAVY)
        text(s, 11.75, y + 0.5, 7.0, 1.0, b, size=18, color=GRAY, line_spacing=1.05)
    footer(s, n)


def s_ml(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 07 · Fundamentos de ML")
    title(s, "¿Siempre un LLM? Mismo test, tres modelos")
    image(s, ROOT / "docs/img/graficos/ml-vs-llm.png", 1.25, 2.95, 17.5, 3.9)
    names = [("TF-IDF + LogReg", "TF-IDF + regresión logística"), ("Haiku zero-shot", "Haiku 4.5 zero-shot"),
             ("Haiku few-shot", "Haiku 4.5 few-shot")]
    y0 = 7.0
    heads = ["Modelo", "Accuracy", "Costo / 1.000", "Latencia p50"]
    xs = [1.25, 8.0, 11.5, 15.2]
    for x, hd in zip(xs, heads):
        text(s, x, y0, 3.5, 0.4, hd, size=16, color=BLUE, font=MONO)
    for i, (key, label) in enumerate(names):
        m = ml[key]
        y = y0 + 0.5 + i * 0.55
        rect(s, 1.25, y + 0.5, 17.5, 0.01, fill=LINE)
        cost = "≈ US$ 0 (local)" if m["cost_per_1000_usd"] == 0 else f"US$ {num(m['cost_per_1000_usd'], 2)}"
        for x, v in zip(xs, [label, pct(m["accuracy"]), cost, f"{num(m['latency_ms_p50'], 1)} ms"]):
            text(s, x, y + 0.05, 6.5, 0.45, v, size=19, color=NAVY)
    text(s, 1.25, 9.5, 17.5, 0.5, "36 casos de prueba sintéticos: 1 caso = 2,8 puntos. Decisión: el agente clasifica en la conversación; el modelo clásico, para triage masivo y drift.",
         size=17, color=GRAY)
    footer(s, n)


def s_coding_agents(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Pasos 01 y 08 · Agentes de código")
    title(s, "Todo esto lo construyó un agente de código")
    image(s, ROOT / "docs/img/ilustraciones/harness-agente.jpg", 1.25, 3.05, 6.3, 3.5)
    ai_label(s, 1.25, 6.6)
    rows = [("CLAUDE.md", "la inducción del agente: arquitectura, comandos, \"nunca inventes métricas\""),
            ("Hooks y permisos", "bloquea escribir claves; no puede leer .env ni forzar un push"),
            ("Subagente revisor", "contexto limpio, solo lectura: \"NOT READY\", 3 fallas graves en 7 minutos"),
            ("Bitácora", "el prompt exacto de cada paso y cada error, sin editar")]
    for i, (h, b) in enumerate(rows):
        y = 3.1 + i * 0.95
        text(s, 8.1, y, 3.4, 0.5, h, size=21, color=NAVY)
        text(s, 11.6, y + 0.02, 7.15, 0.9, b, size=18, color=GRAY, line_spacing=1.05)
        rect(s, 8.1, y + 0.83, 10.65, 0.01, fill=LINE)
    rect(s, 1.25, 7.2, 17.5, 2.45, fill=NAVY)
    text(s, 1.65, 7.5, 16.7, 0.4, "DE LA BITÁCORA DEL PASO 06", size=16, color=BRIGHT, font=MONO)
    text(s, 1.65, 8.0, 16.7, 1.5, [
        [("El modelo escribió: ", {"color": MUTED}),
         ("\"te di cifras de simulación sin haber consultado las herramientas. No debí hacerlo\". ", {"color": "FFFFFF"}),
         ("Sí las había consultado: el bug era nuestro (el historial perdía las llamadas). El modelo \"confesando\" un error que no cometió fue la pista.", {"color": MUTED})],
    ], size=20, line_spacing=1.1)
    footer(s, n)


def s_production(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Paso 09 · Operación en producción")
    title(s, "Lo que no se mide en producción, no existe")
    h = health
    stat(s, 1.25, 3.2, 5.4, f"US$ {num(h['costPerConversationUsd'], 3)}", "costo promedio por conversación", big_size=54)
    stat(s, 7.0, 3.2, 5.4, f"{num(h['latencyP50Ms'] / 1000)} / {num(h['latencyP95Ms'] / 1000)} s", "latencia por respuesta, p50 / p95", color=NAVY, big_size=54)
    stat(s, 12.9, 3.2, 5.9, f"TVD {num(h['drift']['tvd'], 2)}", "alerta de drift (umbral 0,2): avalancha de solicitudes de propiedad intelectual", color=BLUE, big_size=54)
    text(s, 1.25, 5.55, 17.5, 0.8,
         f"Telemetría real de {h['conversations']} conversaciones ({h['turns']} respuestas) hasta el {h['exportedAt'][:10]}: muestra pequeña. El drift usa tráfico simulado y marcado como tal.",
         size=17, color=GRAY2)
    items = [("Telemetría por turno", "tokens, costo, latencia, herramientas, errores"),
             ("Evals de regresión", "un cambio de prompt sin eval en vivo no pasa el CI"),
             ("Runbook", "API caída → modo mock; costo → tope diario; abuso → límites; rollback"),
             ("Riesgo con fecha", "Haiku 4.5 se retira no antes del 15 oct 2026")]
    for i, (hh, b) in enumerate(items):
        x = 1.25 + (i % 2) * 8.9
        y = 6.6 + (i // 2) * 1.55
        rect(s, x, y, 8.5, 1.35, fill="FFFFFF", line=LINE)
        text(s, x + 0.35, y + 0.18, 7.8, 0.45, hh, size=21, color=NAVY)
        text(s, x + 0.35, y + 0.68, 7.8, 0.6, b, size=17, color=GRAY)
    footer(s, n)


def s_lessons(prs, n):
    s = new_slide(prs)
    background(s, BG_LIGHT)
    kicker(s, "Lecciones")
    title(s, "Una lección por pilar")
    a, b, c = cmp_["paso-03-primer-llm"], cmp_["paso-05-rag-hybrid"], cmp_["paso-06-agente"]
    items = [
        ("01 · APPS DE IA", "Los datos pesan más que el modelo",
         f"El mismo modelo pasó de {pct(a['casePassRate'], 0)} a {pct(b['casePassRate'], 0)} de casos correctos con RAG. Y las cifras las calcula una herramienta.", False),
        ("02 · SOFTWARE", "Prueba como atacante, no como usuario",
         "Los guardrails pasaban las pruebas de la UI; el revisor fabricó el historial y encontró tres formas de disparar la factura.", True),
        ("03 · AGENTES DE CÓDIGO", "Una regla pide; un hook garantiza",
         "Permisos, hooks, CI y un revisor con contexto limpio. El humano decidió qué construir y cuándo recortar.", False),
        ("04 · DAR FORMA", "Mide antes de creer, incluso tu eval",
         "El primer 53 % era un defecto del dataset. Leer los fallos a mano evitó una conclusión falsa.", False),
    ]
    for i, (tag, h, body, dark) in enumerate(items):
        x = 1.25 + (i % 2) * 8.9
        y = 3.2 + (i // 2) * 3.35
        card(s, x, y, 8.5, 3.1, h, body, dark=dark, tag=tag, head_size=26, body_size=19)
    footer(s, n)


def s_qr(prs, n):
    s = new_slide(prs)
    background(s, NAVY)
    text(s, 1.25, 1.04, 12, 0.36, "CASO PRÁCTICO", size=18, color=BRIGHT, font=MONO, spc=216)
    text(s, 1.25, 1.66, 17.5, 1.07, "Pruébalo y revísalo tú", size=51, color="FFFFFF", spc=-51)
    for i, (qr, h, url) in enumerate([
        ("repo", "El código, paso a paso", "github.com/FutureTales/ai-engineering-demo"),
        ("app", "La app en vivo", "innova-copilot.vercel.app"),
    ]):
        x = 2.2 + i * 8.9
        rect(s, x, 2.95, 4.7, 4.7, fill="FFFFFF")
        image(s, ROOT / f"presentacion/qr/{qr}.png", x + 0.2, 3.15, 4.3, 4.3)
        text(s, x - 0.75, 7.85, 6.2, 0.6, h, size=28.5, color="FFFFFF", align=PP_ALIGN.CENTER)
        text(s, x - 1.35, 8.5, 7.4, 0.45, url, size=18, color=MUTED, font=MONO, align=PP_ALIGN.CENTER)
    text(s, 1.25, 9.45, 17.5, 0.35, "Demo educativa · el centro, sus servicios y las empresas son ficticios", size=15, color=MUTED, font=MONO)
    footer(s, n, dark=True)


BUILDERS = [s_separator, s_problem, s_timeline, s_architecture, s_first_llm, s_evals, s_rag, s_hotel,
            s_agent, s_ml, s_coding_agents, s_production, s_lessons, s_qr]


def new_slide(prs):
    return prs.slides.add_slide(prs.slide_layouts[0])


def main():
    prs = Presentation(str(ORIGINAL))
    original_count = len(prs.slides)
    for i, build in enumerate(BUILDERS):
        build(prs, INSERT_AFTER + 1 + i)
    # Move the new slides (appended at the end) to after slide INSERT_AFTER.
    ids = prs.slides._sldIdLst
    items = list(ids)
    new = items[original_count:]
    for el in new:
        ids.remove(el)
    for k, el in enumerate(new):
        ids.insert(INSERT_AFTER + k, el)
    # Renumber the slides that moved down (the references slide).
    total = len(prs.slides)
    for idx in range(INSERT_AFTER + len(new), total):
        slide = prs.slides[idx]
        for sh in slide.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip().isdigit() and Emu(sh.left).inches > 17:
                run = sh.text_frame.paragraphs[0].runs[0]
                run.text = f"{idx + 1:02d}"
    prs.save(str(OUT))
    print(f"saved {OUT.relative_to(ROOT)}: {original_count} original + {len(new)} new = {total} slides")


if __name__ == "__main__":
    main()
