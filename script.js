(function () {
  "use strict";
  var SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"];
  var PASS_MARK = 35;
  var form = document.getElementById("gradeForm");
  var grid = document.getElementById("marksGrid");
  var formMsg = document.getElementById("formMsg");
  var nameInput = document.getElementById("studentName");
  var resultBox = document.getElementById("result");
  var emptyBox = document.getElementById("empty");

  /* ---------- Build subject fields ---------- */
  SUBJECTS.forEach(function (s, i) {
    var d = document.createElement("div");
    d.className = "field";
    d.setAttribute("data-field", "m" + i);
    d.innerHTML = '<label for="m' + i + '">' + s + '</label>' +
      '<input id="m' + i + '" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="0 – 100">' +
      '<div class="err" role="alert"></div>';
    grid.appendChild(d);
  });
  var inputs = SUBJECTS.map(function (_, i) { return document.getElementById("m" + i); });

  /* ---------- Theme toggle with localStorage ---------- */
  var root = document.documentElement;
  function paintTheme(t) {
    root.setAttribute("data-theme", t);
    document.getElementById("themeIcon").textContent = t === "dark" ? "☀" : "☾";
    document.getElementById("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  }
  paintTheme(root.getAttribute("data-theme") || "light");
  document.getElementById("themeToggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    paintTheme(next);
    try { localStorage.setItem("grade-calc-theme", next); } catch (e) {}
  });

  /* ---------- Validation ---------- */
  function setError(fieldKey, text) {
    var f = form.querySelector('[data-field="' + fieldKey + '"]');
    if (!f) return;
    f.classList.toggle("invalid", !!text);
    f.querySelector(".err").textContent = text || "";
    var inp = f.querySelector("input");
    if (inp) inp.setAttribute("aria-invalid", text ? "true" : "false");
  }
  function validateMark(i) {
    var raw = inputs[i].value.trim();
    if (raw === "") return "Enter marks for " + SUBJECTS[i] + ".";
    var n = Number(raw);
    if (!isFinite(n)) return "Marks must be a number.";
    if (n < 0 || n > 100) return "Marks must be between 0 and 100.";
    return "";
  }
  function validateName() {
    var v = nameInput.value.trim();
    if (!v) return "Enter the student's name.";
    if (v.length < 2) return "Name must have at least 2 characters.";
    if (/[<>]/.test(v)) return "Name cannot contain < or >.";
    return "";
  }
  // Live feedback: clear an error as soon as the value becomes valid
  nameInput.addEventListener("input", function () { if (form.querySelector('[data-field="name"]').classList.contains("invalid")) setError("name", validateName()); });
  inputs.forEach(function (inp, i) {
    inp.addEventListener("input", function () {
      if (form.querySelector('[data-field="m' + i + '"]').classList.contains("invalid")) setError("m" + i, validateMark(i));
    });
    inp.addEventListener("blur", function () { if (inp.value !== "") setError("m" + i, validateMark(i)); });
  });

  /* ---------- Grading logic ---------- */
  function gradeFor(pct, failedSubject) {
    if (failedSubject || pct < PASS_MARK) return { g: "F", remark: "Fail" };
    if (pct >= 90) return { g: "A+", remark: "Outstanding" };
    if (pct >= 80) return { g: "A", remark: "Excellent" };
    if (pct >= 70) return { g: "B", remark: "Very good" };
    if (pct >= 60) return { g: "C", remark: "Good" };
    if (pct >= 50) return { g: "D", remark: "Satisfactory" };
    return { g: "E", remark: "Needs improvement" };
  }
  function messageFor(grade, name, weak) {
    var first = name.split(" ")[0];
    switch (grade) {
      case "A+": return first + " has delivered an outstanding performance. Keep it up!";
      case "A":  return "Excellent work, " + first + ". A little more polish and A+ is within reach.";
      case "B":  return "Very good result. Strengthening " + (weak || "the weaker subjects") + " will lift the grade further.";
      case "C":  return "A good, steady result. Focus on " + (weak || "practice") + " to move up a grade.";
      case "D":  return "A satisfactory pass. Regular revision, especially in " + (weak || "all subjects") + ", will help.";
      case "E":  return "A narrow pass. Extra attention to " + (weak || "all subjects") + " is strongly recommended.";
      default:   return "Not passed this time. Revisit " + (weak || "the failed subjects") + " and try again. Every retake is progress.";
    }
  }

  /* ---------- Calculate ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = 0, firstBad = null;
    var nErr = validateName();
    setError("name", nErr);
    if (nErr) { bad++; firstBad = nameInput; }
    inputs.forEach(function (inp, i) {
      var err = validateMark(i);
      setError("m" + i, err);
      if (err) { bad++; if (!firstBad) firstBad = inp; }
    });
    if (bad) {
      formMsg.textContent = bad + (bad === 1 ? " field needs" : " fields need") + " attention before calculating.";
      resultBox.classList.remove("show"); emptyBox.style.display = "";
      firstBad.focus();
      return;
    }
    formMsg.textContent = "";

    var marks = inputs.map(function (inp) { return Number(inp.value); });
    var total = marks.reduce(function (a, b) { return a + b; }, 0);
    var pct = total / SUBJECTS.length;           // out of 100 per subject => percentage
    var avg = total / SUBJECTS.length;
    var failedIdx = [];
    marks.forEach(function (m, i) { if (m < PASS_MARK) failedIdx.push(i); });
    var res = gradeFor(pct, failedIdx.length > 0);
    var passed = res.g !== "F";

    var lowest = marks.indexOf(Math.min.apply(null, marks));
    var highest = marks.indexOf(Math.max.apply(null, marks));
    var weakName = failedIdx.length ? failedIdx.map(function (i) { return SUBJECTS[i]; }).join(" and ") : SUBJECTS[lowest];

    document.getElementById("rName").textContent = nameInput.value.trim();
    document.getElementById("rGrade").textContent = res.g;
    var st = document.getElementById("rStatus");
    st.textContent = passed ? "Pass" : "Fail";
    st.className = "badge " + (passed ? "pass" : "fail");
    document.getElementById("rTotal").textContent = fmt(total);
    document.getElementById("rPct").textContent = fmt(pct) + "%";
    document.getElementById("rAvg").textContent = fmt(avg);
    document.getElementById("rBest").textContent = SUBJECTS[highest].split(" ")[0];
    document.getElementById("rMsg").textContent = messageFor(res.g, nameInput.value.trim(), weakName);

    var body = document.getElementById("subjBody");
    body.innerHTML = "";
    marks.forEach(function (m, i) {
      var ok = m >= PASS_MARK;
      var tr = document.createElement("tr");
      tr.innerHTML = '<td>' + SUBJECTS[i] + '</td><td>' + fmt(m) + '</td>' +
        '<td><div class="bar"><i class="' + (ok ? "" : "low") + '"></i></div></td>' +
        '<td class="' + (ok ? "st-pass" : "st-fail") + '">' + (ok ? "Pass" : "Fail") + '</td>';
      body.appendChild(tr);
      requestAnimationFrame(function () { requestAnimationFrame(function () { tr.querySelector(".bar i").style.width = m + "%"; }); });
    });

    emptyBox.style.display = "none";
    resultBox.classList.remove("show");
    void resultBox.offsetWidth;                  // restart entrance animation
    resultBox.classList.add("show");
    animateRing(pct, passed);
    if (window.innerWidth <= 820) resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }

  function animateRing(pct, passed) {
    var ring = document.getElementById("ring");
    var text = document.getElementById("ringText");
    ring.style.setProperty("--ringc", passed ? "var(--pass)" : "var(--fail)");
    ring.setAttribute("aria-label", "Percentage " + fmt(pct) + " percent");
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { ring.style.setProperty("--p", pct); text.textContent = Math.round(pct) + "%"; return; }
    var start = null, dur = 900;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      ring.style.setProperty("--p", pct * eased);
      text.textContent = Math.round(pct * eased) + "%";
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Reset & print ---------- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    form.reset();
    form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("invalid"); f.querySelector(".err").textContent = ""; });
    formMsg.textContent = "";
    resultBox.classList.remove("show");
    emptyBox.style.display = "";
    nameInput.focus();
  });
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
})();