export default function About() {
  return (
    <section id="about-us" className="py-28 px-6" style={{ backgroundColor: "var(--card-bg)" }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[#2979d4] text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Who We Are</span>
          <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6" style={{ color: "var(--foreground)" }}>
            Your Trusted Moving
            <span className="text-[#2979d4]"> Partner</span>
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: "var(--nav-text-muted)" }}>
            Easy To Go is a professional house-shifting company dedicated to making your relocation experience seamless and worry-free. With years of expertise, our trained team handles everything from careful packing to safe transportation and unpacking at your new home.
          </p>
          <p className="text-base leading-relaxed mb-8" style={{ color: "var(--nav-text-muted)" }}>
            We use premium packing materials and modern equipment to ensure your belongings arrive safely — no matter the distance.
          </p>
          <a
            href="#contact"
            className="inline-block bg-[#2979d4] hover:bg-[#1d5fb8] text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-105"
          >
            Get a Free Quote
          </a>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: "📦", title: "Expert Packing", desc: "Professional packing with premium materials" },
            { icon: "🚛", title: "Safe Transport", desc: "Modern fleet with GPS tracking" },
            { icon: "🏠", title: "Unpacking Help", desc: "We set up your new home too" },
            { icon: "🛡️", title: "Fully Insured", desc: "100% coverage on all goods" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5 transition-all duration-300 group"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border-color)",
              }}
            >
              <span className="text-3xl mb-3 block">{f.icon}</span>
              <h3 className="font-bold text-sm mb-1 group-hover:text-[#2979d4] transition-colors" style={{ color: "var(--foreground)" }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--nav-text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}