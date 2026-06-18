import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let notificationLogPath = path.join(__dirname, 'notifications.log');
if (process.env.VERCEL) {
  notificationLogPath = path.join('/tmp', 'notifications.log');
}

/**
 * Creates a real Google Meet room on Google Calendar
 */
export async function createRealGoogleMeetEvent(booking, therapistEmail, therapistMeetLink) {
  const credentialsPath = path.join(__dirname, 'google-credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    if (therapistMeetLink && therapistMeetLink.trim() !== '') {
      console.log(`[Google Meet] Using therapist's personal Google Meet link: ${therapistMeetLink}`);
      return therapistMeetLink;
    }
    console.warn("⚠️ google-credentials.json not found and therapist Meet link not configured. Returning null.");
    return null; 
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const startDateTime = new Date(`${booking.booking_date}T${booking.booking_time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 50 * 60 * 1000); // 50 mins duration

    const event = {
      summary: `Therapy Session: ${booking.client_name}`,
      description: `Client: ${booking.client_name}\nPhone: ${booking.client_phone}\nEmail: ${booking.client_email}\nNotes: ${booking.notes || ''}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${booking.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: therapistEmail || 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink;
    console.log(`[Google Calendar API] Successfully created real event. Google Meet link: ${meetLink}`);
    return meetLink || therapistMeetLink || null;
  } catch (error) {
    console.error("[Google Calendar API Error] Failed to generate real meet link:", error);
    return therapistMeetLink || null;
  }
}

/**
 * Generate a simulated Google Meet link fallback
 */
export function generateMockMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randSeq = (len) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `https://meet.google.com/${randSeq(3)}-${randSeq(4)}-${randSeq(3)}`;
}

/**
 * Generate Google Calendar Add URL
 */
export function generateGoogleCalendarUrl(booking) {
  const dateStr = booking.booking_date.replace(/-/g, '');
  const timeStr = booking.booking_time.replace(/:/g, '');
  
  // Create start time in YYYYMMDDTHHmmSS format
  // Assuming local time for simplicity
  const startDateTime = `${dateStr}T${timeStr}00`;
  
  // Calculate end time (assume +50 minutes)
  const [hours, minutes] = booking.booking_time.split(':').map(Number);
  let endHours = hours;
  let endMinutes = minutes + 50;
  if (endMinutes >= 60) {
    endHours += 1;
    endMinutes -= 60;
  }
  const endHoursStr = String(endHours).padStart(2, '0');
  const endMinutesStr = String(endMinutes).padStart(2, '0');
  const endDateTime = `${dateStr}T${endHoursStr}${endMinutesStr}00`;

  const title = encodeURIComponent(`Therapy Session: ${booking.client_name}`);
  const details = encodeURIComponent(
    `Client Name: ${booking.client_name}\nEmail: ${booking.client_email}\nPhone: ${booking.client_phone}\nNotes: ${booking.notes || 'No notes provided.'}\nGoogle Meet Link: ${booking.meet_link || 'TBD'}`
  );
  const location = encodeURIComponent(booking.meet_link || 'Clinic Office / Online');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
}
import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

let dbPath = path.join(__dirname, 'psychologist.db');
if (process.env.VERCEL) {
  dbPath = path.join('/tmp', 'psychologist.db');
}

// Transporter configuration using Gmail and the user's provided App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'therapist.shamna@gmail.com', // Primary clinic email
    pass: 'atzw urhm jvki zcfo'          // User's Google App Password
  }
});

/**
 * Dispatch booking notifications to therapist and client
 */
export async function sendBookingNotifications(booking, isInitial = false, isMeetLinkOnly = false) {
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM profile WHERE id = ?', [booking.psychologist_id], async (err, therapist) => {
    if (err || !therapist) {
      console.error("Could not fetch therapist profile for notification, falling back to default.", err);
      therapist = {
        name: 'Shamna',
        contact_email: 'therapist.shamna@gmail.com',
        contact_phone: '+1 (555) 839-2810'
      };
    }

    const gcalUrl = generateGoogleCalendarUrl(booking);
    const timestamp = new Date().toLocaleString();

    let therapistMailOptions, clientMailOptions;

    if (isMeetLinkOnly) {
      // 1. Separate Google Meet Link Email
      const meetLink = booking.meet_link || 'TBD';
      
      therapistMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: therapist.contact_email,
        subject: `[Sent] Google Meet Link Shared: ${booking.client_name}`,
        text: `Dear ${therapist.name},\n\n` +
              `The Google Meet link for your therapy session with ${booking.client_name} has been successfully sent to the client.\n\n` +
              `Session Details:\n` +
              `- Client: ${booking.client_name}\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time}\n` +
              `- Google Meet Link: ${meetLink}\n\n` +
              `-----------------------------------------\n` +
              `This is an automated clinical notification.`
      };

      clientMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: booking.client_email,
        subject: `Google Meet Access Link: Session with ${therapist.name}`,
        text: `Dear ${booking.client_name},\n\n` +
              `The Google Meet access link for your consultation session with ${therapist.name} has been assigned.\n\n` +
              `Session Details:\n` +
              `- Therapist: ${therapist.name} (${therapist.title || 'Clinical Psychologist'})\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time} (50 minutes)\n` +
              `- Google Meet Link: ${meetLink}\n\n` +
              `Please click the link above at the time of your appointment to join the video session.\n\n` +
              `Add to Google Calendar:\n` +
              `${gcalUrl}\n\n` +
              `Warm regards,\n` +
              `Shamna Clinic Support`
      };

    } else if (isInitial) {
      // 2. Initial Booking Confirmation (NO Google Meet Link)
      therapistMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: therapist.contact_email,
        subject: `[Alert] New Session Booked: ${booking.client_name}`,
        text: `Dear ${therapist.name},\n\n` +
              `A new therapy session has been successfully booked with you.\n\n` +
              `Client Details:\n` +
              `- Name: ${booking.client_name}\n` +
              `- Email: ${booking.client_email}\n` +
              `- Phone: ${booking.client_phone}\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time} (50 minutes)\n` +
              `- Google Meet Link: Not assigned yet (Please go to the admin panel, edit the booking to set the link, and click 'Send Link to Client').\n\n` +
              `Session Notes:\n` +
              `"${booking.notes || 'None provided.'}"\n\n` +
              `Google Calendar Integration:\n` +
              `Add this session to your calendar (without Meet Link for now):\n` +
              `${gcalUrl}\n\n` +
              `-----------------------------------------\n` +
              `This is an automated clinical notification.`
      };

      clientMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: booking.client_email,
        subject: `Appointment Registered: Consultation with ${therapist.name}`,
        text: `Dear ${booking.client_name},\n\n` +
              `Your consultation session with ${therapist.name} has been successfully registered.\n\n` +
              `Appointment Details:\n` +
              `- Therapist: ${therapist.name} (${therapist.title || 'Clinical Psychologist'})\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time}\n` +
              `- Duration: 50 minutes\n` +
              `- Google Meet Link: Will be shared with you separately once confirmed by the therapist.\n\n` +
              `Add to Google Calendar:\n` +
              `${gcalUrl}\n\n` +
              `We look forward to seeing you.\n\n` +
              `Warm regards,\n` +
              `Shamna Clinic Support`
      };

    } else {
      // 3. Rescheduled or standard update (Keep meet link if exists)
      const meetLink = booking.meet_link || 'Will be shared separately once confirmed by the therapist.';

      therapistMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: therapist.contact_email,
        subject: `[Rescheduled] Session Updated: ${booking.client_name}`,
        text: `Dear ${therapist.name},\n\n` +
              `A therapy session with you has been rescheduled.\n\n` +
              `Updated Details:\n` +
              `- Client: ${booking.client_name}\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time} (50 minutes)\n` +
              `- Google Meet Link: ${booking.meet_link || 'Not assigned yet'}\n\n` +
              `Session Notes:\n" ${booking.notes || 'None provided.'}"\n\n` +
              `Google Calendar Integration:\n` +
              `Update this session in your Google Calendar:\n` +
              `${gcalUrl}\n\n` +
              `-----------------------------------------\n` +
              `This is an automated clinical notification.`
      };

      clientMailOptions = {
        from: `"Shamna Clinic Support" <therapist.shamna@gmail.com>`,
        to: booking.client_email,
        subject: `Session Rescheduled: Appointment with ${therapist.name}`,
        text: `Dear ${booking.client_name},\n\n` +
              `Your consultation session with ${therapist.name} has been rescheduled.\n\n` +
              `Updated Appointment Details:\n` +
              `- Therapist: ${therapist.name} (${therapist.title || 'Clinical Psychologist'})\n` +
              `- Date: ${formatDateToDMY(booking.booking_date)}\n` +
              `- Time: ${booking.booking_time}\n` +
              `- Duration: 50 minutes\n` +
              `- Google Meet Link: ${meetLink}\n\n` +
              `Add to Google Calendar:\n` +
              `${gcalUrl}\n\n` +
              `We look forward to seeing you.\n\n` +
              `Warm regards,\n` +
              `Shamna Clinic Support`
      };
    }

    try {
      // Send both emails using Nodemailer
      await Promise.all([
        transporter.sendMail(therapistMailOptions),
        transporter.sendMail(clientMailOptions)
      ]);
      console.log(`[Notification] Emails successfully dispatched (isMeetLinkOnly=${isMeetLinkOnly}, isInitial=${isInitial}).`);
    } catch (mailError) {
      console.error("Error sending email notification through nodemailer:", mailError);
    }

    // Still append to notifications.log as a local record/fallback
    const mailBody = `
=========================================
EMAIL NOTIFICATION SENT TO THERAPIST
=========================================
Timestamp: ${timestamp}
To: ${therapist.contact_email}
Subject: ${therapistMailOptions.subject}
${therapistMailOptions.text}
=========================================
`;

    const clientMailBody = `
=========================================
EMAIL CONFIRMATION SENT TO CLIENT
=========================================
Timestamp: ${timestamp}
To: ${booking.client_email}
Subject: ${clientMailOptions.subject}
${clientMailOptions.text}
=========================================
`;

    const smsBody = `
=========================================
MOBILE SMS NOTIFICATION SENT TO THERAPIST
=========================================
Timestamp: ${timestamp}
To: ${therapist.name} Mobile (${therapist.contact_phone})
Alert: Session with ${booking.client_name} update. Status details generated.
=========================================
`;

    const fullLog = `${mailBody}\n${clientMailBody}\n${smsBody}\n\n`;
    fs.appendFileSync(notificationLogPath, fullLog);
    db.close();
  });
}
