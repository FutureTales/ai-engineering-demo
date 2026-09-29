"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface UserKeys {
  anthropic: string;
  voyage: string;
}

const STORAGE = { anthropic: "innova.anthropicKey", voyage: "innova.voyageKey" } as const;

/**
 * Keys live ONLY in this tab (sessionStorage): closing the tab forgets them.
 * A tiny external store, so the chat transport can read the current keys at send
 * time without React state or refs being touched during render.
 */
const EMPTY: UserKeys = { anthropic: "", voyage: "" };
let current: UserKeys | null = null;
const listeners = new Set<() => void>();

function read(): UserKeys {
  try {
    return {
      anthropic: sessionStorage.getItem(STORAGE.anthropic) ?? "",
      voyage: sessionStorage.getItem(STORAGE.voyage) ?? "",
    };
  } catch {
    return EMPTY;
  }
}

export const keyStore = {
  get(): UserKeys {
    if (current === null) current = typeof window === "undefined" ? EMPTY : read();
    return current;
  },
  getServer(): UserKeys {
    return EMPTY;
  },
  set(keys: UserKeys) {
    current = keys;
    try {
      for (const k of ["anthropic", "voyage"] as const) {
        if (keys[k]) sessionStorage.setItem(STORAGE[k], keys[k]);
        else sessionStorage.removeItem(STORAGE[k]);
      }
    } catch {
      // Private mode or blocked storage: keys stay in memory for this page only.
    }
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const anthropicOk = (k: string) => /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(k);
const voyageOk = (k: string) => k === "" || /^pa-[A-Za-z0-9_-]{20,200}$/.test(k);

export function ApiKeyPanel({ serverHasKey }: { serverHasKey: boolean }) {
  const keys = useSyncExternalStore(keyStore.subscribe, keyStore.get, keyStore.getServer);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserKeys>(EMPTY);
  const usingOwnKey = Boolean(keys.anthropic);
  const valid = anthropicOk(draft.anthropic) && voyageOk(draft.voyage);

  const status = usingOwnKey
    ? {
        tone: "border-primary/30 bg-primary/5",
        text: (
          <>
            Modelo real con <strong>tu</strong> clave de Anthropic. El costo lo cubre tu cuenta.
          </>
        ),
      }
    : serverHasKey
      ? { tone: "border-border bg-muted/40", text: <>Modelo real con la clave de este servidor.</> }
      : {
          tone: "border-amber-300 bg-amber-50 dark:bg-amber-950/30",
          text: (
            <>
              <strong>Modo demo:</strong> respuestas grabadas del caso del hotel, sin costo. Para conversar
              con el modelo real sobre tu propio caso, usa tu clave de Anthropic.
            </>
          ),
        };

  return (
    <div className={`rounded-lg border p-3 text-sm ${status.tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1">{status.text}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(keys);
            setOpen((o) => !o);
          }}
          aria-expanded={open}
        >
          {usingOwnKey ? "Cambiar clave" : "Usar mi clave"}
        </Button>
      </div>

      {open && (
        <form
          className="mt-3 space-y-3 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            keyStore.set(draft);
            setOpen(false);
          }}
        >
          <div>
            <label htmlFor="anthropic-key" className="text-xs font-medium">
              Clave de Anthropic (obligatoria para el modelo real)
            </label>
            <Input
              id="anthropic-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              value={draft.anthropic}
              onChange={(e) => setDraft({ ...draft, anthropic: e.target.value.trim() })}
            />
          </div>
          <div>
            <label htmlFor="voyage-key" className="text-xs font-medium">
              Clave de Voyage AI (opcional: mejora la búsqueda con embeddings)
            </label>
            <Input
              id="voyage-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="pa-…"
              value={draft.voyage}
              onChange={(e) => setDraft({ ...draft, voyage: e.target.value.trim() })}
            />
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            <li>
              Tu clave se guarda <strong>solo en esta pestaña</strong> y se borra al cerrarla. Se envía por
              HTTPS únicamente para responder tus mensajes; el servidor no la guarda ni la registra.
            </li>
            <li>
              Recomendación: crea una clave nueva solo para esta prueba, con límite de gasto, en{" "}
              <a
                className="underline"
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
              >
                console.anthropic.com
              </a>
              , y bórrala después. Una conversación típica cuesta unos centavos de dólar.
            </li>
            <li>
              ¿Prefieres que la clave no pase por un servidor ajeno? Despliega tu propia copia:{" "}
              <a
                className="underline"
                href="https://github.com/FutureTales/ai-engineering-demo#usa-tus-propias-claves"
              >
                cómo hacerlo
              </a>
              .
            </li>
          </ul>
          {!valid && draft.anthropic && (
            <p className="text-destructive text-xs">
              La clave de Anthropic empieza por &quot;sk-ant-&quot;; la de Voyage, por &quot;pa-&quot;.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!valid}>
              Usar esta clave
            </Button>
            {usingOwnKey && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  keyStore.set(EMPTY);
                  setDraft(EMPTY);
                  setOpen(false);
                }}
              >
                Olvidar mi clave
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
