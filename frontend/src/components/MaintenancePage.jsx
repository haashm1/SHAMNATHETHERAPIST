import React from 'react';
import { Phone, Mail, RefreshCw, Lock } from 'lucide-react';

export default function MaintenancePage({ onRetry, onAdminLogin, error }) {
  const whatsappUrl = 'https://wa.me/919876543210';
  const phoneNumber = '+91 98765 43210';
  const emailAddress = 'therapist.shamna@gmail.com';

  return (
    <div className="maintenance-wrapper">
      <div className="maintenance-container">
        
        {/* Brand header */}
        <header className="maintenance-header">
          <div className="maintenance-logo">
            <span className="logo-shamna">Shamna</span>
            <span className="logo-tagline"> the Therapist</span>
          </div>
          <div className="maintenance-tagline">
            <span>MENTAL HEALTH MATTERS</span>
          </div>
        </header>

        {/* Main Graphic Banner */}
        <div className="maintenance-card">
          <div className="maintenance-image-wrapper">
            <img 
              src="/under-construction.jpg" 
              alt="Shamna the Therapist - Under Construction: A More Supportive Space is on its Way"
              className="maintenance-banner-img"
            />
          </div>

          {/* Emergency / Support Strip */}
          <div className="maintenance-support-panel">
            <div className="maintenance-support-text">
              <h4>Need immediate support or have an urgent query?</h4>
              <p>While our digital space is being polished, Shamna remains reachable directly for consultations and appointments.</p>
            </div>

            <div className="maintenance-actions">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-maintenance btn-whatsapp"
                title="Chat on WhatsApp"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.927 9.927 0 0 0 4.808 1.226h.003c5.502 0 9.99-4.479 9.991-9.986.002-2.67-1.037-5.18-2.93-7.071c-1.893-1.892-4.407-2.93-7.065-2.927zm3.176 13.916c-.288-.144-1.705-.84-1.968-.936c-.263-.096-.454-.144-.645.144c-.191.288-.741.936-.908 1.127c-.167.191-.334.215-.622.072a7.842 7.842 0 0 1-2.31-1.424a8.665 8.665 0 0 1-1.6-1.993c-.167-.288-.018-.444.126-.587c.129-.129.288-.335.431-.502c.144-.167.191-.288.288-.479c.096-.191.048-.36-.024-.503c-.072-.144-.645-1.554-.884-2.13c-.233-.564-.47-.487-.645-.496l-.551-.01c-.191 0-.502.072-.765.36c-.263.288-1.004.981-1.004 2.394s1.028 2.78 1.171 2.971c.144.191 2.022 3.088 4.9 4.331c.685.295 1.22.471 1.637.603c.688.219 1.314.188 1.808.115c.551-.082 1.705-.697 1.944-1.37c.24-.672.24-1.249.167-1.37c-.072-.121-.263-.193-.551-.337z"/>
                </svg>
                <span>WhatsApp Us</span>
              </a>

              <a 
                href={`tel:${phoneNumber}`} 
                className="btn-maintenance btn-outline"
                title="Call Shamna"
              >
                <Phone size={16} />
                <span>Call Clinic</span>
              </a>

              <a 
                href={`mailto:${emailAddress}`} 
                className="btn-maintenance btn-outline"
                title="Send an Email"
              >
                <Mail size={16} />
                <span>Email Us</span>
              </a>

              <button 
                onClick={() => {
                  if (onRetry) onRetry();
                  else window.location.reload();
                }}
                className="btn-maintenance btn-refresh"
                title="Check if site is back online"
              >
                <RefreshCw size={16} />
                <span>Check Status</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="maintenance-footer">
          <p>&copy; {new Date().getFullYear()} Shamna the Therapist &middot; Manjeri, Malappuram, Kerala</p>
          {onAdminLogin && (
            <button 
              onClick={onAdminLogin}
              className="maintenance-admin-link"
              title="Psychologist Admin Login"
            >
              <Lock size={12} />
              <span>Admin Access</span>
            </button>
          )}
        </footer>

      </div>
    </div>
  );
}
