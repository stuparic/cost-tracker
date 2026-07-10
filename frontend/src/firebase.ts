import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Public web config for the moneyflow-832f4 Firebase project
// (same values Firebase Hosting serves at /__/firebase/init.json)
const firebaseConfig = {
  apiKey: 'AIzaSyCpL7eTLzyk0Jy9wcPBRxY47Gb8YB-_cgE',
  authDomain: 'moneyflow-832f4.firebaseapp.com',
  projectId: 'moneyflow-832f4',
  storageBucket: 'moneyflow-832f4.firebasestorage.app',
  messagingSenderId: '514960567351',
  appId: '1:514960567351:web:57b75f70c8bca36fdf63b2'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
