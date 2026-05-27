"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_SERVICES } from "../lib/serviceDefaults";

export default function Services() {
  const [services, setServices] = useState(DEFAULT_SERVICES.filter((service) => service.active));

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch("/api/services?active=true", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.services)) {
          setServices(data.services);
        }
      } catch {
        // Keep the default cards if the services API is temporarily unavailable.
      }
    };

    fetchServices();
  }, []);

  return (
    <section id="services" className="py-5 px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#2979d4] text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: "var(--foreground)" }}>
            Our Services
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <Link href={s.link || "#services"} key={s.id || s.title}>
              <div
                className="relative rounded-2xl p-6 transition-all duration-300 group cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: s.tag ? "1px solid #2979d4" : "1px solid var(--border-color)",
                }}
              >
                {s.tag && (
                  <span className="absolute -top-3 left-5 bg-[#2979d4] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">
                    {s.tag}
                  </span>
                )}

                <span className="text-4xl mb-4 block">{s.icon}</span>

                <h3 className="font-bold text-lg mb-2 group-hover:text-[#2979d4] transition-colors" style={{ color: "var(--foreground)" }}>
                  {s.title}
                </h3>

                <p className="text-sm leading-relaxed" style={{ color: "var(--nav-text-muted)" }}>
                  {s.desc}
                </p>

                <div className="mt-4 text-[#2979d4] text-sm font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more -
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
