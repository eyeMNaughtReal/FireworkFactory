const fs = require('fs');


const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const configContent = `import { initializeApp } from 'firebase/app';\nimport { getFirestore } from 'firebase/firestore';\nimport { getAuth } from 'firebase/auth';\n\nconst firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};\n\nconst app = initializeApp(firebaseConfig);\nexport const db = getFirestore(app);\nexport const auth = getAuth(app);\nexport default firebaseConfig;\n`;

fs.writeFileSync('src/firebase/config.js', configContent);
console.log('Generated src/firebase/config.js with db and auth exports.');
