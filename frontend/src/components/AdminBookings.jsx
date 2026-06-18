import React, { useState } from 'react';
import { Calendar, Clock, Edit2, Ban, AlertTriangle, FileText, CheckCircle, Plus } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function AdminBookings({ bookings, onRefresh, onStartCaseSheet, onBookNextSession }) {
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('09:00');
  const [blockPsychologistId, setBlockPsychologistId] = useState('1');
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [blockSuccess, setBlockSuccess] = useState('');

  const [editingMeetLinkId, setEditingMeetLinkId] = useState(null);
  const [editingMeetLinkVal, setEditingMeetLinkVal] = useState('');

  const [psychologists, setPsychologists] = useState([]);

  // Fetch psychologists list
  React.useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        setPsychologists(Array.isArray(data) ? data : [data]);
      })
      .catch(err => {
        console.error("Error fetching psychologists for admin bookings:", err);
      });
  }, []);

  // Group bookings to detect conflicts dynamically
  // A conflict is when there are 2 or more bookings with status !== 'cancelled' on the same date, time and psychologist
  const conflictMap = {};
  bookings.forEach(b => {
    if (b.status !== 'cancelled') {
      const key = `${b.booking_date}_${b.booking_time}_${b.psychologist_id}`;
      conflictMap[key] = (conflictMap[key] || 0) + 1;
    }
  });

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel/unblock this slot?")) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!res.ok) throw new Error("Failed to cancel booking");
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBlockSlot = async (e) => {
    e.preventDefault();
    if (!blockDate || !blockTime) return;

    setBlockLoading(true);
    setBlockError('');
    setBlockSuccess('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Blocked Slot (Therapist Away)',
          client_email: 'admin@shamna.com',
          client_phone: 'N/A',
          booking_date: blockDate,
          booking_time: blockTime,
          duration_minutes: 50,
          notes: 'Blocked by therapist',
          psychologist_id: blockPsychologistId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to block slot');
      }

      setBlockSuccess('Time slot successfully blocked!');
      setBlockDate('');
      onRefresh();
      setTimeout(() => setBlockSuccess(''), 3000);

    } catch (err) {
      setBlockError(err.message);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleSaveMeetLink = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meet_link: editingMeetLinkVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update Google Meet link");
      setEditingMeetLinkId(null);
      onRefresh();
      if (data.emailed) {
        alert("Meeting link saved and successfully emailed to the client!");
      } else {
        alert("Meeting link updated successfully!");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEmailMeetLink = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}/email-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      alert(data.message || "Meeting link successfully emailed to client!");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenReschedule = (booking) => {
    setRescheduleBooking(booking);
    setNewDate(booking.booking_date);
    setNewTime(booking.booking_time);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_date: newDate,
          booking_time: newTime
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Rescheduling failed");
      }

      setSuccessMsg("Appointment rescheduled successfully!");
      onRefresh();
      setTimeout(() => setRescheduleBooking(null), 1500);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Availability Manager Block */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Ban size={16} style={{ color: 'var(--error)' }} /> Toggle Availability: Block specific time slots
        </h4>
        <form onSubmit={handleBlockSlot} style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem' }}>Select Psychologist</label>
            <select
              className="form-control"
              value={blockPsychologistId}
              onChange={(e) => setBlockPsychologistId(e.target.value)}
              required
            >
              {psychologists.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem' }}>Date to Block</label>
            <CustomDatePicker 
              value={blockDate}
              onChange={setBlockDate}
              placeholder="Select Date"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem' }}>Time Slot</label>
            <select 
              className="form-control"
              value={blockTime}
              onChange={(e) => setBlockTime(e.target.value)}
              required
            >
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="13:00">01:00 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }} disabled={blockLoading}>
            {blockLoading ? 'Blocking...' : 'Block Slot'}
          </button>
        </form>
        {blockError && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{blockError}</p>}
        {blockSuccess && <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{blockSuccess}</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem' }}>Scheduled Consultations</h3>
        <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
          Total Bookings: <strong>{bookings.length}</strong>
        </span>
      </div>

      <div className="data-table-container">
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
            No bookings have been made yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Details</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Conflicts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const conflictKey = `${booking.booking_date}_${booking.booking_time}_${booking.psychologist_id}`;
                const hasConflict = booking.status !== 'cancelled' && conflictMap[conflictKey] > 1;
                const isBlocked = booking.client_email === 'admin@shamna.com';
                const assignedPsy = psychologists.find(p => p.id === booking.psychologist_id);

                return (
                  <tr key={booking.id} style={isBlocked ? { backgroundColor: 'rgba(230, 220, 210, 0.15)' } : {}}>
                    <td>
                      {isBlocked ? (
                        <div>
                          <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontWeight: 600 }}>
                            Blocked Slot (Therapist Offline)
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500, marginTop: '0.2rem' }}>
                            Therapist: {assignedPsy ? assignedPsy.name : `Psychologist ID: ${booking.psychologist_id}`}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600 }}>{booking.client_name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500, marginTop: '0.1rem', marginBottom: '0.2rem' }}>
                            Therapist: {assignedPsy ? assignedPsy.name : `Psychologist ID: ${booking.psychologist_id}`}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                            {booking.client_email} | {booking.client_phone}
                          </div>
                          {booking.notes && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              Note: "{booking.notes}"
                            </div>
                          )}
                          
                          {editingMeetLinkId === booking.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.45rem', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', width: '180px', height: '28px' }}
                                value={editingMeetLinkVal}
                                onChange={(e) => setEditingMeetLinkVal(e.target.value)}
                              />
                              <button 
                                onClick={() => handleSaveMeetLink(booking.id)} 
                                className="btn btn-primary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px', borderRadius: '4px' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingMeetLinkId(null)} 
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px', borderRadius: '4px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', marginTop: '0.45rem', color: 'var(--text-secondary)' }}>
                              <strong>Google Meet:</strong>{' '}
                              {booking.meet_link ? (
                                <a href={booking.meet_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--accent)' }}>
                                  {booking.meet_link.length > 25 ? `${booking.meet_link.substring(0, 25)}...` : booking.meet_link}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not Generated</span>
                              )}{' '}
                              {booking.status !== 'cancelled' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingMeetLinkId(booking.id);
                                      setEditingMeetLinkVal(booking.meet_link || '');
                                    }} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-hover)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: '0.5rem' }}
                                  >
                                    Edit Link
                                  </button>
                                  {booking.meet_link && (
                                    <button 
                                      onClick={() => handleEmailMeetLink(booking.id)} 
                                      className="btn btn-primary"
                                      style={{ 
                                        padding: '0.2rem 0.6rem', 
                                        fontSize: '0.75rem', 
                                        height: '24px', 
                                        borderRadius: '4px',
                                        marginLeft: '0.8rem',
                                        backgroundColor: 'var(--success)',
                                        borderColor: 'var(--success)',
                                        color: 'white',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        transform: 'none',
                                        boxShadow: 'none'
                                      }}
                                    >
                                      Send Link to Client
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <Calendar size={14} className="text-light" />
                        <span>{formatDateToDMY(booking.booking_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} className="text-light" />
                        <span>{booking.booking_time} ({booking.duration_minutes}m)</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${isBlocked ? 'cancelled' : booking.status}`} style={isBlocked ? { backgroundColor: '#eae3db', color: '#7a6f62' } : {}}>
                        {isBlocked ? 'blocked' : booking.status}
                      </span>
                    </td>
                    <td>
                      {isBlocked ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>-</span>
                      ) : hasConflict ? (
                        <span className="conflict-warning-badge">
                          <AlertTriangle size={12} /> Double-Booked
                        </span>
                      ) : booking.status === 'cancelled' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>-</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isBlocked ? (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                          >
                            Unblock / Make Available
                          </button>
                        ) : booking.status !== 'cancelled' ? (
                          <>
                            <button
                              onClick={() => onBookNextSession({
                                client_name: booking.client_name,
                                client_email: booking.client_email,
                                client_phone: booking.client_phone,
                                psychologist_id: booking.psychologist_id
                              })}
                              className="btn btn-accent"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                              title="Book Next Session"
                            >
                              <Calendar size={14} /> Book Next
                            </button>
                            <button
                              onClick={() => onStartCaseSheet(booking)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                              title="Create Case Sheet"
                            >
                              <FileText size={14} /> Start Case Sheet
                            </button>
                            <button
                              onClick={() => handleOpenReschedule(booking)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                              title="Reschedule"
                            >
                              <Edit2 size={14} /> Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(booking.id)}
                              className="btn btn-danger"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                              title="Cancel Session"
                            >
                              <Ban size={14} /> Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenReschedule(booking)}
                            className="btn btn-accent"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.25rem' }}
                          >
                            <Plus size={14} /> Rebook Slot
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Reschedule Appointment</h3>
              <button className="close-btn" onClick={() => setRescheduleBooking(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveReschedule} className="modal-body">
              {errorMsg && (
                <div className="slot-conflict-alert" style={{ marginBottom: '1rem' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', background: 'rgba(122, 143, 117, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Rescheduling appointment for <strong>{rescheduleBooking.client_name}</strong>.
              </p>

              <div className="form-group">
                <label>New Booking Date</label>
                <CustomDatePicker 
                  value={newDate}
                  onChange={setNewDate}
                  placeholder="Select Date"
                />
              </div>

              <div className="form-group">
                <label>New Booking Time Slot</label>
                <select
                  className="form-control"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setRescheduleBooking(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Rescheduling...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
