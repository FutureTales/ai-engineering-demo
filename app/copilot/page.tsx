import type { Metadata } from "next";
import Link from "next/link";
import { Chat } from "@/components/chat/chat";

export const metadata: Metadata = { title: "Copiloto — Innova Copilot" };

export default function CopilotPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col px-4 pt-6 sm:px-6">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Innova Copilot</h1>
          <p className="text-muted-foreground text-xs">
            Centro de Innovación Caribe · demo con datos ficticios
          </p>
        </div>
        <Link href="/" className="text-sm underline underline-offset-2">
          Inicio
        </Link>
      </header>
      <Chat />
    </main>
  );
}
