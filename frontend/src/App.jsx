import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BookingModal from './components/BookingModal';
import AdminProfile from './components/AdminProfile';
import AdminBookings from './components/AdminBookings';
import CaseSheetEditor from './components/CaseSheetEditor';
import AdminClients from './components/AdminClients';
import { Lock, LogOut, Calendar, User, FileText, CheckCircle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('client'); // client | admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [activeAdminTab, setActiveAdminTab] = useState('bookings'); // bookings | profile | cases
  const [selectedBookingForCase, setSelectedBookingForCase] = useState(null);

  const handleBookNextSession = (clientInfo) => {
    setPrefillData(clientInfo);
    setShowBookingModal(true);
  };

  const backendUrl = '';

  // Fetch initial profile and bookings
  const fetchProfile = () => {
    fetch(`${backendUrl}/api/profile`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Find Shamna or take the first therapist as primary profile
          const shamna = data.find(p => p.name.toLowerCase().includes('shamna')) || data[0];
          setProfile(shamna);
        } else {
          setProfile(data);
        }
      })
      .catch(err => console.error("Error fetching profile:", err));
  };

  const fetchBookings = () => {
    fetch(`${backendUrl}/api/bookings`)
      .then(res => res.json())
      .then(data => setBookings(data))
      .catch(err => console.error("Error fetching bookings:", err));
  };

  useEffect(() => {
    fetchProfile();
    fetchBookings();
  }, []);

  const handleAdminPinSubmit = (e) => {
    e.preventDefault();
    if (adminPin === '1234') {
      setIsAdminAuthenticated(true);
      setPinError('');
      setAdminPin('');
    } else {
      setPinError('Invalid passcode. Hint: Use 1234');
      setAdminPin('');
    }
  };

  const handleStartCaseSheet = (booking) => {
    setSelectedBookingForCase(booking);
    setActiveAdminTab('cases');
  };

  const handleBackToBookings = () => {
    setSelectedBookingForCase(null);
    setActiveAdminTab('bookings');
  };

  const handleViewChange = (newView) => {
    setView(newView);
    // Reset selection if toggling
    if (newView === 'client') {
      setSelectedBookingForCase(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar 
        currentView={view} 
        onViewChange={handleViewChange} 
        psychologistName={profile ? profile.name : ''}
        onBookClick={() => setShowBookingModal(true)}
        profile={profile}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {view === 'client' ? (
          /* Client View */
          <>
            <Hero 
              profile={profile} 
              onBookClick={() => setShowBookingModal(true)} 
              onAdminClick={() => setView('admin')}
            />
            {/* Booking modal render removed from here and moved to global root level */}
          </>
        ) : (
          /* Admin View (Requires passcode validation) */
          <div className="container admin-container fade-in">
            {!isAdminAuthenticated ? (
              /* PIN Access Screen */
              <div className="auth-container">
                <form onSubmit={handleAdminPinSubmit} className="auth-card">
                  <div style={{ display: 'inline-flex', alignSelf: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '50%' }}>
                    <Lock size={32} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Portal Authentication</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      Enter your clinical administration passcode.
                    </p>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Passcode PIN" 
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      maxLength={8}
                      style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.2rem' }}
                      required 
                    />
                  </div>

                  {pinError && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--error)', fontWeight: 500 }}>
                      {pinError}
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => setView('client')} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      Enter Portal
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Authenticated Admin Dashboard */
              <>
                <div className="admin-header">
                  <div>
                    <h2 style={{ fontSize: '1.8rem' }}>Clinical Administrator Dashboard</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Manage client appointments, profile updates, and digital case sheets.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsAdminAuthenticated(false)} 
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.25rem' }}
                  >
                    <LogOut size={14} /> Lock Dashboard
                  </button>
                </div>

                {/* Dashboard Sub-Tabs Navigation */}
                <div className="admin-tabs">
                  <button 
                    onClick={() => {
                      setActiveAdminTab('bookings');
                      setSelectedBookingForCase(null);
                    }}
                    className={`tab-btn ${activeAdminTab === 'bookings' ? 'active' : ''}`}
                  >
                    <Calendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
                    Appointments ({bookings.filter(b => b.status !== 'cancelled').length})
                  </button>
                  <button 
                    onClick={() => {
                      setActiveAdminTab('clients');
                      setSelectedBookingForCase(null);
                    }}
                    className={`tab-btn ${activeAdminTab === 'clients' ? 'active' : ''}`}
                  >
                    <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
                    Client Records
                  </button>
                  <button 
                    onClick={() => setActiveAdminTab('cases')}
                    className={`tab-btn ${activeAdminTab === 'cases' ? 'active' : ''}`}
                  >
                    <FileText size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
                    Case Sheets (Google Docs Editor)
                  </button>
                  <button 
                    onClick={() => {
                      setActiveAdminTab('profile');
                      setSelectedBookingForCase(null);
                    }}
                    className={`tab-btn ${activeAdminTab === 'profile' ? 'active' : ''}`}
                  >
                    <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
                    Profile Details
                  </button>
                </div>

                {/* Tab Component Render */}
                {activeAdminTab === 'bookings' && (
                  <AdminBookings 
                    bookings={bookings} 
                    onRefresh={fetchBookings}
                    onStartCaseSheet={handleStartCaseSheet}
                    onBookNextSession={handleBookNextSession}
                  />
                )}

                {activeAdminTab === 'clients' && (
                  <AdminClients 
                    bookings={bookings} 
                    onStartCaseSheet={(booking) => {
                      setSelectedBookingForCase(booking);
                      setActiveAdminTab('cases');
                    }}
                    onOpenCaseSheet={(caseSheet) => {
                      setSelectedBookingForCase(caseSheet);
                      setActiveAdminTab('cases');
                    }}
                    onBookNextSession={handleBookNextSession}
                  />
                )}

                {activeAdminTab === 'cases' && (
                  <CaseSheetEditor 
                    initialCaseData={selectedBookingForCase}
                    onBackToBookings={handleBackToBookings}
                  />
                )}

                {activeAdminTab === 'profile' && (
                  <AdminProfile 
                    profile={profile} 
                    onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer style={{ background: 'var(--text-primary)', color: 'var(--bg-secondary)', padding: '2rem 0', borderTop: '1px solid var(--border-color)', marginTop: '4rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="logo" style={{ color: 'white' }}>
              <span>Shamna</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#8E7E74', marginTop: '0.25rem' }}>
              Empowering mental wellbeing and emotional resilience.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            {view === 'client' && (
              <button 
                onClick={() => handleViewChange('admin')} 
                style={{ background: 'transparent', border: 'none', color: '#8E7E74', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Psychologist Portal Login
              </button>
            )}
            <div style={{ fontSize: '0.8rem', color: '#8E7E74' }}>
              &copy; {new Date().getFullYear()} Shamna Clinic. Clinical records secure & encrypted.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Chat Button */}
      {view === 'client' && profile && (
        <a
          href={`https://wa.me/${profile.contact_phone ? (profile.contact_phone.replace(/\D/g, '').length === 10 ? '91' + profile.contact_phone.replace(/\D/g, '') : profile.contact_phone.replace(/\D/g, '')) : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: '#25D366',
            color: 'white',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
            zIndex: 999,
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = '#128C7E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#25D366';
          }}
          title="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.927 9.927 0 0 0 4.808 1.226h.003c5.502 0 9.99-4.479 9.991-9.986.002-2.67-1.037-5.18-2.93-7.071c-1.893-1.892-4.407-2.93-7.065-2.927zM6.883 18.06l-.32-.19a8.337 8.337 0 0 1-3.66-6.155c-.015-4.602 3.733-8.355 8.342-8.358a8.318 8.318 0 0 1 5.9 2.449c1.577 1.579 2.445 3.677 2.443 5.908c-.005 4.606-3.753 8.358-8.36 8.358h-.002a8.293 8.293 0 0 1-4.225-1.162l-.303-.18L4.35 19.34l.322-2.585l.178-.291-.013-.016l.169-.272-.169-.148c-.767-1.258-1.185-2.73-1.185-4.218zm9.324-4.838c-.288-.144-1.705-.84-1.968-.936c-.263-.096-.454-.144-.645.144c-.191.288-.741.936-.908 1.127c-.167.191-.334.215-.622.072a7.842 7.842 0 0 1-2.31-1.424a8.665 8.665 0 0 1-1.6-1.993c-.167-.288-.018-.444.126-.587c.129-.129.288-.335.431-.502c.144-.167.191-.288.288-.479c.096-.191.048-.36-.024-.503c-.072-.144-.645-1.554-.884-2.13c-.233-.564-.47-.487-.645-.496l-.551-.01c-.191 0-.502.072-.765.36c-.263.288-1.004.981-1.004 2.394s1.028 2.78 1.171 2.971c.144.191 2.022 3.088 4.9 4.331c.685.295 1.22.471 1.637.603c.688.219 1.314.188 1.808.115c.551-.082 1.705-.697 1.944-1.37c.24-.672.24-1.249.167-1.37c-.072-.121-.263-.193-.551-.337z"/>
          </svg>
        </a>
      )}
      {showBookingModal && (
        <BookingModal 
          prefillData={prefillData}
          onClose={() => {
            setShowBookingModal(false);
            setPrefillData(null);
            fetchBookings(); // Refresh bookings list
          }} 
        />
      )}
    </div>
  );
}
