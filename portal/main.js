import { login } from './auth.js';

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    login(email, password)
      .then(() => {
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        if (errorMessage) {
          errorMessage.textContent = "❌ خطأ: البريد الإلكتروني أو كلمة المرور غير صحيحة.";
          errorMessage.style.display = "block";
        }
        console.error(error);
      });
  });
}
