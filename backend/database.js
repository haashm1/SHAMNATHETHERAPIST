import { db } from './firebase.js';

/**
 * Returns default fallback profiles in case Firestore is unconfigured or empty.
 */
function getInMemoryDefaults() {
  return [
    {
      id: 1,
      name: 'Shamna',
      title: 'Licensed Clinical Psychologist & Cognitive Behavioral Therapist',
      bio: 'With over 12 years of experience, Shamna specializes in helping clients navigate anxiety, stress, depression, and relationship dynamics using a compassionate, evidence-based approach.',
      specialties: 'Anxiety,Depression,Relationship Counseling,CBT,Mindfulness-Based Therapy',
      education: 'Ph.D. in Clinical Psychology - Stanford University',
      experience: '12+ Years in Private Practice, Former Lead Therapist at Mindspace Clinic',
      photo_url: '/uploads/default-doctor.jpg',
      contact_email: 'therapist.shamna@gmail.com',
      contact_phone: '+1 (555) 839-2810',
      address: 'Suite 402, Oakwood Wellness Center, San Francisco, CA',
      meet_link: '',
      available_slots: '',
      unavailable_dates: ''
    },
    {
      id: 2,
      name: 'Arjun Mehta',
      title: 'Licensed Counselor & Family Therapist',
      bio: 'Arjun specializes in child psychology, family therapy, and adolescent counseling, helping families build stronger connections and navigate stress.',
      specialties: 'Child Therapy,Family Counseling,Adolescent Support,Anger Management',
      education: 'M.S. in Counseling Psychology - Northwestern University',
      experience: '8+ Years in Family Therapy and Educational Counseling',
      photo_url: '/uploads/default-arjun.jpg',
      contact_email: 'arjun@example.com',
      contact_phone: '+1 (555) 124-7733',
      address: 'Suite 405, Oakwood Wellness Center, San Francisco, CA',
      meet_link: '',
      available_slots: '',
      unavailable_dates: ''
    }
  ];
}

/**
 * Seeds default psychologist profiles if the collection is empty.
 */
async function seedDefaultProfiles() {
  try {
    const profilesSnapshot = await db.collection('profiles').get();
    if (profilesSnapshot.empty) {
      console.log("Seeding default profiles into Firestore...");
      const defaults = getInMemoryDefaults();
      for (const p of defaults) {
        await db.collection('profiles').doc(String(p.id)).set(p);
      }
      console.log("Seeded default psychologist profiles successfully.");
    }
  } catch (error) {
    console.error("Error seeding default profiles in Firestore:", error.message);
  }
}

// ==========================================
// 1. PSYCHOLOGIST PROFILE FUNCTIONS
// ==========================================

export async function getProfiles() {
  try {
    await seedDefaultProfiles();
    const snapshot = await db.collection('profiles').get();
    const profiles = [];
    snapshot.forEach(doc => {
      profiles.push(doc.data());
    });
    
    // Fallback if collection query is empty
    if (profiles.length === 0) {
      console.warn("⚠️ Firestore profiles collection is empty. Falling back to defaults.");
      return getInMemoryDefaults();
    }
    
    // Sort profiles by ID
    profiles.sort((a, b) => a.id - b.id);
    return profiles;
  } catch (error) {
    console.error("Error getting profiles from Firestore, falling back to defaults:", error.message);
    return getInMemoryDefaults();
  }
}

export async function getProfile(id) {
  try {
    await seedDefaultProfiles();
    const doc = await db.collection('profiles').doc(String(id)).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (error) {
    console.error(`Error getting profile ${id} from Firestore, falling back to defaults:`, error.message);
  }
  
  // Return matching default profile
  const defaults = getInMemoryDefaults();
  return defaults.find(p => p.id === Number(id)) || defaults[0];
}

export async function createProfile(data) {
  await seedDefaultProfiles();
  const profiles = await getProfiles();
  const maxId = profiles.reduce((max, p) => (p.id > max ? p.id : max), 0);
  const newId = maxId + 1;
  
  const profileData = {
    ...data,
    id: newId,
    available_slots: data.available_slots || '',
    unavailable_dates: data.unavailable_dates || ''
  };
  
  await db.collection('profiles').doc(String(newId)).set(profileData);
  return profileData;
}

export async function updateProfile(id, data) {
  await seedDefaultProfiles();
  const docRef = db.collection('profiles').doc(String(id));
  
  const updateData = { ...data };
  delete updateData.id; // Protect the numeric ID from modification
  
  await docRef.set(updateData, { merge: true });
  const updated = await docRef.get();
  return updated.data();
}

// ==========================================
// 2. BOOKING & SLOT FUNCTIONS
// ==========================================

export async function getBookings() {
  try {
    const snapshot = await db.collection('bookings').get();
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date DESC, time ASC
    bookings.sort((a, b) => {
      if (a.booking_date !== b.booking_date) {
        return b.booking_date.localeCompare(a.booking_date);
      }
      return a.booking_time.localeCompare(b.booking_time);
    });
    
    return bookings;
  } catch (error) {
    console.error("Error getting bookings from Firestore:", error.message);
    return [];
  }
}

export async function getBooking(id) {
  try {
    const doc = await db.collection('bookings').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error getting booking ${id} from Firestore:`, error.message);
    return null;
  }
}

export async function createBooking(data) {
  const bookingData = {
    client_name: data.client_name,
    client_email: data.client_email,
    client_phone: data.client_phone,
    booking_date: data.booking_date,
    booking_time: data.booking_time,
    duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 50,
    notes: data.notes || '',
    meet_link: data.meet_link || null,
    psychologist_id: Number(data.psychologist_id),
    status: data.status || 'booked',
    created_at: new Date().toISOString()
  };
  
  const docRef = await db.collection('bookings').add(bookingData);
  return { id: docRef.id, ...bookingData };
}

export async function updateBooking(id, data) {
  const docRef = db.collection('bookings').doc(String(id));
  
  const updateData = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.booking_date !== undefined) updateData.booking_date = data.booking_date;
  if (data.booking_time !== undefined) updateData.booking_time = data.booking_time;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.meet_link !== undefined) updateData.meet_link = data.meet_link;
  if (data.psychologist_id !== undefined) updateData.psychologist_id = Number(data.psychologist_id);
  
  await docRef.update(updateData);
  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
}

export async function checkBookingConflict(booking_date, booking_time, psychologist_id, excludeId = null) {
  try {
    const snapshot = await db.collection('bookings')
      .where('booking_date', '==', booking_date)
      .where('booking_time', '==', booking_time)
      .where('psychologist_id', '==', Number(psychologist_id))
      .get();
      
    let conflict = null;
    snapshot.forEach(doc => {
      if (doc.id === excludeId) return;
      const data = doc.data();
      if (data.status !== 'cancelled') {
        conflict = { id: doc.id, ...data };
      }
    });
    
    return conflict;
  } catch (error) {
    console.error("Error checking booking conflict in Firestore:", error.message);
    return null;
  }
}

// ==========================================
// 3. CASE SHEET FUNCTIONS
// ==========================================

export async function getCaseSheets() {
  try {
    const snapshot = await db.collection('case_sheets').get();
    const cases = [];
    snapshot.forEach(doc => {
      cases.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date DESC, created_at DESC
    cases.sort((a, b) => {
      if (a.case_date !== b.case_date) {
        return b.case_date.localeCompare(a.case_date);
      }
      const aTime = a.created_at || '';
      const bTime = b.created_at || '';
      return bTime.localeCompare(aTime);
    });
    
    return cases;
  } catch (error) {
    console.error("Error getting case sheets from Firestore:", error.message);
    return [];
  }
}

export async function getCaseSheet(id) {
  try {
    const doc = await db.collection('case_sheets').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error getting case sheet ${id} from Firestore:`, error.message);
    return null;
  }
}

export async function createCaseSheet(data) {
  const caseData = {
    booking_id: data.booking_id || null,
    client_name: data.client_name,
    case_date: data.case_date,
    title: data.title,
    document_content: data.document_content || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const docRef = await db.collection('case_sheets').add(caseData);
  return { id: docRef.id, ...caseData };
}

export async function updateCaseSheet(id, data) {
  const docRef = db.collection('case_sheets').doc(String(id));
  
  const updateData = {
    title: data.title,
    case_date: data.case_date,
    document_content: data.document_content,
    updated_at: new Date().toISOString()
  };
  
  await docRef.update(updateData);
  return { id, ...updateData };
}

export async function deleteCaseSheet(id) {
  await db.collection('case_sheets').doc(String(id)).delete();
  return true;
}
