/**
 * Fundo animado com blobs de gradiente ("aurora") + textura de grid sutil,
 * inspirado no efeito Aurora do reactbits.dev — reimplementado em CSS puro
 * (sem WebGL/ogl) para manter o peso baixo e o comportamento previsível no
 * Safari/iPad. Fixo, atrás de todo o conteúdo, não interativo.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="bg-grid-fade absolute inset-0" />
      <div
        className="aurora-blob-1 absolute -top-1/4 left-[-15%] size-[65vw] rounded-full opacity-80 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div
        className="aurora-blob-2 absolute top-1/4 right-[-20%] size-[60vw] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-cyan), transparent 70%)" }}
      />
      <div
        className="aurora-blob-3 absolute bottom-[-25%] left-1/4 size-[55vw] rounded-full opacity-55 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div className="absolute inset-0 bg-background/45" />
    </div>
  );
}
