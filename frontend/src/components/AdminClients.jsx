import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, Calendar, ChevronRight, Clock, Plus } from 'lucide-react';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function AdminClients({ bookings, onStartCaseSheet, onOpenCaseSheet, onBookNextSession }) {
  const [selectedClientEmail, setSelectedClientEmail] = useState(null);
  const [clientCaseSheets, setClientCaseSheets] = useState([]);

  // Fetch all case sheets to link them to clients
  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => setClientCaseSheets(data))
      .catch(err => console.error("Error fetching cases for client details:", err));
  }, [selectedClientEmail]);

  // Extract unique clients based on email
  const clientMap = {};
  bookings.forEach(b => {
    if (!clientMap[b.client_email]) {
      clientMap[b.client_email] = {
        name: b.client_name,
        email: b.client_email,
        phone: b.client_phone,
        appointments: []
      };
    }
    clientMap[b.client_email].appointments.push(b);
  });

  const uniqueClients = Object.values(clientMap);

  const handleSelectClient = (email) => {
    setSelectedClientEmail(email);
  };

  const selectedClient = clientMap[selectedClientEmail];
  const selectedClientCases = selectedClient
    ? clientCaseSheets.filter(
        c => c.client_name.toLowerCase().trim() === selectedClient.name.toLowerCase().trim()
      )
    : [];

  return (
    <div className={`clients-layout-grid ${selectedClientEmail ? '' : 'single-col'}`}>
      
      {/* Left Column: Unique Client List */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Client Directory</h3>
        
        {uniqueClients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
            No clients in records.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
            {uniqueClients.map((client) => (
              <div
                key={client.email}
                onClick={() => handleSelectClient(client.email)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedClientEmail === client.email ? 'var(--accent)' : 'var(--border-color)'}`,
                  background: selectedClientEmail === client.email ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{client.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
                    {client.email}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="tag" style={{ fontSize: '0.7rem' }}>
                    {client.appointments.length} Session{client.appointments.length > 1 ? 's' : ''}
                  </span>
                  <ChevronRight size={16} className="text-light" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Expanded Client History Details */}
      {selectedClientEmail && selectedClient && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Client Card */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{selectedClient.name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 500 }}>Client Record Card</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={() => onBookNextSession({
                    client_name: selectedClient.name,
                    client_email: selectedClient.email,
                    client_phone: selectedClient.phone
                  })}
                  className="btn btn-accent"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                >
                  <Calendar size={12} /> Book Next Session
                </button>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '50%' }}>
                  <User size={28} style={{ color: 'var(--accent)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <a 
                href={`mailto:${selectedClient.email}`} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Mail size={16} className="text-light" />
                <span>{selectedClient.email}</span>
              </a>
              <a 
                href={`tel:${selectedClient.phone}`} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Phone size={16} className="text-light" />
                <span>{selectedClient.phone}</span>
              </a>
            </div>
          </div>

          {/* Previous Case Sheets */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem' }}>Clinical Case Sheets</h4>
              <button 
                onClick={() => onStartCaseSheet({ client_name: selectedClient.name, booking_date: new Date().toISOString().split('T')[0] })}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
              >
                <Plus size={12} /> New Case Sheet
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedClientCases.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => onOpenCaseSheet(c)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(250, 246, 240, 0.5)'
                  }}
                  title="Click to open in editor"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Edited: {formatDateToDMY(c.case_date)}</div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-light" />
                </div>
              ))}
              {selectedClientCases.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                  No case sheets recorded for this client.
                </p>
              )}
            </div>
          </div>

          {/* Session History */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Appointment History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedClient.appointments.map((appt) => (
                <div 
                  key={appt.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(250, 246, 240, 0.2)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} className="text-light" />
                      <span>{formatDateToDMY(appt.booking_date)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <Clock size={14} className="text-light" />
                      <span>{appt.booking_time} ({appt.duration_minutes} mins)</span>
                    </div>
                  </div>
                  <span className={`status-badge ${appt.status}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
