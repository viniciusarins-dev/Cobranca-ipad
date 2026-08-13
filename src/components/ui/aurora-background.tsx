/**
 * Fundo animado com blobs de gradiente ("aurora"), inspirado no efeito
 * Aurora do reactbits.dev — reimplementado em CSS puro (sem WebGL/ogl)
 * para manter o peso baixo e o comportamento previsível no Safari/iPad.
 * Fixo, atrás de todo o conteúdo, não interativo e discreto o bastante
 * para não atrapalhar a leitura dos dados financeiros.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="aurora-blob-1 absolute -top-1/4 left-[-10%] size-[60vw] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div
        className="aurora-blob-2 absolute top-1/3 right-[-15%] size-[55vw] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--success), transparent 70%)" }}
      />
      <div
        className="aurora-blob-3 absolute bottom-[-20%] left-1/4 size-[50vw] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />
      <div className="absolute inset-0 bg-background/35" />
    </div>
  );
}
