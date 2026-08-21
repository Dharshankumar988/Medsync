"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function BrainBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.05);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group to hold everything
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Brain Particles
    const PARTICLE_COUNT = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const opacities = new Float32Array(PARTICLE_COUNT);

    let i = 0;
    while (i < PARTICLE_COUNT) {
      // Generate random point in a sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 3.5; // max radius

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Shape it like a brain:
      // - Elongate front-to-back (z axis)
      // - Widen slightly at the back
      // - Create a cleft in the middle (x = 0)
      
      let bx = x * 0.8;
      let by = y * 0.9;
      let bz = z * 1.2;

      // Sagittal fissure (cleft)
      const distFromCenter = Math.abs(bx);
      if (distFromCenter < 0.3) {
         by -= (0.3 - distFromCenter) * 1.5; // dip in the middle
      }
      
      // Make back wider than front
      if (bz < 0) {
        bx *= 1.2;
      } else {
        bx *= 0.9;
        by *= 0.9;
      }

      // Check if it's roughly within the brain bounds
      positions[i * 3] = bx;
      positions[i * 3 + 1] = by;
      positions[i * 3 + 2] = bz;
      
      opacities[i] = 0.3 + Math.random() * 0.7;
      i++;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Custom shader material for particles to have varying opacity and color
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color("#3B82F6") },
        color2: { value: new THREE.Color("#22D3EE") },
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        varying vec3 vPos;
        uniform float time;
        void main() {
          vOpacity = opacity;
          vPos = position;
          // Soft breathing effect
          vec3 pos = position;
          pos += normal * sin(time * 2.0 + position.y * 2.0) * 0.05;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (4.0 + opacity * 3.0) * (10.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying float vOpacity;
        varying vec3 vPos;
        void main() {
          // Circular particle
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if(ll > 0.5) discard;
          
          // Mix colors based on position
          vec3 finalColor = mix(color1, color2, (vPos.y + 3.0) / 6.0);
          
          // Soft edge
          float alpha = (0.5 - ll) * 2.0 * vOpacity * 0.6;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const brainParticles = new THREE.Points(geometry, particleMaterial);
    mainGroup.add(brainParticles);

    // 2. Blockchain Cubes (InstancedMesh)
    const CUBE_COUNT = 3;
    const cubeGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const cubeMat = new THREE.MeshBasicMaterial({
      color: 0x3B82F6,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, CUBE_COUNT);
    
    const dummy = new THREE.Object3D();
    const cubeData: { rotSpeed: number[], pos: THREE.Vector3, timeOffset: number }[] = [];
    
    const cubePositions = [
      new THREE.Vector3(-4, 2, -2),
      new THREE.Vector3(5, -1, -3),
      new THREE.Vector3(-3, -3, 1),
    ];

    for (let j = 0; j < CUBE_COUNT; j++) {
      dummy.position.copy(cubePositions[j]);
      dummy.updateMatrix();
      cubes.setMatrixAt(j, dummy.matrix);
      
      cubeData.push({
        rotSpeed: [Math.random() * 0.01 - 0.005, Math.random() * 0.01 - 0.005, Math.random() * 0.01 - 0.005],
        pos: cubePositions[j],
        timeOffset: Math.random() * Math.PI * 2
      });
    }
    mainGroup.add(cubes);

    // 3. DNA Helix
    const dnaGroup = new THREE.Group();
    const dnaMat = new THREE.LineBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.3 });
    const dnaPoints1 = [];
    const dnaPoints2 = [];
    const rungs = [];
    
    for (let k = 0; k < 20; k++) {
      const y = (k - 10) * 0.2;
      const angle = k * 0.5;
      const r = 0.4;
      
      const x1 = Math.cos(angle) * r;
      const z1 = Math.sin(angle) * r;
      dnaPoints1.push(new THREE.Vector3(x1, y, z1));
      
      const x2 = Math.cos(angle + Math.PI) * r;
      const z2 = Math.sin(angle + Math.PI) * r;
      dnaPoints2.push(new THREE.Vector3(x2, y, z2));
      
      const rungGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2)]);
      rungs.push(new THREE.Line(rungGeo, dnaMat));
    }
    
    const strand1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dnaPoints1), dnaMat);
    const strand2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dnaPoints2), dnaMat);
    
    dnaGroup.add(strand1);
    dnaGroup.add(strand2);
    rungs.forEach(r => dnaGroup.add(r));
    
    dnaGroup.position.set(4, 2, 2);
    dnaGroup.rotation.z = Math.PI / 4;
    mainGroup.add(dnaGroup);

    // 4. AI Nodes
    const aiNodesGroup = new THREE.Group();
    const nodeCount = 15;
    const nodeGeo = new THREE.CircleGeometry(0.05, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.6 });
    
    const nodePositions: THREE.Vector3[] = [];
    for (let n = 0; n < nodeCount; n++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      // Place nodes around the brain
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 6;
      const z = (Math.random() - 0.5) * 4;
      node.position.set(x, y, z);
      nodePositions.push(new THREE.Vector3(x, y, z));
      
      // Look at camera
      node.lookAt(camera.position);
      aiNodesGroup.add(node);
    }

    // Connect nodes with thin lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.15 });
    for (let n = 0; n < nodeCount; n++) {
      for (let m = n + 1; m < nodeCount; m++) {
        if (nodePositions[n].distanceTo(nodePositions[m]) < 3) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([nodePositions[n], nodePositions[m]]);
          aiNodesGroup.add(new THREE.Line(lineGeo, lineMat));
        }
      }
    }
    mainGroup.add(aiNodesGroup);

    // Mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX) * 0.0005;
      mouseY = (event.clientY - windowHalfY) * 0.0005;
    };
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Animation Loop
    let time = 0;
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.01;
      particleMaterial.uniforms.time.value = time;

      // Brain slight drift
      brainParticles.rotation.y = Math.sin(time * 0.5) * 0.1;
      brainParticles.rotation.x = Math.sin(time * 0.3) * 0.05;

      // Cubes rotation and floating
      for (let j = 0; j < CUBE_COUNT; j++) {
        const data = cubeData[j];
        dummy.position.copy(data.pos);
        dummy.position.y += Math.sin(time + data.timeOffset) * 0.2;
        
        dummy.rotation.x += data.rotSpeed[0];
        dummy.rotation.y += data.rotSpeed[1];
        dummy.rotation.z += data.rotSpeed[2];
        
        dummy.updateMatrix();
        cubes.setMatrixAt(j, dummy.matrix);
      }
      cubes.instanceMatrix.needsUpdate = true;

      // DNA rotation
      dnaGroup.rotation.y += 0.005;

      // AI Nodes pulse
      aiNodesGroup.children.forEach((child, idx) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1.0 + Math.sin(time * 2.0 + idx) * 0.3;
          child.scale.set(scale, scale, scale);
        }
      });

      // Overall drift
      mainGroup.position.y = Math.sin(time * 0.5) * 0.2;

      // Parallax
      targetX = mouseX;
      targetY = mouseY;
      mainGroup.rotation.y += 0.05 * (targetX - mainGroup.rotation.y);
      mainGroup.rotation.x += 0.05 * (targetY - mainGroup.rotation.x);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      particleMaterial.dispose();
      cubeGeo.dispose();
      cubeMat.dispose();
      dnaMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)',
        zIndex: 0
      }}
    />
  );
}
