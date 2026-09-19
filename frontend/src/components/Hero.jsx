import React, { useEffect, useRef, useState } from 'react';
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  HeartHandshake, 
  Mail, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  Users,
  Award,
  BookOpen,
  Clock,
  Compass
} from 'lucide-react';

function parseStat(value = '') {
  const clean = String(value).replace(/,/g, '').trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)(.*)$/);
  return match ? { number: Number(match[1]), suffix: match[2] } : { number: 0, suffix: value };
}

function formatStat(number, suffix, decimal) {
  const current = decimal ? number.toFixed(1) : Math.round(number).toLocaleString('en-US');
  return `${current}${suffix}`;
}

function useCountUp(value, elementRef) {
  const parsed = parseStat(value);
  const hasDecimal = String(value).includes('.');
  const [display, setDisplay] = useState(() => formatStat(0, parsed.suffix, hasDecimal));
  const startedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    startedRef.current = false;

    const { number: target, suffix: nextSuffix } = parseStat(value);
    const decimal = String(value).includes('.');
    const finish = () => setDisplay(formatStat(target, nextSuffix, decimal));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return undefined;
    }

    let raf;

    const runAnimation = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const duration = 2000;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t >= 1) {
          finish();
          return;
        }
        setDisplay(formatStat(target * eased, nextSuffix, decimal));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Start on page load after a short delay (so the hero is visually rendered)
    const mountTimer = setTimeout(runAnimation, 500);

    // Also keep IntersectionObserver as fallback (e.g. if component mounts late)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        runAnimation();
        observer.unobserve(element);
      }
    }, { threshold: 0.1 });
    observer.observe(element);

    return () => {
      clearTimeout(mountTimer);
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [elementRef, value]);

  return display;
}


function CountStatCard({ value, label, onClick, title }) {
  const ref = useRef(null);
  const display = useCountUp(value, ref);

  return (
    <div 
      ref={ref} 
      className="editorial-stat-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={title || `Click to view ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="stat-number">{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Hero({ profile, onBookClick, onAdminClick }) {
  const heroRef = useRef(null);

  if (!profile) return null;

  // Clean WhatsApp number
  const rawPhone = profile.contact_whatsapp || profile.contact_phone || '';
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  const whatsappUrl = profile.contact_whatsapp && profile.contact_whatsapp.startsWith('http')
    ? profile.contact_whatsapp
    : `https://wa.me/${cleanPhoneDigits.length === 10 ? '91' + cleanPhoneDigits : cleanPhoneDigits}`;

  // LinkedIn url
  const linkedinUrl = profile.contact_linkedin || 'https://linkedin.com/in/shamna-therapist';

  // Stats fallback
  const totalConsultations = profile.total_consultations || '8,000+';
  const casesResolved = profile.cases_resolved || '8,000+';
  const clientSatisfaction = profile.client_satisfaction || '100%';

  const specialties = profile.specialties 
    ? profile.specialties.split(',').map(s => s.trim()).filter(Boolean)
    : ['Anxiety', 'Depression', 'Relationship Counseling', 'CBT', 'Mindfulness'];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="editorial-page-wrapper">
      {/* MAIN HERO SECTION */}
      <section ref={heroRef} className="editorial-hero">
        <div className="container editorial-hero-container">
          
          {/* LEFT COLUMN: Editorial Typography & Actions */}
          <div className="editorial-hero-left">
            <h1 className="editorial-hero-title">
              {profile.name || 'Shamna'}
            </h1>

            <p className="editorial-hero-description">
              Thoughtful, client-centred counselling for the moments when you need space, clarity, and support to move forward.
            </p>

            {/* CTAs */}
            <div className="editorial-actions-row">
              <button 
                onClick={onBookClick} 
                className="editorial-btn-book-primary"
              >
                <Calendar size={18} />
                <span>Book a Consultation</span>
              </button>

              <a 
                href="#approach" 
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('approach');
                }}
                className="editorial-link-approach"
              >
                <span>Explore My Approach</span>
                <ArrowRight size={17} />
              </a>
            </div>

            {/* CONTACT ROW: Email | Call | WhatsApp | LinkedIn | Location */}
            <div className="editorial-contact-strip" aria-label="Contact channels">
              {profile.contact_email && (
                <>
                  <a 
                    href={`mailto:${profile.contact_email}`}
                    className="editorial-contact-link"
                    title={`Email: ${profile.contact_email}`}
                  >
                    <Mail size={16} />
                    <span>Email</span>
                  </a>
                  <span className="editorial-contact-divider" aria-hidden="true">|</span>
                </>
              )}

              {profile.contact_phone && (
                <>
                  <a 
                    href={`tel:${profile.contact_phone}`}
                    className="editorial-contact-link"
                    title={`Call: ${profile.contact_phone}`}
                  >
                    <Phone size={16} />
                    <span>Call</span>
                  </a>
                  <span className="editorial-contact-divider" aria-hidden="true">|</span>
                </>
              )}

              {/* WhatsApp */}
              <a 
                href={whatsappUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="editorial-contact-link"
                title={`Chat on WhatsApp: ${profile.contact_whatsapp || profile.contact_phone || 'Available'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.927 9.927 0 0 0 4.808 1.226h.003c5.502 0 9.99-4.479 9.991-9.986.002-2.67-1.037-5.18-2.93-7.071c-1.893-1.892-4.407-2.93-7.065-2.927zm3.176 13.916c-.288-.144-1.705-.84-1.968-.936c-.263-.096-.454-.144-.645.144c-.191.288-.741.936-.908 1.127c-.167.191-.334.215-.622.072a7.842 7.842 0 0 1-2.31-1.424a8.665 8.665 0 0 1-1.6-1.993c-.167-.288-.018-.444.126-.587c.129-.129.288-.335.431-.502c.144-.167.191-.288.288-.479c.096-.191.048-.36-.024-.503c-.072-.144-.645-1.554-.884-2.13c-.233-.564-.47-.487-.645-.496l-.551-.01c-.191 0-.502.072-.765.36c-.263.288-1.004.981-1.004 2.394s1.028 2.78 1.171 2.971c.144.191 2.022 3.088 4.9 4.331c.685.295 1.22.471 1.637.603c.688.219 1.314.188 1.808.115c.551-.082 1.705-.697 1.944-1.37c.24-.672.24-1.249.167-1.37c-.072-.121-.263-.193-.551-.337z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
              <span className="editorial-contact-divider" aria-hidden="true">|</span>

              {/* LinkedIn */}
              <a 
                href={linkedinUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="editorial-contact-link"
                title="LinkedIn Profile"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63c.9 0 1.63-.73 1.63-1.63s-.73-1.63-1.63-1.63z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
              <span className="editorial-contact-divider" aria-hidden="true">|</span>

              {/* Location */}
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(profile.address || 'San Francisco, CA')}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="editorial-contact-link"
                title={`Clinic Location: ${profile.address || 'Oakwood Wellness Center'}`}
              >
                <MapPin size={16} />
                <span>Location</span>
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: Backdrop Aura, Rings & Cutout Portrait */}
          <div className="editorial-hero-right">
            <div className="editorial-visual-frame">
              {/* Concentric Golden/Warm Arc Rings */}
              <div className="editorial-halo-ring ring-outer" />
              <div className="editorial-halo-ring ring-inner" />
              
              {/* Soft warm circular backdrop disk */}
              <div className="editorial-halo-disk" />

              {/* Therapist Cutout Image (Transparent background) */}
              <img 
                src="/therapist-hero-cutout.png" 
                alt={`Portrait of ${profile.name || 'Shamna'}`} 
                className="editorial-portrait-cutout"
              />
            </div>
          </div>

        </div>

        {/* BOTTOM WAVY SECTION WITH SCROLL-ANIMATED STATS */}
        <div className="editorial-wave-section">
          {/* Dual-tone curved wave svg divider */}
          <div className="editorial-wave-svg-container">
            <svg 
              className="editorial-wave-svg" 
              viewBox="0 0 1440 140" 
              preserveAspectRatio="none" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Secondary softer wave in background for layered depth */}
              <path 
                d="M0,85 C240,115 520,70 820,45 C1080,24 1260,65 1440,55 L1440,140 L0,140 Z" 
                fill="rgba(72, 45, 28, 0.45)" 
              />
              {/* Foreground rich chocolate wave matching screenshot */}
              <path 
                d="M0,95 C280,125 580,85 860,50 C1100,26 1280,72 1440,65 L1440,140 L0,140 Z" 
                fill="#3E2718" 
              />
            </svg>
          </div>

          {/* Stats Bar */}
          <div className="editorial-stats-bar">
            <div className="container editorial-stats-flex">
              {/* Stat 1: Consultations */}
              <CountStatCard 
                value={totalConsultations}
                label="CONSULTATIONS ATTENDED"
                onClick={onBookClick}
                title="Click to book a consultation"
              />

              <div className="editorial-stat-separator" aria-hidden="true" />

              {/* Stat 2: Care journeys */}
              <CountStatCard 
                value={casesResolved}
                label="CARE JOURNEYS SUPPORTED"
                onClick={() => scrollTo('approach')}
                title="Click to explore my therapeutic approach"
              />

              <div className="editorial-stat-separator" aria-hidden="true" />

              {/* Stat 3: Recovery rate */}
              <CountStatCard 
                value={clientSatisfaction}
                label="CLIENT RECOVERY RATE"
                onClick={() => scrollTo('about')}
                title="Click to view therapist credentials & client outcomes"
              />
            </div>
          </div>
        </div>
      </section>

      {/* APPROACH SECTION (Anchor #approach) */}
      <section className="editorial-approach-section" id="approach">
        <div className="container">
          <div className="editorial-section-header">
            <p className="editorial-section-label">HOW WE CAN WORK TOGETHER</p>
            <h2 className="editorial-section-heading">Care that meets you where you are.</h2>
          </div>

          <div className="editorial-approach-grid">
            {[
              {
                num: '01',
                title: 'Make space',
                desc: 'A confidential first conversation gives you room to share what is on your mind without judgement.'
              },
              {
                num: '02',
                title: 'Find clarity',
                desc: 'Together, we gently identify recurring emotional patterns, inner strengths, and practical coping tools.'
              },
              {
                num: '03',
                title: 'Move forward',
                desc: 'Build a steadier, compassionate relationship with yourself, progressing at a pace that feels genuinely right.'
              }
            ].map((step) => (
              <div key={step.num} className="editorial-approach-card">
                <span className="card-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION (Anchor #about) */}
      <section className="editorial-about-section" id="about">
        <div className="container">
          <div className="editorial-about-card">
            <div className="about-card-left">
              <p className="editorial-section-label">ABOUT YOUR THERAPIST</p>
              <h2>{profile.name}</h2>
              <p className="about-title">{profile.title}</p>
              <p className="about-bio">{profile.bio}</p>

              <div className="about-meta-grid">
                {profile.experience && (
                  <div className="meta-item">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Experience</strong>
                      <p>{profile.experience}</p>
                    </div>
                  </div>
                )}
                {profile.education && (
                  <div className="meta-item">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Education</strong>
                      <p>{profile.education}</p>
                    </div>
                  </div>
                )}
              </div>

              {specialties.length > 0 && (
                <div className="about-specialties">
                  <strong>Specialisations:</strong>
                  <div className="specialty-pills">
                    {specialties.map(spec => (
                      <span key={spec} className="specialty-pill">{spec}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="about-card-right">
              <div className="about-image-frame">
                <img 
                  src={profile.photo_url || '/therapist-hero-cutout.png'} 
                  alt={`Therapist ${profile.name}`} 
                  className="about-image"
                />
              </div>
              <button onClick={onBookClick} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                <Calendar size={16} /> Schedule with {profile.name}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION (Anchor #services) */}
      <section className="editorial-services-section" id="services">
        <div className="container">
          <div className="editorial-section-header">
            <p className="editorial-section-label">SERVICES & SPECIALISATIONS</p>
            <h2 className="editorial-section-heading">Thoughtful care tailored to your journey.</h2>
          </div>

          <div className="editorial-services-grid">
            {[
              {
                icon: <HeartHandshake size={24} />,
                title: 'Individual Counselling',
                desc: 'One-on-one compassionate sessions to address life transitions, emotional overwhelm, and self-worth.'
              },
              {
                icon: <Sparkles size={24} />,
                title: 'Cognitive Behavioural Therapy (CBT)',
                desc: 'Structured, evidence-backed techniques to rewire negative automatic thoughts and anxiety triggers.'
              },
              {
                icon: <Users size={24} />,
                title: 'Relationship & Family Dynamics',
                desc: 'Healthy communication patterns, emotional boundary setting, and deeper interpersonal bonds.'
              },
              {
                icon: <Compass size={24} />,
                title: 'Mindfulness & Stress Management',
                desc: 'Somatic grounding tools, nervous system regulation, and mindfulness-based stress reduction.'
              }
            ].map((service, idx) => (
              <div key={idx} className="service-card">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.desc}</p>
                <button onClick={onBookClick} className="service-book-btn">
                  Book this care <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESOURCES & CONTACT PROMPT (Anchor #resources & #contact) */}
      <section className="editorial-contact-section" id="contact">
        <div className="container">
          <div className="contact-editorial-box" id="resources">
            <div className="contact-editorial-copy">
              <p className="editorial-section-label">GET IN TOUCH</p>
              <h2>Take the first step at your own pace.</h2>
              <p>
                Whether you have questions about the therapeutic process or are ready to schedule your first consultation, reach out anytime.
              </p>
              
              <div className="contact-quick-links">
                {profile.contact_email && (
                  <a href={`mailto:${profile.contact_email}`} className="contact-quick-btn">
                    <Mail size={16} /> {profile.contact_email}
                  </a>
                )}
                {profile.contact_phone && (
                  <a href={`tel:${profile.contact_phone}`} className="contact-quick-btn">
                    <Phone size={16} /> {profile.contact_phone}
                  </a>
                )}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="contact-quick-btn">
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="contact-editorial-action">
              <div className="consultation-card">
                <h3>Ready to begin?</h3>
                <p>Reserve an available online or in-person therapy session.</p>
                <button onClick={onBookClick} className="editorial-btn-book-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Calendar size={18} /> Book a Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
