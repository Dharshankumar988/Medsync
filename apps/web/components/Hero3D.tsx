"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sparkles, Environment, Trail, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

// ─── SHARED TIMING CONSTANT ───
const PULSE_FREQ = 3.5;

// ─── ECG Waveform Line with Simulated Bloom ───
function EcgLine() {
  const coreRef = useRef<any>(null);
  const glowRef = useRef<any>(null);
  
  const getEcgY = (x: number) => {
    let y = 0;
    const cycleLength = 8;
    const px = ((x % cycleLength) + cycleLength) % cycleLength;
    
    // P wave
    if (px > 1.0 && px < 1.6) y = Math.sin((px - 1.0) * Math.PI / 0.6) * 0.2;
    // QRS complex
    else if (px >= 2.0 && px < 2.2) y = -0.2; 
    else if (px >= 2.2 && px < 2.4) y = 1.2;  // R peak
    else if (px >= 2.4 && px < 2.6) y = -0.3; 
    // T wave
    else if (px > 3.2 && px < 4.2) y = Math.sin((px - 3.2) * Math.PI / 1.0) * 0.25;

    return y;
  };

  const pointsCount = 400;
  const length = 22;

  const basePoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i < pointsCount; i++) {
      const x = (i / pointsCount) * length - length / 2;
      pts.push(new THREE.Vector3(x, getEcgY(x), 0));
    }
    return pts;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = (8 * PULSE_FREQ) / Math.PI; 
    const offset = (t * speed) - 1.7; 
    
    if (coreRef.current && glowRef.current) {
      const corePos = coreRef.current.geometry.attributes.position.array;
      const glowPos = glowRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < pointsCount; i++) {
        const x = (i / pointsCount) * length - length / 2;
        const sampleX = x + offset;
        const ecgY = getEcgY(sampleX);
        const undulatingWave = Math.sin(x * 0.8 + t * 1.0) * 0.2;
        
        const finalY = ecgY + undulatingWave;
        corePos[i * 3 + 1] = finalY;
        glowPos[i * 3 + 1] = finalY;
      }
      coreRef.current.geometry.attributes.position.needsUpdate = true;
      glowRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, -2.5]}>
      {/* Simulated Bloom / Glow */}
      <Line
        ref={glowRef}
        points={basePoints}
        color="#22c55e"
        lineWidth={16}
        transparent
        opacity={0.12}
      />
      {/* Core Neon Line */}
      <Line
        ref={coreRef}
        points={basePoints}
        color="#4ade80"
        lineWidth={3.5}
        transparent
        opacity={1.0}
      />
    </group>
  );
}

// ─── Outer Geodesic Shell ───
function GeodesicShell() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.04;
    meshRef.current.rotation.x = t * 0.025;
    meshRef.current.rotation.z = t * 0.015;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[4.2, 2]} />
      <meshPhysicalMaterial 
        color="#64748b"
        wireframe={true}
        transparent
        opacity={0.12}
        roughness={0.2}
        metalness={1.0}
      />
    </mesh>
  );
}

// ─── Inner rotating crystal lattice ───
function InnerCrystalLattice() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = -t * 0.25;
    meshRef.current.rotation.x = t * 0.15;
    meshRef.current.rotation.z = t * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2.0, 1]} />
      <meshPhysicalMaterial
        color="#38bdf8"
        wireframe={true}
        transparent
        opacity={0.2}
        roughness={0.0}
        metalness={1.0}
        emissive="#0ea5e9"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

// ─── Holographic Plasma Sphere ───
function PlasmaSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * PULSE_FREQ * 0.5) * 0.04;
    meshRef.current.scale.setScalar(pulse);
    meshRef.current.rotation.y = t * 0.08;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.55, 64, 64]} />
      <MeshTransmissionMaterial
        backside
        samples={6}
        thickness={0.4}
        chromaticAberration={0.08}
        anisotropy={0.3}
        distortion={0.35}
        distortionScale={0.15}
        temporalDistortion={0.08}
        clearcoat={1}
        clearcoatRoughness={0.05}
        roughness={0.0}
        transmission={1}
        ior={1.35}
        color="#0c1a3a"
      />
    </mesh>
  );
}

// ─── Orbiting Data Nodes ───
function DataNode({ 
  orbitRadius, 
  orbitSpeed, 
  orbitTilt, 
  phaseOffset, 
  color, 
  size = 0.08 
}: { 
  orbitRadius: number; 
  orbitSpeed: number; 
  orbitTilt: number;
  phaseOffset: number;
  color: string;
  size?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const angle = t * orbitSpeed + phaseOffset;

    groupRef.current.position.x = Math.cos(angle) * orbitRadius;
    groupRef.current.position.y = Math.sin(angle) * orbitRadius * Math.sin(orbitTilt);
    groupRef.current.position.z = Math.sin(angle) * orbitRadius * Math.cos(orbitTilt);

    meshRef.current.rotation.x = t * 2.0;
    meshRef.current.rotation.y = t * 1.5;

    const glow = 1 + Math.sin(t * 4 + phaseOffset) * 0.3;
    meshRef.current.scale.setScalar(glow);
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>
      {/* Node glow halo */}
      <mesh>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ─── Orbiting Ring with dynamic rotation ───
function OrbitalRing({ 
  radius, 
  thickness, 
  color, 
  tiltX, 
  tiltZ, 
  rotSpeed 
}: { 
  radius: number; 
  thickness: number; 
  color: string; 
  tiltX: number; 
  tiltZ: number;
  rotSpeed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * rotSpeed;
    ref.current.rotation.x = tiltX + Math.sin(t * 0.3) * 0.05;
    ref.current.rotation.z = tiltZ;

    // Subtle emissive pulse
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.2 + Math.sin(t * PULSE_FREQ + tiltX) * 0.6;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, thickness, 32, 200]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// ─── Quantum Core Crystal ───
function QuantumCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.6;
      coreRef.current.rotation.x = t * 0.4;
      
      const pulse = 1 + Math.sin(t * PULSE_FREQ) * 0.07;
      coreRef.current.scale.setScalar(pulse);

      const mat = coreRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(t * PULSE_FREQ) * 0.5;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 1.2;
      innerRef.current.rotation.z = t * 0.8;
    }
  });

  return (
    <group>
      {/* Outer crystalline octahedron */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[1.1, 0]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.0}
          roughness={0.0}
          metalness={0.0}
          transmission={0.85}
          thickness={2.0}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          ior={2.4}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Inner glowing tetrahedron */}
      <mesh ref={innerRef}>
        <tetrahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={4.0}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Central hot core */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#bae6fd"
          emissiveIntensity={8.0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ─── Energy Filaments (curved arcs between nodes) ───
function EnergyFilaments() {
  const refs = useRef<any[]>([]);
  
  const arcs = useMemo(() => {
    const result = [];
    const colors = ["#38bdf8", "#818cf8", "#34d399", "#f472b6", "#fb923c"];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const r = 2.0;
      const pts = [];
      for (let j = 0; j <= 30; j++) {
        const a = angle + (j / 30) * (Math.PI * 0.5);
        pts.push(new THREE.Vector3(
          Math.cos(a) * r * (0.8 + j / 60),
          Math.sin(a * 0.7) * r * 0.5,
          Math.sin(a) * r * (0.8 + j / 60)
        ));
      }
      result.push({ pts, color: colors[i] });
    }
    return result;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    refs.current.forEach((ref, i) => {
      if (ref) {
        const mat = ref.material;
        mat.opacity = 0.3 + Math.sin(t * 2 + i * 1.2) * 0.2;
      }
    });
  });

  return (
    <>
      {arcs.map((arc, i) => (
        <Line
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          points={arc.pts}
          color={arc.color}
          lineWidth={1.5}
          transparent
          opacity={0.4}
        />
      ))}
    </>
  );
}

// ─── Main Composition ───
export function Hero3D() {
  return (
    <div 
      className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center pointer-events-none"
      style={{ 
        background: "radial-gradient(circle at center, #0a1628 0%, #030608 100%)", 
        borderRadius: "100%",
        boxShadow: "0 0 80px 20px rgba(14, 165, 233, 0.08), 0 0 160px 40px rgba(56, 189, 248, 0.04)"
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        className="w-full h-full bg-transparent"
        style={{ background: "transparent" }}
      >
        <Environment preset="city" />
        
        {/* ── Lighting ── */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={2.0} color="#ffffff" />
        {/* Cyan rim */}
        <spotLight position={[-2, 6, -4]} color="#22d3ee" intensity={12} penumbra={1} angle={0.4} />
        {/* Violet accent */}
        <pointLight position={[3, -3, 2]} color="#a78bfa" intensity={4} distance={8} />
        {/* Deep blue fill */}
        <directionalLight position={[-5, -5, 2]} intensity={0.6} color="#1e3a8a" />
        {/* Core warm white */}
        <pointLight position={[0, 0, 0]} color="#e0f2fe" intensity={2.5} distance={4} />

        {/* ── Background Particles ── */}
        <Sparkles count={120} scale={12} size={1.8} speed={0.15} opacity={0.35} color="#93c5fd" />
        <Sparkles count={40} scale={6} size={3} speed={0.3} opacity={0.2} color="#818cf8" />

        <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.07}>
          <group>
            {/* ECG backdrop */}
            <EcgLine />

            {/* Outer geodesic mesh */}
            <GeodesicShell />

            {/* Inner fast lattice */}
            <InnerCrystalLattice />

            {/* Glass plasma shell */}
            <PlasmaSphere />

            {/* Energy filaments */}
            <EnergyFilaments />

            {/* ── Orbital Rings ── */}
            <OrbitalRing radius={1.95} thickness={0.022} color="#0ea5e9" tiltX={Math.PI / 2.8} tiltZ={0} rotSpeed={0.7} />
            <OrbitalRing radius={2.3} thickness={0.016} color="#818cf8" tiltX={Math.PI / 4} tiltZ={Math.PI / 5} rotSpeed={-0.5} />
            <OrbitalRing radius={2.65} thickness={0.012} color="#34d399" tiltX={-Math.PI / 3.5} tiltZ={Math.PI / 3} rotSpeed={0.35} />

            {/* ── Orbiting Data Nodes ── */}
            <DataNode orbitRadius={2.0} orbitSpeed={1.4} orbitTilt={Math.PI / 2.5} phaseOffset={0} color="#38bdf8" size={0.1} />
            <DataNode orbitRadius={2.3} orbitSpeed={-1.0} orbitTilt={Math.PI / 4} phaseOffset={Math.PI * 0.66} color="#818cf8" size={0.09} />
            <DataNode orbitRadius={2.6} orbitSpeed={0.7} orbitTilt={Math.PI / 3.5} phaseOffset={Math.PI * 1.33} color="#34d399" size={0.08} />
            <DataNode orbitRadius={1.85} orbitSpeed={-1.8} orbitTilt={-Math.PI / 4} phaseOffset={Math.PI * 0.3} color="#f472b6" size={0.07} />
            <DataNode orbitRadius={2.5} orbitSpeed={1.1} orbitTilt={Math.PI / 6} phaseOffset={Math.PI * 1.7} color="#fb923c" size={0.075} />

            {/* ── Central Quantum Core ── */}
            <QuantumCore />
          </group>
        </Float>
      </Canvas>
    </div>
  );
}
