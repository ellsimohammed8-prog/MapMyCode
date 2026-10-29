import { useMemo } from "react";
import { useDashboardStore } from "../store";
import { useI18n } from "../contexts/I18nContext";
import type { GraphNode, TourStep } from "@understand-anything/core/types";

// Risk dot colors — same hexes as the NodeInfo badge and the CustomNode
// border, so the card, the map and the feature boxes always agree. A node
// without a riskLevel gets no dot: unknown is never shown as green.
const riskDotColors: Record<string, string> = {
  green: "#7fb98a",
  yellow: "#d8a94e",
  red: "#c97070",
};

function RiskDot({ riskLevel, label }: { riskLevel?: string; label: string | null }) {
  if (!riskLevel || !riskDotColors[riskLevel] || !label) return null;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: riskDotColors[riskLevel] }}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}

function riskLabelFor(node: GraphNode, t: ReturnType<typeof useI18n>["t"]): string | null {
  if (node.riskLevel === "green") return t.nodeInfo.riskSafe;
  if (node.riskLevel === "yellow") return t.nodeInfo.riskCaution;
  if (node.riskLevel === "red") return t.nodeInfo.riskDanger;
  return null;
}

function FileRow({ node, onSelect }: { node: GraphNode; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="w-full flex items-center gap-2 text-start px-3 py-2 rounded-lg bg-surface border border-border-subtle hover:border-gold/40 transition-colors"
    >
      <RiskDot riskLevel={node.riskLevel} label={riskLabelFor(node, t)} />
      <span dir="ltr" className="text-xs text-text-primary truncate">
        {node.name}
      </span>
      {node.plainMeta?.plainName && (
        <span className="text-[11px] text-text-muted truncate">{node.plainMeta.plainName}</span>
      )}
    </button>
  );
}

function TourStepCard({
  step,
  nodes,
  onSelect,
}: {
  step: TourStep;
  nodes: GraphNode[];
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const redNodes = nodes.filter((n) => n.riskLevel === "red");

  return (
    <div className="rounded-lg border border-border-subtle bg-elevated p-4">
      <h3 className="text-base font-heading text-text-primary mb-1">{step.title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-3">{step.description}</p>

      {redNodes.length > 0 && (
        <div className="rounded-lg border border-[#c97070]/40 bg-[#c97070]/10 p-3 mb-3 space-y-1.5">
          {redNodes.map((n) => (
            <p key={n.id} className="text-xs text-text-secondary leading-relaxed">
              <span className="me-1">⚠️</span>
              <span dir="ltr" className="text-text-primary">
                {n.name}
              </span>
              <span className="text-text-muted"> — </span>
              {n.plainMeta?.plainConsequence ?? t.nodeInfo.riskDanger}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {nodes.map((n) => (
          <FileRow key={n.id} node={n} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export default function FeaturesView() {
  const graph = useDashboardStore((s) => s.graph);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const { t } = useI18n();

  const { steps, supplementary } = useMemo(() => {
    if (!graph) {
      return { steps: [], supplementary: { layers: [], other: [] } } as {
        steps: { step: TourStep; nodes: GraphNode[] }[];
        supplementary: {
          layers: { name: string; nodes: GraphNode[] }[];
          other: GraphNode[];
        };
      };
    }

    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    const toured = new Set<string>();

    // Main boxes: one card per journey step, in journey order. Steps whose
    // nodes are all missing from the graph are dropped, never shown empty.
    const steps = [...(graph.tour ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        step,
        nodes: step.nodeIds
          .map((id) => nodesById.get(id))
          .filter((n): n is GraphNode => n !== undefined),
      }))
      .filter((s) => s.nodes.length > 0);
    steps.forEach(({ nodes }) => nodes.forEach((n) => toured.add(n.id)));

    // Supplementary box: every file the journey did not cover, grouped by
    // its layer — plus a catch-all group for nodes no layer claims — so
    // 100% of the project is present somewhere on this page.
    const untoured = graph.nodes.filter((n) => !toured.has(n.id));
    const untouredIds = new Set(untoured.map((n) => n.id));
    const layers = (graph.layers ?? [])
      .map((layer) => ({
        name: layer.name,
        nodes: layer.nodeIds
          .map((id) => nodesById.get(id))
          .filter((n): n is GraphNode => n !== undefined && untouredIds.has(n.id)),
      }))
      .filter((g) => g.nodes.length > 0);
    const layeredIds = new Set(layers.flatMap((g) => g.nodes.map((n) => n.id)));
    const other = untoured.filter((n) => !layeredIds.has(n.id));

    return { steps, supplementary: { layers, other } };
  }, [graph]);

  if (!graph) return null;

  return (
    <div className="h-full w-full overflow-auto p-5 animate-fade-slide-in">
      {steps.length === 0 ? (
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {t.featuresView.noTour}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-4">
          {steps.map(({ step, nodes }) => (
            <TourStepCard key={step.order} step={step} nodes={nodes} onSelect={selectNode} />
          ))}
        </div>
      )}

      {(supplementary.layers.length > 0 || supplementary.other.length > 0) && (
        <details className="rounded-lg border border-border-subtle bg-elevated p-4">
          <summary className="cursor-pointer text-sm font-semibold text-text-primary">
            {t.featuresView.supplementaryTitle}
          </summary>
          <div className="mt-3 space-y-4">
            {supplementary.layers.map((group) => (
              <div key={group.name}>
                <h4 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
                  {group.name}
                </h4>
                <div className="space-y-1.5">
                  {group.nodes.map((n) => (
                    <FileRow key={n.id} node={n} onSelect={selectNode} />
                  ))}
                </div>
              </div>
            ))}
            {supplementary.other.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-2">
                  {t.featuresView.otherFiles}
                </h4>
                <div className="space-y-1.5">
                  {supplementary.other.map((n) => (
                    <FileRow key={n.id} node={n} onSelect={selectNode} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
