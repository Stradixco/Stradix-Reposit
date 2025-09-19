import { login } from './auth.js';

const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");

if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault(); // منع إعادة تحميل الصفحة

    const email = emailInput.value;
    const password = passwordInput.value;

    login(email, password)
      .then(() => {
        // ✅ تسجيل دخول ناجح
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        // ❌ خطأ في تسجيل الدخول
        if (errorMessage) {
          errorMessage.textContent = "خطأ: البريد الإلكتروني أو كلمة المرور غير صحيحة.";
          errorMessage.style.color = "red";
        }
      });
  });
}
