import React from 'react';
import { Calendar, ShieldAlert, Award, BookOpen, Mail, Phone, MapPin } from 'lucide-react';

export default function Hero({ profile, onBookClick, onAdminClick }) {
  if (!profile) return null;

  // Split specialties string into tags
  const specialtiesTags = profile.specialties
    ? profile.specialties.split(',').map(s => s.trim())
    : [];

  const backendUrl = '';
  const photoUrl = profile.photo_url
    ? (profile.photo_url.startsWith('http') || profile.photo_url.startsWith('data:'))
      ? profile.photo_url
      : `${backendUrl}${profile.photo_url}`
    : '/uploads/default-doctor.jpg';

  return (
    <section className="container hero fade-in">
      <div className="hero-content">
        <span className="hero-subtitle">Professional Psychological Counseling</span>
        <h1 className="hero-title">
          Find Balance, Clarity & Healing In Your Life
        </h1>
        <p className="hero-description">
          Welcome to a safe space designed for self-discovery and recovery. I offer client-centered therapy 
          designed to guide you through anxiety, depression, stressors, and emotional challenges, helping you rediscover 
          your inner strength.
        </p>
        
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a 
            href={`mailto:${profile.contact_email}`} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Mail size={18} className="text-light" />
            <span>{profile.contact_email}</span>
          </a>
          <a 
            href={`tel:${profile.contact_phone}`} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Phone size={18} className="text-light" />
            <span>{profile.contact_phone}</span>
          </a>
          <a 
            href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <MapPin size={18} className="text-light" />
            <span style={{ fontSize: '0.9rem' }}>{profile.address}</span>
          </a>
        </div>

        <div className="hero-actions">
          <button onClick={onBookClick} className="btn btn-accent">
            <Calendar size={18} /> Book a Consultation
          </button>
          <a 
            href={`https://wa.me/${profile.contact_phone ? (profile.contact_phone.replace(/\D/g, '').length === 10 ? '91' + profile.contact_phone.replace(/\D/g, '') : profile.contact_phone.replace(/\D/g, '')) : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.927 9.927 0 0 0 4.808 1.226h.003c5.502 0 9.99-4.479 9.991-9.986.002-2.67-1.037-5.18-2.93-7.071c-1.893-1.892-4.407-2.93-7.065-2.927zM6.883 18.06l-.32-.19a8.337 8.337 0 0 1-3.66-6.155c-.015-4.602 3.733-8.355 8.342-8.358a8.318 8.318 0 0 1 5.9 2.449c1.577 1.579 2.445 3.677 2.443 5.908c-.005 4.606-3.753 8.358-8.36 8.358h-.002a8.293 8.293 0 0 1-4.225-1.162l-.303-.18L4.35 19.34l.322-2.585l.178-.291-.013-.016l.169-.272-.169-.148c-.767-1.258-1.185-2.73-1.185-4.218zm9.324-4.838c-.288-.144-1.705-.84-1.968-.936c-.263-.096-.454-.144-.645.144c-.191.288-.741.936-.908 1.127c-.167.191-.334.215-.622.072a7.842 7.842 0 0 1-2.31-1.424a8.665 8.665 0 0 1-1.6-1.993c-.167-.288-.018-.444.126-.587c.129-.129.288-.335.431-.502c.144-.167.191-.288.288-.479c.096-.191.048-.36-.024-.503c-.072-.144-.645-1.554-.884-2.13c-.233-.564-.47-.487-.645-.496l-.551-.01c-.191 0-.502.072-.765.36c-.263.288-1.004.981-1.004 2.394s1.028 2.78 1.171 2.971c.144.191 2.022 3.088 4.9 4.331c.685.295 1.22.471 1.637.603c.688.219 1.314.188 1.808.115c.551-.082 1.705-.697 1.944-1.37c.24-.672.24-1.249.167-1.37c-.072-.121-.263-.193-.551-.337z"/>
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="doctor-card-section" id="doctor-card-section">
        <div className="doctor-card">
          <div className="doctor-img-container">
            <img 
              src={photoUrl} 
              alt={profile.name} 
              className="doctor-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-doctor.jpg';
              }} 
            />
          </div>
          <div className="doctor-info">
            <h3 style={{ fontSize: '1.4rem' }}>{profile.name}</h3>
            <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
              {profile.title}
            </span>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {profile.bio}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Award size={16} style={{ color: 'var(--accent)' }} />
                <span><strong>Experience:</strong> {profile.experience}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                <span><strong>Education:</strong> {profile.education}</span>
              </div>
            </div>

            <div className="doctor-specialties">
              {specialtiesTags.map((tag, idx) => (
                <span key={idx} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
