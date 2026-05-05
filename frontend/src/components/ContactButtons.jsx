import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";

export default function ContactButtons() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "auto",
      }}
    >
      {/* Call Button */}
      <a
        href="tel:+1234567890"
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#14b8a6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          textDecoration: "none",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
      >
        <FaPhoneAlt style={{ color: "white", fontSize: "20px" }} />
      </a>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/1234567890"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#22c55e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          textDecoration: "none",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
      >
        <FaWhatsapp style={{ color: "white", fontSize: "22px" }} />
      </a>
    </div>
  );
}