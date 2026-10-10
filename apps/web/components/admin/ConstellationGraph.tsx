"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  forceZ
} from "d3-force-3d";
import {
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
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
  ChevronRight,
  Share2,
  Compass
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
  targetZ?: number;
  phaseOffset?: number;
  floatSpeed?: number;
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
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  // Computed 3D projection cache for render and hit testing
  projX?: number;
  projY?: number;
  projScale?: number;
  projDepth?: number;
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

// Visual color tokens for graph entities
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
    color: "#fbbf24", // Radiant gold
    glow: "rgba(251, 191, 36, 0.65)",
    neighborColor: "#f59e0b",
    radius: 17,
    icon: Share2,
    label: "MedSync Core"
  },
  Medicine: {
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.65)",
    neighborColor: "#f59e0b",
    radius: 17,
    icon: Share2,
    label: "MedSync Core"
  },
  Hospital: {
    color: "#c084fc", // Radiant violet
    glow: "rgba(192, 132, 252, 0.5)",
    neighborColor: "#ec4899", // Magenta
    radius: 12,
    icon: Building,
    label: "Hospital"
  },
  Doctor: {
    color: "#34d399", // Emerald green
    glow: "rgba(52, 211, 153, 0.5)",
    neighborColor: "#06b6d4", // Cyan
    radius: 10,
    icon: Stethoscope,
    label: "Doctor"
  },
  Patient: {
    color: "#38bdf8", // Sky blue
    glow: "rgba(56, 189, 248, 0.5)",
    neighborColor: "#f43f5e", // Rose pink
    radius: 8,
    icon: UserCheck,
    label: "Patient"
  },
  Pharmacy: {
    color: "#fb923c", // Amber orange
    glow: "rgba(251, 146, 60, 0.5)",
    neighborColor: "#e879f9", // Purple
    radius: 9,
    icon: Pill,
    label: "Pharmacy"
  },
  Admin: {
    color: "#fb7185", // Crimson rose
    glow: "rgba(251, 113, 133, 0.5)",
    neighborColor: "#a855f7",
    radius: 9,
    icon: Shield,
    label: "Admin"
  }
};

const DEFAULT_CONFIG = {
  color: "#94a3b8",
  glow: "rgba(148, 163, 184, 0.35)",
  neighborColor: "#38bdf8",
  radius: 8,
  icon: Share2,
  label: "Entity"
};

export default function ConstellationGraph({ nodes: initialNodes, edges: initialEdges }: ConstellationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Graph state
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNodeData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [labelMode, setLabelMode] = useState<"ALL" | "CONNECTED" | "HOVER_ONLY">("ALL");
  const [ambientDrift, setAmbientDrift] = useState(true);

  // 3D Camera Controls State
  const cameraRef = useRef({
    rotX: -0.16, // slight pitch down for natural 3D depth
    rotY: 0.35,  // slight initial yaw angle
    zoom: 0.78,  // comfortable default zoom that fits spread nodes
    panX: 0,
    panY: 0,
    velRotY: 0,
    velRotX: 0,
    isDragging: false,
    dragMode: "NONE" as "ORBIT" | "PAN" | "NODE" | "NONE",
    dragStartMouse: { x: 0, y: 0 },
    dragStartAngles: { rotX: 0, rotY: 0 },
    dragStartPan: { x: 0, y: 0 },
    activeNode: null as GraphNodeData | null
  });

  const [zoomLevelDisplay, setZoomLevelDisplay] = useState(0.78);

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

  // Initializing 3D physics simulation with spacious multi-shell 3D distribution
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

    // 3D Sectors around MedSync Core with generous radii & distinct 3D elevation
    // Ensures categories never overlap and have plenty of breathing room
    const ROLE_3D_SECTORS: Record<
      string,
      { baseAzimuth: number; baseElevation: number; innerRadius: number; outerRadius: number }
    > = {
      Hospital: {
        baseAzimuth: -Math.PI / 2,     // 12 o'clock (North)
        baseElevation: 0.35,           // +20° elevation
        innerRadius: 280,
        outerRadius: 360
      },
      Doctor: {
        baseAzimuth: -Math.PI / 6,     // 2 o'clock (North-East)
        baseElevation: 0.22,           // +12° elevation
        innerRadius: 270,
        outerRadius: 350
      },
      Patient: {
        baseAzimuth: Math.PI / 4,      // 4 o'clock (East-Southeast)
        baseElevation: -0.15,          // -8° depression
        innerRadius: 300,
        outerRadius: 390
      },
      Pharmacy: {
        baseAzimuth: (3 * Math.PI) / 4,// 8 o'clock (South-West)
        baseElevation: -0.25,          // -14° depression
        innerRadius: 290,
        outerRadius: 380
      },
      Admin: {
        baseAzimuth: (-3 * Math.PI) / 4,// 10 o'clock (North-West)
        baseElevation: 0.28,           // +16° elevation
        innerRadius: 240,
        outerRadius: 320
      }
    };

    const clonedNodes: GraphNodeData[] = filteredNodes.map((n, globalIdx) => {
      const isHub = n.isCentral || n.id === "MEDSYNC" || n.id === "MEDICINE" || n.type === "MedSync" || n.type === "Medicine";
      if (isHub) {
        return {
          ...n,
          isCentral: true,
          label: n.label === "Medicine" ? "MedSync" : n.label,
          type: "MedSync",
          x: 0,
          y: 0,
          z: 0,
          fx: 0,
          fy: 0,
          fz: 0,
          targetX: 0,
          targetY: 0,
          targetZ: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          phaseOffset: 0
        };
      }

      // Group entities of the same role and distribute across 2 tiered 3D orbital shells
      const sameRoleNodes = filteredNodes.filter((item) => item.type === n.type);
      const rIdx = sameRoleNodes.indexOf(n);
      const count = sameRoleNodes.length;
      const sector = ROLE_3D_SECTORS[n.type] || {
        baseAzimuth: (globalIdx / Math.max(filteredNodes.length, 1)) * Math.PI * 2,
        baseElevation: 0,
        innerRadius: 280,
        outerRadius: 360
      };

      // Angular spread across a wide fan (up to 1.35 radians ~78 degrees)
      const maxFan = count > 1 ? Math.min(1.4, 0.18 * count) : 0;
      const azOffset = count > 1 ? ((rIdx / (count - 1)) - 0.5) * maxFan : 0;
      const az = sector.baseAzimuth + azOffset;

      // Stagger radius between inner and outer shells so nodes don't sit in a tight line
      const isOuter = rIdx % 2 === 1;
      const radius = isOuter ? sector.outerRadius : sector.innerRadius;

      // Alternate elevation and Z-depth for 3D volume
      const elevOffset = (rIdx % 3 === 0 ? 0.12 : rIdx % 3 === 1 ? -0.12 : 0);
      const el = sector.baseElevation + elevOffset;

      // Convert spherical coordinates (azimuth, elevation, radius) to Cartesian (X, Y, Z)
      const initX = radius * Math.cos(el) * Math.sin(az);
      const initY = -radius * Math.sin(el); // Negative Y is UP in screen space
      const initZ = radius * Math.cos(el) * Math.cos(az) + (rIdx % 2 === 0 ? 30 : -30);

      return {
        ...n,
        x: initX,
        y: initY,
        z: initZ,
        targetX: initX,
        targetY: initY,
        targetZ: initZ,
        vx: 0,
        vy: 0,
        vz: 0,
        phaseOffset: globalIdx * 1.37,
        floatSpeed: 0.8 + (globalIdx % 5) * 0.15
      };
    });

    const clonedEdges = filteredEdges.map((e) => ({
      source: typeof e.source === "object" ? (e.source as any).id : e.source,
      target: typeof e.target === "object" ? (e.target as any).id : e.target,
      type: e.type
    }));

    simNodesRef.current = clonedNodes;
    simEdgesRef.current = clonedEdges;

    // D3 Force Simulation in full 3D space with high repulsion and collision clearance
    const simulation = forceSimulation(clonedNodes, 3)
      .force(
        "charge",
        forceManyBody()
          .strength((d: any) => (d.isCentral ? -700 : -280))
          .distanceMax(650)
      )
      .force(
        "x",
        forceX((d: any) => (d.isCentral ? 0 : d.targetX || 0)).strength((d: any) => (d.isCentral ? 1 : 0.28))
      )
      .force(
        "y",
        forceY((d: any) => (d.isCentral ? 0 : d.targetY || 0)).strength((d: any) => (d.isCentral ? 1 : 0.28))
      )
      .force(
        "z",
        forceZ((d: any) => (d.isCentral ? 0 : d.targetZ || 0)).strength((d: any) => (d.isCentral ? 1 : 0.28))
      )
      .force(
        "link",
        forceLink(clonedEdges)
          .id((d: any) => d.id)
          .distance((link: any) => {
            const type = link.type || "";
            if (type.includes("network") || type.includes("verified") || type.includes("accredited") || type.includes("holder")) return 220;
            if (type.includes("affiliated")) return 140;
            if (type.includes("active") || type.includes("plan")) return 160;
            if (type.includes("dispenses")) return 150;
            return 170;
          })
          .strength(0.65)
      )
      .force(
        "collide",
        forceCollide()
          .radius((d: any) => {
            const conf = ENTITY_CONFIG[d.type] || DEFAULT_CONFIG;
            return conf.radius + 40; // Enforces wide spacing so labels have room
          })
          .iterations(3)
      )
      .force("center", forceCenter(0, 0, 0))
      .alphaDecay(0.015)
      .velocityDecay(0.32);

    simRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialEdges, filterType]);

  // Main 3D Hardware Accelerated Canvas Render Loop (60 FPS)
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

      // 1. Clear Canvas to Deep Obsidian Black (Clean, no sparkles)
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      const camera = cameraRef.current;

      // 2. Ambient 3D Floatation & Momentum Decay
      if (!camera.isDragging) {
        if (ambientDrift && !hoveredNode && !selectedNode) {
          camera.rotY += 0.0007; // Gentle continuous 3D celestial orbit
        }
        // Momentum friction
        camera.rotY += camera.velRotY;
        camera.rotX += camera.velRotX;
        camera.velRotY *= 0.92;
        camera.velRotX *= 0.92;
        camera.rotX = Math.max(-1.3, Math.min(1.3, camera.rotX));
      }

      const rotX = camera.rotX;
      const rotY = camera.rotY;
      const zoom = camera.zoom;
      const panX = camera.panX * dpr;
      const panY = camera.panY * dpr;
      const centerX = width / 2 + panX;
      const centerY = height / 2 + panY;
      const focalLength = 950 * dpr;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const nodes = simNodesRef.current;
      const edges = simEdgesRef.current;
      const hovered = hoveredNode;
      const selected = selectedNode;
      const activeNode = hovered || selected;

      // Active constellation neighbors
      const activeNeighborIds = new Set<string>();
      if (activeNode) {
        const neighbors = adjacencyMap.get(activeNode.id);
        if (neighbors) {
          neighbors.forEach((id) => activeNeighborIds.add(id));
        }
      }

      const nowTime = Date.now();
      const floatTime = nowTime * 0.001;

      // 3. Project 3D Coordinates with Organic Anti-Gravity Floatation
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.x === undefined || n.y === undefined || n.z === undefined) continue;

        // Harmonic 3D floatation wave (subtle weightless bobbing)
        let curX = n.x;
        let curY = n.y;
        let curZ = n.z;

        if (!n.isCentral) {
          const phase = n.phaseOffset || 0;
          const speed = n.floatSpeed || 1;
          const floatDx = Math.sin(floatTime * 0.7 * speed + phase) * 8;
          const floatDy = Math.cos(floatTime * 0.55 * speed + phase * 1.2) * 10;
          const floatDz = Math.sin(floatTime * 0.65 * speed + phase * 0.8) * 11;
          curX += floatDx;
          curY += floatDy;
          curZ += floatDz;
        }

        // Camera yaw rotation (around Y axis)
        const x1 = curX * cosY + curZ * sinY;
        const z1 = -curX * sinY + curZ * cosY;

        // Camera pitch rotation (around X axis)
        const y2 = curY * cosX - z1 * sinX;
        const z2 = curY * sinX + z1 * cosX;

        // Perspective scale factor based on depth Z
        const scale = (focalLength / (focalLength + z2)) * zoom;

        n.projX = centerX + x1 * scale;
        n.projY = centerY + y2 * scale;
        n.projScale = scale;
        n.projDepth = z2;
      }

      // 4. RENDER 3D EDGES (Depth-aware & illuminated)
      // Sort edges by average depth so foreground lines render properly
      const sortedEdges = [...edges].filter((edge) => {
        const src = typeof edge.source === "object" ? edge.source : nodes.find((n) => n.id === edge.source);
        const tgt = typeof edge.target === "object" ? edge.target : nodes.find((n) => n.id === edge.target);
        return src && tgt && src.projX !== undefined && tgt.projX !== undefined;
      });

      sortedEdges.sort((a, b) => {
        const srcA = typeof a.source === "object" ? a.source : nodes.find((n) => n.id === a.source)!;
        const tgtA = typeof a.target === "object" ? a.target : nodes.find((n) => n.id === a.target)!;
        const srcB = typeof b.source === "object" ? b.source : nodes.find((n) => n.id === b.source)!;
        const tgtB = typeof b.target === "object" ? b.target : nodes.find((n) => n.id === b.target)!;
        const depthA = ((srcA.projDepth || 0) + (tgtA.projDepth || 0)) / 2;
        const depthB = ((srcB.projDepth || 0) + (tgtB.projDepth || 0)) / 2;
        return depthB - depthA; // Farthest first
      });

      for (let i = 0; i < sortedEdges.length; i++) {
        const edge = sortedEdges[i];
        const src = typeof edge.source === "object" ? edge.source : nodes.find((n) => n.id === edge.source)!;
        const tgt = typeof edge.target === "object" ? edge.target : nodes.find((n) => n.id === edge.target)!;

        const isEdgeConnectedToActive =
          activeNode && (src.id === activeNode.id || tgt.id === activeNode.id);

        const avgScale = ((src.projScale || 1) + (tgt.projScale || 1)) / 2;

        ctx.beginPath();
        ctx.moveTo(src.projX!, src.projY!);
        ctx.lineTo(tgt.projX!, tgt.projY!);

        if (isEdgeConnectedToActive) {
          // Highlighted connected edge (vivid cyan neon beam)
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 14 * avgScale;
          ctx.strokeStyle = "rgba(6, 182, 212, 0.95)";
          ctx.lineWidth = Math.max(1.2, 2.5 * avgScale);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Animated 3D energy pulse traveling along the link
          const progress = (nowTime / 1400 + i * 0.25) % 1;
          const px = src.projX! + (tgt.projX! - src.projX!) * progress;
          const py = src.projY! + (tgt.projY! - src.projY!) * progress;

          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.5, 3 * avgScale), 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 8 * avgScale;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (activeNode) {
          // Dim non-connected links
          ctx.strokeStyle = "rgba(100, 116, 139, 0.06)";
          ctx.lineWidth = Math.max(0.5, 0.8 * avgScale);
          ctx.stroke();
        } else {
          // Subtle resting network thread with depth attenuation
          const alpha = Math.max(0.08, Math.min(0.28, 0.22 * avgScale));
          ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.lineWidth = Math.max(0.6, 1.1 * avgScale);
          ctx.stroke();
        }
      }

      // 5. RENDER 3D NODES (Depth-Sorted: Farthest -> Nearest)
      const sortedNodes = [...nodes].filter((n) => n.projX !== undefined);
      sortedNodes.sort((a, b) => (b.projDepth || 0) - (a.projDepth || 0));

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i];
        const config = ENTITY_CONFIG[node.type] || DEFAULT_CONFIG;
        const isHovered = hovered?.id === node.id;
        const isSelected = selected?.id === node.id;
        const isNeighbor = activeNeighborIds.has(node.id);
        const isDimmed = activeNode && !isHovered && !isSelected && !isNeighbor;

        const scale = node.projScale || 1;
        const baseRadius = node.isCentral ? 16 : config.radius;
        const swell = isHovered ? 1.4 : isNeighbor ? 1.2 : 1.0;
        const radius = Math.max(3, baseRadius * scale * swell);

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.16;
        } else {
          // Depth atmospheric opacity for distant nodes
          const depthAlpha = Math.max(0.55, Math.min(1.0, scale * 1.1));
          ctx.globalAlpha = depthAlpha;
        }

        // A. 3D Radiant Aura Halo
        const haloRadius = radius * (isHovered ? 3.2 : isNeighbor ? 2.5 : 2.0);
        const haloGrad = ctx.createRadialGradient(
          node.projX!,
          node.projY!,
          radius * 0.4,
          node.projX!,
          node.projY!,
          haloRadius
        );

        const auraColor = isNeighbor
          ? config.neighborColor
          : isHovered
          ? "#06b6d4"
          : config.color;

        haloGrad.addColorStop(0, auraColor + "99");
        haloGrad.addColorStop(0.5, auraColor + "26");
        haloGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(node.projX!, node.projY!, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // B. Pulsing Concentric Outer Ring on Hover / Selection
        if (isHovered || isSelected) {
          const pulseWave = Math.sin(nowTime * 0.007) * 3 * scale;
          ctx.beginPath();
          ctx.arc(node.projX!, node.projY!, radius + (5 * scale) + pulseWave, 0, Math.PI * 2);
          ctx.strokeStyle = "#22d3ee"; // Neon cyan
          ctx.lineWidth = Math.max(1, 1.8 * scale);
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 12 * scale;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // C. Core 3D Sphere Body
        ctx.beginPath();
        ctx.arc(node.projX!, node.projY!, radius, 0, Math.PI * 2);

        const coreColor = isHovered
          ? "#06b6d4"
          : isNeighbor
          ? config.neighborColor
          : config.color;

        ctx.fillStyle = coreColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = (isHovered ? 18 : isNeighbor ? 12 : 8) * scale;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner specular highlight
        ctx.beginPath();
        ctx.arc(
          node.projX! - radius * 0.3,
          node.projY! - radius * 0.3,
          radius * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.fill();

        // D. 3D Text Label (Rendered directly with high-contrast outline)
        const shouldShowLabel =
          labelMode === "ALL" ||
          (labelMode === "CONNECTED" && (isHovered || isNeighbor || isSelected)) ||
          (labelMode === "HOVER_ONLY" && (isHovered || isSelected));

        if (shouldShowLabel && !isDimmed) {
          const baseFontSize = isHovered
            ? 13
            : isNeighbor
            ? 11.5
            : node.isCentral
            ? 12
            : 10.5;

          const fontSize = Math.max(8, Math.round(baseFontSize * scale));
          ctx.font = `${isHovered || isNeighbor ? "600" : "500"} ${fontSize}px Inter, -apple-system, sans-serif`;

          const labelText = node.label || "Entity";
          const labelY = node.projY! + radius + (11 * scale);

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Dark drop-shadow outline for guaranteed readability
          ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
          ctx.lineWidth = Math.max(2, 3.5 * scale);
          ctx.strokeText(labelText, node.projX!, labelY);

          // Text Fill
          ctx.fillStyle = isHovered
            ? "#38bdf8"
            : isNeighbor
            ? "#f8fafc"
            : scale < 0.75
            ? "#94a3b8"
            : "#cbd5e1";

          if (isHovered) {
            ctx.shadowColor = "#0284c7";
            ctx.shadowBlur = 8;
          }
          ctx.fillText(labelText, node.projX!, labelY);
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [hoveredNode, selectedNode, labelMode, ambientDrift, adjacencyMap]);

  // Handle Resize & Canvas Dimensions
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
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 3D MOUSE PROXIMITY DETECTION & INTERACTIVE CONTROLS
  const getMousePosOnCanvas = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr
    };
  }, []);

  // Proximity Hit Tester: detects which 3D node cursor is hovering over
  const findClosestNodeInProximity = useCallback(
    (mx: number, my: number) => {
      const nodes = simNodesRef.current;
      let closestNode: GraphNodeData | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.projX === undefined || node.projY === undefined) continue;

        const scale = node.projScale || 1;
        const config = ENTITY_CONFIG[node.type] || DEFAULT_CONFIG;
        const hitRadius = (config.radius * scale + 24);

        const dist = Math.hypot(node.projX - mx, node.projY - my);
        if (dist <= hitRadius && dist < minDistance) {
          minDistance = dist;
          closestNode = node;
        }
      }

      return { node: closestNode, distance: minDistance };
    },
    []
  );

  // Mouse Move: Orbit, Pan, Node Drag or Hover Sensing
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      const camera = cameraRef.current;

      if (camera.isDragging) {
        const dx = mx - camera.dragStartMouse.x;
        const dy = my - camera.dragStartMouse.y;

        if (camera.dragMode === "ORBIT") {
          // 3D Orbit Rotation around Center
          const sensitivity = 0.0035;
          camera.rotY = camera.dragStartAngles.rotY + dx * sensitivity;
          camera.rotX = Math.max(
            -1.3,
            Math.min(1.3, camera.dragStartAngles.rotX + dy * sensitivity)
          );
          camera.velRotY = (dx * sensitivity) * 0.2;
          camera.velRotX = (dy * sensitivity) * 0.2;
        } else if (camera.dragMode === "PAN") {
          // Canvas 2D Pan
          camera.panX = camera.dragStartPan.x + dx;
          camera.panY = camera.dragStartPan.y + dy;
        } else if (camera.dragMode === "NODE" && camera.activeNode) {
          // Reposition active node in 3D
          const node = camera.activeNode;
          const scale = node.projScale || 1;
          const dpr = window.devicePixelRatio || 1;
          node.x = (node.x || 0) + (dx / (scale * dpr)) * 0.2;
          node.y = (node.y || 0) + (dy / (scale * dpr)) * 0.2;
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
          if (simRef.current) simRef.current.alpha(0.15).restart();
        }
        return;
      }

      // Proximity detection for cursor reactions
      const { node } = findClosestNodeInProximity(mx, my);
      if (node) {
        setHoveredNode(node);
        if (canvasRef.current) canvasRef.current.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
    },
    [getMousePosOnCanvas, findClosestNodeInProximity]
  );

  // Mouse Down: Start Orbit or Node Drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      const camera = cameraRef.current;

      camera.isDragging = true;
      camera.dragStartMouse = { x: mx, y: my };
      camera.dragStartAngles = { rotX: camera.rotX, rotY: camera.rotY };
      camera.dragStartPan = { x: camera.panX, y: camera.panY };

      const { node } = findClosestNodeInProximity(mx, my);
      if (node) {
        camera.dragMode = "NODE";
        camera.activeNode = node;
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      } else if (e.shiftKey || e.button === 1 || e.button === 2) {
        camera.dragMode = "PAN";
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      } else {
        camera.dragMode = "ORBIT";
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }
    },
    [getMousePosOnCanvas, findClosestNodeInProximity]
  );

  // Mouse Up: Settle node and register click selection
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const { x: mx, y: my } = getMousePosOnCanvas(e);
      const camera = cameraRef.current;

      const movedDist = Math.hypot(
        mx - camera.dragStartMouse.x,
        my - camera.dragStartMouse.y
      );

      if (camera.dragMode === "NODE" && camera.activeNode) {
        camera.activeNode.fx = null;
        camera.activeNode.fy = null;
        camera.activeNode.fz = null;
        camera.activeNode = null;
        if (simRef.current) simRef.current.alpha(0.15).restart();
      }

      camera.isDragging = false;
      camera.dragMode = "NONE";

      // If user clicked without dragging, select the node
      if (movedDist < 8) {
        const { node } = findClosestNodeInProximity(mx, my);
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

  // Mouse Wheel (Smooth 3D Zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const camera = cameraRef.current;
    const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
    camera.zoom = Math.max(0.35, Math.min(3.5, camera.zoom * zoomDelta));
    setZoomLevelDisplay(camera.zoom);
  }, []);

  // Reset 3D View
  const handleResetView = useCallback(() => {
    const camera = cameraRef.current;
    camera.rotX = -0.16;
    camera.rotY = 0.35;
    camera.zoom = 0.78;
    camera.panX = 0;
    camera.panY = 0;
    camera.velRotX = 0;
    camera.velRotY = 0;
    setZoomLevelDisplay(0.78);
  }, []);

  // Zoom In / Zoom Out Controls
  const handleZoomIn = () => {
    cameraRef.current.zoom = Math.min(3.5, cameraRef.current.zoom * 1.25);
    setZoomLevelDisplay(cameraRef.current.zoom);
  };

  const handleZoomOut = () => {
    cameraRef.current.zoom = Math.max(0.35, cameraRef.current.zoom * 0.8);
    setZoomLevelDisplay(cameraRef.current.zoom);
  };

  const handleReheatPhysics = () => {
    if (simRef.current) {
      simRef.current.alpha(0.6).restart();
    }
  };

  // Render Entity Details Drawer
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
        {(data.city || data.state || data.address || data.clinicAddress) && (
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address / Region</p>
              <p className="text-foreground/90 leading-snug">
                {data.clinicAddress || data.address || ""}
                {data.city ? `${data.clinicAddress || data.address ? ", " : ""}${data.city}, ${data.state || ""}` : ""}
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
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D Hardware Accelerated Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* TOP-LEFT CONTROLS TOOLBAR */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center shadow-lg ${
              showSettings
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-background/80 hover:bg-background/95 border-border/70 text-foreground/80 hover:text-foreground"
            }`}
            title="Graph View Controls & Filters"
          >
            <Settings className={`h-4 w-4 ${showSettings ? "animate-spin-slow" : ""}`} />
          </button>

          {/* Settings Popover */}
          {showSettings && (
            <div className="absolute top-12 left-0 w-72 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl z-30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-xs tracking-wider uppercase text-foreground">
                    3D Graph Controls
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

              {/* Ambient 3D Float Drift Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Ambient 3D Float</span>
                <button
                  onClick={() => setAmbientDrift(!ambientDrift)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                    ambientDrift
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  {ambientDrift ? "Active" : "Paused"}
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
            onClick={handleResetView}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Reset 3D Perspective"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleReheatPhysics}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Re-balance 3D Physics Layout"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TOP-RIGHT TELEMETRY STATS */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2">
        <div className="bg-background/80 backdrop-blur-md border border-border/70 rounded-xl px-3 py-1.5 shadow-lg text-[11px] font-mono text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {simNodesRef.current.length} Nodes • {simEdgesRef.current.length} Links
          </span>
          <span className="text-foreground/40">|</span>
          <span>{Math.round(zoomLevelDisplay * 100)}% Zoom</span>
        </div>
      </div>

      {/* HOVER / PROXIMITY TOOLTIP */}
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
            {hoveredNode.details || "Connected platform entity node"}
          </p>

          <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>
              {adjacencyMap.get(hoveredNode.id)?.size || 0} Connected Link
              {(adjacencyMap.get(hoveredNode.id)?.size || 0) === 1 ? "" : "s"}
            </span>
            <span className="text-cyan-400 font-sans font-medium flex items-center gap-0.5">
              Click to inspect <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      )}

      {/* SELECTED NODE INSPECTOR MODAL */}
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
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 px-3 rounded-xl border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT NAVIGATION HINT */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none text-[11px] text-muted-foreground/60 font-mono hidden md:block">
        Orbit: Drag canvas • Zoom: Scroll • Drag node to move • Click to inspect
      </div>
    </div>
  );
}
