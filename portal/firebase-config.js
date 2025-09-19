import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjLXXAGlafMwZLBnEXgwfDBFUiKwY6GsQ",
  authDomain: "tradix-portal.firebaseapp.com",
  projectId: "tradix-portal",
  storageBucket: "tradix-portal.firebasestorage.app",
  messagingSenderId: "18982343212",
  appId: "1:18982343212:web:ce602a4609c2a303927789",
  measurementId: "G-CS9QFQXWHP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
