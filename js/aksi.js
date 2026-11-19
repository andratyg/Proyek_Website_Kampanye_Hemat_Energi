const STORAGE_KEYS = {
  challenge: "sadarWatt_challenge_v1",
  commitments: "sadarWatt_commitments_v1"
};

const ACTION_GUIDE = {
  P01: "Pertahankan praktik hemat listrik dan air sehari-hari sambil membagikan contoh nyata ke teman sekelas.",
  P02: "Pastikan seluruh perangkat praktik di lab, bengkel, kelas, dan rumah langsung diputus dayanya setelah dipakai.",
  P03: "Tugaskan dua siswa terakhir yang keluar kelas untuk mematikan seluruh kipas angin dinding, lampu, dan proyektor saat jam olahraga atau istirahat.",
  P04: "Redupkan layar laptop ke 50%, aktifkan mode hemat baterai saat sesi teori, dan lakukan shutdown jika jeda lebih dari 30 menit.",
  P05: "Prioritaskan jalan kaki, bersepeda, angkutan umum, atau berangkat bersama teman satu rayon minimal dua hari sepekan.",
  P06: "Cabut adaptor charger dari stopkontak begitu baterai penuh agar daya siaga tidak terbuang sia-sia.",
  P07: "Buka lebar tirai dan jendela di pagi serta siang hari agar cahaya matahari menggantikan lampu ruang kelas.",
  P08: "Gunakan kipas angin dinding pada tingkat kecepatan seperlunya dan maksimalkan sirkulasi udara alami dari jendela.",
  P09: "Masukkan cek sakelar ke jadwal piket kelas dan pakai kalimat pengingat santai agar teman sekelas tidak sungkan diingatkan.",
  P10: "Lakukan audit 30 detik sebelum pulang untuk menekan sakelar utama kabel roll lab ke posisi OFF."
};

document.addEventListener("DOMContentLoaded", () => {
  initChallengeTracker();
  initScriptCopyButtons();
  initCommitmentFeature();
  initRombelDiagnostic();
});

async function loadEnergyData() {
  try {
    const response = await fetch("data-perilaku-energi.json");
    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }
    return await response.json();
  } catch (fetchErr) {
    // Fallback to global DATA_ENERGI when opened directly via file:// without a local HTTP server.
    if (typeof DATA_ENERGI !== "undefined" && DATA_ENERGI.ringkasan) {
      return DATA_ENERGI;
    }
    throw new Error("Berkas data-perilaku-energi.json dan fallback DATA_ENERGI tidak dapat dibaca.");
  }
}

function readStorage(key, fallbackValue) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    // Restricted storage contexts (e.g. private browsing) fall back to in-memory session state.
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or privacy-mode storage errors so UI interactions keep working.
  }
}

async function initRombelDiagnostic() {
  const loadingEl = document.getElementById("rombelLoading");
  const errorEl = document.getElementById("rombelError");
  const contentEl = document.getElementById("rombelContent");
  const retryBtn = document.getElementById("btnRetryData");

  if (!loadingEl || !errorEl || !contentEl) return;

  async function loadAndBind() {
    loadingEl.style.display = "block";
    errorEl.style.display = "none";
    contentEl.style.display = "none";

    try {
      const data = await loadEnergyData();
      loadingEl.style.display = "none";
      contentEl.style.display = "block";
      setupRombelControls(data);
      populateCommitRombels(data.per_rombel);
    } catch (err) {
      loadingEl.style.display = "none";
      errorEl.style.display = "block";
      const errDetail = errorEl.querySelector(".error-detail");
      if (errDetail) {
        errDetail.textContent = err.message;
      }
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", loadAndBind);
  }

  await loadAndBind();
}

function setupRombelControls(data) {
  const selectJurusan = document.getElementById("selectJurusan");
  const selectRombel = document.getElementById("selectRombel");
  const resultEl = document.getElementById("rombelResult");
  const quickPickButtons = document.querySelectorAll(".btn-quick-pick");

  if (!selectJurusan || !selectRombel || !resultEl) return;

  const allRombels = [...data.per_rombel].sort((a, b) =>
    a.rombel.localeCompare(b.rombel, "id")
  );
  const schoolAvg = data.ringkasan.rata_rata_skor;

  selectJurusan.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = `Semua Jurusan (${data.per_jurusan.length} Keahlian)`;
  selectJurusan.appendChild(allOpt);

  [...data.per_jurusan]
    .sort((a, b) => a.kode.localeCompare(b.kode, "id"))
    .forEach((jur) => {
      const opt = document.createElement("option");
      opt.value = jur.kode;
      opt.textContent = `${jur.kode} - ${jur.nama} (Rata-rata ${jur.rata_rata_skor.toFixed(2)})`;
      selectJurusan.appendChild(opt);
    });

  function populateRombelOptions(jurusanKode) {
    const filtered =
      jurusanKode === "all"
        ? allRombels
        : allRombels.filter((r) => r.jurusan === jurusanKode);

    selectRombel.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih rombel kelas XI";
    selectRombel.appendChild(placeholder);

    filtered.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.rombel;
      opt.textContent = `${item.rombel} (Skor ${item.rata_rata_skor.toFixed(2)} • ${item.jumlah_responden} siswa)`;
      selectRombel.appendChild(opt);
    });
  }

  function renderEmptyResult() {
    resultEl.innerHTML = "";
    const emptyBox = document.createElement("div");
    emptyBox.className = "rombel-empty-state";

    const heading = document.createElement("h3");
    heading.textContent = "Belum Ada Rombel yang Dipilih";

    const desc = document.createElement("p");
    desc.textContent =
      "Pilih salah satu rombel dari daftar di atas atau gunakan tombol pintasan cepat untuk menampilkan skor rata-rata kelas dan dua prioritas aksi paling mendesak.";

    emptyBox.append(heading, desc);
    resultEl.appendChild(emptyBox);
  }

  function syncQuickPickButtons(activeRombel) {
    quickPickButtons.forEach((btn) => {
      const isMatch = btn.getAttribute("data-rombel") === activeRombel;
      btn.classList.toggle("active", isMatch);
      btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
    });
  }

  function renderRombelDiagnosis(rombelName) {
    const rombelObj = allRombels.find((r) => r.rombel === rombelName);
    if (!rombelObj) {
      syncQuickPickButtons("");
      renderEmptyResult();
      return;
    }

    syncQuickPickButtons(rombelName);

    const diffNum = Number((rombelObj.rata_rata_skor - schoolAvg).toFixed(2));
    const isAboveOrEqual = diffNum >= 0;
    const diffText =
      diffNum >= 0
        ? `+${diffNum.toFixed(2)} di atas rata-rata sekolah (${schoolAvg.toFixed(2)})`
        : `${diffNum.toFixed(2)} di bawah rata-rata sekolah (${schoolAvg.toFixed(2)})`;

    const rankedButir = rombelObj.rata_rata_per_butir
      .map((score, idx) => ({
        score,
        meta: data.per_butir[idx]
      }))
      .filter((entry) => Boolean(entry.meta))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);

    resultEl.innerHTML = "";

    const strip = document.createElement("div");
    strip.className = "rombel-summary-strip";

    const stripLeft = document.createElement("div");
    const titleEl = document.createElement("h3");
    titleEl.className = "rombel-summary-title";
    titleEl.textContent = rombelObj.rombel;

    const metaEl = document.createElement("p");
    metaEl.className = "rombel-summary-meta";
    metaEl.textContent = `${rombelObj.jumlah_responden} responden • Kategori Sangat Baik: ${rombelObj.kategori_persen["Sangat Baik"]}%`;
    stripLeft.append(titleEl, metaEl);

    const stripRight = document.createElement("div");
    stripRight.className = "rombel-score-box";

    const scoreVal = document.createElement("span");
    scoreVal.className = "rombel-score-value";
    scoreVal.textContent = `${rombelObj.rata_rata_skor.toFixed(2)} / 4.00`;

    const deltaBadge = document.createElement("span");
    deltaBadge.className = `rombel-delta-badge ${isAboveOrEqual ? "above" : "below"}`;
    deltaBadge.textContent = diffText;

    stripRight.append(scoreVal, deltaBadge);
    strip.append(stripLeft, stripRight);

    const weakHeading = document.createElement("p");
    weakHeading.className = "rombel-weak-title";
    weakHeading.textContent = `Dua indikator terendah di ${rombelObj.rombel} yang paling perlu ditindaklanjuti:`;

    const weakGrid = document.createElement("div");
    weakGrid.className = "rombel-weak-grid";

    rankedButir.forEach((item) => {
      const card = document.createElement("div");
      card.className = "rombel-weak-item";

      const head = document.createElement("div");
      head.className = "rombel-weak-head";

      const codeSpan = document.createElement("span");
      codeSpan.className = "rombel-weak-code";
      codeSpan.textContent = item.meta.kode;

      const scoreSpan = document.createElement("span");
      scoreSpan.className = "rombel-weak-score";
      scoreSpan.textContent = `Skor ${item.score.toFixed(2)} / 4.00`;

      head.append(codeSpan, scoreSpan);

      const labelH4 = document.createElement("h4");
      labelH4.textContent = item.meta.label;

      const recP = document.createElement("p");
      recP.textContent = ACTION_GUIDE[item.meta.kode] || item.meta.pertanyaan;

      card.append(head, labelH4, recP);
      weakGrid.appendChild(card);
    });

    const footerActions = document.createElement("div");
    footerActions.className = "rombel-result-actions";

    const footerNote = document.createElement("p");
    footerNote.className = "rombel-summary-meta";
    footerNote.textContent = `Siap menjadikan prioritas ${rombelObj.rombel} sebagai komitmen kelas?`;

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.className = "btn btn-primary";
    applyBtn.textContent = `Gunakan ${rombelObj.rombel} di Formulir Komitmen`;
    applyBtn.addEventListener("click", () => {
      const commitRombel = document.getElementById("commitRombel");
      const commitName = document.getElementById("commitName");
      const commitSection = document.getElementById("komitmen");

      if (commitRombel) {
        commitRombel.value = rombelObj.rombel;
      }
      if (commitSection) {
        commitSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (commitName) {
        commitName.focus({ preventScroll: true });
      }
    });

    footerActions.append(footerNote, applyBtn);
    resultEl.append(strip, weakHeading, weakGrid, footerActions);
  }

  populateRombelOptions("all");

  selectJurusan.addEventListener("change", (e) => {
    const selectedJur = e.target.value;
    populateRombelOptions(selectedJur);
    syncQuickPickButtons("");
    renderEmptyResult();
  });

  selectRombel.addEventListener("change", (e) => {
    renderRombelDiagnosis(e.target.value);
  });

  quickPickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const rombelTarget = btn.getAttribute("data-rombel") || "";
      selectJurusan.value = "all";
      populateRombelOptions("all");
      selectRombel.value = rombelTarget;
      renderRombelDiagnosis(rombelTarget);
    });
  });
}

function populateCommitRombels(rombels) {
  const select = document.getElementById("commitRombel");
  if (!select) return;

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Pilih rombel kelas";
  select.appendChild(placeholder);

  [...rombels]
    .sort((a, b) => a.rombel.localeCompare(b.rombel, "id"))
    .forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.rombel;
      opt.textContent = item.rombel;
      select.appendChild(opt);
    });

  const extraOpt = document.createElement("option");
  extraOpt.value = "Guru / Warga Sekolah Lainnya";
  extraOpt.textContent = "Guru / Warga Sekolah Lainnya";
  select.appendChild(extraOpt);
}

function initChallengeTracker() {
  const checkboxes = document.querySelectorAll('#challengeList input[type="checkbox"]');
  const countEl = document.getElementById("challengeCount");
  const barEl = document.getElementById("challengeProgressBar");
  const trackEl = document.getElementById("challengeProgressTrack");
  const feedbackEl = document.getElementById("challengeFeedback");
  const celebrationEl = document.getElementById("challengeCelebration");
  const resetBtn = document.getElementById("btnResetChallenge");

  if (checkboxes.length === 0) return;

  let completedDays = readStorage(STORAGE_KEYS.challenge, []);
  if (!Array.isArray(completedDays)) {
    completedDays = [];
  }

  function syncUI(saveToStorage) {
    const activeIds = [];

    checkboxes.forEach((cb) => {
      const dayId = cb.getAttribute("data-day");
      const label = cb.closest(".challenge-item");
      if (cb.checked && dayId) {
        activeIds.push(dayId);
      }
      if (label) {
        label.classList.toggle("completed", cb.checked);
      }
    });

    const total = checkboxes.length;
    const doneCount = activeIds.length;
    const pct = Math.round((doneCount / total) * 100);

    if (countEl) {
      countEl.textContent = `${doneCount} dari ${total} hari selesai`;
    }
    if (barEl) {
      barEl.style.width = `${pct}%`;
    }
    if (trackEl) {
      trackEl.setAttribute("aria-valuenow", String(doneCount));
    }
    if (celebrationEl) {
      celebrationEl.hidden = doneCount < total;
    }

    if (feedbackEl) {
      if (doneCount === 0) {
        feedbackEl.textContent = "Centang aksi harian yang sudah kamu jalankan di kelas atau lab.";
      } else if (doneCount < total) {
        feedbackEl.textContent = `Mantap, ${doneCount} hari beres! Tinggal ${total - doneCount} aksi lagi pekan ini.`;
      } else {
        feedbackEl.textContent = "Semua 7 hari tuntas! Ajak petugas piket minggu depan ikut melanjutkan.";
      }
    }

    if (saveToStorage) {
      writeStorage(STORAGE_KEYS.challenge, activeIds);
    }
  }

  checkboxes.forEach((cb) => {
    const dayId = cb.getAttribute("data-day");
    cb.checked = Boolean(dayId && completedDays.includes(dayId));
    cb.addEventListener("change", () => syncUI(true));
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      checkboxes.forEach((cb) => {
        cb.checked = false;
      });
      syncUI(true);
      if (feedbackEl) {
        feedbackEl.textContent =
          "Progres tantangan direset ke 0 dari 7 hari. Siap dimulai kembali.";
      }
    });
  }

  syncUI(false);
}

function initScriptCopyButtons() {
  const buttons = document.querySelectorAll(".btn-copy-script");
  const feedbackEl = document.getElementById("copyFeedback");

  if (buttons.length === 0) return;

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall through when clipboard permission is denied or unavailable.
      }
    }
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(temp);
    if (!ok) {
      throw new Error("Salin teks tidak didukung peramban ini.");
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const scriptText = btn.getAttribute("data-script") || "";
      if (!scriptText) return;

      try {
        await copyText(scriptText);
        buttons.forEach((other) => {
          other.classList.remove("copied");
          other.textContent = "Salin Kalimat";
        });
        btn.classList.add("copied");
        btn.textContent = "Tersalin";
        if (feedbackEl) {
          feedbackEl.textContent =
            "Kalimat pengingat tersalin ke papan klip dan siap ditempel ke chat kelas.";
        }
        window.setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = "Salin Kalimat";
        }, 2200);
      } catch {
        if (feedbackEl) {
          feedbackEl.textContent =
            "Gagal menyalin otomatis. Silakan blok dan salin kalimat secara manual.";
        }
      }
    });
  });
}

function initCommitmentFeature() {
  const form = document.getElementById("commitmentForm");
  const nameInput = document.getElementById("commitName");
  const rombelSelect = document.getElementById("commitRombel");
  const noteInput = document.getElementById("commitNote");
  const nameError = document.getElementById("commitNameError");
  const rombelError = document.getElementById("commitRombelError");
  const actionsError = document.getElementById("commitActionsError");
  const statusEl = document.getElementById("commitFormStatus");
  const listEl = document.getElementById("commitmentList");
  const emptyEl = document.getElementById("commitmentEmpty");
  const countEl = document.getElementById("commitmentCount");
  const clearBtn = document.getElementById("btnClearCommitments");

  if (!form || !listEl || !emptyEl || !countEl) return;

  let commitments = readStorage(STORAGE_KEYS.commitments, []);
  if (!Array.isArray(commitments)) {
    commitments = [];
  }

  function clearErrors() {
    if (nameError) nameError.textContent = "";
    if (rombelError) rombelError.textContent = "";
    if (actionsError) actionsError.textContent = "";
    if (nameInput) nameInput.removeAttribute("aria-invalid");
    if (rombelSelect) rombelSelect.removeAttribute("aria-invalid");
  }

  function showFormStatus(type, message) {
    if (!statusEl) return;
    statusEl.className = `form-status-msg ${type}`;
    statusEl.textContent = message;
    statusEl.style.display = "block";
  }

  function renderBoard() {
    listEl.innerHTML = "";
    countEl.textContent = `${commitments.length} komitmen`;
    emptyEl.style.display = commitments.length === 0 ? "block" : "none";
    if (clearBtn) {
      clearBtn.disabled = commitments.length === 0;
    }

    commitments.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "commitment-entry";

      const head = document.createElement("div");
      head.className = "commitment-entry-head";

      const titleWrap = document.createElement("div");
      const nameSpan = document.createElement("span");
      nameSpan.className = "commitment-entry-name";
      nameSpan.textContent = entry.name;

      const rombelSpan = document.createElement("span");
      rombelSpan.className = "commitment-entry-rombel";
      rombelSpan.textContent = entry.rombel;
      titleWrap.append(nameSpan, rombelSpan);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete-commit";
      deleteBtn.textContent = "Hapus";
      deleteBtn.setAttribute(
        "aria-label",
        `Hapus komitmen atas nama ${entry.name}`
      );
      deleteBtn.addEventListener("click", () => {
        commitments = commitments.filter((item) => item.id !== entry.id);
        writeStorage(STORAGE_KEYS.commitments, commitments);
        renderBoard();
        showFormStatus(
          "success",
          `Komitmen atas nama ${entry.name} dihapus dari daftar perangkat ini.`
        );
      });

      head.append(titleWrap, deleteBtn);

      const actionUl = document.createElement("ul");
      actionUl.className = "commitment-entry-actions";
      entry.actions.forEach((actText) => {
        const actLi = document.createElement("li");
        actLi.textContent = actText;
        actionUl.appendChild(actLi);
      });

      li.append(head, actionUl);

      if (entry.note) {
        const noteP = document.createElement("p");
        noteP.className = "commitment-entry-note";
        noteP.textContent = `Catatan: "${entry.note}"`;
        li.appendChild(noteP);
      }

      const timeP = document.createElement("p");
      timeP.className = "commitment-entry-time";
      timeP.textContent = `Dicatat pada ${entry.createdAt}`;
      li.appendChild(timeP);

      listEl.appendChild(li);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();
    if (statusEl) statusEl.style.display = "none";

    const nameVal = nameInput ? nameInput.value.trim() : "";
    const rombelVal = rombelSelect ? rombelSelect.value.trim() : "";
    const noteVal = noteInput ? noteInput.value.trim() : "";
    const checkedBoxes = form.querySelectorAll(
      'input[name="commitActions"]:checked'
    );
    const selectedActions = Array.from(checkedBoxes).map((cb) => cb.value);

    let firstInvalid = null;

    if (nameVal.length < 2) {
      if (nameError) {
        nameError.textContent =
          "Nama wajib diisi minimal 2 huruf sebelum menyimpan komitmen.";
      }
      if (nameInput) {
        nameInput.setAttribute("aria-invalid", "true");
        firstInvalid = firstInvalid || nameInput;
      }
    }

    if (!rombelVal) {
      if (rombelError) {
        rombelError.textContent = "Pilih rombel kelas atau peran di sekolah.";
      }
      if (rombelSelect) {
        rombelSelect.setAttribute("aria-invalid", "true");
        firstInvalid = firstInvalid || rombelSelect;
      }
    }

    if (selectedActions.length === 0) {
      if (actionsError) {
        actionsError.textContent =
          "Pilih minimal satu aksi hemat energi yang ingin kamu jalankan.";
      }
      const firstActionBox = form.querySelector('input[name="commitActions"]');
      firstInvalid = firstInvalid || firstActionBox;
    }

    if (firstInvalid) {
      showFormStatus(
        "error",
        "Periksa kembali kolom yang masih kosong sebelum menyimpan komitmen."
      );
      firstInvalid.focus();
      return;
    }

    const timestamp = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      name: nameVal,
      rombel: rombelVal,
      actions: selectedActions,
      note: noteVal,
      createdAt: timestamp
    };

    commitments.unshift(newEntry);
    writeStorage(STORAGE_KEYS.commitments, commitments);
    form.reset();
    renderBoard();
    showFormStatus(
      "success",
      `Komitmen ${newEntry.name} (${newEntry.rombel}) berhasil disimpan di daftar perangkat ini.`
    );
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (commitments.length === 0) return;
      commitments = [];
      writeStorage(STORAGE_KEYS.commitments, commitments);
      renderBoard();
      showFormStatus(
        "success",
        "Seluruh daftar komitmen di perangkat ini telah dikosongkan."
      );
    });
  }

  renderBoard();
}
