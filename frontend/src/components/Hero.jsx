import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Calendar, CheckCircle2, HeartHandshake, Mail, MapPin, Phone, ShieldCheck, Sparkles, Users } from 'lucide-react';

function parseStat(value = '') {
  const match = String(value).replace(/,/g, '').match(/^(\d+(?:\.\d+)?)(.*)$/);
  return match ? { number: Number(match[1]), suffix: match[2] } : { number: 0, suffix: value };
}

function useScrollNumber(value, elementRef) {
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    const { number, suffix } = parseStat(value);
    const decimal = String(value).includes('.');
    const update = () => {
      const rect = element.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = decimal ? (number * eased).toFixed(1) : Math.round(number * eased).toLocaleString('en-IN');
      setDisplay(`${current}${suffix}`);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [elementRef, value]);
  return display;
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.unobserve(node); }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`scroll-reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>{children}</div>;
}

function ScrollStat({ value, label, icon }) {
  const ref = useRef(null);
  const display = useScrollNumber(value, ref);
  return <article ref={ref} className="impact-stat"><span className="impact-stat-icon">{icon}</span><strong>{display}</strong><span>{label}</span></article>;
}

export default function Hero({ profile, onBookClick }) {
  if (!profile) return null;
  const specialties = profile.specialties ? profile.specialties.split(',').map((item) => item.trim()) : [];
  const totalConsultations = profile.total_consultations || '1,500+';
  const casesResolved = profile.cases_resolved || '1,200+';
  const clientSatisfaction = profile.client_satisfaction || '98%';

  return <>
    <section className="hero hero--editorial">
      <div className="hero-aura hero-aura--one" /><div className="hero-aura hero-aura--two" />
      <div className="container hero-shell">
        <Reveal className="hero-copy" delay={40}>
          <p className="hero-kicker"><Sparkles size={15} /> A gentle place to begin</p>
          <h1>Find your way back to <em>yourself.</em></h1>
          <p className="hero-description">Thoughtful, client-centred counselling for the moments when you need space, clarity, and support to move forward.</p>
          <div className="hero-actions"><button onClick={onBookClick} className="btn btn-accent"><Calendar size={18} /> Book a consultation</button><a className="hero-text-link" href="#approach">Explore my approach <ArrowDownRight size={18} /></a></div>
          <div className="hero-contact-row" aria-label="Contact details"><a href={`mailto:${profile.contact_email}`}><Mail size={15} /> Email</a><a href={`tel:${profile.contact_phone}`}><Phone size={15} /> Call</a>{profile.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`} target="_blank" rel="noreferrer"><MapPin size={15} /> Location</a>}</div>
        </Reveal>
        <Reveal className="hero-intro-card" delay={160}>
          <div className="hero-portrait-frame">
            <img src="/therapist-hero-cutout.png" alt={`Portrait of ${profile.name}`} className="hero-portrait" />
          </div>
          <div className="therapist-panel-details">
            <div className="intro-card-mark"><HeartHandshake size={24} /></div><p className="intro-card-eyebrow">Meet your therapist</p><h2>{profile.name}</h2><p className="intro-card-title">{profile.title}</p><p className="intro-card-bio">{profile.bio}</p>
            <div className="intro-card-details">{profile.experience && <span><ShieldCheck size={16} /> {profile.experience} experience</span>}{profile.education && <span><CheckCircle2 size={16} /> {profile.education}</span>}</div>
            {specialties.length > 0 && <div className="doctor-specialties">{specialties.map((item) => <span key={item} className="tag">{item}</span>)}</div>}
          </div>
        </Reveal>
      </div>
    </section>
    <section className="impact-section" aria-label="Practice impact"><div className="container"><Reveal className="impact-header"><p className="section-label">A practice built on progress</p><p>These figures respond to your scroll — pause anywhere to take them in.</p></Reveal><Reveal className="impact-grid" delay={120}><ScrollStat value={totalConsultations} label="Consultations attended" icon={<Users size={21} />} /><ScrollStat value={casesResolved} label="Care journeys supported" icon={<CheckCircle2 size={21} />} /><ScrollStat value={clientSatisfaction} label="Client recovery rate" icon={<Sparkles size={21} />} /></Reveal></div></section>
    <section className="approach-section container" id="approach"><Reveal className="approach-heading"><p className="section-label">How we can work together</p><h2>Care that meets you where you are.</h2></Reveal><div className="approach-grid">{[['01', 'Make space', 'A confidential first conversation gives you room to share what is on your mind.'], ['02', 'Find clarity', 'Together, we gently identify patterns, strengths, and practical next steps.'], ['03', 'Move forward', 'Build a steadier relationship with yourself, at a pace that feels right.']].map(([number, title, description], index) => <Reveal className="approach-card" delay={index * 110} key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></Reveal>)}</div></section>
  </>;
}
