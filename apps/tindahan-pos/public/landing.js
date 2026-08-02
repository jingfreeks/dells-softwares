(function () {
  var f = document.getElementById("demoform");
  if (!f) return;
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var req = f.querySelectorAll("[required]"),
      bad = null;
    for (var i = 0; i < req.length; i++) {
      var el = req[i],
        empty = el.type === "checkbox" ? !el.checked : !el.value.trim();
      el.style.borderColor = empty ? "#F87171" : "";
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
  document.querySelector(".burger").addEventListener("click", function () {
    location.hash = "#demo";
  });
})();
