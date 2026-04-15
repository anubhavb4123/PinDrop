import { Link, useLocation } from "react-router-dom";
import { Zap, Send, Download } from "lucide-react";

export default function Header() {
  const location = useLocation();

  return (
    <header className="animate-slide-down" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--color-border)',
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="max-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
      }}>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          textDecoration: 'none',
          color: 'inherit',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
          }}>
            <Zap size={20} color="white" fill="white" />
          </div>
          <span style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            Share<span className="gradient-text">Jet</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <NavLink to="/send" icon={<Send size={16} />} label="Send" active={location.pathname === '/send'} />
          <NavLink to="/receive" icon={<Download size={16} />} label="Receive" active={location.pathname === '/receive'} />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link to={to} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.5rem 1rem',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.9rem',
      fontWeight: active ? 600 : 500,
      textDecoration: 'none',
      color: active ? 'white' : 'var(--color-text-secondary)',
      background: active ? 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' : 'transparent',
      border: active ? 'none' : '1px solid transparent',
      transition: 'all 0.3s',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.color = 'var(--color-text-primary)';
        e.currentTarget.style.background = 'var(--color-bg-card)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.color = 'var(--color-text-secondary)';
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }
    }}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
