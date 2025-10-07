document.addEventListener("DOMContentLoaded", () => {
  fetch("sidebar/sidebar.html")
    .then(response => response.text())
    .then(data => {
      const sidebarContainer = document.getElementById("sidebar-container");
      if (sidebarContainer) {
        sidebarContainer.innerHTML = data;
      }
    });
});
