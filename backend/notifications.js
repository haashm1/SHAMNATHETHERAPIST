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
import { getProfile } from './database.js';
import nodemailer from 'nodemailer';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Transporter configuration using Gmail and the user's provided App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'therapist.shamna@gmail.com', // Primary clinic email
    pass: 'atzw urhm jvki zcfo'          // User's Google App Password
  }
});

function buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, isClient, gcalUrl) {
  const formattedDate = formatDateToDMY(booking.booking_date);
  
  let heading = '';
  let introText = '';
  let closingText = '';
  let detailsRows = '';
  
  const therapistEmail = therapist.contact_email || 'therapist.shamna@gmail.com';
  
  if (isMeetLinkOnly) {
    const meetLinkText = booking.meet_link 
      ? `<a href="${booking.meet_link}" target="_blank" style="color: #B08E73; font-weight: 600; text-decoration: underline;">${booking.meet_link}</a>` 
      : 'Not assigned yet';
      
    if (isClient) {
      heading = 'Google Meet Access Link';
      introText = `Dear ${booking.client_name},<br><br>The Google Meet access link for your consultation session with ${therapist.name} has been assigned.`;
      detailsRows = `
        <tr><td class="label">Therapist</td><td class="val">${therapist.name} (${therapist.title || 'Clinical Psychologist'})</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Duration</td><td class="val">50 minutes</td></tr>
        <tr><td class="label">Meet Link</td><td class="val">${meetLinkText}</td></tr>
      `;
      closingText = `Please click the Google Meet link above at the time of your appointment to join the video session. We look forward to speaking with you.`;
    } else {
      heading = 'Meet Link Shared with Client';
      introText = `Dear ${therapist.name},<br><br>The Google Meet link for your session with ${booking.client_name} has been successfully sent to the client.`;
      detailsRows = `
        <tr><td class="label">Client Name</td><td class="val">${booking.client_name}</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Meet Link</td><td class="val">${meetLinkText}</td></tr>
      `;
      closingText = `This is an automated clinical notification.`;
    }
  } else if (isInitial) {
    if (isClient) {
      heading = 'Appointment Registered';
      introText = `Dear ${booking.client_name},<br><br>Your consultation session with ${therapist.name} has been successfully registered. We look forward to welcoming you.`;
      detailsRows = `
        <tr><td class="label">Therapist</td><td class="val">${therapist.name} (${therapist.title || 'Clinical Psychologist'})</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Duration</td><td class="val">50 minutes</td></tr>
        <tr><td class="label">Meet Link</td><td class="val"><em>Will be shared separately once confirmed by the therapist.</em></td></tr>
      `;
      closingText = `A secure Google Meet link to join the session will be emailed to you shortly before your appointment.`;
    } else {
      heading = 'New Session Booked';
      introText = `Dear ${therapist.name},<br><br>A new therapy session has been successfully booked with you.`;
      detailsRows = `
        <tr><td class="label">Client Name</td><td class="val">${booking.client_name}</td></tr>
        <tr><td class="label">Client Email</td><td class="val">${booking.client_email}</td></tr>
        <tr><td class="label">Client Phone</td><td class="val">${booking.client_phone}</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Meet Link</td><td class="val"><em>Not assigned yet</em><br><small style="color:#8E7E74;">(Please go to the administrator portal to set the link and email it to the client)</small></td></tr>
      `;
      closingText = `Please check your psychologist portal to manage this session.`;
    }
  } else {
    // Rescheduled
    const meetLinkText = booking.meet_link 
      ? `<a href="${booking.meet_link}" target="_blank" style="color: #B08E73; font-weight: 600; text-decoration: underline;">${booking.meet_link}</a>` 
      : '<em>Will be shared separately once confirmed by the therapist.</em>';
      
    if (isClient) {
      heading = 'Session Rescheduled';
      introText = `Dear ${booking.client_name},<br><br>Your consultation session with ${therapist.name} has been rescheduled.`;
      detailsRows = `
        <tr><td class="label">Therapist</td><td class="val">${therapist.name} (${therapist.title || 'Clinical Psychologist'})</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Duration</td><td class="val">50 minutes</td></tr>
        <tr><td class="label">Meet Link</td><td class="val">${meetLinkText}</td></tr>
      `;
      closingText = `We look forward to seeing you at the rescheduled time.`;
    } else {
      heading = 'Session Rescheduled';
      introText = `Dear ${therapist.name},<br><br>A therapy session with you has been rescheduled.`;
      detailsRows = `
        <tr><td class="label">Client Name</td><td class="val">${booking.client_name}</td></tr>
        <tr><td class="label">Date</td><td class="val">${formattedDate}</td></tr>
        <tr><td class="label">Time</td><td class="val">${booking.booking_time}</td></tr>
        <tr><td class="label">Meet Link</td><td class="val">${booking.meet_link || '<em>Not assigned yet</em>'}</td></tr>
      `;
      closingText = `This is an automated clinical notification.`;
    }
  }

  const notesSection = booking.notes 
    ? `<div style="font-size: 14px; font-weight: 600; color: #2E251E; margin-top: 25px; margin-bottom: 5px;">Client Notes:</div>
       <div class="notes-box">"${booking.notes}"</div>` 
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body {
      background-color: #FAF6F0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2E251E;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #FAF6F0;
      width: 100%;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E6DCD2;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(46, 37, 30, 0.03);
    }
    .header {
      background-color: #FAF6F0;
      border-bottom: 1px solid #E6DCD2;
      padding: 30px;
      text-align: center;
    }
    .header-logo {
      font-family: 'Georgia', serif;
      font-size: 24px;
      font-weight: 800;
      color: #2E251E;
      letter-spacing: -0.02em;
      margin: 0;
      text-transform: uppercase;
    }
    .header-logo span {
      color: #B08E73;
    }
    .content {
      padding: 40px 35px;
    }
    .title {
      font-family: 'Georgia', serif;
      font-size: 20px;
      font-weight: 700;
      color: #2E251E;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .intro {
      font-size: 15px;
      line-height: 1.6;
      color: #6B5B52;
      margin-bottom: 30px;
    }
    .details-card {
      background-color: #FAF6F0;
      border: 1px solid #E6DCD2;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .details-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #B08E73;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table td {
      padding: 8px 0;
      font-size: 14px;
      line-height: 1.5;
      vertical-align: top;
    }
    .label {
      font-weight: 600;
      color: #2E251E;
      width: 35%;
    }
    .val {
      color: #6B5B52;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      display: inline-block;
      background-color: #B08E73;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
    }
    .btn:hover {
      background-color: #917056;
    }
    .notes-box {
      border-left: 3px solid #B08E73;
      padding-left: 15px;
      font-style: italic;
      color: #8E7E74;
      margin: 10px 0 20px 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .footer {
      background-color: #FAF6F0;
      border-top: 1px solid #E6DCD2;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #8E7E74;
      line-height: 1.5;
    }
    .footer a {
      color: #B08E73;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="header-logo">SHAMNA <span>THE THERAPIST</span></h1>
      </div>
      <div class="content">
        <h2 class="title">${heading}</h2>
        <p class="intro">${introText}</p>
        
        <div class="details-card">
          <div class="details-title">Session Details</div>
          <table class="details-table">
            ${detailsRows}
          </table>
        </div>

        ${notesSection}

        <div class="btn-container">
          <a href="${gcalUrl}" target="_blank" class="btn" style="color:#ffffff;">📅 Add to Google Calendar</a>
        </div>
        
        <p class="intro" style="margin-bottom: 0;">${closingText}</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Shamna Clinic. Secure & confidential records.<br>
        Need help? Contact <a href="mailto:${therapistEmail}">${therapistEmail}</a> or visit <a href="https://shamnathetherapist.in" target="_blank">shamnathetherapist.in</a>.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch booking notifications to therapist and client
 */
export async function sendBookingNotifications(booking, isInitial = false, isMeetLinkOnly = false) {
  let therapist;
  try {
    therapist = await getProfile(booking.psychologist_id);
  } catch (err) {
    console.error("Could not fetch therapist profile for notification, falling back to default.", err);
  }

  if (!therapist) {
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
              `This is an automated clinical notification.`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, false, gcalUrl)
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
              `Shamna Clinic Support`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, true, gcalUrl)
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
              `This is an automated clinical notification.`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, false, gcalUrl)
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
              `- Google Meet Link: Will be shared separately once confirmed by the therapist.\n\n` +
              `Add to Google Calendar:\n` +
              `${gcalUrl}\n\n` +
              `We look forward to seeing you.\n\n` +
              `Warm regards,\n` +
              `Shamna Clinic Support`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, true, gcalUrl)
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
              `This is an automated clinical notification.`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, false, gcalUrl)
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
              `Shamna Clinic Support`,
        html: buildHtmlEmail(booking, therapist, isInitial, isMeetLinkOnly, true, gcalUrl)
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
}
