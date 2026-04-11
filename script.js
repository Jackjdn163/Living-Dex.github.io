/* ============================================================
   ELEMENT REFERENCES
   ============================================================ */
const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const shinyToggle = document.getElementById("shinyToggle");
const sortSelect = document.getElementById("sortSelect");
const darkToggle = document.getElementById("darkModeToggle");

/* Reset popup */
const resetPopup = document.getElementById("resetPopup");
const confirmReset = document.getElementById("confirmReset");
const cancelReset = document.getElementById("cancelReset");

/* Loading screen */
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const loadingDots = document.getElementById("loadingDots");
const pokeball = document.querySelector(".pokeball");
const pokeballCenter = document.querySelector(".pokeball-center");

/* Per-generation progress */
const genProgressEls = {
    1: document.getElementById("gen1Progress"),
    2: document.getElementById("gen2Progress"),
    3: document.getElementById("gen3Progress"),
    4: document.getElementById("gen4Progress"),
    5: document.getElementById("gen5Progress"),
    6: document.getElementById("gen6Progress"),
    7: document.getElementById("gen7Progress"),
    8: document.getElementById("gen8Progress"),
    9: document.getElementById("gen9Progress"),
};

/* Google Sheet */
const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

let tasks = [];
let dotInterval;

/* ============================================================
   HELPERS
   ============================================================ */
function padDex(num) {
    return num.toString().padStart(3, "0");
}

function getGeneration(n) {
    n = parseInt(n);
    if (n <= 151) return 1;
    if (n <= 251) return 2;
    if (n <= 386) return 3;
    if (n <= 493) return 4;
    if (n <= 649) return 5;
    if (n <= 721) return 6;
    if (n <= 809) return 7;
    if (n <= 898) return 8;
    return 9;
}

/* ============================================================
   STORAGE
   ============================================================ */

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasksFromStorage() {
    const raw = localStorage.getItem("tasks");
    if (!raw) {
        tasks = [];
        return;
    }
    try {
        tasks = JSON.parse(raw);
    } catch {
        tasks = [];
    }
}

/* ============================================================
   PROGRESS
   ============================================================ */

function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total ? ((caught / total) * 100).toFixed(2) : "0.00";
    progressDisplay.textContent = `${percent}% complete`;
}

function updateGenProgress() {
    const totals = {};
    const caught = {};

    tasks.forEach(t => {
        totals[t.gen] = (totals[t.gen] || 0) + 1;
        if (t.completed) caught[t.gen] = (caught[t.gen] || 0) + 1;
    });

    Object.keys(genProgressEls).forEach(g => {
        const total = totals[g] || 0;
        const c = caught[g] || 0;
        const percent = total ? ((c / total) * 100).toFixed(2) : "0.00";
        genProgressEls[g].textContent = `Gen ${g}: ${percent}%`;
    });
}

function updateAllProgress() {
    updateOverallProgress();
    updateGenProgress();
}

/* ============================================================
   SORTING
   ============================================================ */

function getSortedTasks() {
    const mode = sortSelect.value;
    const arr = [...tasks];

    if (mode === "name") {
        arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "caught") {
        arr.sort((a, b) => (b.completed - a.completed) || (Number(a.dexRaw) - Number(b.dexRaw)));
    } else if (mode === "uncaught") {
        arr.sort((a, b) => (a.completed - b.completed) || (Number(a.dexRaw) - Number(b.dexRaw)));
    } else {
        arr.sort((a, b) => Number(a.dexRaw) - Number(b.dexRaw));
    }

    return arr;
}

/* ============================================================
   RENDER LIST
   ============================================================ */

function renderTasks() {
    const search = searchBar.value.toLowerCase();
    taskList.innerHTML = "";

    const shiny = shinyToggle.checked;
    const sorted = getSortedTasks();

    sorted.forEach(task => {
        if (
            !task.name.toLowerCase().includes(search) &&
            !task.dex.includes(search) &&
            !task.dexRaw.includes(search)
        ) return;

        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        const sprite = shiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${task.dexRaw}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png`;

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = sprite;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        // Three dots button
        const moreBtn = document.createElement("button");
        moreBtn.className = "more-btn";
        moreBtn.textContent = "⋮";

        moreBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            openInfoPanel(task);
        });

        li.addEventListener("click", () => {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        });

        li.appendChild(img);
        li.appendChild(label);
        li.appendChild(moreBtn);

        taskList.appendChild(li);
    });

    updateAllProgress();
}
/* ============================================================
   LOADING SCREEN LOGIC
   ============================================================ */

function startLoadingDots() {
    let count = 1;
    dotInterval = setInterval(() => {
        loadingDots.textContent = ".".repeat(count);
        count = count === 3 ? 1 : count + 1;
    }, 400);
}

function stopLoadingDots() {
    clearInterval(dotInterval);
}

async function finishLoadingAnimation() {
    stopLoadingDots();

    loadingText.classList.add("fade-out");
    pokeball.classList.add("finish-spin");

    // Shake animation
    setTimeout(() => {
        pokeball.classList.add("shake");
    }, 200);

    // Green flash
    setTimeout(() => {
        pokeballCenter.classList.add("catch");
    }, 300);

    // Fade out loading screen
    setTimeout(() => {
        loadingScreen.classList.add("fade-out");
        loadingScreen.style.pointerEvents = "none";
    }, 900);
}

/* ============================================================
   IMPORT FROM SHEET
   ============================================================ */

async function importFromSheet() {
    const response = await fetch(GOOGLE_SHEET_URL);
    const csv = await response.text();
    const rows = csv.split("\n").slice(1);

    const newTasks = [];

    for (const row of rows) {
        if (!row.trim()) continue;

        const cols = row.split(",");
        const dexRaw = cols[0]?.trim();
        const name = cols[1]?.trim();

        if (!dexRaw || !name) continue;

        const dex = padDex(dexRaw);
        const gen = getGeneration(dexRaw);

        newTasks.push({
            dex,
            dexRaw,
            name,
            gen,
            completed: false
        });
    }

    tasks = newTasks;
    saveTasks();
    renderTasks();
}

/* ============================================================
   RESET POPUP LOGIC
   ============================================================ */

resetBtn.addEventListener("click", () => {
    resetPopup.classList.remove("hidden");
});

cancelReset.addEventListener("click", () => {
    resetPopup.classList.add("hidden");
});

confirmReset.addEventListener("click", async () => {
    resetPopup.classList.add("hidden");

    localStorage.removeItem("tasks");
    tasks = [];

    progressDisplay.textContent = "0.00% complete";
    Object.values(genProgressEls).forEach(el => {
        el.textContent = el.textContent.replace(/(\d+(\.\d+)?)%/, "0.00%");
    });

    await importFromSheet();
});

/* ============================================================
   DARK MODE INSTANT UPDATE
   ============================================================ */

darkToggle.addEventListener("change", () => {
    const isDark = darkToggle.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("darkMode", isDark ? "1" : "0");

    if (!loadingScreen.classList.contains("fade-out")) {
        loadingScreen.style.background = isDark ? "#1a1a1a" : "#ffffff";
    }

    renderTasks();
});

if (localStorage.getItem("darkMode") === "1") {
    document.body.classList.add("dark");
    darkToggle.checked = true;
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

searchBar.addEventListener("input", renderTasks);

shinyToggle.addEventListener("change", () => {
    renderTasks();
});

sortSelect.addEventListener("change", () => {
    renderTasks();
});

/* ============================================================
   RIGHT-SIDE INFO PANEL
   ============================================================ */

function openInfoPanel(task) {
    const panel = document.getElementById("infoPanel");
    const content = document.getElementById("infoContent");

    content.innerHTML = `
        <h2>#${task.dex} — ${task.name}</h2>
        <p>More info coming soon...</p>
    `;

    panel.classList.add("open");
}

document.getElementById("closeInfoPanel").addEventListener("click", () => {
    document.getElementById("infoPanel").classList.remove("open");
});

/* ============================================================
   INITIAL LOAD
   ============================================================ */

async function init() {
    startLoadingDots();

    const startTime = Date.now();

    loadTasksFromStorage();

    if (tasks.length === 0) {
        await importFromSheet();
    } else {
        tasks.forEach(t => {
            if (!t.gen) t.gen = getGeneration(t.dexRaw);
        });
        renderTasks();
    }

    const elapsed = Date.now() - startTime;
    const minDuration = 5000;

    if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
    }

    await finishLoadingAnimation();
}

init();
