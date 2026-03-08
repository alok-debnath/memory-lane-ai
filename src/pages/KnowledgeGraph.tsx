import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Network, X, Tag, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface GraphMemory {
  id: string;
  title: string;
  category: string;
  tags: string[];
  created_at: string;
  content: string;
}

interface GraphNode {
  id: string;
  title: string;
  category: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  content: string;
  created_at: string;
}

interface GraphEdge {
  source: number;
  target: number;
  strength: number;
  sharedTags: string[];
}

const categoryColors: Record<string, string> = {
  personal: '#F97316',
  work: '#3B82F6',
  finance: '#10B981',
  health: '#EF4444',
  other: '#8B5CF6',
};

function buildForceGraph(memories: GraphMemory[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = memories.map(m => ({
    ...m,
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 500,
    vx: 0,
    vy: 0,
  }));

  const edges: GraphEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const sharedTags = (nodes[i].tags || []).filter(t => (nodes[j].tags || []).includes(t));
      const sameCategory = nodes[i].category === nodes[j].category;
      if (sharedTags.length > 0 || sameCategory) {
        edges.push({
          source: i,
          target: j,
          strength: sharedTags.length * 3 + (sameCategory ? 1 : 0),
          sharedTags,
        });
      }
    }
  }

  // Run force simulation
  const iterations = 120;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (3000 * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodes[edge.source];
      const b = nodes[edge.target];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const targetDist = 80 / Math.max(edge.strength, 1);
      const force = (dist - targetDist) * 0.008 * alpha * edge.strength;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx -= node.x * 0.002 * alpha;
      node.vy -= node.y * 0.002 * alpha;
    }

    // Apply with damping
    const damping = 0.85;
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  // Reset velocities
  nodes.forEach(n => { n.vx = 0; n.vy = 0; });
  return { nodes, edges };
}

const KnowledgeGraph: React.FC = () => {
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -350, w: 800, h: 700 });

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['graph-memories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('id, title, category, created_at, content')
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      // Fetch tags separately since column might not be in types
      const ids = (data || []).map(d => d.id);
      if (ids.length === 0) return [];
      const { data: withTags } = await (supabase as any)
        .from('memory_notes')
        .select('id, tags')
        .in('id', ids);
      const tagMap = new Map((withTags || []).map((t: any) => [t.id, t.tags || []]));
      return (data || []).map(m => ({
        ...m,
        tags: tagMap.get(m.id) || [],
        category: m.category || 'other',
      })) as GraphMemory[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const graph = useMemo(() => {
    if (memories.length === 0) return { nodes: [], edges: [] };
    return buildForceGraph(memories);
  }, [memories]);

  // Collect all unique tags for legend
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    graph.nodes.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).slice(0, 20);
  }, [graph.nodes]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="native-card aspect-[4/3] animate-pulse" />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <Network className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-base">No memories to visualize</h3>
        <p className="text-[13px] text-muted-foreground mt-1">Create some memories to see your knowledge graph</p>
      </div>
    );
  }

  const nodeRadius = (n: GraphNode) => {
    const connections = graph.edges.filter(e => graph.nodes[e.source].id === n.id || graph.nodes[e.target].id === n.id).length;
    return Math.max(6, Math.min(16, 6 + connections * 2));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2.5">
          <Network className="w-6 h-6 text-primary" />
          Knowledge Graph
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {graph.nodes.length} memories · {graph.edges.length} connections
        </p>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryColors).map(([cat, color]) => {
          const count = graph.nodes.filter(n => n.category === cat).length;
          if (count === 0) return null;
          return (
            <div key={cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="capitalize">{cat} ({count})</span>
            </div>
          );
        })}
      </div>

      {/* Graph */}
      <div className="native-card-elevated overflow-hidden rounded-2xl" style={{ aspectRatio: '4 / 3' }}>
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full bg-card cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <defs>
            {Object.entries(categoryColors).map(([cat, color]) => (
              <radialGradient key={cat} id={`glow-${cat}`}>
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const a = graph.nodes[edge.source];
            const b = graph.nodes[edge.target];
            const isHighlighted = hoveredNode === a.id || hoveredNode === b.id;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isHighlighted ? 1.5 : 0.5 + edge.strength * 0.3}
                strokeOpacity={isHighlighted ? 0.8 : 0.3}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const r = nodeRadius(node);
            const color = categoryColors[node.category] || categoryColors.other;
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Glow */}
                {(isHovered || isSelected) && (
                  <circle cx={node.x} cy={node.y} r={r * 3} fill={`url(#glow-${node.category})`} />
                )}
                {/* Node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered || isSelected ? r * 1.3 : r}
                  fill={color}
                  stroke={isSelected ? 'hsl(var(--foreground))' : 'none'}
                  strokeWidth={2}
                  opacity={hoveredNode && !isHovered ? 0.4 : 1}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* Label */}
                {(isHovered || isSelected || r > 10) && (
                  <text
                    x={node.x}
                    y={node.y + r + 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill="hsl(var(--foreground))"
                    fontWeight="600"
                    opacity={isHovered || isSelected ? 1 : 0.6}
                  >
                    {node.title.length > 20 ? node.title.slice(0, 18) + '…' : node.title}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tag cloud */}
      {allTags.length > 0 && (
        <div className="native-card p-4">
          <p className="section-label mb-2">Top Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selected node details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="native-card-elevated p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-display font-bold text-foreground">{selectedNode.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] capitalize text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                    {selectedNode.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selectedNode.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-foreground/80 leading-relaxed">{selectedNode.content}</p>

            {selectedNode.tags?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                {selectedNode.tags.map(tag => (
                  <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Connected memories */}
            {(() => {
              const connected = graph.edges
                .filter(e => graph.nodes[e.source].id === selectedNode.id || graph.nodes[e.target].id === selectedNode.id)
                .map(e => graph.nodes[e.source].id === selectedNode.id ? graph.nodes[e.target] : graph.nodes[e.source])
                .slice(0, 5);
              if (connected.length === 0) return null;
              return (
                <div className="pt-2">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Connected to</p>
                  {connected.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNode(n)}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: categoryColors[n.category] || categoryColors.other }} />
                      <span className="text-[13px] text-foreground truncate flex-1">{n.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KnowledgeGraph;
