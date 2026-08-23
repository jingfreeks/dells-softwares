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

// Separate IIFE (not folded into the one above, which early-returns if
// #demoform is ever missing) -- monthly/annual pricing toggle. No state
// persisted: a reload always starts on Monthly, same "no card, no
// commitment" framing as the rest of this page.
(function () {
  var toggle = document.getElementById("pricetoggle"),
    save = document.getElementById("pricesave");
  if (!toggle) return;
  var buttons = toggle.querySelectorAll("button"),
    amounts = document.querySelectorAll(".pamt[data-monthly]");
  toggle.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-interval]");
    if (!btn) return;
    var interval = btn.getAttribute("data-interval");
    buttons.forEach(function (b) {
      var on = b === btn;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    amounts.forEach(function (el) {
      el.innerHTML = el.getAttribute("data-" + interval);
    });
    if (save) save.classList.toggle("show", interval === "annual");
  });
})();
