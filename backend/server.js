import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './database.js';
import { sendBookingNotifications, generateGoogleCalendarUrl, generateMockMeetLink, createRealGoogleMeetEvent } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure upload directory exists
let uploadDir = path.join(__dirname, 'uploads');
if (process.env.VERCEL) {
  uploadDir = path.join('/tmp', 'uploads');
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static uploaded files
app.use('/uploads', express.static(uploadDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed!'));
  }
});

// Create default placeholder image if not present
const defaultImagePath = path.join(uploadDir, 'default-doctor.jpg');
if (!fs.existsSync(defaultImagePath)) {
  // We'll write a simple 1x1 base64 transparent pixel as fallback or generate an image shortly
  const base64Pixel = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  fs.writeFileSync(defaultImagePath, Buffer.from(base64Pixel, 'base64'));
}

// ==========================================
// 1. PSYCHOLOGIST PROFILE ENDPOINTS
// ==========================================

// Get Psychologist Profiles (individual or list)
app.get('/api/profile', (req, res) => {
  const { id } = req.query;
  if (id) {
    db.get('SELECT * FROM profile WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error fetching profile.' });
      }
      res.json(row);
    });
  } else {
    db.all('SELECT * FROM profile', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error fetching profiles.' });
      }
      res.json(rows);
    });
  }
});

// Update or Create Psychologist Profile
app.post('/api/profile', upload.single('photo'), (req, res) => {
  const {
    id,
    name,
    title,
    bio,
    specialties,
    education,
    experience,
    contact_email,
    contact_phone,
    address,
    meet_link,
    available_slots,
    unavailable_dates
  } = req.body;

  if (id && id !== 'new') {
    // Update existing profile
    let query = `
      UPDATE profile
      SET name = ?, title = ?, bio = ?, specialties = ?, education = ?, experience = ?,
          contact_email = ?, contact_phone = ?, address = ?, meet_link = ?,
          available_slots = ?, unavailable_dates = ?
    `;
    const params = [
      name,
      title,
      bio,
      specialties,
      education,
      experience,
      contact_email,
      contact_phone,
      address,
      meet_link,
      available_slots || '',
      unavailable_dates || ''
    ];

    if (req.file) {
      query += `, photo_url = ?`;
      params.push(`/uploads/${req.file.filename}`);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    db.run(query, params, function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error updating profile.' });
      }
      
      db.get('SELECT * FROM profile WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error fetching updated profile.' });
        }
        res.json({ message: 'Profile updated successfully!', profile: row });
      });
    });
  } else {
    // Create new profile
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-doctor.jpg';
    const query = `
      INSERT INTO profile (name, title, bio, specialties, education, experience, photo_url, contact_email, contact_phone, address, meet_link, available_slots, unavailable_dates)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      name,
      title,
      bio,
      specialties,
      education,
      experience,
      photoUrl,
      contact_email,
      contact_phone,
      address,
      meet_link,
      available_slots || '',
      unavailable_dates || ''
    ];

    db.run(query, params, function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error creating profile.' });
      }
      const newId = this.lastID;
      db.get('SELECT * FROM profile WHERE id = ?', [newId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error fetching new profile.' });
        }
        res.json({ message: 'Profile created successfully!', profile: row });
      });
    });
  }
});

// ==========================================
// 2. BOOKINGS & SLOT CONFLICTS ENDPOINTS
// ==========================================

// Get All Bookings
app.get('/api/bookings', (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY booking_date DESC, booking_time ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching bookings.' });
    }
    res.json(rows);
  });
});

// Create Booking (with Conflict Checking)
app.post('/api/bookings', (req, res) => {
  const { client_name, client_email, client_phone, booking_date, booking_time, duration_minutes, notes, meet_link, psychologist_id } = req.body;

  if (!client_name || !client_email || !client_phone || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const activePsyId = psychologist_id ? parseInt(psychologist_id, 10) : 1;

  // Conflict detection: Is there a booking at the same date, time, and therapist that is not cancelled?
  const checkQuery = `
    SELECT * FROM bookings
    WHERE booking_date = ?
      AND booking_time = ?
      AND status != 'cancelled'
      AND psychologist_id = ?
  `;

  db.get(checkQuery, [booking_date, booking_time, activePsyId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error validation.' });
    }

    if (row) {
      return res.status(400).json({
        error: 'Conflict Detected',
        message: `The slot on ${booking_date} at ${booking_time} is already booked for this therapist. Please select a different time slot.`
      });
    }

    // Get therapist details
    db.get('SELECT * FROM profile WHERE id = ?', [activePsyId], async (err, therapist) => {
      // Meet link starts as null or whatever is explicitly provided (no auto-generation)
      const activeMeetLink = meet_link || null;

      // No conflict, proceed to insert
      const insertQuery = `
        INSERT INTO bookings (client_name, client_email, client_phone, booking_date, booking_time, duration_minutes, notes, meet_link, psychologist_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        client_name,
        client_email,
        client_phone,
        booking_date,
        booking_time,
        duration_minutes || 50,
        notes || '',
        activeMeetLink,
        activePsyId
      ];

      db.run(insertQuery, params, async function (err) {
        if (err) {
          console.error("Database error creating booking:", err);
          return res.status(500).json({ error: 'Database error creating booking.' });
        }
        
        const newBooking = {
          id: this.lastID,
          client_name,
          client_email,
          client_phone,
          booking_date,
          booking_time,
          duration_minutes: duration_minutes || 50,
          notes: notes || '',
          status: 'booked',
          meet_link: activeMeetLink,
          psychologist_id: activePsyId
        };

        // Dispatch mail, mobile SMS, and calendar notifications
        try {
          await sendBookingNotifications(newBooking, true);
        } catch (err) {
          console.error("Error dispatching notifications:", err);
        }

        const gcalUrl = generateGoogleCalendarUrl(newBooking);

        res.status(201).json({
          message: 'Booking created successfully!',
          bookingId: this.lastID,
          booking: newBooking,
          googleCalendarUrl: gcalUrl
        });
      });
    });
  });
});

// Update Booking Status or Reschedule (with Conflict checking for rescheduling)
app.patch('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { status, booking_date, booking_time, notes, meet_link, psychologist_id } = req.body;

  // Fetch current booking first
  db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, currentBooking) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching booking.' });
    }
    if (!currentBooking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const newDate = booking_date || currentBooking.booking_date;
    const newTime = booking_time || currentBooking.booking_time;
    const newStatus = status || currentBooking.status;
    const newNotes = notes !== undefined ? notes : currentBooking.notes;
    const newPsyId = psychologist_id !== undefined ? parseInt(psychologist_id, 10) : currentBooking.psychologist_id;

    // If rescheduling to a DIFFERENT date/time, or changing status/therapist, check conflicts
    const timeChanged = newDate !== currentBooking.booking_date || newTime !== currentBooking.booking_time;
    const therapistChanged = newPsyId !== currentBooking.psychologist_id;
    const statusReopened = currentBooking.status === 'cancelled' && newStatus !== 'cancelled';

    // Get therapist details if needed (no calendar API auto-generation)
    db.get('SELECT * FROM profile WHERE id = ?', [newPsyId], async (err, therapist) => {
      if (err) {
        return res.status(500).json({ error: 'Database error fetching therapist details.' });
      }

      // Meet link is kept as-is unless explicitly updated in req.body
      const activeMeetLink = meet_link !== undefined ? meet_link : currentBooking.meet_link;

      if ((timeChanged || therapistChanged || statusReopened) && newStatus !== 'cancelled') {
        const checkQuery = `
          SELECT * FROM bookings
          WHERE booking_date = ?
            AND booking_time = ?
            AND status != 'cancelled'
            AND psychologist_id = ?
            AND id != ?
        `;
        db.get(checkQuery, [newDate, newTime, newPsyId, id], (err, conflictRow) => {
          if (err) {
            return res.status(500).json({ error: 'Database error validation.' });
          }
          if (conflictRow) {
            return res.status(400).json({
              error: 'Conflict Detected',
              message: `Cannot reschedule. The slot on ${newDate} at ${newTime} is already booked for this therapist by ${conflictRow.client_name}.`
            });
          }
          performUpdate(activeMeetLink);
        });
      } else {
        performUpdate(activeMeetLink);
      }
    });

    function performUpdate(finalMeetLink) {
      const updateQuery = `
        UPDATE bookings
        SET status = ?, booking_date = ?, booking_time = ?, notes = ?, meet_link = ?, psychologist_id = ?
        WHERE id = ?
      `;
      db.run(updateQuery, [newStatus, newDate, newTime, newNotes, finalMeetLink, newPsyId, id], async function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error updating booking.' });
        }
        
        // Trigger notification only on reschedule (date/time change) or therapist change, NOT when only meet_link changes
        const shouldNotify = (timeChanged || therapistChanged);

        if (shouldNotify && newStatus !== 'cancelled') {
          const updatedBooking = {
            id,
            client_name: currentBooking.client_name,
            client_email: currentBooking.client_email,
            client_phone: currentBooking.client_phone,
            booking_date: newDate,
            booking_time: newTime,
            notes: newNotes,
            status: newStatus,
            meet_link: finalMeetLink,
            psychologist_id: newPsyId
          };
          try {
            await sendBookingNotifications(updatedBooking);
          } catch (err) {
            console.error("Update notification error:", err);
          }
        }

        res.json({ 
          message: 'Booking updated successfully!', 
          meet_link: finalMeetLink,
          emailed: !!(shouldNotify && newStatus !== 'cancelled')
        });
      });
    }
  });
});

// ==========================================
// 3. CASE SHEETS ENDPOINTS
// ==========================================

// Get All Case Sheets
app.get('/api/cases', (req, res) => {
  db.all('SELECT * FROM case_sheets ORDER BY case_date DESC, created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching case sheets.' });
    }
    res.json(rows);
  });
});

// Get Single Case Sheet
app.get('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM case_sheets WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching case sheet.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Case sheet not found.' });
    }
    res.json(row);
  });
});

// Create Case Sheet
app.post('/api/cases', (req, res) => {
  const { booking_id, client_name, case_date, title, document_content } = req.body;

  if (!client_name || !case_date || !title) {
    return res.status(400).json({ error: 'Missing required fields: client_name, case_date, title.' });
  }

  const query = `
    INSERT INTO case_sheets (booking_id, client_name, case_date, title, document_content)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [booking_id || null, client_name, case_date, title, document_content || ''];

  db.run(query, params, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error creating case sheet.' });
    }
    res.status(201).json({
      message: 'Case sheet created successfully!',
      caseId: this.lastID,
      caseSheet: {
        id: this.lastID,
        booking_id,
        client_name,
        case_date,
        title,
        document_content
      }
    });
  });
});

// Update Case Sheet
app.put('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  const { title, case_date, document_content } = req.body;

  const query = `
    UPDATE case_sheets
    SET title = ?, case_date = ?, document_content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [title, case_date, document_content, id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error updating case sheet.' });
    }
    res.json({ message: 'Case sheet updated successfully!' });
  });
});

// Delete Case Sheet
app.delete('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM case_sheets WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error deleting case sheet.' });
    }
    res.json({ message: 'Case sheet deleted successfully!' });
  });
});

// Send email with meet link manually
app.post('/api/bookings/:id/email-link', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching booking.' });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (!booking.meet_link) {
      return res.status(400).json({ error: 'Cannot send email: No Google Meet link is configured for this booking.' });
    }

    sendBookingNotifications(booking, false, true)
      .then(() => {
        res.json({ message: 'Meeting link successfully emailed to client and therapist!' });
      })
      .catch(error => {
        console.error("Manual notification error:", error);
        res.status(500).json({ error: 'Failed to send email notification.' });
      });
  });
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Psychologist platform backend running at http://localhost:${PORT}`);
  });
}

export default app;
