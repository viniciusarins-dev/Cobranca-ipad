"use client";

import * as React from "react";

import { formatCurrency } from "@/lib/utils";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Número que sobe animado até o valor final (reactbits.dev "CountUp"),
 * reimplementado com requestAnimationFrame puro — sem dependência extra.
 * Respeita prefers-reduced-motion (mostra o valor final direto, sem animar).
 *
 * `format` recebe um identificador serializável (não uma função) porque
 * este componente é renderizado a partir de Server Components — funções
 * não podem atravessar a fronteira servidor/cliente como prop.
 */
export function CountUp({
  value,
  duration = 1200,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: "currency";
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (reducedMotion) return;

    let rafId = 0;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration, reducedMotion]);

  const shown = reducedMotion ? value : display;
  const text = format === "currency" ? formatCurrency(shown) : Math.round(shown).toLocaleString("pt-BR");

  return <span className={className}>{text}</span>;
}
