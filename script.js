async function safeFetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ========= External APIs (Fetch) ========= */
// Fetch #1: Dog image
async function loadRandomDog() {
  const data = await safeFetchJSON("https://dog.ceo/api/breeds/image/random");
  const img = document.getElementById("dogImg");
  if (img) {
    img.src = data.message;
    img.dataset.url = data.message;
  }
}

// Fetch #2: Cat fact
async function loadCatFact() {
  const data = await safeFetchJSON("https://catfact.ninja/fact");
  const box = document.getElementById("catFact");
  if (box) {
    box.textContent = data.fact;
    box.dataset.fact = data.fact;
  }
}

// Fetch #3: Breed list + search
let BREEDS_CACHE = [];
async function loadBreedList() {
  const data = await safeFetchJSON("https://dog.ceo/api/breeds/list/all");
  BREEDS_CACHE = Object.keys(data.message || {}).sort();
  renderBreedOptions(BREEDS_CACHE);
}

function renderBreedOptions(list) {
  const select = document.getElementById("breedSelect");
  if (!select) return;
  select.innerHTML = "";
  list.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

function filterBreeds() {
  const q = (document.getElementById("breedSearch")?.value || "")
    .toLowerCase()
    .trim();
  const filtered = BREEDS_CACHE.filter((b) => b.includes(q));
  renderBreedOptions(filtered);
}

async function loadBreedImage() {
  const breed = document.getElementById("breedSelect")?.value;
  if (!breed) return;
  const data = await safeFetchJSON(
    `https://dog.ceo/api/breed/${breed}/images/random`
  );
  const img = document.getElementById("breedImg");
  if (img) {
    img.src = data.message;
    img.dataset.url = data.message;
    img.dataset.breed = breed;
  }
}

/* ========= Your Backend API (Supabase via Vercel) ========= */
async function loadFavoritesFromDB() {
  const box = document.getElementById("favoritesBox");
  if (box) box.innerHTML = `<div class="small">Loading favorites...</div>`;

  try {
    const data = await safeFetchJSON("/api/favorites"); // GET
    renderFavorites(data.favorites || []);
  } catch (e) {
    console.error(e);
    if (box)
      box.innerHTML = `<div class="small">Favorites DB works after Vercel deploy. (Local Go Live may not support /api)</div>`;
  }
}

async function saveFavoriteToDB(type, value) {
  return await safeFetchJSON("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, value }),
  });
}

async function deleteFavoriteFromDB(id) {
  return await safeFetchJSON(`/api/favorites?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

function escapeHTML(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderFavorites(favs) {
  const box = document.getElementById("favoritesBox");
  if (!box) return;

  if (!favs.length) {
    box.innerHTML = `<div class="small">No favorites saved yet.</div>`;
    return;
  }

  box.innerHTML = "";
  favs.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.boxShadow = "none";

    const isDogImage = item.type === "dog";

    div.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:center;">
        <div class="badge">${escapeHTML(item.type)}</div>
        <button class="btn" data-del="${item.id}">Remove</button>
      </div>
      ${
        isDogImage
          ? `<img class="media" style="height:160px;margin-top:8px" src="${escapeHTML(
              item.value
            )}" alt="dog">`
          : `<div class="small" style="margin-top:8px">${escapeHTML(
              item.value
            )}</div>`
      }
    `;

    div.querySelector("[data-del]")?.addEventListener("click", async () => {
      try {
        await deleteFavoriteFromDB(item.id);
        await loadFavoritesFromDB();
      } catch (e) {
        alert("Remove failed: " + e.message);
      }
    });

    box.appendChild(div);
  });
}

/* ========= JS Library #1: annyang (voice) ========= */
function setupVoice() {
  if (!window.annyang) return;

  const commands = {
    "new dog": () => loadRandomDog(),
    "new fact": () => loadCatFact(),
    "go home": () => (window.location.href = "index.html"),
    "go app": () => (window.location.href = "app.html"),
    "go breeds": () => (window.location.href = "breeds.html"),
    "go about": () => (window.location.href = "about.html"),
  };

  annyang.removeCommands();
  annyang.addCommands(commands);
}

/* ========= Page init ========= */
async function initAppPage() {
  await loadRandomDog();
  await loadCatFact();
  await loadFavoritesFromDB();

  document.getElementById("btnNewDog")?.addEventListener("click", loadRandomDog);
  document.getElementById("btnNewFact")?.addEventListener("click", loadCatFact);

  document.getElementById("btnSaveDog")?.addEventListener("click", async () => {
    const url = document.getElementById("dogImg")?.dataset.url;
    if (!url) return;
    try {
      await saveFavoriteToDB("dog", url);
      await loadFavoritesFromDB();
    } catch (e) {
      alert("Save Dog failed: " + e.message);
    }
  });

  document.getElementById("btnSaveFact")?.addEventListener("click", async () => {
    const fact = document.getElementById("catFact")?.dataset.fact;
    if (!fact) return;
    try {
      await saveFavoriteToDB("fact", fact);
      await loadFavoritesFromDB();
    } catch (e) {
      alert("Save Fact failed: " + e.message);
    }
  });

  setupVoice();
  if (window.annyang) annyang.start({ autoRestart: true, continuous: false });
}

async function initBreedsPage() {
  await loadBreedList();
  await loadBreedImage();

  document.getElementById("breedSearch")?.addEventListener("input", filterBreeds);
  document.getElementById("breedSelect")?.addEventListener("change", loadBreedImage);
  document.getElementById("btnBreed")?.addEventListener("click", loadBreedImage);

  // Save current breed image into favorites as type "dog" (so it renders as image)
  document.getElementById("btnSaveBreed")?.addEventListener("click", async () => {
    const url = document.getElementById("breedImg")?.dataset.url;
    if (!url) return;
    try {
      await saveFavoriteToDB("dog", url);
      alert("Saved!");
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  });

  setupVoice();
  if (window.annyang) annyang.start({ autoRestart: true, continuous: false });
}

function initCommonPage() {
  setupVoice();
  if (window.annyang) annyang.start({ autoRestart: true, continuous: false });
}

// expose to HTML inline calls
window.initAppPage = initAppPage;
window.initBreedsPage = initBreedsPage;
window.initCommonPage = initCommonPage;
