"""
Charts for the docs and the slides, drawn ONLY from files in the repo:

  evals/results/comparacion.json      -> evolución de las evals por versión
  docs/evidencia/paso-06/hotel-simulacion.json -> espera del hotel por escenario (si existe)
  ml/results/comparacion.json         -> ML clásico vs LLM (si existe)

Usage:
  .venv/bin/python scripts/charts/make_charts.py [--out docs/img/graficos] [--dpi 200]

Palette and fonts match the conference deck (Arial; navy #1A2850, blues #0283BA / #01A2E9).
"""

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

NAVY = "#1A2850"
BLUE = "#0283BA"
BRIGHT = "#01A2E9"
LIGHT_BLUE = "#7DCEF4"
GRAY = "#4A5266"
GRAY_LIGHT = "#C9D0DC"
BG = "#FFFFFF"

plt.rcParams.update(
    {
        "font.family": "Arial",
        "font.size": 13,
        "axes.edgecolor": GRAY_LIGHT,
        "axes.labelcolor": GRAY,
        "xtick.color": GRAY,
        "ytick.color": GRAY,
        "axes.titleweight": "bold",
        "axes.titlecolor": NAVY,
        "axes.titlesize": 17,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "figure.facecolor": BG,
        "axes.facecolor": BG,
    }
)

ROOT = Path(__file__).resolve().parents[2]

VERSION_NAMES = {
    "paso-03-primer-llm": "Paso 03\nsolo prompt",
    "paso-05-rag-fts": "Paso 05\nRAG (texto)",
    "paso-05-rag-hybrid": "Paso 05\nRAG (híbrido)",
    "paso-06-agente": "Paso 06\nagente + herramientas",
}

METRICS = [
    ("casePassRate", "Casos que pasan todo"),
    ("no_off_catalog_prices", "Sin precios inventados"),
    ("service_mentioned", "Servicio real del catálogo"),
    ("tool_when_expected", "Simula cuando corresponde"),
]


def pct_label(ax, bars):
    for b in bars:
        h = b.get_height()
        ax.annotate(f"{h:.0f} %", (b.get_x() + b.get_width() / 2, h), ha="center", va="bottom",
                    fontsize=11, color=NAVY, xytext=(0, 3), textcoords="offset points")


def evals_chart(out: Path, dpi: int):
    data = json.loads((ROOT / "evals/results/comparacion.json").read_text())
    versions = data["versions"]
    labels = [VERSION_NAMES.get(v["label"], v["label"]) for v in versions]
    colors = [GRAY_LIGHT, LIGHT_BLUE, BLUE, NAVY][: len(METRICS)]
    fig, ax = plt.subplots(figsize=(12, 6), dpi=dpi)
    width = 0.8 / len(METRICS)
    for i, (key, name) in enumerate(METRICS):
        vals = []
        for v in versions:
            s = v["summary"]
            vals.append(100 * (s["casePassRate"] if key == "casePassRate" else (s["checks"][key]["rate"] or 0)))
        xs = [j + (i - (len(METRICS) - 1) / 2) * width for j in range(len(versions))]
        bars = ax.bar(xs, vals, width=width * 0.92, color=colors[i], label=name)
        pct_label(ax, bars)
    ax.set_xticks(range(len(versions)), labels)
    ax.set_ylim(0, 112)
    ax.set_ylabel("% de casos (30 casos)")
    ax.set_title("Evals del copiloto por versión")
    ax.legend(frameon=False, ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.14), fontsize=11)
    ax.yaxis.grid(True, color="#E6EAF0")
    ax.set_axisbelow(True)
    fig.text(0.99, 0.01, "Fuente: evals/results/comparacion.json", ha="right", fontsize=9, color=GRAY)
    fig.tight_layout()
    fig.savefig(out / "evals-evolucion.png", bbox_inches="tight")
    plt.close(fig)
    print("✓", out / "evals-evolucion.png")


def hotel_chart(out: Path, dpi: int):
    f = ROOT / "docs/evidencia/paso-06/hotel-simulacion.json"
    if not f.exists():
        print("· skip hotel chart (no", f.relative_to(ROOT), ")")
        return
    scenarios = json.loads(f.read_text())["scenarios"]
    names = [s["scenario_label"] for s in scenarios]
    wait = [s["simulation"]["avg_wait_min"] for s in scenarios]
    p90 = [s["simulation"]["p90_wait_min"] for s in scenarios]
    util = [100 * s["utilization"] for s in scenarios]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.6), dpi=dpi, gridspec_kw={"width_ratios": [1.6, 1]})
    xs = range(len(names))
    b1 = ax1.bar([x - 0.2 for x in xs], wait, 0.4, color=BLUE, label="Espera media")
    b2 = ax1.bar([x + 0.2 for x in xs], p90, 0.4, color=NAVY, label="Espera p90 (1 de cada 10 espera más)")
    for bars in (b1, b2):
        for b in bars:
            ax1.annotate(f"{b.get_height():.1f}", (b.get_x() + b.get_width() / 2, b.get_height()), ha="center",
                         va="bottom", fontsize=10, color=NAVY, xytext=(0, 2), textcoords="offset points")
    ax1.set_xticks(list(xs), [n.replace(", ", ",\n") for n in names], fontsize=10)
    ax1.set_ylabel("minutos")
    ax1.set_title("Espera en el check-in (pico de 3 h)")
    ax1.legend(frameon=False, fontsize=10)
    ax1.yaxis.grid(True, color="#E6EAF0")
    ax1.set_axisbelow(True)
    bars = ax2.barh(list(xs), util, color=[NAVY if u >= 85 else BRIGHT for u in util])
    for b, u in zip(bars, util):
        ax2.annotate(f"{u:.0f} %", (u, b.get_y() + b.get_height() / 2), va="center", fontsize=10, color=NAVY,
                     xytext=(4, 0), textcoords="offset points")
    ax2.set_yticks(list(xs), [n.split(",")[0] for n in names], fontsize=10)
    ax2.invert_yaxis()
    ax2.set_xlim(0, 110)
    ax2.axvline(85, color=GRAY_LIGHT, ls="--")
    ax2.set_title("Utilización de recepción")
    fig.text(0.99, 0.01, "Fuente: simulate_queue (simulación de eventos discretos, 200 réplicas, semilla 42)",
             ha="right", fontsize=9, color=GRAY)
    fig.tight_layout()
    fig.savefig(out / "hotel-simulacion.png", bbox_inches="tight")
    plt.close(fig)
    print("✓", out / "hotel-simulacion.png")


def ml_chart(out: Path, dpi: int):
    f = ROOT / "ml/results/comparacion.json"
    if not f.exists():
        print("· skip ML chart (no", f.relative_to(ROOT), ")")
        return
    rows = json.loads(f.read_text())["models"]
    names = [r["name"] for r in rows]
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.8), dpi=dpi)
    specs = [
        ("accuracy", "Accuracy", "{:.0%}", 1.0),
        ("cost_per_1000_usd", "Costo por 1.000 clasificaciones (US$)", "US$ {:.3f}", None),
        ("latency_ms_p50", "Latencia p50 (ms)", "{:.0f} ms", None),
    ]
    for ax, (key, title, fmt, ymax) in zip(axes, specs):
        vals = [r[key] for r in rows]
        bars = ax.bar(names, vals, color=[BLUE if "TF-IDF" in n else NAVY for n in names])
        for b, v in zip(bars, vals):
            ax.annotate(fmt.format(v), (b.get_x() + b.get_width() / 2, v), ha="center", va="bottom", fontsize=10,
                        color=NAVY, xytext=(0, 2), textcoords="offset points")
        ax.set_title(title, fontsize=13)
        if ymax:
            ax.set_ylim(0, ymax * 1.12)
        ax.tick_params(axis="x", labelsize=10)
        ax.yaxis.grid(True, color="#E6EAF0")
        ax.set_axisbelow(True)
    fig.text(0.99, 0.01, "Fuente: ml/results/comparacion.json (mismo conjunto de prueba)", ha="right", fontsize=9,
             color=GRAY)
    fig.tight_layout()
    fig.savefig(out / "ml-vs-llm.png", bbox_inches="tight")
    plt.close(fig)
    print("✓", out / "ml-vs-llm.png")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="docs/img/graficos")
    ap.add_argument("--dpi", type=int, default=160)
    a = ap.parse_args()
    out = ROOT / a.out
    out.mkdir(parents=True, exist_ok=True)
    evals_chart(out, a.dpi)
    hotel_chart(out, a.dpi)
    ml_chart(out, a.dpi)
