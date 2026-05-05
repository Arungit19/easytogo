"use client";

import Link from "next/link";


export default function Services() {

  const services = [
    {
      icon: "🏘️",
      title: "Home Shifting",
      desc: "Complete house relocation — local or intercity. We manage the entire process from start to finish.",
      tag: "Most Popular",
      link: "/services/home-shifting",
    },
    {
      icon: "🏢",
      title: "Office Relocation",
      desc: "Seamless office shifting with minimal downtime. Your business continuity is our priority.",
      link: "/services/office-relocation",
    },
    {
      icon: "📦",
      title: "Packing & Unpacking",
      desc: "Expert packing using bubble wrap, foam, and custom crates for fragile and valuable items.",
      link: "/services/packing-unpacking",
    },
    {
      icon: "🚗",
      title: "Vehicle Transport",
      desc: "Safe and insured car transport via enclosed carriers across all major routes.",
      link: "/services/vehicle-transport",
    },
    {
      icon: "🏬",
      title: "Storage Solutions",
      desc: "Secure, climate-controlled storage facilities for short-term and long-term needs.",
      link: "/services/storage",
    },
    {
      icon: "🧹",
      title: "Post-Move Cleaning",
      desc: "Deep cleaning services for your old or new home after the move is complete.",
      link: "/services/cleaning",
    },
  ];

  return (
    <section id="services" className="py-5 px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <span className="text-[#2979d4] text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: "var(--foreground)" }}>
            Our Services
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <Link href={s.link} key={s.title}>
              <div
                className="relative rounded-2xl p-6 transition-all duration-300 group cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: s.tag ? "1px solid #2979d4" : "1px solid var(--border-color)",
                }}
              >
                {/* Tag */}
                {s.tag && (
                  <span className="absolute -top-3 left-5 bg-[#2979d4] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">
                    {s.tag}
                  </span>
                )}

                {/* Icon */}
                <span className="text-4xl mb-4 block">{s.icon}</span>

                {/* Title */}
                <h3 className="font-bold text-lg mb-2 group-hover:text-[#2979d4] transition-colors" style={{ color: "var(--foreground)" }}>
                  {s.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: "var(--nav-text-muted)" }}>
                  {s.desc}
                </p>

                {/* Learn More */}
                <div className="mt-4 text-[#2979d4] text-sm font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more →
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}