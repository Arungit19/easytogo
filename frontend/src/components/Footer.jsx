"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaFacebookF, FaInstagram, FaTwitter, FaLinkedinIn } from "react-icons/fa";

const Footer = () => {
  const router = useRouter();

  const services = [
    { name: "Home Shifting", href: "/services/home-shifting" },
    { name: "Office Relocation", href: "/services/office-relocation" },
    { name: "Vehicle Transport", href: "/services/vehicle-transport" },
    { name: "Storage & Warehousing", href: "/services/storage" },
    { name: "Packing & Unpacking", href: "/services/packing-unpacking" },
    { name: "Post-Move Cleaning", href: "/services/cleaning" },
  ];

  const quickLinks = [
    { name: "About Us", sectionId: "about-us" },
    { name: "How It Works", sectionId: "how-it-works" },
    { name: "Get a Quote", sectionId: "services" },
    { name: "Contact Us", sectionId: "contact" },
  ];

  const handleQuickLink = (sectionId) => {
    // If already on home page, just scroll
    if (window.location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Navigate to home, then scroll after page loads
      router.push("/");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 800);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .footer-font { font-family: 'Poppins', sans-serif; }
      `}</style>

      <footer className="footer-font bg-[#1a3c6e] text-white">

        {/* Main Grid */}
        <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-9 grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-[22px] font-bold text-white mb-2.5">
              <img
                src="/logo.png"
                alt="Easy To Go Logo"
                className="w-[38px] h-[38px] object-contain rounded-md bg-white p-1 shrink-0"
              />
              Easy<span className="text-blue-400">To Go</span>
            </div>

            <p className="text-[13.5px] text-[#93b8e8] leading-[1.7] mb-5">
              Your trusted partner for stress-free house shifting across India. Safe, affordable &amp; on time.
            </p>

            <a href="tel:+911800123456" className="flex items-center gap-2 text-[13px] text-[#93b8e8] mb-2 hover:text-white">
              1800-123-4567 (Toll Free)
            </a>

            <a href="mailto:hello@shifteasy.in" className="flex items-center gap-3 text-[13px] text-[#93b8e8] hover:text-white">
              hello@shifteasy.in
            </a>

            {/* Social Media Icons */}
            <div className="flex gap-4 mt-4 text-[#93b8e8]">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                <FaFacebookF size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                <FaInstagram size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                <FaTwitter size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                <FaLinkedinIn size={20} />
              </a>
            </div>
          </div>

          {/* Services + Quick Links */}
          <div className="flex gap-10 lg:contents">

            {/* Services */}
            <div className="flex-1">
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">
                Services
              </p>
              <ul className="list-none p-0 m-0">
                {services.map((s) => (
                  <li key={s.name} className="mb-2.5">
                    <Link
                      href={s.href}
                      className="text-[13.5px] text-[#93b8e8] hover:text-white transition-colors"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div className="flex-1">
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">
                Quick Links
              </p>
              <ul className="list-none p-0 m-0">
                {quickLinks.map((l) => (
                  <li key={l.name} className="mb-2.5">
                    <button
                      onClick={() => handleQuickLink(l.sectionId)}
                      className="text-[13.5px] text-[#93b8e8] hover:text-white transition-colors text-left cursor-pointer bg-transparent border-none p-0"
                    >
                      {l.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Divider */}
        <hr className="border-t border-[#2d5a9e]" />

        {/* Bottom Bar */}
        <div className="max-w-[1100px] mx-auto px-6 py-[18px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-[13px] text-[#93b8e8]">
            © {new Date().getFullYear()} Easy To Go. All rights reserved.
          </p>
          <nav className="flex gap-5">
            <Link href="/" className="text-[13px] text-[#93b8e8] hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/" className="text-[13px] text-[#93b8e8] hover:text-white">
              Terms of Service
            </Link>
            <Link href="/" className="text-[13px] text-[#93b8e8] hover:text-white">
              Refund Policy
            </Link>
          </nav>
        </div>

      </footer>
    </>
  );
};

export default Footer;