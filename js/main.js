document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initScrollReveal();
  initEnergySwitch();
  initBackToTop();
});

function initMobileNav() {
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");

  if (!navToggle || !navMenu) return;

  function closeMenu(returnFocus) {
    navMenu.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) {
      navToggle.focus();
    }
  }

  navToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navMenu.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => closeMenu(false));
  });

  document.addEventListener("click", (event) => {
    if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
      closeMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navMenu.classList.contains("open")) {
      closeMenu(true);
    }
  });
}

function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (targets.length === 0) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced || typeof IntersectionObserver === "undefined") {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // Defer hiding until JS confirms observer support so no-JS views never stay invisible.
  document.documentElement.classList.add("js-ready");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

function initEnergySwitch() {
  const btn = document.getElementById("energySwitchBtn");
  const box = document.getElementById("switchPlayground");
  const titleEl = document.getElementById("switchStatusTitle");
  const descEl = document.getElementById("switchStatusDesc");
  const labelEl = document.getElementById("switchBtnLabel");

  if (!btn || !box || !titleEl || !descEl || !labelEl) return;

  btn.addEventListener("click", () => {
    const isNowOff = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", isNowOff ? "true" : "false");
    box.classList.toggle("is-off", isNowOff);

    if (isNowOff) {
      titleEl.textContent = "Sakelar OFF: Kelas & Lab Aman!";
      descEl.textContent = "Kipas berhenti, charger cabut, daya siaga stop. Semudah satu klik ini.";
      labelEl.textContent = "Posisi OFF (Hemat)";
    } else {
      titleEl.textContent = "Sakelar Masih ON di Ruang Kosong";
      descEl.textContent = "Kipas tetap berputar dan adaptor terus menyedot 0,5 sampai 3 Watt. Coba matikan!";
      labelEl.textContent = "Matikan Sakelar";
    }
  });
}

function initBackToTop() {
  const btn = document.getElementById("btnBackToTop");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth"
    });
  });
}
