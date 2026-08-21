"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 1500;
const MORPH_DURATION = 10; // seconds
const PAUSE_DURATION = 2; // seconds
const TOTAL_CYCLE = MORPH_DURATION + PAUSE_DURATION;

// Utility to sort points so that morphing lines don't get too messy
function sortPoints(points: THREE.Vector3[]) {
  return points.sort((a, b) => {
    return a.y - b.y || a.x - b.x || a.z - b.z;
  });
}

function getBrainPoints(count: number) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const r = 3 * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    let x = r * Math.sin(phi) * Math.cos(theta);
    let y = r * Math.sin(phi) * Math.sin(theta);
    let z = r * Math.cos(phi);

    x *= 0.8;
    y *= 0.75;

    // Hemispheres gap
    if (x > 0) x += 0.2;
    else x -= 0.2;

    points.push(new THREE.Vector3(x, y, z));
  }
  return sortPoints(points);
}

function getHeartPoints(count: number) {
  const points = [];
  while (points.length < count) {
    const x = (Math.random() - 0.5) * 3;
    const y = (Math.random() - 0.5) * 3;
    const z = (Math.random() - 0.5) * 3;

    // 3D Heart equation
    const a = x * x + 2.25 * z * z + y * y - 1;
    const val = a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
    if (val <= 0) {
      points.push(new THREE.Vector3(x * 1.5, y * 1.5, z * 1.5));
    }
  }
  return sortPoints(points);
}

function getDNAPoints(count: number) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = (Math.random() - 0.5) * 2 * Math.PI * 3; // 3 turns
    const type = Math.random();

    const radius = 1.0;
    let x, y, z;

    y = (t / (Math.PI * 3)) * 3; // map to -3..3

    if (type < 0.4) {
      // Helix 1
      x = Math.cos(t) * radius;
      z = Math.sin(t) * radius;
    } else if (type < 0.8) {
      // Helix 2
      x = Math.cos(t + Math.PI) * radius;
      z = Math.sin(t + Math.PI) * radius;
    } else {
      // Base pairs (connecting lines)
      const bridgeT = Math.floor(t / (Math.PI / 4)) * (Math.PI / 4);
      const r2 = (Math.random() - 0.5) * 2 * radius;
      x = Math.cos(bridgeT) * r2;
      z = Math.sin(bridgeT) * r2;
      y = (bridgeT / (Math.PI * 3)) * 3;
    }

    // Small noise
    x += (Math.random() - 0.5) * 0.1;
    y += (Math.random() - 0.5) * 0.1;
    z += (Math.random() - 0.5) * 0.1;

    points.push(new THREE.Vector3(x, y, z));
  }
  return sortPoints(points);
}

function getCloudPoints(count: number) {
  const points = [];
  const spheres = [
    { center: new THREE.Vector3(0, 0, 0), radius: 1.5 },
    { center: new THREE.Vector3(-1.2, -0.2, 0), radius: 1.2 },
    { center: new THREE.Vector3(1.2, 0.1, 0.2), radius: 1.1 },
    { center: new THREE.Vector3(-0.5, 0.8, -0.2), radius: 1.0 },
    { center: new THREE.Vector3(0.6, 0.9, 0.1), radius: 1.0 },
  ];

  for (let i = 0; i < count; i++) {
    const s = spheres[Math.floor(Math.random() * spheres.length)];
    const r = s.radius * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = s.center.x + r * Math.sin(phi) * Math.cos(theta);
    const y = s.center.y + r * Math.sin(phi) * Math.sin(theta);
    const z = s.center.z + r * Math.cos(phi);

    points.push(new THREE.Vector3(x, y, z));
  }
  return sortPoints(points);
}

function ParticleSystem() {
  const particlesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);

  const shapes = useMemo(
    () => [
      getBrainPoints(PARTICLE_COUNT),
      getHeartPoints(PARTICLE_COUNT),
      getDNAPoints(PARTICLE_COUNT),
      getCloudPoints(PARTICLE_COUNT),
    ],
    []
  );

  const currentPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const linePositions = useMemo(() => new Float32Array(800 * 3), []); // Max 400 lines

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const cycleTime = time % TOTAL_CYCLE;

    const shapeIndex = Math.floor(time / TOTAL_CYCLE) % shapes.length;
    const nextShapeIndex = (shapeIndex + 1) % shapes.length;

    const currentShape = shapes[shapeIndex];
    const nextShape = shapes[nextShapeIndex];

    let t = 0;
    if (cycleTime > PAUSE_DURATION) {
      t = (cycleTime - PAUSE_DURATION) / MORPH_DURATION;
      // Easing function (easeInOutCubic)
      t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    let lineIndex = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p1 = currentShape[i];
      const p2 = nextShape[i];

      // Interpolate
      const x = THREE.MathUtils.lerp(p1.x, p2.x, t);
      const y = THREE.MathUtils.lerp(p1.y, p2.y, t);
      const z = THREE.MathUtils.lerp(p1.z, p2.z, t);

      // Breathing / floating effect
      const noiseOffset = Math.sin(time * 0.5 + i * 0.1) * 0.05;

      currentPositions[i * 3] = x + noiseOffset;
      currentPositions[i * 3 + 1] = y + noiseOffset;
      currentPositions[i * 3 + 2] = z + noiseOffset;
    }

    // Connect nearby particles for a sparse subset
    const subsetCount = 300;
    for (let i = 0; i < subsetCount; i++) {
      for (let j = i + 1; j < subsetCount; j++) {
        const dx = currentPositions[i * 3] - currentPositions[j * 3];
        const dy = currentPositions[i * 3 + 1] - currentPositions[j * 3 + 1];
        const dz = currentPositions[i * 3 + 2] - currentPositions[j * 3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 0.2 && lineIndex < 800 * 3) {
          linePositions[lineIndex++] = currentPositions[i * 3];
          linePositions[lineIndex++] = currentPositions[i * 3 + 1];
          linePositions[lineIndex++] = currentPositions[i * 3 + 2];
          linePositions[lineIndex++] = currentPositions[j * 3];
          linePositions[lineIndex++] = currentPositions[j * 3 + 1];
          linePositions[lineIndex++] = currentPositions[j * 3 + 2];
        }
      }
    }

    if (particlesRef.current) {
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    if (linesRef.current) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.setDrawRange(0, lineIndex / 3);
    }

    if (groupRef.current) {
      // Gentle floating and parallax
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.1;
      groupRef.current.rotation.y = time * 0.05 + state.pointer.x * 0.1;
      groupRef.current.rotation.x = state.pointer.y * 0.1;
    }
  });

  // Create a canvas texture for soft circular particles
  const particleTexture = useMemo(() => {
    if (typeof window === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group ref={groupRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={currentPositions}
            itemSize={3}
            args={[currentPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#3B82F6"
          map={particleTexture}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={800}
            array={linePositions}
            itemSize={3}
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export default function ProceduralBackground() {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#050816] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ParticleSystem />
      </Canvas>
    </div>
  );
}
