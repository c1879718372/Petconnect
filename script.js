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
      box.innerHTML = `<div class="small">If you are using VSCode Go Live, /api won't work. Test on your Vercel URL.</div>`;
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

    const top = document.createElement("div");
    top.className = "row";
    top.style.justifyContent = "space-between";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = item.type || "item";

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Remove";
    btn.addEventListener("click", async () => {
      try {
        await deleteFavoriteFromDB(item.id);
        await loadFavoritesFromDB();
      } catch (e) {
        alert("Remove failed: " + e.message);
      }
    });

    top.appendChild(badge);
    top.appendChild(btn);

    div.appendChild(top);

    // Show content
    const isImage =
      typeof item.value === "string" &&
      (item.value.startsWith("http://") || item.value.startsWith("https://")) &&
      (item.value.includes(".jpg") ||
        item.value.includes(".jpeg") ||
        item.value.includes(".png") ||
        item.value.includes("dog.ceo"));

    if (isImage) {
      const img = document.createElement("img");
      img.className = "media";
      img.style.height = "160px";
      img.style.marginTop = "8px";
      img.src = item.value;
      img.alt = item.type || "favorite";
      div.appendChild(img);
    } else {
      const p = document.createElement("div");
      p.className = "small";
      p.style.marginTop = "8px";
      p.textContent = item.value;
      div.appendChild(p);
    }

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
    await saveFavoriteToDB("dog", url);
    await loadFavoritesFromDB();
  });

  document.getElementById("btnSaveFact")?.addEventListener("click", async () => {
    const fact = document.getElementById("catFact")?.dataset.fact;
    if (!fact) return;
    await saveFavoriteToDB("fact", fact);
    await loadFavoritesFromDB();
  });

  // voice only on App/Breeds (per your request)
  setupVoice();
  if (window.annyang) annyang.start({ autoRestart: true, continuous: false });
}

async function initBreedsPage() {
  await loadBreedList();
  await loadBreedImage();

  // Optional: show favorites box on breeds page if exists
  if (document.getElementById("favoritesBox")) {
    await loadFavoritesFromDB();
  }

  document.getElementById("breedSearch")?.addEventListener("input", filterBreeds);
  document.getElementById("breedSelect")?.addEventListener("change", loadBreedImage);
  document.getElementById("btnBreed")?.addEventListener("click", loadBreedImage);

  document.getElementById("btnSaveBreed")?.addEventListener("click", async () => {
    const url = document.getElementById("breedImg")?.dataset.url;
    if (!url) return;
    await saveFavoriteToDB("breed", url);
    if (document.getElementById("favoritesBox")) {
      await loadFavoritesFromDB();
    }
  });

  // voice
  setupVoice();
  if (window.annyang) annyang.start({ autoRestart: true, continuous: false });
}


