"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CopilotUIMessage } from "@/lib/ai/metadata";
import { UnderTheHood } from "./under-the-hood";

export const HOTEL_CASE =
  "Tengo un hotel boutique de 24 habitaciones en Getsemaní, el Hotel Brisas de Getsemaní. En temporada alta (diciembre y enero) se forman filas de hasta 40 minutos en el check-in entre las 2 y las 5 de la tarde. Tenemos 2 recepcionistas. Llegan unos 18 huéspedes por hora en el pico y cada check-in toma unos 6 minutos. Los huéspedes se quejan en las reseñas. ¿Qué me recomiendan?";

const EXAMPLES = [
  { label: "Hotel con filas en el check-in", text: HOTEL_CASE },
  {
    label: "Panadería que bota pan",
    text: "Tengo una panadería con tres sedes en Turbaco y al final del día botamos mucho pan. ¿Me pueden ayudar?",
  },
  {
    label: "Startup que quiere proteger su marca",
    text: "Somos una startup de bolsos con fibras recicladas y queremos exportar. ¿Cómo protegemos la marca?",
  },
];

export function Chat() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat<CopilotUIMessage>({
    id: chatId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            Cuéntale al copiloto qué problema tiene tu empresa. O prueba un ejemplo:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <Button key={e.label} variant="outline" size="sm" onClick={() => send(e.text)}>
                {e.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-4" aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.role === "user" ? "max-w-[85%] self-end" : "w-full self-start"}>
            <div
              className={
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 text-sm"
                  : "text-sm leading-relaxed"
              }
            >
              {m.parts.map((part, i) =>
                part.type === "text" ? (
                  m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : (
                    <div key={i} className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                    </div>
                  )
                ) : null,
              )}
            </div>
            {m.role === "assistant" && m.metadata?.usage && <UnderTheHood meta={m.metadata} />}
          </li>
        ))}
      </ol>

      {status === "submitted" && <p className="text-muted-foreground text-sm">Pensando…</p>}
      {error && (
        <p role="alert" className="border-destructive/40 text-destructive rounded-md border p-3 text-sm">
          No pude responder. Intenta de nuevo en un momento.
        </p>
      )}

      <form
        className="bg-background sticky bottom-0 flex items-end gap-2 pt-2 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Mensaje
        </label>
        <Textarea
          id="chat-input"
          value={input}
          maxLength={2000}
          rows={2}
          placeholder="Describe el problema de tu empresa…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={stop}>
            Detener
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()}>
            Enviar
          </Button>
        )}
      </form>
      <div ref={bottomRef} />
    </div>
  );
}
