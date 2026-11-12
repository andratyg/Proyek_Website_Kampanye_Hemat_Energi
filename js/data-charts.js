/**
 * Visualisasi Data & Fakta Perilaku Hemat Energi Siswa
 * Menggunakan Chart.js dan membaca data dari data-perilaku-energi.json
 * Kampanye Sadar Watt - SMK Wikrama Bogor
 */

document.addEventListener("DOMContentLoaded", () => {
  initDataPage();
});

const chartInstances = {};

async function initDataPage() {
  const loadingEl = document.getElementById("dataLoading");
  const errorEl = document.getElementById("dataError");
  const contentEl = document.getElementById("dataContent");

  try {
    const data = await loadEnergyData();
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "block";

    renderKpiSummary(data);
    renderCategoryChart(data);
    renderConcernChart(data);
    renderIndicatorsChart(data, "score");
    renderJurusanChart(data);
    renderDataTable(data.per_butir);

    setupQuickNav();
    setupIndicatorsSort(data);
    setupTableControls(data.per_butir);
  } catch (err) {
    console.error("Gagal memuat data perilaku energi:", err);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.style.display = "block";
      const errMsg = errorEl.querySelector(".error-detail");
      if (errMsg) {
        errMsg.textContent = err.message || "Pastikan file JSON dapat diakses.";
      }
    }
  }
}

/**
 * Membaca data dari data-perilaku-energi.json dengan fallback ke DATA_ENERGI (data-perilaku-energi.js)
 * Ini memastikan halaman berfungsi baik di server lokal (fetch) maupun saat file dibuka langsung (CORS restriction fallback).
 */
async function loadEnergyData() {
  try {
    const response = await fetch("data-perilaku-energi.json");
    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }
    return await response.json();
  } catch (fetchErr) {
    console.warn("Fetch JSON gagal, mencoba fallback objek DATA_ENERGI:", fetchErr);
    if (typeof DATA_ENERGI !== "undefined" && DATA_ENERGI.ringkasan) {
      return DATA_ENERGI;
    }
    throw new Error("Gagal mengambil data dari data-perilaku-energi.json maupun fallback data-perilaku-energi.js.");
  }
}

function renderKpiSummary(data) {
  const { meta, ringkasan } = data;

  const totalRespondenEl = document.getElementById("kpiTotalResponden");
  const rataRataSkorEl = document.getElementById("kpiRataRataSkor");
  const persenPositifEl = document.getElementById("kpiPersenPositif");
  const partisipasiEl = document.getElementById("kpiPartisipasi");

  if (totalRespondenEl) totalRespondenEl.textContent = `${meta.jumlah_responden} Siswa`;
  if (rataRataSkorEl) rataRataSkorEl.textContent = `${ringkasan.rata_rata_skor.toFixed(2)} / 4.00`;
  
  if (persenPositifEl) {
    const totalPositif = (ringkasan.kategori_persen["Sangat Baik"] || 0) + (ringkasan.kategori_persen["Baik"] || 0);
    persenPositifEl.textContent = `${totalPositif.toFixed(1)}%`;
  }

  if (partisipasiEl) partisipasiEl.textContent = `${meta.persen_partisipasi}%`;
}

const CHART_THEME = {
  fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
  colors: {
    forestDark: "#0c1f15",
    forest: "#133826",
    forestMid: "#1d4d35",
    forestSoft: "#eaf3ee",
    sage: "#3a6f53",
    amber: "#c87d1a",
    amberDark: "#8c4905",
    amberSoft: "#fef7ed",
    ink: "#141c17",
    inkMuted: "#4f6356",
    border: "#d4e0d8",
    danger: "#b93828"
  }
};

/**
 * 1. Grafik Distribusi Kategori Perilaku Siswa (Doughnut Chart)
 */
function renderCategoryChart(data) {
  const ctx = document.getElementById("chartCategory");
  if (!ctx) return;

  const kategori = data.ringkasan.kategori;
  const persen = data.ringkasan.kategori_persen;
  const labels = ["Sangat Baik (3.26 - 4.00)", "Baik (2.51 - 3.25)", "Cukup (1.76 - 2.50)", "Kurang (1.00 - 1.75)"];
  const values = [kategori["Sangat Baik"], kategori["Baik"], kategori["Cukup"], kategori["Kurang"]];
  const percentages = [persen["Sangat Baik"], persen["Baik"], persen["Cukup"], persen["Kurang"]];

  if (chartInstances.category) {
    chartInstances.category.destroy();
  }

  chartInstances.category = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            CHART_THEME.colors.forest,
            CHART_THEME.colors.sage,
            CHART_THEME.colors.amber,
            CHART_THEME.colors.danger
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: CHART_THEME.fontFamily, size: 12, weight: "500" },
            color: CHART_THEME.colors.ink,
            padding: 16,
            usePointStyle: true,
            pointStyle: "circle"
          }
        },
        tooltip: {
          backgroundColor: CHART_THEME.colors.forestDark,
          titleFont: { family: CHART_THEME.fontFamily, size: 13, weight: "700" },
          bodyFont: { family: CHART_THEME.fontFamily, size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              const count = context.raw || 0;
              const pct = percentages[context.dataIndex] || 0;
              return ` ${count} siswa (${pct}%)`;
            }
          }
        }
      },
      cutout: "62%"
    }
  });
}

/**
 * 2. Grafik Fokus Titik Rawan: Persentase Respon 'Jarang/Tidak Pernah' (Bar Chart)
 */
function renderConcernChart(data) {
  const ctx = document.getElementById("chartConcern");
  if (!ctx) return;

  const butir = [...data.per_butir].sort((a, b) => b.persen_jarang - a.persen_jarang);
  const labels = butir.map((b) => `${b.kode} (${b.label.slice(0, 24)}...)`);
  const values = butir.map((b) => b.persen_jarang);

  const colors = butir.map((b) => {
    if (b.persen_jarang >= 10) return CHART_THEME.colors.amber;
    return CHART_THEME.colors.sage;
  });

  if (chartInstances.concern) {
    chartInstances.concern.destroy();
  }

  chartInstances.concern = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Persentase Siswa Jarang / Tidak Pernah (%)",
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 16,
          grid: { color: "#e8ede9" },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 11 },
            color: CHART_THEME.colors.inkMuted,
            callback: (val) => val + "%"
          },
          title: {
            display: true,
            text: "Persentase Respon Jarang / Tidak Pernah (Skor 1 & 2)",
            font: { family: CHART_THEME.fontFamily, size: 12, weight: "600" },
            color: CHART_THEME.colors.inkMuted
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 11, weight: "500" },
            color: CHART_THEME.colors.ink
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_THEME.colors.forestDark,
          titleFont: { family: CHART_THEME.fontFamily, size: 13, weight: "700" },
          bodyFont: { family: CHART_THEME.fontFamily, size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              const item = butir[context.dataIndex];
              return [
                ` Jarang / Tidak Pernah: ${item.persen_jarang}%`,
                ` Rata-rata Skor: ${item.rata_rata.toFixed(2)} / 4.00`
              ];
            }
          }
        }
      }
    }
  });
}

/**
 * 3. Grafik Skor Rata-rata 10 Butir Indikator (Horizontal Bar Chart dengan Opsi Urut)
 */
function renderIndicatorsChart(data, sortBy = "score") {
  const ctx = document.getElementById("chartIndicators");
  if (!ctx) return;

  let butir = [...data.per_butir];
  if (sortBy === "score") {
    butir.sort((a, b) => b.rata_rata - a.rata_rata);
  } else {
    butir.sort((a, b) => a.id - b.id);
  }

  const labels = butir.map((b) => `${b.kode}: ${b.label}`);
  const scores = butir.map((b) => b.rata_rata);

  const backgroundColors = butir.map((b) => {
    if (b.kode === "P04" || b.kode === "P09") {
      return CHART_THEME.colors.amber;
    }
    if (b.kode === "P01" || b.kode === "P02" || b.kode === "P06") {
      return CHART_THEME.colors.forest;
    }
    return CHART_THEME.colors.sage;
  });

  if (chartInstances.indicators) {
    chartInstances.indicators.destroy();
  }

  chartInstances.indicators = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Rata-rata Skor (Skala 1 - 4)",
          data: scores,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 2.8,
          max: 4.0,
          grid: { color: "#e8ede9" },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 11 },
            color: CHART_THEME.colors.inkMuted,
            stepSize: 0.2
          },
          title: {
            display: true,
            text: "Rata-rata Skor Likert (Ambang Sangat Baik >= 3.26)",
            font: { family: CHART_THEME.fontFamily, size: 12, weight: "600" },
            color: CHART_THEME.colors.inkMuted
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 11, weight: "500" },
            color: CHART_THEME.colors.ink
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_THEME.colors.forestDark,
          titleFont: { family: CHART_THEME.fontFamily, size: 13, weight: "700" },
          bodyFont: { family: CHART_THEME.fontFamily, size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              const item = butir[context.dataIndex];
              return [
                ` Skor rata-rata: ${item.rata_rata.toFixed(2)} / 4.00`,
                ` Sering / Sangat Sering: ${item.persen_sering}%`,
                ` Jarang / Tidak Pernah: ${item.persen_jarang}%`
              ];
            }
          }
        }
      }
    }
  });
}

/**
 * 4. Grafik Rata-rata Skor per Konsentrasi Keahlian (Bar Chart Vertikal)
 */
function renderJurusanChart(data) {
  const ctx = document.getElementById("chartJurusan");
  if (!ctx) return;

  const jurusan = [...data.per_jurusan].sort((a, b) => b.rata_rata_skor - a.rata_rata_skor);
  const labels = jurusan.map((j) => j.kode);
  const scores = jurusan.map((j) => j.rata_rata_skor);

  const colors = jurusan.map((j) => {
    if (j.kode === "PMN") return CHART_THEME.colors.forest;
    if (j.kode === "PPLG" || j.kode === "MPLB") return CHART_THEME.colors.amber;
    return CHART_THEME.colors.sage;
  });

  if (chartInstances.jurusan) {
    chartInstances.jurusan.destroy();
  }

  chartInstances.jurusan = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Rata-rata Skor Jurusan",
          data: scores,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 3.0,
          max: 3.8,
          grid: { color: "#e8ede9" },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 11 },
            color: CHART_THEME.colors.inkMuted,
            stepSize: 0.1
          },
          title: {
            display: true,
            text: "Rata-rata Skor (Garis Acuan Sekolah: 3.36)",
            font: { family: CHART_THEME.fontFamily, size: 12, weight: "600" },
            color: CHART_THEME.colors.inkMuted
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: CHART_THEME.fontFamily, size: 12, weight: "700" },
            color: CHART_THEME.colors.forest
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_THEME.colors.forestDark,
          titleFont: { family: CHART_THEME.fontFamily, size: 13, weight: "700" },
          bodyFont: { family: CHART_THEME.fontFamily, size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            title: function (context) {
              const idx = context[0].dataIndex;
              const item = jurusan[idx];
              return `${item.kode} - ${item.nama}`;
            },
            label: function (context) {
              const idx = context.dataIndex;
              const item = jurusan[idx];
              const diff = (item.rata_rata_skor - 3.36).toFixed(2);
              const sign = diff >= 0 ? "+" : "";
              return [
                ` Rata-rata Skor: ${item.rata_rata_skor.toFixed(2)} (${sign}${diff} vs rata-rata sekolah)`,
                ` Responden: ${item.jumlah_responden} siswa`,
                ` Kategori Sangat Baik: ${item.kategori_persen["Sangat Baik"]}%`
              ];
            }
          }
        }
      }
    }
  });
}

/**
 * 5. Pengaturan Tombol Urut Indikator
 */
function setupIndicatorsSort(data) {
  const btnSortScore = document.getElementById("btnSortScore");
  const btnSortCode = document.getElementById("btnSortCode");
  if (!btnSortScore || !btnSortCode) return;

  btnSortScore.addEventListener("click", () => {
    btnSortScore.classList.add("active");
    btnSortScore.setAttribute("aria-pressed", "true");
    btnSortCode.classList.remove("active");
    btnSortCode.setAttribute("aria-pressed", "false");
    renderIndicatorsChart(data, "score");
  });

  btnSortCode.addEventListener("click", () => {
    btnSortCode.classList.add("active");
    btnSortCode.setAttribute("aria-pressed", "true");
    btnSortScore.classList.remove("active");
    btnSortScore.setAttribute("aria-pressed", "false");
    renderIndicatorsChart(data, "code");
  });
}

/**
 * 6. Pengaturan Navigasi Cepat Halaman Data
 */
function setupQuickNav() {
  const links = document.querySelectorAll(".quicknav-link");
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          links.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      }
    });
  });
}

/**
 * 7. Filter dan Pencarian Cepat Tabel Matriks
 */
function setupTableControls(allButir) {
  const searchInput = document.getElementById("tableSearchInput");
  const filterPills = document.querySelectorAll(".filter-pill");
  let currentFilter = "all";
  let currentSearch = "";

  function applyFilters() {
    let filtered = allButir.filter((item) => {
      const matchSearch =
        currentSearch === "" ||
        item.kode.toLowerCase().includes(currentSearch) ||
        item.label.toLowerCase().includes(currentSearch) ||
        item.pertanyaan.toLowerCase().includes(currentSearch);

      let matchCategory = true;
      if (currentFilter === "excellent") {
        matchCategory = item.rata_rata >= 3.26;
      } else if (currentFilter === "attention") {
        matchCategory = item.rata_rata < 3.26;
      }

      return matchSearch && matchCategory;
    });

    renderDataTable(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-filter") || "all";
      applyFilters();
    });
  });
}

function renderDataTable(items) {
  const tbody = document.getElementById("dataTableBody");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-ink-muted);">
          Tidak ditemukan butir kuesioner yang cocok dengan pencarian kata kunci.
        </td>
      </tr>
    `;
    return;
  }

  const rowsHtml = items.map((item) => {
    let categoryBadge = "badge-good";
    let categoryText = "Baik";

    if (item.rata_rata >= 3.26) {
      categoryBadge = "badge-excellent";
      categoryText = "Sangat Baik";
    } else if (item.rata_rata < 2.51) {
      categoryBadge = "badge-fair";
      categoryText = "Cukup";
    }

    return `
      <tr>
        <td class="col-code"><strong>${item.kode}</strong></td>
        <td class="col-question">
          <div class="table-question-title">${item.label}</div>
          <div class="table-question-desc">${item.pertanyaan}</div>
        </td>
        <td class="col-score"><strong>${item.rata_rata.toFixed(2)}</strong></td>
        <td class="col-pct">${item.persen_sering}%</td>
        <td class="col-status">
          <span class="status-pill ${categoryBadge}">${categoryText}</span>
        </td>
      </tr>
    `;
  }).join("");

  tbody.innerHTML = rowsHtml;
}
