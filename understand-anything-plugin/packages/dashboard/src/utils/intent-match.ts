import type { GraphNode, TourStep } from "@understand-anything/core/types";

export interface IntentMatch {
  node: GraphNode;
  score: number;
}

const TOP_MATCHES = 5;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function fieldScore(field: string | undefined, tokens: string[], weight: number): number {
  if (!field) return 0;
  const text = field.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += weight;
  }
  return score;
}

// Keyword matching on plain-language fields, not code. The existing
// SearchEngine indexes name/tags/summary only, so it can never match a
// plain-words request like "change the buy button color" — this scorer
// reads what the file IS and DOES, plus the journey steps that use it.
// Same-language matching only: a query in another language than the
// graph's analysis language will not match, by design of v1.
export function matchIntent(
  nodes: GraphNode[],
  tour: TourStep[],
  query: string,
  limit: number = TOP_MATCHES,
): IntentMatch[] {
  const trimmed = query.trim().toLowerCase();
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Journey boost: a token matching a step's title or description lifts
  // every file that step passes through.
  const tourBoost = new Map<string, number>();
  for (const step of tour ?? []) {
    const boost = fieldScore(step.title, tokens, 2) + fieldScore(step.description, tokens, 1);
    if (boost <= 0) continue;
    for (const id of step.nodeIds) {
      tourBoost.set(id, (tourBoost.get(id) ?? 0) + boost);
    }
  }

  const scored: IntentMatch[] = [];
  for (const node of nodes) {
    const plain = node.plainMeta;
    let score =
      fieldScore(plain?.plainName, tokens, 3) +
      fieldScore(plain?.plainWhat, tokens, 3) +
      fieldScore(plain?.plainRole, tokens, 3) +
      fieldScore(plain?.plainConsequence, tokens, 2) +
      fieldScore(node.name, tokens, 1) +
      fieldScore(node.summary, tokens, 1) +
      (tourBoost.get(node.id) ?? 0);
    // Whole-phrase bonus: the exact request appearing in a plain field
    // outranks scattered single-word hits.
    if (
      plain?.plainWhat?.toLowerCase().includes(trimmed) ||
      plain?.plainRole?.toLowerCase().includes(trimmed) ||
      plain?.plainName?.toLowerCase().includes(trimmed)
    ) {
      score += 4;
    }
    if (score > 0) scored.push({ node, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
