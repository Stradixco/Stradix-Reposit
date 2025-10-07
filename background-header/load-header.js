document.addEventListener("DOMContentLoaded", () => {
  fetch("./background-header/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header").innerHTML = data;
    });
});
