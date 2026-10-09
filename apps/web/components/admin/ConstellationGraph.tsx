"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  forceX,
  forceY
} from "d3-force-3d";
import {
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Clock,
  Award,
  ExternalLink,
  X,
  Building,
  UserCheck,
  Stethoscope,
  Pill,
  Shield,
  Layers,
  ChevronRight
} from "lucide-react";

export interface GraphNodeData {
  id: string;
  label: string;
  type: "MedSync" | "Medicine" | "Patient" | "Doctor" | "Pharmacy" | "Hospital" | "Admin" | string;
  hasError?: boolean;
  details?: string;
  isCentral?: boolean;
  targetX?: number;
  targetY?: number;
  entityData?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    bloodGroup?: string;
    specialization?: string;
    licenseNumber?: string;
    clinicName?: string;
    clinicAddress?: string;
    experience?: number;
    consultationFee?: number;
    operatingHours?: string;
    is24x7?: boolean;
    type?: string;
    role?: string;
    status?: string;
    isVerified?: boolean;
    googleMapsLink?: string;
    [key: string]: any;
  };
  // D3 force simulation internal properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdgeData {
  source: string | GraphNodeData;
  target: string | GraphNodeData;
  type: string;
}

interface ConstellationGraphProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

// Visual color tokens inspired by deep space obsidian constellations
const ENTITY_CONFIG: Record<
  string,
  {
    color: string;
    glow: string;
    neighborColor: string;
    radius: number;
    icon: any;
    label: string;
  }
> = {
  MedSync: {
    color: "#fbbf24", // Celestial radiant gold
    glow: "rgba(251, 191, 36, 0.55)",
    neighborColor: "#f59e0b",
    radius: 16,
    icon: Sparkles,
    label: "MedSync Core"
  },
  Medicine: {
    color: "#fbbf24", // Core fallback
    glow: "rgba(251, 191, 36, 0.55)",
    neighborColor: "#f59e0b",
    radius: 16,
    icon: Sparkles,
    label: "MedSync Core"
  },
  Hospital: {
    color: "#c084fc", // Radiant violet
    glow: "rgba(192, 132, 252, 0.4)",
    neighborColor: "#ec4899", // Neon magenta
    radius: 11,
    icon: Building,
    label: "Hospital"
  },
  Doctor: {
    color: "#34d399", // Emerald nebula
    glow: "rgba(52, 211, 153, 0.4)",
    neighborColor: "#06b6d4", // Electric cyan
    radius: 9,
    icon: Stethoscope,
    label: "Doctor"
  },
  Patient: {
    color: "#38bdf8", // Stellar sky blue
    glow: "rgba(56, 189, 248, 0.4)",
    neighborColor: "#f43f5e", // Neon pink / rose
    radius: 7,
    icon: UserCheck,
    label: "Patient"
  },
  Pharmacy: {
    color: "#fb923c", // Amber orange
    glow: "rgba(251, 146, 60, 0.4)",
    neighborColor: "#e879f9", // Vivid purple
    radius: 8,
    icon: Pill,
    label: "Pharmacy"
  },
  Admin: {
    color: "#fb7185", // Crimson rose
    glow: "rgba(251, 113, 133, 0.4)",
    neighborColor: "#a855f7",
    radius: 8,
    icon: Shield,
    label: "Admin"
  }
};

const DEFAULT_CONFIG = {
  color: "#94a3b8",
  glow: "rgba(148, 163, 184, 0.3)",
  neighborColor: "#38bdf8",
  radius: 7,
  icon: Sparkles,
  label: "Entity"
};

// Generates background celestial dust stars for cosmic atmosphere
function generateBackgroundStars(count: number, width: number, height: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.45 + 0.1,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    });
  }
  return stars;
}

export default function ConstellationGraph({ nodes: initialNodes, edges: initialEdges }: ConstellationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Graph state
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNodeData | null>(null);
  const [proximityDistance, setProximityDistance] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [labelMode, setLabelMode] = useState<"ALL" | "CONNECTED" | "HOVER_ONLY">("ALL");
  const [showStarfield, setShowStarfield] = useState(true);

  // Camera transform: x, y in pixels, k is zoom scale
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Mouse interaction state
  const isDraggingCanvasRef = useRef(false);
  const isDraggingNodeRef = useRef(false);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const dragStartTransformRef = useRef({ x: 0, y: 0 });
  const activeDraggedNodeRef = useRef<GraphNodeData | null>(null);
  const mouseScreenPosRef = useRef<{ x: number; y: number } | null>(null);

  // Background stars
  const backgroundStarsRef = useRef<any[]>([]);

  // Simulation data clones
  const simNodesRef = useRef<GraphNodeData[]>([]);
  const simEdgesRef = useRef<any[]>([]);

  // Node lookup map for quick connection resolution
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    initialNodes.forEach((n) => map.set(n.id, new Set()));

    initialEdges.forEach((e) => {
      const srcId = typeof e.source === "object" ? (e.source as any).id : e.source;
      const tgtId = typeof e.target === "object" ? (e.target as any).id : e.target;
      if (map.has(srcId)) map.get(srcId)!.add(tgtId);
      if (map.has(tgtId)) map.get(tgtId)!.add(srcId);
    });
    return map;
  }, [initialNodes, initialEdges]);

  // Initializing physics simulation with organic non-symmetric seeding
  useEffect(() => {
    if (!initialNodes || initialNodes.length === 0) return;

    // Filter nodes if user applied a role filter
    const filteredNodes =
      filterType === "ALL"
        ? initialNodes
        : initialNodes.filter((n) => n.isCentral || n.type === filterType);

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = initialEdges.filter((e) => {
      const srcId = typeof e.source === "object" ? (e.source as any).id : e.source;
      const tgtId = typeof e.target === "object" ? (e.target as any).id : e.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });

    // Role cluster sector angles and distances around central MedSync core
    const ROLE_SECTORS: Record<string, { angle: number; radius: number }> = {
      Hospital: { angle: -Math.PI / 2, radius: 135 },       // 12 o'clock (North)
      Doctor: { angle: -Math.PI / 6, radius: 160 },         // ~1:30 o'clock (North-East)
      Patient: { angle: Math.PI / 4, radius: 195 },         // ~3:30 o'clock (East-Southeast)
      Pharmacy: { angle: (3 * Math.PI) / 4, radius: 165 },  // ~7:30 o'clock (South-West)
      Admin: { angle: (-3 * Math.PI) / 4, radius: 125 }     // ~10:30 o'clock (North-West)
    };

    const clonedNodes: GraphNodeData[] = filteredNodes.map((n) => {
      const isHub = n.isCentral || n.id === "MEDSYNC" || n.id === "MEDICINE" || n.type === "MedSync" || n.type === "Medicine";
      if (isHub) {
        return {
          ...n,
          isCentral: true,
          label: n.label === "Medicine" ? "MedSync" : n.label,
          type: "MedSync",
          x: 0,
          y: 0,
          fx: 0,
          fy: 0,
          targetX: 0,
          targetY: 0,
          vx: 0,
          vy: 0
        };
      }

      // Group entities of the same role tightly together in their orbital sector
      const sameRoleNodes = filteredNodes.filter((item) => item.type === n.type);
      const rIdx = sameRoleNodes.indexOf(n);
      const count = sameRoleNodes.length;
      const sector = ROLE_SECTORS[n.type] || { angle: 0, radius: 150 };

      const arcSpread = Math.min(0.65, 0.12 * Math.max(count, 1));
      const spreadOffset = count > 1 ? ((rIdx / (count - 1)) - 0.5) * arcSpread : 0;
      const radJitter = (rIdx % 2 === 0 ? 1 : -1) * 12;

      const targetAngle = sector.angle + spreadOffset;
      const targetRadius = sector.radius + radJitter;
      const initX = Math.cos(targetAngle) * targetRadius;
      const initY = Math.sin(targetAngle) * targetRadius;

      return {
        ...n,
        x: initX,
        y: initY,
        targetX: initX,
        targetY: initY,
        vx: 0,
        vy: 0
      };
    });

    const clonedEdges = filteredEdges.map((e) => ({
      source: typeof e.source === "object" ? (e.source as any).id : e.source,
      target: typeof e.target === "object" ? (e.target as any).id : e.target,
      type: e.type
    }));

    simNodesRef.current = clonedNodes;
    simEdgesRef.current = clonedEdges;

    // D3 Force Simulation (Single tight cluster with role-based sector clustering)
    const simulation = forceSimulation(clonedNodes, 2)
      .force(
        "charge",
        forceManyBody()
          .strength((d: any) => (d.isCentral ? -260 : -85))
          .distanceMax(360)
      )
      .force(
        "x",
        forceX((d: any) => (d.isCentral ? 0 : d.targetX || 0)).strength((d: any) => (d.isCentral ? 1 : 0.32))
      )
      .force(
        "y",
        forceY((d: any) => (d.isCentral ? 0 : d.targetY || 0)).strength((d: any) => (d.isCentral ? 1 : 0.32))
      )
      .force(
        "link",
        forceLink(clonedEdges)
          .id((d: any) => d.id)
          .distance((link: any) => {
            const type = link.type || "";
            if (type.includes("network") || type.includes("verified") || type.includes("accredited") || type.includes("holder")) return 105;
            if (type.includes("affiliated")) return 65;
            if (type.includes("active") || type.includes("plan")) return 75;
            if (type.includes("dispenses")) return 70;
            return 80;
          })
          .strength(0.75)
      )
      .force(
        "collide",
        forceCollide()
          .radius((d: any) => {
            const conf = ENTITY_CONFIG[d.type] || DEFAULT_CONFIG;
            return conf.radius + 15;
          })
          .iterations(3)
      )
      .force("center", forceCenter(0, 0))
      .alphaDecay(0.02)
      .velocityDecay(0.35);

    simRef.current = simulation;

    // Generate cosmic background stars
    if (containerRef.current) {
      backgroundStarsRef.current = generateBackgroundStars(
        160,
        containerRef.current.clientWidth || 1000,
        containerRef.current.clientHeight || 600
      );
    }

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialEdges, filterType]);

  // Main Canvas Render Loop (60 FPS, High-DPI hardware accelerated)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Complete Deep Black Space Background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Twinkling Background Celestial Starfield
      if (showStarfield) {
        ctx.save();
        const stars = backgroundStarsRef.current;
        const now = Date.now();
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const twinkle = Math.sin(now * s.twinkleSpeed + s.phase) * 0.2 + 0.8;
          ctx.beginPath();
          ctx.arc(
            width / 2 + s.x * transformRef.current.k * 0.3 + transformRef.current.x * 0.1,
            height / 2 + s.y * transformRef.current.k * 0.3 + transformRef.current.y * 0.1,
            s.size * dpr,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(203, 213, 225, ${s.alpha * twinkle})`;
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Apply Camera Zoom & Pan Transformations
      ctx.save();
      ctx.translate(
        width / 2 + transformRef.current.x * dpr,
        height / 2 + transformRef.current.y * dpr
      );
      ctx.scale(transformRef.current.k * dpr, transformRef.current.k * dpr);

      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;
      const hovered = hoveredNode;
      const selected = selectedNode;
      const activeNode = hovered || selected;

      // Identify active constellation neighbors
      const activeNeighborIds = new Set<string>();
      if (activeNode) {
        const neighbors = adjacencyMap.get(activeNode.id);
        if (neighbors) {
          neighbors.forEach((id) => activeNeighborIds.add(id));
        }
      }

      // --- 4. RENDER CONSTELLATION EDGES ---
      const nowTime = Date.now();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const src = typeof edge.source === "object" ? edge.source : null;
        const tgt = typeof edge.target === "object" ? edge.target : null;

        if (!src || !tgt || src.x === undefined || tgt.x === undefined) continue;

        const isEdgeConnectedToActive =
          activeNode && (src.id === activeNode.id || tgt.id === activeNode.id);

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (isEdgeConnectedToActive) {
          // HIGHLIGHTED EDGE (Inspired by cyan glowing lines in Image 2)
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 12;
          ctx.strokeStyle = "rgba(6, 182, 212, 0.95)"; // Bright cyan neon
          ctx.lineWidth = 2.4 / transformRef.current.k;
          ctx.stroke();

          // Reset shadow
          ctx.shadowBlur = 0;

          // Animated energy photon packet along the line
          const progress = (nowTime / 1400 + i * 0.25) % 1;
          const px = src.x + (tgt.x - src.x) * progress;
          const py = src.y + (tgt.y - src.y) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5 / transformRef.current.k, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (activeNode) {
          // Dim non-connected edges when a node is hovered/active
          ctx.strokeStyle = "rgba(100, 116, 139, 0.08)";
          ctx.lineWidth = 0.8 / transformRef.current.k;
          ctx.stroke();
        } else {
          // Resting constellation thread
          ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
          ctx.lineWidth = 1.1 / transformRef.current.k;
          ctx.stroke();
        }
      }

      // --- 5. RENDER CONSTELLATION NODES (STARS) ---
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.x === undefined || node.y === undefined) continue;

        const config = ENTITY_CONFIG[node.type] || DEFAULT_CONFIG;
        const isHovered = hovered?.id === node.id;
        const isSelected = selected?.id === node.id;
        const isNeighbor = activeNeighborIds.has(node.id);
        const isDimmed = activeNode && !isHovered && !isSelected && !isNeighbor;

        const baseRadius = node.isCentral ? 14 : config.radius;
        // Smoothly swell node radius when hovered or close
        const radius = isHovered
          ? baseRadius * 1.35
          : isNeighbor
          ? baseRadius * 1.15
          : baseRadius;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.18;
        }

        // A. Outer Radiant Halo / Nebula Aura
        const haloRadius = radius * (isHovered ? 3.0 : isNeighbor ? 2.4 : 1.9);
        const haloGrad = ctx.createRadialGradient(
          node.x,
          node.y,
          radius * 0.5,
          node.x,
          node.y,
          haloRadius
        );

        const auraColor = isNeighbor
          ? config.neighborColor // Vivid neon magenta / pink for neighbors (Image 2 style)
          : isHovered
          ? "#06b6d4" // Glowing teal/cyan for hovered node (Image 2 style)
          : config.color;

        haloGrad.addColorStop(0, auraColor + "88");
        haloGrad.addColorStop(0.5, auraColor + "22");
        haloGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // B. Pulsing Concentric Outer Ring on Hover (Image 2 signature effect)
        if (isHovered) {
          const pulseWave = Math.sin(nowTime * 0.006) * 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 5 + pulseWave, 0, Math.PI * 2);
          ctx.strokeStyle = "#22d3ee"; // Neon cyan
          ctx.lineWidth = 1.8 / transformRef.current.k;
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // C. Core Celestial Orb / Star Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        // Core color: cyan if hovered, neighbor vibrant color if neighbor, else native entity color
        const coreColor = isHovered
          ? "#06b6d4"
          : isNeighbor
          ? config.neighborColor
          : config.color;

        ctx.fillStyle = coreColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = isHovered ? 16 : isNeighbor ? 12 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner white glimmer highlight
        ctx.beginPath();
        ctx.arc(
          node.x - radius * 0.3,
          node.y - radius * 0.3,
          radius * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fill();

        // D. Node Text Label (Crisp, legibly rendered directly on canvas like Image 2)
        const shouldShowLabel =
          labelMode === "ALL" ||
          (labelMode === "CONNECTED" && (isHovered || isNeighbor || isSelected)) ||
          (labelMode === "HOVER_ONLY" && (isHovered || isSelected));

        if (shouldShowLabel && !isDimmed) {
          const fontSize = isHovered
            ? 13
            : isNeighbor
            ? 12
            : node.isCentral
            ? 12
            : 10.5;

          ctx.font = `${isHovered || isNeighbor ? "600" : "500"} ${
            fontSize / transformRef.current.k
          }px Inter, -apple-system, sans-serif`;

          const labelText = node.label || "Entity";
          const labelY = node.y + radius + (13 / transformRef.current.k);

          // Dark drop-shadow outline for guaranteed readability against lines
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.strokeStyle = "rgba(5, 7, 12, 0.9)";
          ctx.lineWidth = 3 / transformRef.current.k;
          ctx.strokeText(labelText, node.x, labelY);

          // Text Fill
          ctx.fillStyle = isHovered
            ? "#38bdf8"
            : isNeighbor
            ? "#f8fafc"
            : "#cbd5e1";

          if (isHovered) {
            ctx.shadowColor = "#0284c7";
            ctx.shadowBlur = 8;
          }
          ctx.fillText(labelText, node.x, labelY);
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [hoveredNode, selectedNode, labelMode, showStarfield, adjacencyMap]);

  // Handle Resize & DPR
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      // Regulate stars
      backgroundStarsRef.current = generateBackgroundStars(160, width, height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PROXIMITY DETECTION & MOUSE INTERACTION ENGINE
  // Solves: "and also i can navigate or it doesnt react when i take the mouse close to it"
  const getMousePosOnCanvas = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  // Transform graph coordinates (node.x, node.y) to screen coordinates (px from top-left)
  const graphToScreen = useCallback((gx: number, gy: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    return {
      x: width / 2 + transformRef.current.x + gx * transformRef.current.k,
      y: height / 2 + transformRef.current.y + gy * transformRef.current.k
    };
  }, []);

  // Transform screen coordinates back to graph space
  const screenToGraph = useCallback((sx: number, sy: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    return {
      x: (sx - width / 2 - transformRef.current.x) / transformRef.current.k,
      y: (sy - height / 2 - transformRef.current.y) / transformRef.current.k
    };
  }, []);

  // Proximity Hit Tester: detects when mouse comes close to a node (radius ~42px)
  const findClosestNodeInProximity = useCallback(
    (mx: number, my: number, thresholdRadius: number = 42) => {
      const nodes = simNodesRef.current;
      let closestNode: GraphNodeData | null = null;
      let minDistance = thresholdRadius;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.x === undefined || node.y === undefined) continue;

        const screenPos = graphToScreen(node.x, node.y);
        const dist = Math.hypot(screenPos.x - mx, screenPos.y - my);

        if (dist < minDistance) {
          minDistance = dist;
          closestNode = node;
        }
      }

      return { node: closestNode, distance: minDistance };
    },
    [graphToScreen]
  );

  // Mouse Move Event Listener
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      mouseScreenPosRef.current = { x: mx, y: my };

      if (isDraggingNodeRef.current && activeDraggedNodeRef.current) {
        // Dragging a node in 2D space
        const graphPos = screenToGraph(mx, my);
        activeDraggedNodeRef.current.fx = graphPos.x;
        activeDraggedNodeRef.current.fy = graphPos.y;
        if (simRef.current) {
          simRef.current.alpha(0.2).restart();
        }
        return;
      }

      if (isDraggingCanvasRef.current) {
        // Panning the canvas
        const dx = mx - dragStartMouseRef.current.x;
        const dy = my - dragStartMouseRef.current.y;
        transformRef.current.x = dragStartTransformRef.current.x + dx;
        transformRef.current.y = dragStartTransformRef.current.y + dy;
        return;
      }

      // Proximity detection: react when mouse moves close to any star!
      const { node, distance } = findClosestNodeInProximity(mx, my, 45);
      if (node) {
        setHoveredNode(node);
        setProximityDistance(distance);
        if (canvasRef.current) canvasRef.current.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        setProximityDistance(0);
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
    },
    [getMousePosOnCanvas, screenToGraph, findClosestNodeInProximity]
  );

  // Mouse Down Event Listener
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      dragStartMouseRef.current = { x: mx, y: my };
      dragStartTransformRef.current = { ...transformRef.current };

      // Check if mouse is on or in proximity to a node
      const { node } = findClosestNodeInProximity(mx, my, 35);
      if (node) {
        isDraggingNodeRef.current = true;
        activeDraggedNodeRef.current = node;
        const graphPos = screenToGraph(mx, my);
        node.fx = graphPos.x;
        node.fy = graphPos.y;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      } else {
        isDraggingCanvasRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }
    },
    [getMousePosOnCanvas, findClosestNodeInProximity, screenToGraph]
  );

  // Mouse Up Event Listener
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      const movedDist = Math.hypot(
        mx - dragStartMouseRef.current.x,
        my - dragStartMouseRef.current.y
      );

      if (isDraggingNodeRef.current && activeDraggedNodeRef.current) {
        // Release node fixation (let it settle naturally into constellation)
        activeDraggedNodeRef.current.fx = null;
        activeDraggedNodeRef.current.fy = null;
        isDraggingNodeRef.current = false;
        activeDraggedNodeRef.current = null;
        if (simRef.current) {
          simRef.current.alpha(0.2).restart();
        }
      }

      if (isDraggingCanvasRef.current) {
        isDraggingCanvasRef.current = false;
      }

      // If user performed a click without significant dragging, trigger selection
      if (movedDist < 6) {
        const { node } = findClosestNodeInProximity(mx, my, 35);
        if (node) {
          setSelectedNode(node);
        } else {
          setSelectedNode(null);
        }
      }

      if (canvasRef.current) {
        canvasRef.current.style.cursor = hoveredNode ? "pointer" : "grab";
      }
    },
    [getMousePosOnCanvas, findClosestNodeInProximity, hoveredNode]
  );

  // Mouse Wheel (Smooth Zoom centered on cursor)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const { x: mx, y: my } = getMousePosOnCanvas(e as any);
      if (!canvasRef.current) return;

      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const currentK = transformRef.current.k;
      const newK = Math.max(0.25, Math.min(4.5, currentK * zoomFactor));

      // Zoom towards mouse pointer
      const graphMouseX = (mx - width / 2 - transformRef.current.x) / currentK;
      const graphMouseY = (my - height / 2 - transformRef.current.y) / currentK;

      transformRef.current.x = mx - width / 2 - graphMouseX * newK;
      transformRef.current.y = my - height / 2 - graphMouseY * newK;
      transformRef.current.k = newK;

      setZoomLevel(newK);
    },
    [getMousePosOnCanvas]
  );

  // Double Click: Center camera onto clicked node or reset view
  // Smooth Camera Animation
  const smoothAnimateCamera = useCallback(
    (targetX: number, targetY: number, targetK: number) => {
      const startX = transformRef.current.x;
      const startY = transformRef.current.y;
      const startK = transformRef.current.k;
      const startTime = performance.now();
      const duration = 500;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        transformRef.current.x = startX + (targetX - startX) * ease;
        transformRef.current.y = startY + (targetY - startY) * ease;
        transformRef.current.k = startK + (targetK - startK) * ease;
        setZoomLevel(transformRef.current.k);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    },
    []
  );

  // Fit view: centers all nodes and adjusts zoom
  const fitView = useCallback(() => {
    const nodes = simNodesRef.current;
    if (!nodes.length || !containerRef.current) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const n of nodes) {
      if (n.x === undefined || n.y === undefined) continue;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const boundWidth = Math.max(maxX - minX + 160, 200);
    const boundHeight = Math.max(maxY - minY + 160, 200);

    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 500;

    const scaleX = containerWidth / boundWidth;
    const scaleY = containerHeight / boundHeight;
    const targetK = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY) * 0.85));

    const centerX = -(minX + maxX) / 2 * targetK;
    const centerY = -(minY + maxY) / 2 * targetK;

    smoothAnimateCamera(centerX, centerY, targetK);
  }, [smoothAnimateCamera]);

  // Double Click: Center camera onto clicked node or reset view
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      const { node } = findClosestNodeInProximity(mx, my, 40);

      if (node && node.x !== undefined && node.y !== undefined) {
        // Smoothly center onto this node
        smoothAnimateCamera(-node.x * 1.6, -node.y * 1.6, 1.6);
        setSelectedNode(node);
      } else {
        // Reset view to origin
        fitView();
      }
    },
    [getMousePosOnCanvas, findClosestNodeInProximity, smoothAnimateCamera, fitView]
  );

  // Zoom Controls
  const handleZoomIn = () => {
    smoothAnimateCamera(
      transformRef.current.x,
      transformRef.current.y,
      Math.min(4.5, transformRef.current.k * 1.3)
    );
  };

  const handleZoomOut = () => {
    smoothAnimateCamera(
      transformRef.current.x,
      transformRef.current.y,
      Math.max(0.25, transformRef.current.k * 0.75)
    );
  };

  const handleReheatPhysics = () => {
    if (simRef.current) {
      simRef.current.alpha(0.6).restart();
    }
  };

  // Render Entity Details Modal/Drawer
  const renderEntityDetails = (data: any) => {
    if (!data) return null;
    return (
      <div className="space-y-3.5 text-sm">
        {data.name && (
          <div className="flex items-start gap-2.5">
            <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Entity Name</p>
              <p className="font-semibold text-foreground">{data.name}</p>
            </div>
          </div>
        )}
        {data.specialization && (
          <div className="flex items-start gap-2.5">
            <Stethoscope className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Specialization</p>
              <p className="font-medium text-foreground">{data.specialization}</p>
            </div>
          </div>
        )}
        {data.email && (
          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-mono text-xs text-foreground/90">{data.email}</p>
            </div>
          </div>
        )}
        {data.phone && (
          <div className="flex items-start gap-2.5">
            <Phone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Contact Phone</p>
              <p className="font-medium text-foreground">{data.phone}</p>
            </div>
          </div>
        )}
        {(data.city || data.state || data.address) && (
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address / Region</p>
              <p className="text-foreground/90 leading-snug">
                {data.address || ""}
                {data.city ? `${data.address ? ", " : ""}${data.city}, ${data.state || ""}` : ""}
              </p>
            </div>
          </div>
        )}
        {data.licenseNumber && (
          <div className="flex items-start gap-2.5">
            <Award className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">License / Accreditation</p>
              <p className="font-mono text-xs text-foreground">{data.licenseNumber}</p>
            </div>
          </div>
        )}
        {data.operatingHours && (
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Operating Schedule</p>
              <p className="text-foreground">{data.operatingHours}</p>
            </div>
          </div>
        )}
        {data.is24x7 !== undefined && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                data.is24x7
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {data.is24x7 ? "24/7 Emergency Care Available" : "Standard Hours"}
            </span>
          </div>
        )}
        {data.googleMapsLink && (
          <div className="pt-2 border-t border-border/40">
            <a
              href={data.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-neutral-900 bg-black select-none shadow-2xl"
    >
      {/* Interactive HTML5 Hardware Accelerated Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* TOP-LEFT OBSIDIAN STYLE GEAR & NAVIGATION TOOLBAR (Image 2 style) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Settings Gear Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center shadow-lg ${
              showSettings
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-background/80 hover:bg-background/95 border-border/70 text-foreground/80 hover:text-foreground"
            }`}
            title="Constellation Settings & Filters"
          >
            <Settings className={`h-4 w-4 ${showSettings ? "animate-spin-slow" : ""}`} />
          </button>

          {/* Obsidian Style Settings Popover */}
          {showSettings && (
            <div className="absolute top-12 left-0 w-72 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                    Constellation Engine
                  </span>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Filter by Entity Role */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Filter by Entity Category
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "ALL", label: "All Entities" },
                    { key: "Hospital", label: "Hospitals" },
                    { key: "Doctor", label: "Doctors" },
                    { key: "Patient", label: "Patients" },
                    { key: "Pharmacy", label: "Pharmacies" },
                    { key: "Admin", label: "Admins" }
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setFilterType(cat.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium text-left transition-colors ${
                        filterType === cat.key
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold"
                          : "bg-muted/30 border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Display Mode */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Node Labels Display
                </label>
                <div className="flex rounded-lg bg-muted/40 p-0.5 border border-border/50">
                  {(["ALL", "CONNECTED", "HOVER_ONLY"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLabelMode(mode)}
                      className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-colors ${
                        labelMode === mode
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "ALL" ? "All" : mode === "CONNECTED" ? "Connected" : "Hover"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starfield Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Cosmic Starfield</span>
                <button
                  onClick={() => setShowStarfield(!showStarfield)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                    showStarfield
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  {showStarfield ? "Active" : "Muted"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Navigation Toolbar */}
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-md border border-border/70 rounded-xl p-1 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={fitView}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleReheatPhysics}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Settle Constellation Forces"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TOP-RIGHT CONSTELLATION TELEMETRY STATS */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2">
        <div className="bg-background/80 backdrop-blur-md border border-border/70 rounded-xl px-3 py-1.5 shadow-lg text-[11px] font-mono text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {simNodesRef.current.length} Stars • {simEdgesRef.current.length} Links
          </span>
          <span className="text-foreground/40">|</span>
          <span>{Math.round(zoomLevel * 100)}% Zoom</span>
        </div>
      </div>

      {/* HOVER / PROXIMITY HUD TOOLTIP (Image 2 style reactive badge) */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-5 left-5 z-20 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl p-3.5 shadow-2xl max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-3 h-3 rounded-full shadow-[0_0_8px]"
              style={{
                backgroundColor:
                  (ENTITY_CONFIG[hoveredNode.type] || DEFAULT_CONFIG).color,
                boxShadow: `0 0 10px ${
                  (ENTITY_CONFIG[hoveredNode.type] || DEFAULT_CONFIG).color
                }`
              }}
            />
            <span className="text-xs font-bold text-foreground truncate">
              {hoveredNode.label}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ml-auto"
              style={{
                backgroundColor: `${
                  (ENTITY_CONFIG[hoveredNode.type] || DEFAULT_CONFIG).color
                }22`,
                color: (ENTITY_CONFIG[hoveredNode.type] || DEFAULT_CONFIG).color
              }}
            >
              {hoveredNode.type}
            </span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {hoveredNode.details || "Connected in healthcare constellation graph"}
          </p>

          <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>
              {adjacencyMap.get(hoveredNode.id)?.size || 0} Connected Constellation Link
              {(adjacencyMap.get(hoveredNode.id)?.size || 0) === 1 ? "" : "s"}
            </span>
            <span className="text-cyan-400 font-sans font-medium flex items-center gap-0.5">
              Click to inspect <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      )}

      {/* SELECTED NODE INSPECTOR MODAL / DRAWER */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bottom-4 w-80 sm:w-96 bg-card/95 backdrop-blur-2xl border border-border/90 rounded-2xl p-5 shadow-2xl z-30 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-4 duration-200">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{
                    backgroundColor: `${
                      (ENTITY_CONFIG[selectedNode.type] || DEFAULT_CONFIG).color
                    }25`,
                    color: (ENTITY_CONFIG[selectedNode.type] || DEFAULT_CONFIG).color,
                    boxShadow: `0 0 16px ${
                      (ENTITY_CONFIG[selectedNode.type] || DEFAULT_CONFIG).color
                    }33`
                  }}
                >
                  {React.createElement(
                    (ENTITY_CONFIG[selectedNode.type] || DEFAULT_CONFIG).icon,
                    { className: "h-5 w-5" }
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground leading-tight">
                    {selectedNode.label}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: (ENTITY_CONFIG[selectedNode.type] || DEFAULT_CONFIG).color
                      }}
                    >
                      {selectedNode.type}
                    </span>
                    <span className="text-muted-foreground text-[11px]">•</span>
                    <span className="text-muted-foreground text-[11px]">
                      {adjacencyMap.get(selectedNode.id)?.size || 0} Links
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details Content */}
            <div className="py-1">
              {selectedNode.entityData ? (
                renderEntityDetails(selectedNode.entityData)
              ) : (
                <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground">
                  {selectedNode.details || "No additional metadata registered for this entity."}
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-border/60 mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                if (
                  selectedNode &&
                  selectedNode.x !== undefined &&
                  selectedNode.y !== undefined
                ) {
                  smoothAnimateCamera(
                    -selectedNode.x * 1.8,
                    -selectedNode.y * 1.8,
                    1.8
                  );
                }
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" /> Center Star View
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="py-2 px-3 rounded-xl border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT CONSTELLATION NAVIGATION HINT */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none text-[11px] text-muted-foreground/50 font-mono hidden md:block">
        Pan: Drag canvas • Zoom: Scroll • Drag stars to adjust • Click to inspect
      </div>
    </div>
  );
}
