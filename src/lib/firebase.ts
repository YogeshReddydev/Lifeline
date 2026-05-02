import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// CRITICAL CONSTRAINT: Test connection to Firestore on boot
export async function testConnection() {
  try {
    // Attempt to fetch a document that definitely shouldn't trigger a heavy read
    await getDocFromServer(doc(db, 'system', 'heartbeat'));
    console.log("Firestore connection verified.");
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.error("CRITICAL: Firebase configuration error or network unreachable. Client is offline.");
    }
    return false;
  }
}

testConnection();
