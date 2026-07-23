"use client";
import { useState } from "react";

const sanitizePhone = (value) => value.replace(/\D/g, "").slice(0, 10);

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/get-in-touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          phone: sanitizePhone(String(formData.get("phone") || "")),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit message.");

      setSubmitted(true);
      form.reset();

      setTimeout(() => setSubmitted(false), 4000);
    } catch (error) {
      console.error("Form submit error:", error);
      setError(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-5 px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#2979d4] text-xs font-bold tracking-[0.3em] uppercase mb-4 block">
            Reach Out
          </span>
          <h2 className="text-4xl md:text-5xl font-black" style={{ color: "var(--foreground)" }}>Get In Touch</h2>
          <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "var(--nav-text-muted)" }}>
            Ready to move? Get a free quote today or reach us for any questions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {[
              { icon: "📍", label: "Address", value: "Moradabad, Uttar Pradesh, India" },
              { icon: "📞", label: "Phone", value: "+91 98765 43210" },
              { icon: "📧", label: "Email", value: "easytogo@gmail.com" },
              { icon: "🕐", label: "Hours", value: "Mon–Sat: 8AM – 8PM" },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-start gap-4 rounded-2xl p-5"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <span className="text-2xl mt-0.5">{c.icon}</span>
                <div>
                  <p className="text-[#2979d4] text-xs font-bold uppercase tracking-wider mb-1">
                    {c.label}
                  </p>
                  <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{c.value}</p>
                </div>
              </div>
            ))}

            <div
              className="rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300"
              style={{ border: "1px solid var(--border-color)" }}
            >
              <iframe
                src="https://www.google.com/maps?q=Moradabad,Uttar Pradesh,India&output=embed"
                width="100%"
                height="150"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Map"
              ></iframe>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl p-6"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_subject" value="New Contact Form Message" />

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--nav-text-muted)" }}>
                Your Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2979d4] transition-colors"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--nav-text-muted)" }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="9876543210"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                onInput={(e) => {
                  e.currentTarget.value = sanitizePhone(e.currentTarget.value);
                }}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2979d4] transition-colors"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--nav-text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Mail"
                required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2979d4] transition-colors"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--nav-text-muted)" }}>
                Message
              </label>
              <textarea
                name="message"
                rows={4}
                placeholder="Shifting from All over India, need packing + transport..."
                required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#2979d4] transition-colors resize-none"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2979d4] hover:bg-[#1d5fb8] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200 hover:scale-[1.02]"
              style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>

            {submitted && (
              <p className="text-green-500 text-sm text-center mt-2">
                Your form has been submitted successfully.
              </p>
            )}
            {error && (
              <p className="text-red-500 text-sm text-center mt-2">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
