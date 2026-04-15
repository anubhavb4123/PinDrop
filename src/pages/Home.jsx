import { Link } from "react-router-dom";
import { Send, Download, Zap, Shield, Clock, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero Section */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        textAlign: 'center',
        padding: '4rem 1.5rem 2rem',
      }}>
        {/* Badge */}
        <div className="animate-fade-in-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '100px',
          background: 'var(--color-accent-subtle)',
          border: '1px solid rgba(108, 99, 255, 0.15)',
          marginBottom: '2rem',
          fontSize: '0.85rem',
          color: 'var(--color-accent-light)',
          fontWeight: 500,
        }}>
          <Zap size={14} />
          <span>Blazing-fast cross-device sharing</span>
        </div>

        {/* Heading */}
        <h1 className="animate-fade-in-up delay-100" style={{
          fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '1.5rem',
          opacity: 0,
        }}>
          Share{" "}
          <span className="gradient-text">anything</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-200" style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: 'var(--color-text-secondary)',
          maxWidth: '540px',
          lineHeight: 1.7,
          marginBottom: '3rem',
          opacity: 0,
        }}>
          Paste text or upload a file, get a 6-digit PIN. Retrieve it instantly on any device. No login, no friction, no limits.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-300" style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          opacity: 0,
        }}>
          <Link to="/send" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" id="hero-send-btn" style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}>
              <Send size={18} />
              <span>Send Data</span>
            </button>
          </Link>
          <Link to="/receive" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" id="hero-receive-btn" style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}>
              <Download size={18} />
              <span>Receive Data</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '4rem 1.5rem 6rem',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <h2 className="animate-fade-in" style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--color-text-muted)',
          marginBottom: '3rem',
          fontWeight: 600,
        }}>
          How it works
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
        }}>
          <FeatureCard
            icon={<Zap size={24} />}
            title="Lightning Fast"
            description="Generate a PIN in milliseconds. Share text or files instantly across any device."
            delay="0.1s"
          />
          <FeatureCard
            icon={<Shield size={24} />}
            title="Auto-Expiring"
            description="PINs automatically expire after 10 minutes for security. No data lingers."
            delay="0.2s"
          />
          <FeatureCard
            icon={<Clock size={24} />}
            title="No Login Required"
            description="Zero authentication needed. Just paste, share, and retrieve — that simple."
            delay="0.3s"
          />
          <FeatureCard
            icon={<Smartphone size={24} />}
            title="Cross-Device"
            description="Works on any device with a browser. Desktop, tablet, or mobile — anywhere."
            delay="0.4s"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }) {
  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: '2rem',
        opacity: 0,
        animationDelay: delay,
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-accent-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-accent)',
        marginBottom: '1.25rem',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}
