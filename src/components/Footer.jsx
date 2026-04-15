import { Heart, MapPin, ExternalLink, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "2rem 0",
        marginTop: "auto",
        background: "linear-gradient(to bottom, transparent, var(--color-bg-secondary))",
      }}
    >
      <div
        className="max-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Main Content - 3 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          {/* Brand Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  padding: "0.5rem",
                  background: "linear-gradient(135deg, #3b82f6, #a855f7)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={16} color="white" />
              </div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "var(--color-text-primary)",
                }}
              >
                PinDrop
              </span>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
              }}
            >
              Instant cross-device sharing
            </p>
          </div>

          {/* Quick Links */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Features
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                fontSize: "0.85rem",
              }}
            >
              {["Send Files", "Receive Files", "About"].map((link, idx) => (
                <a
                  key={idx}
                  href="#"
                  style={{
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    transition: "color 0.3s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.target.style.color = "var(--color-text-muted)")}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Connect
            </h3>
            <div
              style={{
                display: "flex",
                gap: "1rem",
              }}
            >
              {[
                { icon: ExternalLink, url: "https://github.com" },
                { icon: Mail, url: "mailto:contact@example.com" },
              ].map((social, idx) => {
                const Icon = social.icon;
                return (
                  <a
                    key={idx}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      transition: "background 0.3s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "var(--color-bg-card-hover)")}
                    onMouseLeave={(e) => (e.target.style.background = "transparent")}
                  >
                    <Icon size={16} color="var(--color-text-muted)" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, var(--color-border), transparent)",
          }}
        />

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              justifyContent: "center",
            }}
          >
            Made with{" "}
            <Heart size={12} color="#ef4444" fill="#ef4444" /> by Anubhav Bajpai
          </p>
          <p>&copy; {currentYear} PinDrop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
