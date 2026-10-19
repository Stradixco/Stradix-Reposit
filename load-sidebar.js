document.addEventListener("DOMContentLoaded", () => {
  fetch("sidebar.html")
    .then(response => response.text())
    .then(data => {
      const sidebarContainer = document.getElementById("sidebar-container");
      if (sidebarContainer) {
        sidebarContainer.innerHTML = data;
        // Highlight the link for the current page
        const page = location.pathname.split("/").pop() || "dashboard.html";
        sidebarContainer.querySelectorAll("a.sidebar-btn").forEach(a => {
          if (a.getAttribute("href") === page) a.setAttribute("aria-current", "page");
        });
      }
    });
});

// Mobile: open/close the sidebar from the top-bar button (works for injected markup)
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sb-open");
  else if (e.target.closest("[data-sidebar-close]") || (document.body.classList.contains("sb-open") && e.target.closest("#sidebar-container a"))) document.body.classList.remove("sb-open");
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("sb-open"); });
