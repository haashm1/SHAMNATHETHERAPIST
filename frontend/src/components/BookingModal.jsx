import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Video, MapPin } from 'lucide-react';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const DEFAULT_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00'
];

export default function BookingModal({ onClose, prefillData }) {
  const [clientName, setClientName] = useState(prefillData?.client_name || '');
  const [clientEmail, setClientEmail] = useState(prefillData?.client_email || '');
  const [clientPhone, setClientPhone] = useState(prefillData?.client_phone || '');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [notes, setNotes] = useState('');
  const [consultationMode, setConsultationMode] = useState('online'); // 'online' | 'offline'
  
  const [existingBookings, setExistingBookings] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState(prefillData?.psychologist_id?.toString() || '1');
  const [disabledSlots, setDisabledSlots] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [gcalUrl, setGcalUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Weekdays headers
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevTotalDays - i,
        isPadding: true,
        dateStr: null
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isUnavailable = therapistUnavailableDates.includes(dateStr);
      const isPast = dateStr < getMinDate();

      // Check if all slots are fully booked
      const bookingsOnDate = existingBookings.filter(
        b => b.booking_date === dateStr && 
             b.status !== 'cancelled' && 
             parseInt(b.psychologist_id, 10) === parseInt(selectedPsychologistId, 10)
      );
      const isFullyBooked = bookingsOnDate.length >= therapistSlots.length;

      days.push({
        day: i,
        isPadding: false,
        dateStr,
        disabled: isUnavailable || isPast || isFullyBooked,
        isFullyBooked
      });
    }

    // Next month padding
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        isPadding: true,
        dateStr: null
      });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => {
      const today = new Date();
      if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
        setCurrentMonth(new Date(year, month - 1, 1));
      }
    };

    const nextMonth = () => {
      setCurrentMonth(new Date(year, month + 1, 1));
    };

    return (
      <div className="custom-calendar">
        <div className="calendar-header">
          <button type="button" className="calendar-nav-btn" onClick={prevMonth}>
            <ChevronLeft size={14} />
          </button>
          <span className="calendar-month-title">{monthNames[month]} {year}</span>
          <button type="button" className="calendar-nav-btn" onClick={nextMonth}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="calendar-weekdays">
          {weekdays.map(w => <span key={w}>{w}</span>)}
        </div>
        <div className="calendar-days-grid">
          {days.map((item, idx) => {
            if (item.isPadding) {
              return (
                <button
                  key={idx}
                  type="button"
                  className="calendar-day-cell padding-day"
                  disabled
                >
                  {item.day}
                </button>
              );
            }
            const isSelected = bookingDate === item.dateStr;
            const isToday = item.dateStr === new Date().toISOString().split('T')[0];
            const isFullyBooked = item.isFullyBooked;

            let cellClass = 'calendar-day-cell';
            if (isSelected) cellClass += ' selected';
            if (isToday) cellClass += ' today';
            if (isFullyBooked) cellClass += ' fully-booked';

            return (
              <button
                key={idx}
                type="button"
                className={cellClass}
                disabled={item.disabled}
                onClick={() => setBookingDate(item.dateStr)}
                title={isFullyBooked ? 'Fully Booked' : undefined}
              >
                {item.day}
              </button>
            );
          })}
        </div>
        
        {/* Calendar Legend */}
        <div className="calendar-legend" style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '1px solid var(--accent)' }}></span>
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}></span>
            <span>Selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(200, 100, 100, 0.15)', border: '1px solid var(--error)' }}></span>
            <span>Fully Booked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f0ebe4', textDecoration: 'line-through' }}></span>
            <span>Holiday / Past</span>
          </div>
        </div>
      </div>
    );
  };

  // Fetch all existing bookings & psychologists
  useEffect(() => {
    // Fetch bookings
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => {
        setExistingBookings(data);
      })
      .catch(err => {
        console.error("Error fetching bookings for conflict check:", err);
      });

    // Fetch psychologist profiles
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        setPsychologists(Array.isArray(data) ? data : [data]);
      })
      .catch(err => {
        console.error("Error fetching psychologists:", err);
      });
  }, []);

  const activePsychologist = psychologists.find(p => p.id === parseInt(selectedPsychologistId, 10));
  const availableSlotsStr = activePsychologist?.available_slots || '';
  const therapistSlots = availableSlotsStr 
    ? availableSlotsStr.split(',').filter(Boolean)
    : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  
  const therapistUnavailableDates = activePsychologist?.unavailable_dates
    ? activePsychologist.unavailable_dates.split(',').filter(Boolean)
    : [];
 
  // Update disabled slots when date or psychologist changes
  useEffect(() => {
    if (!bookingDate) {
      setDisabledSlots([]);
      return;
    }
    // Filter bookings on this specific date and selected psychologist that are not cancelled
    const bookingsOnDate = existingBookings.filter(
      b => b.booking_date === bookingDate && 
           b.status !== 'cancelled' && 
           parseInt(b.psychologist_id, 10) === parseInt(selectedPsychologistId, 10)
    );
    // Map them to their times
    const timesBooked = bookingsOnDate.map(b => b.booking_time);
    
    // Check if the chosen date is today, and disable past times
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const pastTimes = [];
    if (bookingDate === todayDate) {
      const currentHours = today.getHours();
      const currentMinutes = today.getMinutes();
      
      therapistSlots.forEach(slot => {
        const [slotHours, slotMinutes] = slot.split(':').map(Number);
        if (slotHours < currentHours || (slotHours === currentHours && slotMinutes <= currentMinutes)) {
          pastTimes.push(slot);
        }
      });
    }

    const combinedDisabled = [...new Set([...timesBooked, ...pastTimes])];
    setDisabledSlots(combinedDisabled);
    
    // Clear slot selection if the currently selected one is now disabled
    if (combinedDisabled.includes(bookingTime)) {
      setBookingTime('');
    }
  }, [bookingDate, selectedPsychologistId, existingBookings, availableSlotsStr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      setErrorMsg('Please select a date and an available time slot.');
      return;
    }

    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim() || !notes.trim()) {
      setErrorMsg('Please fill in all details, including what you would like to address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          booking_date: bookingDate,
          booking_time: bookingTime,
          duration_minutes: 50,
          notes: `[${consultationMode === 'online' ? 'Online / Video Session' : 'In-Person / Offline Visit'}] ${notes}`,
          psychologist_id: selectedPsychologistId,
          consultation_mode: consultationMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to book slot');
      }

      // Store details for confirmation receipt
      const chosenPsy = psychologists.find(p => p.id === parseInt(selectedPsychologistId, 10)) || {};
      setConfirmedBookingDetails({
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        booking_date: bookingDate,
        booking_time: bookingTime,
        therapist_name: chosenPsy.name || 'Shamna',
        therapist_phone: chosenPsy.contact_phone || '',
        meet_link: data.booking?.meet_link || '',
        consultation_mode: consultationMode,
        therapist_address: chosenPsy.address || ''
      });

      // Prepare WhatsApp booking confirmation text
      const modeLabel = consultationMode === 'online' ? 'Online / Video Session' : 'In-Person / Offline Visit';
      const waText = encodeURIComponent(
        `*Session Booking Confirmation*\n` +
        `-----------------------------\n` +
        `*Client:* ${clientName}\n` +
        `*Therapist:* ${chosenPsy.name || 'Shamna'}\n` +
        `*Date:* ${formatDateToDMY(bookingDate)}\n` +
        `*Time:* ${bookingTime} (50 mins)\n` +
        `*Mode:* ${modeLabel}\n` +
        (consultationMode === 'online'
          ? `*Google Meet:* ${data.booking?.meet_link || 'Will be shared before the session'}\n`
          : `*Location:* ${chosenPsy.address || 'Clinic address will be confirmed'}\n`) +
        `-----------------------------\n` +
        `Thank you for booking with us!`
      );

      // Open WhatsApp automatically
      const rawPhone = chosenPsy.contact_phone || '9605223399';
      let targetPhone = rawPhone.replace(/\D/g, '');
      if (targetPhone.length === 10) {
        targetPhone = '91' + targetPhone;
      }
      const waUrl = `https://api.whatsapp.com/send/?phone=${targetPhone}&text=${waText}&type=phone_number&app_absent=0`;
      window.open(waUrl, '_blank');

      setSuccessMsg('Your appointment has been successfully booked!');
      setGcalUrl(data.googleCalendarUrl || '');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setBookingDate('');
      setBookingTime('');
      setNotes('');

      // Refresh bookings list
      const freshRes = await fetch('/api/bookings');
      const freshData = await freshRes.json();
      setExistingBookings(freshData);

    } catch (err) {
      setErrorMsg(err.message || 'Slot booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get current date formatted as YYYY-MM-DD for min-date picker limit
  const getMinDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.5rem' }}>Book a Consultation</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {successMsg ? (
            <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <CheckCircle size={48} style={{ color: 'var(--success)' }} />
                <h3 style={{ color: 'var(--text-primary)', marginTop: '0.5rem' }}>Booking Confirmed!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{successMsg}</p>
              </div>

              {confirmedBookingDetails && (
                <div id="booking-receipt" style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent)', textAlign: 'center' }}>
                    Consultation Receipt
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-light)' }}>Client Name:</span>
                    <strong style={{ textAlign: 'right' }}>{confirmedBookingDetails.client_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-light)' }}>Email:</span>
                    <span style={{ textAlign: 'right', wordBreak: 'break-all' }}>{confirmedBookingDetails.client_email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-light)' }}>Phone:</span>
                    <span style={{ textAlign: 'right' }}>{confirmedBookingDetails.client_phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-light)' }}>Therapist:</span>
                    <strong style={{ textAlign: 'right' }}>{confirmedBookingDetails.therapist_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-light)' }}>Date:</span>
                    <strong style={{ textAlign: 'right' }}>{formatDateToDMY(confirmedBookingDetails.booking_date)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-light)' }}>Time:</span>
                    <strong style={{ textAlign: 'right' }}>{confirmedBookingDetails.booking_time} (50m)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-light)' }}>Session Mode:</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: confirmedBookingDetails.consultation_mode === 'online' ? 'rgba(122,143,117,0.15)' : 'rgba(176,142,115,0.15)',
                      color: confirmedBookingDetails.consultation_mode === 'online' ? '#4c5e49' : 'var(--accent)',
                      padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600
                    }}>
                      {confirmedBookingDetails.consultation_mode === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                      {confirmedBookingDetails.consultation_mode === 'online' ? 'Online / Video' : 'In-Person / Offline'}
                    </span>
                  </div>
                  {confirmedBookingDetails.consultation_mode === 'online' ? (
                    confirmedBookingDetails.meet_link ? (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-light)' }}>Google Meet Link:</span>
                        <a href={confirmedBookingDetails.meet_link} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600 }}>
                          {confirmedBookingDetails.meet_link}
                        </a>
                      </div>
                    ) : (
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-light)' }}>Google Meet Link:</span>
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Will be emailed to you once confirmed by the therapist.</span>
                      </div>
                    )
                  ) : (
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>Clinic Address:</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{confirmedBookingDetails.therapist_address || 'Address will be confirmed by the therapist.'}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => window.print()} 
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'inline-flex', gap: '0.5rem', justifyContent: 'center' }}
                >
                  Download / Save Receipt
                </button>

                {gcalUrl && (
                  <a 
                    href={gcalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'inline-flex', gap: '0.5rem', justifyContent: 'center', textDecoration: 'none' }}
                  >
                    <Calendar size={18} /> Add to Google Calendar
                  </a>
                )}

                {confirmedBookingDetails && (
                  <button 
                    onClick={() => {
                      const rModeLabel = confirmedBookingDetails.consultation_mode === 'online' ? 'Online / Video Session' : 'In-Person / Offline Visit';
                      const waText = encodeURIComponent(
                        `*Session Booking Confirmation*\n` +
                        `-----------------------------\n` +
                        `*Client:* ${confirmedBookingDetails.client_name}\n` +
                        `*Therapist:* ${confirmedBookingDetails.therapist_name}\n` +
                        `*Date:* ${formatDateToDMY(confirmedBookingDetails.booking_date)}\n` +
                        `*Time:* ${confirmedBookingDetails.booking_time} (50 mins)\n` +
                        `*Mode:* ${rModeLabel}\n` +
                        (confirmedBookingDetails.consultation_mode === 'online'
                          ? `*Google Meet:* ${confirmedBookingDetails.meet_link || 'Will be shared before the session'}\n`
                          : `*Location:* ${confirmedBookingDetails.therapist_address || 'Address will be confirmed'}\n`) +
                        `-----------------------------\n` +
                        `Thank you for booking with us!`
                      );
                      const rawPhone = confirmedBookingDetails.therapist_phone || '9605223399';
                      let targetPhone = rawPhone.replace(/\D/g, '');
                      if (targetPhone.length === 10) {
                        targetPhone = '91' + targetPhone;
                      }
                      const waUrl = `https://api.whatsapp.com/send/?phone=${targetPhone}&text=${waText}&type=phone_number&app_absent=0`;
                      window.open(waUrl, '_blank');
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'inline-flex', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#25D366', color: 'white', border: 'none' }}
                  >
                    Resend to WhatsApp
                  </button>
                )}

                <button 
                  onClick={() => {
                    // Reset state to book the next session
                    setSuccessMsg('');
                    setGcalUrl('');
                    setConfirmedBookingDetails(null);
                    setBookingDate('');
                    setBookingTime('');
                    setNotes('');
                  }} 
                  className="btn btn-accent" 
                  style={{ width: '100%', display: 'inline-flex', gap: '0.5rem', justifyContent: 'center' }}
                >
                  Book Next Session (Keep Info)
                </button>

                <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%' }}>
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {errorMsg && (
                <div className="slot-conflict-alert">
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="client-name">Your Full Name</label>
                <input 
                  type="text" 
                  id="client-name" 
                  className="form-control"
                  placeholder="Your Name" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="client-email">Email Address</label>
                  <input 
                    type="email" 
                    id="client-email" 
                    className="form-control"
                    placeholder="Your Email" 
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client-phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="client-phone" 
                    className="form-control"
                    placeholder="9876543210" 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required 
                  />
                </div>
              </div>

              {/* Consultation Mode Toggle */}
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Consultation Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    id="mode-online"
                    onClick={() => setConsultationMode('online')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      padding: '0.85rem 1rem',
                      border: `2px solid ${consultationMode === 'online' ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: consultationMode === 'online' ? 'rgba(176,142,115,0.1)' : 'var(--bg-primary)',
                      color: consultationMode === 'online' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: consultationMode === 'online' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem',
                    }}
                  >
                    <Video size={18} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>Online</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.8 }}>Video / Google Meet</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    id="mode-offline"
                    onClick={() => setConsultationMode('offline')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      padding: '0.85rem 1rem',
                      border: `2px solid ${consultationMode === 'offline' ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: consultationMode === 'offline' ? 'rgba(176,142,115,0.1)' : 'var(--bg-primary)',
                      color: consultationMode === 'offline' ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: consultationMode === 'offline' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem',
                    }}
                  >
                    <MapPin size={18} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>In-Person</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.8 }}>Visit the Clinic</div>
                    </div>
                  </button>
                </div>
                {consultationMode === 'online' && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                    📹 A Google Meet link will be emailed to you before your session.
                  </p>
                )}
                {consultationMode === 'offline' && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                    📍 Please arrive 10 minutes before your scheduled appointment at the clinic.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Select Session Date</label>
                {renderCalendar()}
              </div>

              {bookingDate && (
                <div className="form-group">
                  {therapistUnavailableDates.includes(bookingDate) ? (
                    <div className="slot-conflict-alert" style={{ background: 'rgba(201, 122, 122, 0.1)', color: 'var(--error)', border: '1px solid rgba(201, 122, 122, 0.2)' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span>Therapist is unavailable on this day. Please select a different date.</span>
                    </div>
                  ) : (
                    <>
                      <label>Available Slots (50 mins session)</label>
                      <div className="slots-container">
                        {therapistSlots.map((slot) => {
                          const isBooked = disabledSlots.includes(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              className={`slot-item ${bookingTime === slot ? 'selected' : ''} ${isBooked ? 'disabled' : ''}`}
                              disabled={isBooked}
                              onClick={() => setBookingTime(slot)}
                            >
                              <Clock size={12} style={{ marginRight: '4px', display: 'inline' }} />
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                        * Slots with line-throughs are already booked.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="booking-notes">Briefly describe what you'd like to address</label>
                <textarea 
                  id="booking-notes" 
                  className="form-control"
                  rows="3"
                  placeholder="Stress management, anxiety support, family dynamics..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn btn-accent" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Appointment'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
