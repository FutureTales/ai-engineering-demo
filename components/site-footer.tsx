export const REPO_URL = "https://github.com/FutureTales/ai-engineering-demo";

export function SiteFooter() {
  return (
    <footer className="bg-muted/40 text-muted-foreground border-t px-6 py-4 text-center text-xs">
      <p>
        <strong>Demo educativa.</strong> Innova Copilot no es un servicio oficial de ninguna institución. El
        &ldquo;Centro de Innovación Caribe&rdquo;, sus servicios, precios y todas las empresas son{" "}
        <strong>ficticios</strong>. No compartas datos personales sensibles.
      </p>
      <p className="mt-1">
        Código abierto en{" "}
        <a className="underline underline-offset-2" href={REPO_URL}>
          GitHub
        </a>{" "}
        · Construido con Claude Code por Future Tales.
      </p>
    </footer>
  );
}
