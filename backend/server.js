import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  checkBookingConflict,
  getCaseSheets,
  getCaseSheet,
  createCaseSheet,
  updateCaseSheet,
  deleteCaseSheet,
  deleteClientRecords
} from './database.js';
import { firebaseStatus } from './firebase.js';
import { sendBookingNotifications, generateGoogleCalendarUrl, generateMockMeetLink, createRealGoogleMeetEvent } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Security Headers (Helmet) ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow embedding of images/assets
}));

// ── CORS — only allow the real frontend origin ───────────────────
const ALLOWED_ORIGINS = [
  'https://shamnathetherapist.in',
  'https://www.shamnathetherapist.in',
  'https://shamnathetherapist.com',
  'https://www.shamnathetherapist.com',
  'http://localhost:5173',
  'http://localhost:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman in dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Body size limits (reduced from 50 MB → 5 MB) ────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ── Global rate limiter: 100 req per 15 min per IP ───────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', globalLimiter);

// ── Booking creation limiter: 10 req per 15 min per IP ──────────
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts. Please slow down and try again later.' }
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max upload
  fileFilter: (req, file, cb) => {
    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ALLOWED_EXT = /\.(jpeg|jpg|png|webp)$/i;
    const extOk = ALLOWED_EXT.test(path.extname(file.originalname));
    const mimeOk = ALLOWED_MIME.includes(file.mimetype);
    if (mimeOk && extOk) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) under 5 MB are allowed!'));
  }
});

// Copy deployed static uploads (like default-doctor.jpg) to the ephemeral /tmp/uploads on Vercel
const deployedUploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(deployedUploadsDir)) {
  try {
    const files = fs.readdirSync(deployedUploadsDir);
    files.forEach(file => {
      const srcPath = path.join(deployedUploadsDir, file);
      const destPath = path.join(uploadDir, file);
      if (fs.statSync(srcPath).isFile() && !fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied deployed asset ${file} to /tmp/uploads`);
      }
    });
  } catch (err) {
    console.error("Failed to copy deployed static uploads to /tmp/uploads:", err);
  }
}

// Fallback: Create default placeholder image if not present
const defaultImagePath = path.join(uploadDir, 'default-doctor.jpg');
if (!fs.existsSync(defaultImagePath)) {
  const base64Pixel = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  fs.writeFileSync(defaultImagePath, Buffer.from(base64Pixel, 'base64'));
}

// ==========================================
// 1. PSYCHOLOGIST PROFILE ENDPOINTS
// ==========================================

// Get Psychologist Profiles (individual or list)
app.get('/api/profile', async (req, res) => {
  const { id } = req.query;
  try {
    if (id) {
      const row = await getProfile(id);
      res.json(row);
    } else {
      const rows = await getProfiles();
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching profile(s).' });
  }
});

// Update or Create Psychologist Profile
app.post('/api/profile', upload.single('photo'), async (req, res) => {
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
    contact_whatsapp,
    contact_linkedin,
    address,
    meet_link,
    available_slots,
    unavailable_dates,
    total_consultations,
    cases_resolved,
    client_satisfaction
  } = req.body;

  try {
    const profileData = {
      name,
      title,
      bio,
      specialties,
      education,
      experience,
      contact_email,
      contact_phone,
      contact_whatsapp: contact_whatsapp || '',
      contact_linkedin: contact_linkedin || '',
      address,
      meet_link,
      available_slots: available_slots || '',
      unavailable_dates: unavailable_dates || '',
      total_consultations: total_consultations !== undefined ? total_consultations : '8,000+',
      cases_resolved: cases_resolved !== undefined ? cases_resolved : '8,000+',
      client_satisfaction: client_satisfaction !== undefined ? client_satisfaction : '100%'
    };

    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const mimeType = req.file.mimetype;
        const base64Data = fileBuffer.toString('base64');
        profileData.photo_url = `data:${mimeType};base64,${base64Data}`;
        
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.warn("Failed to delete temp uploaded file:", unlinkErr.message);
        }
      } catch (readErr) {
        console.error("Failed to read uploaded file for base64 conversion:", readErr);
        profileData.photo_url = `/uploads/${req.file.filename}`;
      }
    }

    if (id && id !== 'new') {
      // Update existing profile
      const updatedProfile = await updateProfile(id, profileData);
      res.json({ message: 'Profile updated successfully!', profile: updatedProfile });
    } else {
      // Create new profile
      if (!profileData.photo_url) {
        profileData.photo_url = '/uploads/default-doctor.jpg';
      }
      const newProfile = await createProfile(profileData);
      res.json({ message: 'Profile created successfully!', profile: newProfile });
    }
  } catch (err) {
    console.error("Error creating/updating profile:", err);
    res.status(500).json({ error: 'Database error saving profile.' });
  }
});

// ==========================================
// 2. BOOKINGS & SLOT CONFLICTS ENDPOINTS
// ==========================================

// Get All Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const rows = await getBookings();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching bookings.' });
  }
});

// Create Booking (with Conflict Checking)
app.post('/api/bookings', bookingLimiter, async (req, res) => {
  const { client_name, client_email, client_phone, booking_date, booking_time, duration_minutes, notes, meet_link, psychologist_id } = req.body;

  // Input validation
  if (!client_name || !client_email || !client_phone || !booking_date || !booking_time || !notes) {
    return res.status(400).json({ error: 'Missing required booking fields. Please provide all details, including notes.' });
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(client_email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(booking_date)) {
    return res.status(400).json({ error: 'Invalid booking_date format. Use YYYY-MM-DD.' });
  }
  if (typeof client_name !== 'string' || client_name.trim().length < 2 || client_name.trim().length > 100) {
    return res.status(400).json({ error: 'client_name must be between 2 and 100 characters.' });
  }

  const activePsyId = psychologist_id ? parseInt(psychologist_id, 10) : 1;

  try {
    // Conflict detection: Is there a booking at the same date, time, and therapist that is not cancelled?
    const conflict = await checkBookingConflict(booking_date, booking_time, activePsyId);

    if (conflict) {
      return res.status(400).json({
        error: 'Conflict Detected',
        message: `The slot on ${booking_date} at ${booking_time} is already booked for this therapist. Please select a different time slot.`
      });
    }

    // Get therapist details
    const therapist = await getProfile(activePsyId);

    // Meet link starts as null or whatever is explicitly provided (no auto-generation)
    const activeMeetLink = meet_link || null;

    // No conflict, proceed to insert
    const newBooking = await createBooking({
      client_name,
      client_email,
      client_phone,
      booking_date,
      booking_time,
      duration_minutes,
      notes,
      meet_link: activeMeetLink,
      psychologist_id: activePsyId
    });

    // Dispatch mail, mobile SMS, and calendar notifications
    try {
      await sendBookingNotifications(newBooking, true);
    } catch (err) {
      console.error("Error dispatching notifications:", err);
    }

    const gcalUrl = generateGoogleCalendarUrl(newBooking);

    res.status(201).json({
      message: 'Booking created successfully!',
      bookingId: newBooking.id,
      booking: newBooking,
      googleCalendarUrl: gcalUrl
    });
  } catch (err) {
    console.error("Database error creating booking:", err);
    res.status(500).json({ error: 'Database error creating booking.' });
  }
});

// Update Booking Status or Reschedule (with Conflict checking for rescheduling)
app.patch('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status, booking_date, booking_time, notes, meet_link, psychologist_id } = req.body;

  try {
    // Fetch current booking first
    const currentBooking = await getBooking(id);
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

    // Get therapist details if needed
    const therapist = await getProfile(newPsyId);

    // Meet link is kept as-is unless explicitly updated in req.body
    const activeMeetLink = meet_link !== undefined ? meet_link : currentBooking.meet_link;

    if ((timeChanged || therapistChanged || statusReopened) && newStatus !== 'cancelled') {
      const conflict = await checkBookingConflict(newDate, newTime, newPsyId, id);
      if (conflict) {
        return res.status(400).json({
          error: 'Conflict Detected',
          message: `Cannot reschedule. The slot on ${newDate} at ${newTime} is already booked for this therapist by ${conflict.client_name}.`
        });
      }
    }

    // Perform update
    await updateBooking(id, {
      status: newStatus,
      booking_date: newDate,
      booking_time: newTime,
      notes: newNotes,
      meet_link: activeMeetLink,
      psychologist_id: newPsyId
    });

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
        meet_link: activeMeetLink,
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
      meet_link: activeMeetLink,
      emailed: !!(shouldNotify && newStatus !== 'cancelled')
    });
  } catch (err) {
    console.error("Error updating booking:", err);
    res.status(500).json({ error: 'Database error updating booking.' });
  }
});

// ==========================================
// 3. CASE SHEETS ENDPOINTS
// ==========================================

// Get All Case Sheets
app.get('/api/cases', async (req, res) => {
  try {
    const rows = await getCaseSheets();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching case sheets.' });
  }
});

// Get Single Case Sheet
app.get('/api/cases/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const row = await getCaseSheet(id);
    if (!row) {
      return res.status(404).json({ error: 'Case sheet not found.' });
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching case sheet.' });
  }
});

// Create Case Sheet
app.post('/api/cases', async (req, res) => {
  const { booking_id, client_name, case_date, title, document_content } = req.body;

  if (!client_name || !case_date || !title) {
    return res.status(400).json({ error: 'Missing required fields: client_name, case_date, title.' });
  }

  try {
    const newCaseSheet = await createCaseSheet({
      booking_id,
      client_name,
      case_date,
      title,
      document_content
    });
    
    res.status(201).json({
      message: 'Case sheet created successfully!',
      caseId: newCaseSheet.id,
      caseSheet: newCaseSheet
    });
  } catch (err) {
    console.error("Error creating case sheet:", err);
    res.status(500).json({ error: 'Database error creating case sheet.' });
  }
});

// Update Case Sheet
app.put('/api/cases/:id', async (req, res) => {
  const { id } = req.params;
  const { title, case_date, document_content } = req.body;

  try {
    await updateCaseSheet(id, { title, case_date, document_content });
    res.json({ message: 'Case sheet updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating case sheet.' });
  }
});

// Delete Case Sheet
app.delete('/api/cases/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteCaseSheet(id);
    res.json({ message: 'Case sheet deleted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error deleting case sheet.' });
  }
});

// Delete Client Records (Bookings and Case Sheets)
app.delete('/api/clients', async (req, res) => {
  const { email, name } = req.query;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name query parameter.' });
  }
  
  try {
    await deleteClientRecords(email, name);
    res.json({ message: 'Client records successfully deleted.' });
  } catch (err) {
    console.error("Error deleting client records:", err);
    res.status(500).json({ error: 'Failed to delete client records.' });
  }
});

// Send email with meet link manually
app.post('/api/bookings/:id/email-link', async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await getBooking(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (!booking.meet_link) {
      return res.status(400).json({ error: 'Cannot send email: No Google Meet link is configured for this booking.' });
    }

    await sendBookingNotifications(booking, false, true);
    res.json({ message: 'Meeting link successfully emailed to client and therapist!' });
  } catch (error) {
    console.error("Manual notification error:", error);
    res.status(500).json({ error: 'Failed to send email notification.' });
  }
});

// Diagnostics endpoint to check Firebase setup
app.get('/api/status', (req, res) => {
  res.json(firebaseStatus);
});

// ── Global error handler — never leak stack traces to clients ───
app.use((err, req, res, _next) => {
  if (IS_PROD) {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: 'An unexpected error occurred.' });
  } else {
    res.status(err.status || 500).json({ error: err.message, stack: err.stack });
  }
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Psychologist platform backend running at http://localhost:${PORT}`);
  });
}

export default app;
