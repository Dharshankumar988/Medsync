"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html, Sphere, Torus, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function OrbCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerPulseRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (coreRef.current) {
      const pulse = Math.sin(time * 2.5) * 0.06 + 1;
      coreRef.current.scale.setScalar(pulse);
      coreRef.current.rotation.y = time * 0.4;
      coreRef.current.rotation.x = time * 0.2;
    }
    if (innerPulseRef.current) {
      const innerPulse = Math.sin(time * 4) * 0.1 + 1;
      innerPulseRef.current.scale.setScalar(innerPulse);
    }
  });

  return (
    <group>
      {/* Central Supercharged Core */}
      <Sphere args={[0.32, 64, 64]} ref={coreRef}>
        <meshStandardMaterial 
          color="#38bdf8" 
          emissive="#0284c7" 
          emissiveIntensity={3} 
          toneMapped={false}
          roughness={0.1}
          metalness={0.9}
        />
      </Sphere>

      {/* Inner Energy Pulse */}
      <Sphere args={[0.18, 32, 32]} ref={innerPulseRef}>
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#bae6fd" 
          emissiveIntensity={6} 
          toneMapped={false}
        />
      </Sphere>

      {/* Core Halo */}
      <Sphere args={[0.5, 32, 32]}>
        <meshStandardMaterial 
          color="#0ea5e9" 
          emissive="#0ea5e9" 
          emissiveIntensity={0.6} 
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </Sphere>
    </group>
  );
}

function MultiLayerRings() {
  const ringsRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!ringsRef.current) return;
    const time = state.clock.getElapsedTime();
    
    ringsRef.current.children.forEach((child, i) => {
      const speedMult = (i % 2 === 0 ? 1 : -1) * (0.15 + i * 0.08);
      child.rotation.y = time * speedMult;
      child.rotation.x = time * (0.08 + i * 0.03);
      child.rotation.z = Math.sin(time * 0.5 + i) * 0.1;
    });
  });

  return (
    <group ref={ringsRef}>
      {/* Inner Precision Ring */}
      <Torus args={[0.68, 0.006, 24, 120]} rotation={[Math.PI / 2.5, 0, 0]}>
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.0} toneMapped={false} />
      </Torus>

      {/* Mid Orbit Ring */}
      <Torus args={[0.88, 0.005, 24, 120]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={1.5} toneMapped={false} />
      </Torus>

      {/* Outer Cyan Ring */}
      <Torus args={[1.08, 0.004, 24, 120]} rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={1.2} toneMapped={false} />
      </Torus>

      {/* Far Outer Ambient Ring */}
      <Torus args={[1.25, 0.002, 16, 100]} rotation={[Math.PI / 6, -Math.PI / 3, 0]}>
        <meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.3} roughness={0.1} />
      </Torus>
    </group>
  );
}

function GlassShell() {
  const shellRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!shellRef.current) return;
    const time = state.clock.getElapsedTime();
    shellRef.current.rotation.y = time * 0.03;
    shellRef.current.rotation.x = time * 0.015;
  });

  return (
    <Sphere ref={shellRef} args={[1.22, 64, 64]}>
      <MeshTransmissionMaterial
        backside
        samples={6}
        thickness={0.45}
        chromaticAberration={0.06}
        anisotropy={0.25}
        distortion={0.25}
        distortionScale={0.12}
        temporalDistortion={0.06}
        clearcoat={1}
        clearcoatRoughness={0.05}
        roughness={0.05}
        transmission={1}
        ior={1.25}
        color="#082f49" 
      />
    </Sphere>
  );
}

function FloatingCards() {
  const cards = [
    { text: "⚡ AI Clinical Intelligence", position: [-1.4, 0.9, 0.2] as [number, number, number] },
    { text: "🔒 Patient-Owned Health Records", position: [1.4, 0.4, 0.5] as [number, number, number] },
    { text: "🌐 Blockchain Verified Access", position: [-1.1, -1.0, 0.4] as [number, number, number] },
  ];

  return (
    <>
      {cards.map((card, idx) => (
        <Float key={idx} speed={1.5} rotationIntensity={0.05} floatIntensity={0.2} floatingRange={[-0.05, 0.05]}>
          <group position={card.position}>
            <Html center zIndexRange={[100, 0]}>
              <div className="px-3.5 py-1.5 rounded-full border border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(14,165,233,0.25)] text-cyan-200 text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap pointer-events-none flex items-center gap-1.5">
                {card.text}
              </div>
            </Html>
          </group>
        </Float>
      ))}
    </>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const targetX = mouse.x * 0.15;
    const targetY = mouse.y * 0.15;
    groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * 0.03;
    groupRef.current.rotation.x += (-targetY - groupRef.current.rotation.x) * 0.03;
  });

  return (
    <group ref={groupRef} position={[0.1, 0, 0]}>
      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2} floatingRange={[-0.05, 0.05]}>
        <OrbCore />
        <MultiLayerRings />
        <GlassShell />
      </Float>
      
      <FloatingCards />

      <Sparkles count={50} scale={5} size={1.5} speed={0.2} opacity={0.3} color="#38bdf8" />
      
      <Environment preset="night" />
      <ambientLight intensity={0.3} />
      <spotLight position={[5, 5, 5]} angle={0.25} penumbra={1} intensity={1.2} color="#38bdf8" />
      <pointLight position={[-5, -5, -5]} intensity={0.8} color="#0ea5e9" />
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#38bdf8" distance={4} />
    </group>
  );
}

export function IntelligenceOrb() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
      {/* Procedural noise background */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
      
      {/* Dynamic radial lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.15)_0%,transparent_65%)]" />
      
      <Canvas 
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
