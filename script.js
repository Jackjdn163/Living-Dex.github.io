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
const pokeballCenter = document.querySelector(".pokeball-button");

const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

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
        "nidoran-f": "Nidoran♀",
        "nidoran-m": "Nidoran♂",
        "mr-mime": "Mr. Mime",
        "mime-jr": "Mime Jr.",
        "type-null": "Type: Null",
        "ho-oh": "Ho-Oh",
        "porygon-z": "Porygon-Z",
        "farfetchd": "Farfetch’d",
        "sirfetchd": "Sirfetch’d",
        "jangmo-o": "Jangmo-o",
        "hakamo-o": "Hakamo-o",
        "kommo-o": "Kommo-o",
        "flabebe": "Flabébé"
    };

    if (special[name]) return special[name];

    return name
        .split("-")
        .map(p => p[0].toUpperCase() + p.slice(1))
        .join(" ");
}

/* ============================================================
   TYPE ICONS + COLORS
   ============================================================ */
const typeIconSrc = t =>
`https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t}.svg`;

const typeColors = {
    normal:"#A8A77A", fire:"#EE8130", water:"#6390F0", electric:"#F7D02C",
    grass:"#7AC74C", ice:"#96D9D6", fighting:"#C22E28", poison:"#A33EA1",
    ground:"#E2BF65", flying:"#A98FF3", psychic:"#F95587", bug:"#A6B91A",
    rock:"#B6A136", ghost:"#735797", dragon:"#6F35FC", dark:"#705746",
    steel:"#B7B7CE", fairy:"#D685AD"
};

const getTypeColor = t => typeColors[t] || "#888";

/* ============================================================
   STORAGE
   ============================================================ */
const saveTasks = () =>
    localStorage.setItem("tasks", JSON.stringify(tasks));

const loadTasksFromStorage = () => {
    const raw = localStorage.getItem("tasks");
    tasks = raw ? JSON.parse(raw) : [];
};

/* ============================================================
   PROGRESS BARS
   ============================================================ */
function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total ? (caught / total) * 100 : 0;

    const row = document.getElementById("fullDexRow");
    row.querySelector(".fullDexFill").style.width = percent + "%";
    row.querySelector(".fullDexPercent").textContent = percent.toFixed(2) + "%";

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

        row.querySelector(".genPercent").textContent = percent.toFixed(2) + "%";
        row.querySelector(".genFill").style.width = percent + "%";
    });
}

const updateAllProgress = () => {
    updateOverallProgress();
    updateGenProgress();
};

/* ============================================================
   SORTING
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
   RENDER LIST
   ============================================================ */
function renderTasks() {
    const search = searchBar.value.toLowerCase();
    const shiny = shinyToggle.checked;
    const sorted = getSortedTasks();

    taskList.innerHTML = "";

    const frag = document.createDocumentFragment();

    for (const task of sorted) {
        if (
            !task.name.toLowerCase().includes(search) &&
            !task.dex.includes(search) &&
            !task.dexRaw.includes(search)
        ) continue;

        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = shiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${task.dexRaw}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png`;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${formatPokemonName(task.name)}`;

        const moreBtn = document.createElement("button");
        moreBtn.className = "more-btn";
        moreBtn.textContent = "⋮";
        moreBtn.addEventListener("click", e => {
            e.stopPropagation();
            openInfoPanel(task);
        });

        li.addEventListener("click", () => {
            const wasCompleted = task.completed;
            task.completed = !task.completed;

            li.classList.remove("check-anim", "uncheck-anim");
            void li.offsetWidth;

            li.classList.add(wasCompleted ? "uncheck-anim" : "check-anim");

            saveTasks();

            setTimeout(() => preserveScroll(renderTasks), 250);
        });

        li.append(img, label, moreBtn);
        frag.appendChild(li);
    }

    taskList.appendChild(frag);
    updateAllProgress();
}

/* ============================================================
   LOADING SCREEN
   ============================================================ */
function startLoadingDots() {
    let count = 1;
    dotInterval = setInterval(() => {
        loadingDots.textContent = ".".repeat(count);
        count = count === 3 ? 1 : count + 1;
    }, 400);
}

const stopLoadingDots = () => clearInterval(dotInterval);

async function finishLoadingAnimation() {
    stopLoadingDots();

    loadingText.classList.add("fade-out");
    pokeball.classList.add("finish-spin");

    setTimeout(() => pokeball.classList.add("shake"), 200);
    setTimeout(() => pokeballCenter.classList.add("catch"), 300);

    setTimeout(() => {
        loadingScreen.classList.add("fade-out");
        loadingScreen.style.pointerEvents = "none";
    }, 900);
}

/* ============================================================
   EVOLUTION FETCHING
   ============================================================ */
async function fetchEvolutionData(dexNumber) {
    try {
        const speciesData = await (await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`)).json();
        const evoData = await (await fetch(speciesData.evolution_chain.url)).json();
        return parseEvolutionChain(evoData.chain, String(dexNumber));
    } catch {
        return { prev: null, next: null };
    }
}

function parseEvolutionChain(chain, dexNumber) {
    let prev = null, next = null;

    function search(node, parent) {
        const id = node.species.url.split("/").slice(-2, -1)[0];

        if (id === dexNumber) {
            if (parent) prev = parent;

            if (node.evolves_to.length > 0) {
                const evo = node.evolves_to[0];
                next = {
                    id: evo.species.url.split("/").slice(-2, -1)[0],
                    name: evo.species.name,
                    method: evo.evolution_details[0]
                };
            }
        }

        for (const evo of node.evolves_to) {
            search(evo, {
                id,
                name: node.species.name,
                method: evo.evolution_details[0]
            });
        }
    }

    search(chain, null);
    return { prev, next };
}

function formatEvolutionMethod(method) {
    if (!method) return "Unknown";

    const t = method.trigger.name;

    if (t === "level-up") {
        if (method.min_level) return `Level ${method.min_level}`;
        if (method.min_happiness) return "Friendship";
        if (method.time_of_day) return `Level up at ${method.time_of_day}`;
        return "Level up";
    }

    if (t === "use-item") return method.item.name.replace("-", " ");
    if (t === "trade") return "Trade";

    return t.replace("-", " ");
}

/* ============================================================
   IMPORT FROM SHEET
   ============================================================ */
async function importFromSheet() {
    const csv = await (await fetch(GOOGLE_SHEET_URL)).text();
    const rows = csv.split("\n").slice(1);

    tasks = rows
        .filter(Boolean)
        .map(row => {
            const [dexRaw, name] = row.split(",");
            const clean = dexRaw.trim();
            return {
                dexRaw: clean,
                dex: padDex(clean),
                name: name.trim(),
                gen: getGeneration(clean),
                completed: false
            };
        });

    saveTasks();
    renderTasks();
}

/* ============================================================
   RESET POPUP
   ============================================================ */
resetBtn.addEventListener("click", () =>
    resetPopup.classList.remove("hidden")
);

cancelReset.addEventListener("click", () =>
    resetPopup.classList.add("hidden")
);

confirmReset.addEventListener("click", async () => {
    resetPopup.classList.add("hidden");
    localStorage.removeItem("tasks");
    tasks = [];
    await importFromSheet();
});

/* ============================================================
   DARK MODE
   ============================================================ */
darkToggle.addEventListener("change", () => {
    const isDark = darkToggle.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("darkMode", isDark ? "1" : "0");
    renderTasks();
});

if (localStorage.getItem("darkMode") === "1") {
    document.body.classList.add("dark");
    darkToggle.checked = true;
}

/* ============================================================
   INFO PANEL
   ============================================================ */
async function openInfoPanel(task) {
    const panel = document.getElementById("infoPanel");
    const content = document.getElementById("infoContent");

    if (panel.classList.contains("open")) {
        content.classList.add("fading");
        await new Promise(r => setTimeout(r, 150));
    }

    document.getElementById("infoSprite").innerHTML =
        `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png">`;

    document.getElementById("infoName").textContent =
        `#${task.dex} — ${formatPokemonName(task.name)}`;

    document.getElementById("infoGames").innerHTML =
        `<p style="opacity:0.5; text-align:center;">No game data</p>`;

    const infoTypes = document.getElementById("infoTypes");
    infoTypes.innerHTML = "";

    fetch(`https://pokeapi.co/api/v2/pokemon/${task.dexRaw}`)
        .then(r => r.json())
        .then(data => {
            for (const t of data.types) {
                const typeName = t.type.name;

                const badge = document.createElement("div");
                badge.className = "typeBadge";
                badge.style.backgroundColor = getTypeColor(typeName);

                const icon = document.createElement("img");
                icon.src = typeIconSrc(typeName);

                badge.appendChild(icon);
                infoTypes.appendChild(badge);
            }
        });

    const evoBox = document.getElementById("infoEvolutions");
    evoBox.innerHTML = "Loading evolution data...";

    try {
        const evo = await fetchEvolutionData(task.dexRaw);
        evoBox.innerHTML = "";

        if (evo.prev) {
            evoBox.innerHTML += `
                <div class="evoLabel">Evolves From</div>
                <div class="evoBox">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.prev.id}.png">
                    <div>
                        <strong>${formatPokemonName(evo.prev.name)}</strong><br>
                        <span class="evoMethod">${formatEvolutionMethod(evo.prev.method)}</span>
                    </div>
                </div>`;
        }

        if (evo.next) {
            evoBox.innerHTML += `
                <div class="evoLabel">Evolves Into</div>
                <div class="evoBox">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.next.id}.png">
                    <div>
                        <strong>${formatPokemonName(evo.next.name)}</strong><br>
                        <span class="evoMethod">${formatEvolutionMethod(evo.next.method)}</span>
                    </div>
                </div>`;
        }

        if (!evo.prev && !evo.next) {
            evoBox.innerHTML =
                `<p style="opacity:0.5; text-align:center;">No evolution data</p>`;
        }
    } catch {
        evoBox.innerHTML =
            `<p style="opacity:0.5; text-align:center;">Error loading evolution data</p>`;
    }

    content.classList.remove("fading");
    panel.classList.add("open");
}

document.getElementById("closeInfoPanel").addEventListener("click", () => {
    const panel = document.getElementById("infoPanel");
    const content = document.getElementById("infoContent");

    content.classList.add("fading");
    panel.classList.remove("open");

    setTimeout(() => content.classList.remove("fading"), 300);
});

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
searchBar.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);
shinyToggle.addEventListener("change", renderTasks);

// ====================== RANDOM UNCAUGHT FEATURE ======================
function pickRandomUncaught() {
    const uncaught = tasks.filter(t => !t.completed);
    
    if (uncaught.length === 0) {
        alert("🎉 Congratulations! You've caught everything in your Living Dex!");
        return;
    }

    // Pick one at random
    const randomTask = uncaught[Math.floor(Math.random() * uncaught.length)];

    // Re-render so everything is up to date
    renderTasks();

    // Scroll to the Pokémon and highlight it temporarily
    setTimeout(() => {
        const listItems = document.querySelectorAll('#taskList li');
        const targetLi = Array.from(listItems).find(li => 
            li.textContent.includes(`#${randomTask.dex} —`)
        );

        if (targetLi) {
            targetLi.scrollIntoView({ behavior: "smooth", block: "center" });
            
            // Nice highlight animation (reuses your existing animation classes)
            targetLi.classList.add("highlight-flash");
            setTimeout(() => {
                targetLi.classList.remove("highlight-flash");
            }, 1800);
        }

        // Optional: auto-open the info panel for the random mon
        // openInfoPanel(randomTask);   // uncomment if you want this
    }, 100);
}

// Add event listener (put this with your other button listeners)
document.getElementById("randomUncaughtBtn").addEventListener("click", pickRandomUncaught);
/* ============================================================
   INITIAL LOAD
   ============================================================ */
async function init() {
    startLoadingDots();

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
