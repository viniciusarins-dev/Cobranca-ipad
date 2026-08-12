import { getBrazilDateInfo } from "@/lib/scheduling/time-window";

/**
 * Resolve blocos de spintax no formato {opção 1|opção 2|opção 3},
 * escolhendo uma opção aleatória. Suporta blocos aninhados.
 */
export function resolveSpintax(text: string): string {
  const pattern = /\{([^{}]+)\}/;
  let result = text;

  while (pattern.test(result)) {
    result = result.replace(pattern, (_match, options: string) => {
      const choices = options.split("|");
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }

  return result;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const MORNING_GREETINGS = ["Bom dia", "Oi, bom dia", "Olá, bom dia"];
const AFTERNOON_GREETINGS = ["Boa tarde", "Oi, boa tarde", "Olá, boa tarde"];
const EVENING_GREETINGS = ["Boa noite", "Oi, boa noite", "Olá, boa noite"];

const CLOSINGS = [
  "Qualquer dúvida, estou à disposição.",
  "Agradecemos a atenção.",
  "Fico no aguardo do retorno, obrigado(a).",
  "Se já efetuou o pagamento, desconsidere esta mensagem.",
  "Conto com a sua atenção, desde já agradeço.",
];

/** Saudação de acordo com o horário atual em Brasília. */
export function pickGreeting(date: Date = new Date()): string {
  const { hour } = getBrazilDateInfo(date);
  if (hour < 12) return pickRandom(MORNING_GREETINGS);
  if (hour < 18) return pickRandom(AFTERNOON_GREETINGS);
  return pickRandom(EVENING_GREETINGS);
}

export function pickClosing(): string {
  return pickRandom(CLOSINGS);
}

/**
 * Monta uma variação da mensagem final: saudação aleatória + corpo (com
 * spintax já resolvido) + frase de encerramento aleatória. Reduz a chance
 * de mensagens idênticas serem enviadas em sequência para o WhatsApp.
 */
export function varyMessage(core: string, date: Date = new Date()): string {
  const greeting = pickGreeting(date);
  const resolvedCore = resolveSpintax(core);
  const closing = pickClosing();

  return `${greeting}! ${resolvedCore}\n\n${closing}`;
}
