import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink } from "./actions";

export const metadata = { title: "Panel del centro — Innova Copilot" };

export default async function LoginPage({ searchParams }: PageProps<"/panel/login">) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-xl font-semibold">Panel del centro</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Solo para el equipo del Centro de Innovación Caribe (ficticio). Te enviamos un enlace de acceso por
        correo.
      </p>
      {params.sent ? (
        <p className="mt-6 rounded-md border p-3 text-sm">
          Si tu correo está autorizado, recibirás un enlace para entrar. Revisa tu bandeja de entrada.
        </p>
      ) : (
        <form action={sendMagicLink} className="mt-6 flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Correo
          </label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          <Button type="submit">Enviar enlace</Button>
        </form>
      )}
      {params.error && (
        <p className="text-destructive mt-4 text-sm">El enlace no es válido o expiró. Pide uno nuevo.</p>
      )}
    </main>
  );
}
