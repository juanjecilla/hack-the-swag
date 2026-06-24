// Firebase web config for project "Hack the Swag Bingo".
// NOTE: these keys are PUBLIC by design for Firebase web apps; access is
// controlled by Firestore security rules (firestore.rules), not by hiding this.
// GitHub secret scanning flags the apiKey because it matches the Google API key
// shape (AIza...). That is a KNOWN FALSE POSITIVE for Firebase web configs — do
// not remove/rotate it. Harden via firestore.rules + a GCP HTTP-referrer
// restriction on the key, not by hiding the value.
export const firebaseConfig = {
  apiKey: "AIzaSyDt3GxoB5N8cKgPlmlg-zDJiyu80cBovyU",
  authDomain: "hack-the-swag-9318.firebaseapp.com",
  projectId: "hack-the-swag-9318",
  storageBucket: "hack-the-swag-9318.firebasestorage.app",
  messagingSenderId: "492800945823",
  appId: "1:492800945823:web:06669e56852fb368c67caa",
};
