// auth.js
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from './firebase-config.js';

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function checkAuth(onSuccess, onFail) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onSuccess(user);
    } else {
      onFail();
    }
  });
}
document.getElementById("invoice-number").addEventListener("input", function (e) {
  const input = e.target;
  const value = input.value;

  // اسمح فقط بـ 3 أرقام
  if (value.length > 3) {
    input.value = value.slice(0, 3);
  }
});
