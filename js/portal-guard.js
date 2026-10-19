// Portal access guard (ES module). Include on every internal page:
//   <script type="module" src="js/portal-guard.js"></script>
// Redirects visitors without an active Firebase session to Login.html and
// wires every logout link (.logout-btn or [data-logout]) to a real sign-out.
// NOTE: this is a client-side gate for a static site. Data stored in
// Firebase must also be protected by Firebase Security Rules.
import { auth } from "../portal/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const root = document.documentElement;
root.style.visibility = "hidden";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    const page = location.pathname.split("/").pop() || "dashboard.html";
    location.replace("Login.html?next=" + encodeURIComponent(page));
    return;
  }
  root.style.visibility = "";
});

document.addEventListener("click", (e) => {
  const link = e.target.closest(".logout-btn, [data-logout]");
  if (!link) return;
  e.preventDefault();
  signOut(auth).finally(() => location.replace("Login.html"));
});
