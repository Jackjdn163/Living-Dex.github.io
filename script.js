/* ============================================================
   ELEMENT REFERENCES
   ============================================================ */
const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const resetBtn = document.getElementById("resetBtn");
const shinyToggle = document.getElementById("shinyToggle");
const sortSelect = document.getElementById("sortSelect");
const darkToggle = document.getElementById("darkModeToggle");
const resetPopup = document.getElementById("resetPopup");
const confirmReset = document.getElementById("confirmReset");
const cancelReset = document.getElementById("cancelReset");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const loadingDots = document.getElementById("loadingDots");
const pokeball = document.querySelector(".pokeball");
const pokeballCenter = document.querySelector(".pokeball-center");
const randomBtn = document.getElementById("randomBtn");

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

let tasks = [];
let dotInterval;

/* ============================================================
   HELPERS
   ============================================================ */
const preserveScroll = fn => {
    const y = window.scrollY;
    fn();
    window.scrollTo(0, y);
};

const padDex = n => n.toString().padStart(3, "0");

function getGeneration(n) {
    n = +n;
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

function formatPokemonName(name) {
    if (!name) return "";
    name = name.toLowerCase();
    const special = {
        "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", "mr-mime": "Mr. Mime",
        "mime-jr": "Mime Jr.", "type-null": "Type: Null", "ho-oh": "Ho-Oh",
        "porygon-z": "Porygon-Z", "farfetchd": "Farfetch’d", "sirfetchd": "Sirfetch’d",
        "jangmo-o": "Jangmo-o", "hakamo-o": "Hakamo-o", "kommo-o": "Kommo-o",
        "flabebe": "Flabébé"
    };
    if (special[name]) return special[name];
    return name.split("-").map(p => p[0].toUpperCase() + p.slice(1)).join(" ");
}

/* ============================================================
   TYPE ICONS + COLORS (unchanged)
   ============================================================ */
const typeIconSrc = t => `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg`;
const typeColors = { /* ... your existing typeColors object ... */ };
const getTypeColor = t => typeColors[t] || "#888";

/* ============================================================
   STORAGE (unchanged)
   ============================================================ */
const saveTasks = () => localStorage.setItem("tasks", JSON.stringify(tasks));
const loadTasksFromStorage = () => {
    const raw = localStorage.getItem("tasks");
    tasks = raw ? JSON.parse(raw) : [];
};

/* ============================================================
   PROGRESS BARS – now show caught/total
   ============================================================ */
function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total ? (caught / total) * 100 : 0;
    const row = document.getElementById("fullDexRow");
    row.querySelector(".fullDexFill").style.width = percent + "%";
    row.querySelector(".fullDexPercent").textContent = `${caught}/${total} (${percent.toFixed(2)}%)`;
    row.classList.toggle("completed", percent >= 100);
}

function updateGenProgress() {
    const totals = {};
    const caught = {};
    for (const t of tasks) {
        totals[t.gen] = (totals[t.gen] || 0) + 1;
        if (t.completed) caught[t.gen] = (caught[t.gen] || 0) + 1;
    }
    document.querySelectorAll(".genRow").forEach(row => {
        const gen = row.dataset.gen;
        const total = totals[gen] || 0;
        const c = caught[gen] || 0;
        const percent = total ? (c / total) * 100 : 0;
        row.querySelector(".genPercent").textContent = `${c}/${total} (${percent.toFixed(2)}%)`;
        row.querySelector(".genFill").style.width = percent + "%";
    });
}

const updateAllProgress = () => {
    updateOverallProgress();
    updateGenProgress();
};

/* ============================================================
   SORTING (unchanged)
   ============================================================ */
function getSortedTasks() {
    const mode = sortSelect.value;
    return [...tasks].sort((a, b) => {
        if (mode === "name") return a.name.localeCompare(b.name);
        if (mode === "caught") return (b.completed - a.completed) || (a.dexRaw - b.dexRaw);
        if (mode === "uncaught") return (a.completed - b.completed) || (a.dexRaw - b.dexRaw);
        return a.dexRaw - b.dexRaw;
    });
}

/* ============================================================
   NEW GRID RENDER (3-column responsive cards)
   ============================================================ */
function renderTasks() {
    const search = searchBar.value.toLowerCase();
    const shiny = shinyToggle.checked;
    const sorted = getSortedTasks();

    taskList.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const task of sorted) {
        if (!task.name.toLowerCase().includes(search) &&
            !task.dex.includes(search) &&
            !task.dexRaw.includes(search)) continue;

        const normalUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png`;
        const shinyUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${task.dexRaw}.png`;

        const card = document.createElement("div");
        card.className = `pokemon-card ${task.completed ? "completed" : ""}`;
        card.innerHTML = `
            <img class="sprite" src="${shiny ? shinyUrl : normalUrl}" alt="${task.name}">
            <div class="card-info">
                <strong>#${task.dex}</strong>
                <span>${formatPokemonName(task.name)}</span>
            </div>
            <button class="more-btn">⋮</button>
        `;

        // Toggle caught on card click
        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("more-btn")) return;
            const wasCompleted = task.completed;
            task.completed = !task.completed;
            card.classList.remove("check-anim", "uncheck-anim");
            void card.offsetWidth;
            card.classList.add(wasCompleted ? "uncheck-anim" : "check-anim");
            saveTasks();
            setTimeout(() => preserveScroll(renderTasks), 250);
        });

        // More info button
        card.querySelector(".more-btn").addEventListener("click", e => {
            e.stopPropagation();
            openInfoPanel(task);
        });

        frag.appendChild(card);
    }

    taskList.appendChild(frag);
    updateAllProgress();
}

/* ============================================================
   LOADING SCREEN (polished)
   ============================================================ */
function startLoadingDots() { /* unchanged */ }
const stopLoadingDots = () => clearInterval(dotInterval);

async function finishLoadingAnimation() { /* unchanged */ }

/* ============================================================
   EVOLUTION & INFO PANEL (unchanged – kept exactly as you had)
   ============================================================ */
async function fetchEvolutionData(dexNumber) { /* your original code */ }
function parseEvolutionChain(chain, dexNumber) { /* your original code */ }
function formatEvolutionMethod(method) { /* your original code */ }

/* ============================================================
   IMPORT FROM SHEET (unchanged)
   ============================================================ */
async function importFromSheet() { /* your original code */ }

/* ============================================================
   RESET POPUP – now with nice animation
   ============================================================ */
resetBtn.addEventListener("click", () => resetPopup.classList.remove("hidden"));
cancelReset.addEventListener("click", () => resetPopup.classList.add("hidden"));

confirmReset.addEventListener("click", async () => {
    resetPopup.classList.add("hidden");
    taskList.classList.add("resetting");           // ← animation trigger
    localStorage.removeItem("tasks");
    tasks = [];
    await importFromSheet();
    taskList.classList.remove("resetting");
});

/* ============================================================
   DARK MODE (unchanged)
   ============================================================ */
darkToggle.addEventListener("change", () => { /* your original code */ });
if (localStorage.getItem("darkMode") === "1") { /* your original code */ }

/* ============================================================
   INFO PANEL (unchanged)
   ============================================================ */
async function openInfoPanel(task) { /* your original full function */ }
document.getElementById("closeInfoPanel").addEventListener("click", () => { /* your original code */ });

/* ============================================================
   RANDOM UNCAUGHT BUTTON
   ============================================================ */
function getRandomUncaught() {
    const uncaught = tasks.filter(t => !t.completed);
    if (uncaught.length === 0) {
        alert("🎉 Congratulations! You've completed your entire Living Dex!");
        return;
    }
    const randomTask = uncaught[Math.floor(Math.random() * uncaught.length)];
    renderTasks();
    const cards = Array.from(taskList.children);
    const targetCard = cards.find(card => 
        card.querySelector("strong").textContent === `#${randomTask.dex}`
    );
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        targetCard.style.boxShadow = "0 0 0 6px #4ade80";
        setTimeout(() => targetCard.style.boxShadow = "", 2000);
    }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
searchBar.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);
shinyToggle.addEventListener("change", renderTasks);
randomBtn.addEventListener("click", getRandomUncaught);

/* ============================================================
   INITIAL LOAD
   ============================================================ */
async function init() {
    startLoadingDots();
    loadingText.textContent = "Catching Pokémon for your Living Dex..."; // nicer text
    const start = performance.now();
    loadTasksFromStorage();
    if (tasks.length === 0) {
        await importFromSheet();
    } else {
        for (const t of tasks) {
            if (!t.gen) t.gen = getGeneration(t.dexRaw);
        }
        renderTasks();
    }
    const elapsed = performance.now() - start;
    const min = 5000;
    if (elapsed < min) await new Promise(r => setTimeout(r, min - elapsed));
    await finishLoadingAnimation();
}

init();
