import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount = null;
export let firebaseStatus = {
  envVarPresent: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  envVarLength: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
  usingMock: false,
  error: null,
  initSuccess: false
};

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err);
    firebaseStatus.error = "JSON Parse Error: " + err.message;
  }
}

try {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized via environment credentials.");
    firebaseStatus.initSuccess = true;
  } else {
    const localKeyPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(localKeyPath)) {
      try {
        const localKey = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(localKey)
        });
        console.log("Firebase Admin initialized via local service account file.");
        firebaseStatus.initSuccess = true;
      } catch (err) {
        console.error("Failed to parse local firebase-service-account.json file:", err);
        firebaseStatus.error = "Local Key Parse Error: " + err.message;
        admin.initializeApp();
      }
    } else {
      console.warn("⚠️ Firebase credentials not found. Attempting default initialization...");
      admin.initializeApp();
    }
  }
} catch (initError) {
  console.error("❌ Failed to initialize Firebase Admin SDK. Please configure FIREBASE_SERVICE_ACCOUNT environment variable.", initError.message);
  if (!firebaseStatus.error) {
    firebaseStatus.error = "Init Error: " + initError.message;
  }
}

let db;
try {
  db = getFirestore();
  firebaseStatus.usingMock = false;
} catch (dbError) {
  console.error("❌ Failed to get Firestore instance. Firestore operations will fail.", dbError.message);
  if (!firebaseStatus.error) {
    firebaseStatus.error = "Firestore Fetch Error: " + dbError.message;
  }
  firebaseStatus.usingMock = true;
  // Create a mock db object to prevent the server from crashing on import
  db = {
    collection: () => {
      const mockCollection = {
        get: async () => ({ empty: true, forEach: () => {} }),
        doc: () => ({
          get: async () => ({ exists: false, data: () => null }),
          set: async () => {},
          update: async () => {},
          delete: async () => {}
        }),
        where: () => mockCollection,
        add: async () => ({ id: 'mock' })
      };
      return mockCollection;
    }
  };
}

export { db };
