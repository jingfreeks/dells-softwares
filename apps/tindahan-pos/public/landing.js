(function () {
  var f = document.getElementById("demoform");
  if (!f) return;
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var req = f.querySelectorAll("[required]"),
      bad = null;
    for (var i = 0; i < req.length; i++) {
      var el = req[i],
        isCheckbox = el.type === "checkbox",
        empty = isCheckbox ? !el.checked : !el.value.trim();
      el.style.borderColor = empty ? "#F87171" : "";
      if (!isCheckbox) el.setAttribute("aria-invalid", empty ? "true" : "false");
      var errId = el.getAttribute("aria-describedby"),
        errEl = errId ? document.getElementById(errId) : null;
      if (errEl) {
        errEl.textContent = empty
          ? isCheckbox
            ? "Please agree before continuing."
            : "This field is required."
          : "";
        errEl.hidden = !empty;
      }
      if (empty && !bad) bad = el;
    }
    if (bad) {
      bad.focus();
      return;
    }
    // Wire this to your backend / form service. Nothing is sent from this static page.
    document.getElementById("formfields").style.display = "none";
    document.getElementById("okmsg").style.display = "block";
  });

  var burger = document.getElementById("burger"),
    menu = document.getElementById("mobilemenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var isOpen = menu.classList.toggle("open");
      menu.hidden = !isOpen;
      burger.setAttribute("aria-expanded", String(isOpen));
      burger.innerHTML = isOpen ? "&#10005;" : "&#9776;";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        menu.hidden = true;
        burger.setAttribute("aria-expanded", "false");
        burger.innerHTML = "&#9776;";
      });
    });
  }
})();
