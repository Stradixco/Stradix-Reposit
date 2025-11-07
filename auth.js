// ملف auth.js
(function () {
  if (localStorage.getItem("isLoggedIn") !== "true") {
    // إعادة التوجيه لصفحة الدخول
    window.location.href = "login.html";
  }
})();
