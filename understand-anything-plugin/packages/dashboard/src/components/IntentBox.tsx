import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "../store";
import { useI18n } from "../contexts/I18nContext";
import { matchIntent } from "../utils/intent-match";
import { fillTask } from "../utils/intent-prompt";
import type { GraphNode } from "@understand-anything/core/types";

// Same risk dot colors as the card badge, the graph nodes and the feature
// boxes, so every surface agrees. No dot when the level is unknown.
const riskDotColors: Record<string, string> = {
  green: "#7fb98a",
  yellow: "#d8a94e",
  red: "#c97070",
};

function riskLabelFor(node: GraphNode, t: ReturnType<typeof useI18n>["t"]): string | null {
  if (node.riskLevel === "green") return t.nodeInfo.riskSafe;
  if (node.riskLevel === "yellow") return t.nodeInfo.riskCaution;
  if (node.riskLevel === "red") return t.nodeInfo.riskDanger;
  return null;
}

export default function IntentBox() {
  const graph = useDashboardStore((s) => s.graph);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const { t } = useI18n();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => (query.trim() ? matchIntent(graph?.nodes ?? [], graph?.tour ?? [], query) : []),
    [graph, query],
  );

  // Close the results on outside click, like SearchBar.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = async (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const template = node.plainMeta?.safeChangeInstruction;
    if (!template) return;
    try {
      await navigator.clipboard.writeText(fillTask(template, query));
      setCopiedId(node.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative z-30">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface border-b border-border-subtle">
        <span className="text-base shrink-0">🎯</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t.intentBox.placeholder}
          className="flex-1 min-w-0 bg-elevated text-text-primary text-sm rounded-lg px-3 py-1.5 border border-border-subtle focus:outline-none focus:border-accent/50 placeholder-text-muted"
        />
      </div>

      {showPanel && (
        <div className="absolute start-3 end-3 sm:start-4 sm:end-4 top-full mt-1 glass rounded-lg shadow-xl overflow-hidden animate-fade-slide-in z-50 max-h-[320px] overflow-auto">
          {matches.length === 0 ? (
            <p className="text-sm text-text-secondary px-4 py-3">{t.intentBox.noResults}</p>
          ) : (
            <div className="p-2 space-y-1.5">
              {matches.map(({ node }, i) => {
                const template = node.plainMeta?.safeChangeInstruction;
                const riskLabel = riskLabelFor(node, t);
                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      selectNode(node.id);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      i === 0
                        ? "border-gold/40 bg-gold/5 hover:bg-gold/10"
                        : "border-border-subtle bg-elevated hover:border-gold/40"
                    }`}
                  >
                    {node.riskLevel && riskDotColors[node.riskLevel] && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: riskDotColors[node.riskLevel] }}
                        role="img"
                        aria-label={riskLabel ?? undefined}
                        title={riskLabel ?? undefined}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div dir="ltr" className="text-xs text-text-primary truncate">
                        {node.name}
                      </div>
                      {node.plainMeta?.plainName && (
                        <div className="text-[11px] text-text-muted truncate">
                          {node.plainMeta.plainName}
                        </div>
                      )}
                    </div>
                    {template && (
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, node)}
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border border-accent/30 text-accent hover:text-accent-bright hover:border-accent/60 transition-colors"
                      >
                        {copiedId === node.id ? t.common.copied : `📋 ${t.intentBox.copyPrompt}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
