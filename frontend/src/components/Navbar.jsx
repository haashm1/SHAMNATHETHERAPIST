import React from 'react';
import { Calendar, User, Key, LayoutDashboard } from 'lucide-react';

export default function Navbar({ currentView, onViewChange, psychologistName, onBookClick, profile }) {
  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => onViewChange('client')}>
          <span>Shamna</span> <span style={{ color: 'var(--text-primary)' }}>The Therapist</span>
        </div>
        <div className="nav-links">
          {currentView === 'client' ? (
            <>
              <button 
                onClick={() => onViewChange('client')}
                className="btn btn-secondary"
                style={{ fontWeight: 600, border: 'none', background: 'transparent' }}
              >
                Home
              </button>
              <button 
                onClick={() => {
                  // Scroll to doctor card
                  const el = document.getElementById('doctor-card-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-secondary"
                style={{ fontWeight: 600, border: 'none', background: 'transparent' }}
              >
                About Me
              </button>
              <button 
                onClick={onBookClick}
                className="btn btn-accent btn-sm"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Book Session
              </button>
              {profile && (
                <a 
                  href={`https://wa.me/${profile.contact_phone ? (profile.contact_phone.replace(/\D/g, '').length === 10 ? '91' + profile.contact_phone.replace(/\D/g, '') : profile.contact_phone.replace(/\D/g, '')) : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ backgroundColor: '#25D366', color: 'white', borderColor: '#25D366', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  WhatsApp Chat
                </a>
              )}
            </>
          ) : (
            <>
              <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                Logged in as <strong>{psychologistName || 'Psychologist'}</strong>
              </span>
              <button 
                onClick={() => onViewChange('client')} 
                className="btn btn-secondary btn-sm"
              >
                <LayoutDashboard size={16} /> View Client Site
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
