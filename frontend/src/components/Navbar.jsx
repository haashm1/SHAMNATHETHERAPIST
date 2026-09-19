import React, { useState } from 'react';
import { Calendar, LayoutDashboard, Menu, X } from 'lucide-react';

export default function Navbar({ currentView, onViewChange, psychologistName, onBookClick, profile }) {
  const [activeLink, setActiveLink] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { id: 'top',      key: 'home',     label: 'Home' },
    { id: 'about',    key: 'about',    label: 'About' },
    { id: 'approach', key: 'approach', label: 'Approach' },
    { id: 'services', key: 'services', label: 'Services' },
    { id: 'contact',  key: 'contact',  label: 'Contact' },
  ];

  const scrollToSection = (id, linkName) => {
    setMenuOpen(false);
    setActiveLink(linkName);
    if (currentView !== 'client') {
      onViewChange('client');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return;
    }
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar-editorial">
      <div className="container nav-editorial-container">
        {/* Brand Logo matching screenshot */}
        <div 
          className="editorial-logo" 
          onClick={() => scrollToSection('top', 'home')}
          role="button"
          tabIndex={0}
        >
          <span className="logo-shamna">Shamna</span>
          <span className="logo-tagline"> the Therapist</span>
        </div>

        {/* Desktop Center Navigation */}
        {currentView === 'client' && (
          <nav className="editorial-nav-links" aria-label="Main Navigation">
            {navLinks.map(({ id, key, label }) => (
              <button
                key={key}
                onClick={() => scrollToSection(id, key)}
                className={`nav-item-btn ${activeLink === key ? 'is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {/* Right: Book + Hamburger */}
        <div className="nav-editorial-actions">
          {currentView === 'client' ? (
            <>
              <button onClick={onBookClick} className="editorial-btn-book nav-book-desktop">
                <Calendar size={16} />
                <span>Book a Consultation</span>
              </button>
              <button
                className="nav-hamburger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          ) : (
            <div className="admin-status-pill">
              <span>Logged in as <strong>{psychologistName || 'Psychologist'}</strong></span>
              <button
                onClick={() => onViewChange('client')}
                className="btn btn-secondary btn-sm"
              >
                <LayoutDashboard size={15} /> View Client Site
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile Drawer */}
      {currentView === 'client' && menuOpen && (
        <div className="nav-mobile-drawer" aria-label="Mobile Navigation">
          {navLinks.map(({ id, key, label }) => (
            <button
              key={key}
              onClick={() => scrollToSection(id, key)}
              className={`nav-mobile-link ${activeLink === key ? 'is-active' : ''}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { setMenuOpen(false); onBookClick(); }}
            className="nav-mobile-book-btn"
          >
            <Calendar size={16} /> Book a Consultation
          </button>
        </div>
      )}
    </header>
  );
}
