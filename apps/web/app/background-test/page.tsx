import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the procedural background with SSR disabled to prevent 
// hydration mismatches with Three.js / Canvas
const ProceduralBackground = dynamic(
  () => import("../../components/ProceduralBackground"),
  { ssr: false }
);

export default function BackgroundTestPage() {
  return (
    <main className="w-full min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-12 overflow-hidden">
      
      {/* Rounded Container */}
      <div className="relative w-full max-w-6xl aspect-[16/9] min-h-[600px] bg-[#050816] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
        
        {/* Procedural Three.js Background Layer */}
        <ProceduralBackground />
        
        {/* Foreground Content for demonstration */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#22D3EE]">Healthcare AI</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-xl font-light">
            Intelligent patient care powered by procedural cloud infrastructure and biological harmony.
          </p>
          <button className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-medium transition-all pointer-events-auto">
            Explore Platform
          </button>
        </div>
      </div>

    </main>
  );
}
