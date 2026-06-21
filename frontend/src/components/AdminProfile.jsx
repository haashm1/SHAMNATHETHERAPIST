import React, { useState, useEffect } from 'react';
import { Camera, Save, CheckCircle, AlertCircle } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function AdminProfile({ profile, onProfileUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    specialties: '',
    education: '',
    experience: '',
    contact_email: '',
    contact_phone: '',
    hourly_rate: '',
    address: '',
    meet_link: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [slotsList, setSlotsList] = useState([]);
  const [newSlotTime, setNewSlotTime] = useState('09:00');
  
  const [unavailableDatesList, setUnavailableDatesList] = useState([]);
  const [newUnavailableDate, setNewUnavailableDate] = useState('');

  const backendUrl = '';

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        title: profile.title || '',
        bio: profile.bio || '',
        specialties: profile.specialties || '',
        education: profile.education || '',
        experience: profile.experience || '',
        contact_email: profile.contact_email || '',
        contact_phone: profile.contact_phone || '',
        hourly_rate: profile.hourly_rate || '',
        address: profile.address || '',
        meet_link: profile.meet_link || ''
      });

      if (profile.photo_url) {
        setPhotoPreview(
          (profile.photo_url.startsWith('http') || profile.photo_url.startsWith('data:'))
            ? profile.photo_url
            : `${backendUrl}${profile.photo_url}`
        );
      }

      const rawSlots = profile.available_slots ? profile.available_slots.split(',').filter(Boolean) : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
      setSlotsList(rawSlots);

      const rawDates = profile.unavailable_dates ? profile.unavailable_dates.split(',').filter(Boolean) : [];
      setUnavailableDatesList(rawDates);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      // Append available slots and unavailable dates
      data.append('available_slots', slotsList.join(','));
      data.append('unavailable_dates', unavailableDatesList.join(','));

      if (profile && profile.id) {
        data.append('id', profile.id);
      } else {
        data.append('id', 'new');
      }

      if (photoFile) {
        data.append('photo', photoFile);
      }

      const response = await fetch(`${backendUrl}/api/profile`, {
        method: 'POST',
        body: data
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setSuccessMsg('Profile details updated successfully!');
      onProfileUpdate(result.profile);

      // Scroll to top or clear msg after 4s
      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) {
      setErrorMsg(err.message || 'Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profile-edit-grid">
      <div className="profile-avatar-upload">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Profile Photo</h3>
        <div style={{ position: 'relative' }}>
          <img 
            src={photoPreview || '/uploads/default-doctor.jpg'} 
            alt="Psychologist headshot" 
            className="preview-avatar"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-doctor.jpg';
            }}
          />
          <div className="upload-file-btn" style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>
              <Camera size={18} />
            </button>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center' }}>
          Click the camera icon to upload a headshot. Supported formats: JPEG, PNG, WEBP.
        </p>

        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', background: 'rgba(122, 143, 117, 0.1)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', fontSize: '0.85rem', background: 'rgba(201, 122, 122, 0.1)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="profile-form-fields">
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Professional Information
        </h3>

        <div className="form-row-2col">
          <div className="form-group">
            <label>Full Professional Name</label>
            <input 
              type="text" 
              name="name" 
              className="form-control" 
              value={formData.name} 
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Professional Title</label>
            <input 
              type="text" 
              name="title" 
              className="form-control" 
              value={formData.title} 
              onChange={handleChange}
              placeholder="e.g. Licensed Clinical Therapist"
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Bio / Description</label>
          <textarea 
            name="bio" 
            className="form-control" 
            rows="4" 
            value={formData.bio} 
            onChange={handleChange}
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label>Specialties (comma separated)</label>
          <input 
            type="text" 
            name="specialties" 
            className="form-control" 
            value={formData.specialties} 
            onChange={handleChange}
            placeholder="Anxiety, Depression, Family Therapy"
            required 
          />
        </div>

        <div className="form-row-2col">
          <div className="form-group">
            <label>Education & Qualifications</label>
            <input 
              type="text" 
              name="education" 
              className="form-control" 
              value={formData.education} 
              onChange={handleChange}
              placeholder="Stanford University Ph.D."
              required 
            />
          </div>
          <div className="form-group">
            <label>Experience</label>
            <input 
              type="text" 
              name="experience" 
              className="form-control" 
              value={formData.experience} 
              onChange={handleChange}
              placeholder="10+ Years in Private Practice"
              required 
            />
          </div>
        </div>

        <h3 style={{ fontSize: '1.3rem', margin: '2rem 0 1.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Contact & Clinic Settings
        </h3>

        <div className="form-row-2col">
          <div className="form-group">
            <label>Contact Email</label>
            <input 
              type="email" 
              name="contact_email" 
              className="form-control" 
              value={formData.contact_email} 
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Contact Phone</label>
            <input 
              type="text" 
              name="contact_phone" 
              className="form-control" 
              value={formData.contact_phone} 
              onChange={handleChange}
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Office / Clinic Address</label>
          <input 
            type="text" 
            name="address" 
            className="form-control" 
            value={formData.address} 
            onChange={handleChange}
            required 
          />
        </div>

        <div className="form-group">
          <label>Clinical / Personal Google Meet Link (Permanent Room URL)</label>
          <input 
            type="url" 
            name="meet_link" 
            className="form-control" 
            value={formData.meet_link} 
            onChange={handleChange}
            placeholder="e.g. https://meet.google.com/abc-defg-hij" 
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
            * This link will be used for client sessions if Google Calendar API service account credentials are not present in the backend.
          </p>
        </div>

        {/* Custom Timings Availability Settings */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Availability Slots Timing Configuration
          </h3>
          
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Define Available Session Time Slots (Hourly)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {slotsList.map((slot, index) => (
                <span key={index} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
                  {slot}
                  <button 
                    type="button" 
                    onClick={() => setSlotsList(prev => prev.filter(s => s !== slot))}
                    style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.1rem', display: 'flex', alignItems: 'center' }}
                  >
                    &times;
                  </button>
                </span>
              ))}
              {slotsList.length === 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No custom slots defined. Will fallback to default hours.</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px', marginTop: '0.5rem' }}>
              <input 
                type="time" 
                className="form-control" 
                value={newSlotTime} 
                onChange={(e) => setNewSlotTime(e.target.value)} 
              />
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                onClick={() => {
                  if (newSlotTime && !slotsList.includes(newSlotTime)) {
                    setSlotsList(prev => [...prev, newSlotTime].sort());
                  }
                }}
              >
                + Add Slot
              </button>
            </div>
          </div>
        </div>

        {/* Unavailable Holidays Dates Configuration */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Holidays & Unavailable Dates Configuration
          </h3>
          
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Block Specific Dates (Leave / Clinic Holidays)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {unavailableDatesList.map((date, index) => (
                <span key={index} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(200, 100, 100, 0.08)', border: '1px solid rgba(200, 100, 100, 0.2)', color: '#c53030', borderRadius: '20px' }}>
                  {formatDateToDMY(date)}
                  <button 
                    type="button" 
                    onClick={() => setUnavailableDatesList(prev => prev.filter(d => d !== date))}
                    style={{ background: 'transparent', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0.1rem', display: 'flex', alignItems: 'center' }}
                  >
                    &times;
                  </button>
                </span>
              ))}
              {unavailableDatesList.length === 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No blocked dates set. Therapist is currently available every day.</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px', marginTop: '0.5rem' }}>
              <CustomDatePicker 
                value={newUnavailableDate} 
                onChange={setNewUnavailableDate} 
                placeholder="Select Date"
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                onClick={() => {
                  if (newUnavailableDate && !unavailableDatesList.includes(newUnavailableDate)) {
                    setUnavailableDatesList(prev => [...prev, newUnavailableDate].sort());
                    setNewUnavailableDate('');
                  }
                }}
              >
                + Mark Blocked
              </button>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-accent" 
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
        >
          <Save size={18} /> {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </div>
    </form>
  );
}
