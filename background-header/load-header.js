document.addEventListener("DOMContentLoaded", () => {
  fetch("./background-header/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header").innerHTML = data;
      const today = document.querySelector("#header [data-today]");
      if (today) today.textContent = new Date().toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    });
});
