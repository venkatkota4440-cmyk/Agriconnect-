import React from "react";

const V = [12.6, 37.5, 61.9, 86.2];
const H = [32.7, 71.4];
const VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4";

const NODES = [
  { title: "CORE_ENTITY", desc: "Neural node processing real-time data streams.", x: V[1], y: H[0] },
  { title: "LUMINOUS_INSIGHT", desc: "Deep-learning engine synthesizing raw inputs.", x: V[2], y: H[1] },
  { title: "CONNECTIVITY", desc: "Latency-free transmission across distributed networks.", x: V[3], y: H[0] },
];

export function LumenHero() {
  return (
    <section className="lumen relative overflow-hidden" style={{ minHeight: "88vh" }} data-testid="lumen-hero">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src={VIDEO} type="video/mp4" />
      </video>

      {/* Network grid */}
      <div className="absolute inset-0 hidden md:block" aria-hidden>
        {V.map((v, i) => <div key={`v${i}`} className="lumen-grid-line absolute top-0 h-full" style={{ left: `${v}%`, width: 1, animationDelay: `${i * 0.12}s` }} />)}
        {H.map((h, i) => <div key={`h${i}`} className="lumen-grid-line absolute left-0 w-full" style={{ top: `${h}%`, height: 1, animationDelay: `${0.3 + i * 0.12}s` }} />)}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <line className="lumen-connector" x1={`${V[1]}%`} y1={`${H[0]}%`} x2={`${V[2]}%`} y2={`${H[1]}%`} style={{ animationDelay: "0.6s" }} />
          <line className="lumen-connector" x1={`${V[2]}%`} y1={`${H[1]}%`} x2={`${V[3]}%`} y2={`${H[0]}%`} style={{ animationDelay: "0.9s" }} />
          <line className="lumen-connector" x1={`${V[0]}%`} y1={`${H[0]}%`} x2={`${V[1]}%`} y2={`${H[0]}%`} style={{ animationDelay: "1.1s" }} />
        </svg>
        {/* Plus intersections */}
        {V.map((v) => H.map((h, j) => (
          <div key={`p${v}-${j}`} className="absolute -translate-x-1/2 -translate-y-1/2 text-ice" style={{ left: `${v}%`, top: `${h}%`, opacity: 0.4 }}>
            <span className="text-xs">+</span>
          </div>
        )))}
        {/* Nodes */}
        {NODES.map((n, i) => (
          <div key={n.title} className="lumen-node absolute -translate-x-1/2 -translate-y-1/2 rounded-sm px-3 py-2" style={{ left: `${n.x}%`, top: `${n.y}%`, animationDelay: `${1.2 + i * 0.2}s`, maxWidth: 190 }}>
            <div className="font-mono text-[10px] font-semibold tracking-wider text-ice">[ {n.title} ]</div>
            <div className="mt-1 font-mono text-[9px] leading-tight text-white/50">{n.desc}</div>
          </div>
        ))}
      </div>

      {/* H1 */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="absolute left-6 right-6 top-[140px] sm:top-[160px] lg:top-[178px]">
          <div className="mb-4 font-mono text-xs tracking-[0.3em] text-ice animate-fade-in">LŪMEN // ÍNDEX</div>
          <h1 className="font-display font-bold leading-[0.98] tracking-tight text-white animate-fade-up"
            style={{ fontSize: "clamp(32px, 6vw, 68px)", maxWidth: 554 }}>
            Liquid Assets.<br />Luminous Returns.
          </h1>
          <p className="mt-6 max-w-md text-sm text-white/50 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            A financial-grade view of agricultural markets — real-time price discovery, verified counterparties and secure settlement across a distributed trade network.
          </p>
        </div>
      </div>
    </section>
  );
}
