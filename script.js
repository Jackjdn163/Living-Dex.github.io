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

const resetPopup = document.getElementById("resetPopup");
const confirmReset = document.getElementById("confirmReset");
const cancelReset = document.getElementById("cancelReset");

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const loadingDots = document.getElementById("loadingDots");
const pokeball = document.querySelector(".pokeball");
const pokeballCenter = document.querySelector(".pokeball-center");

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

const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

let tasks = [];
let dotInterval;

/* ============================================================
   FORCE STATE CHANGE (THE FIX)
   ============================================================ */
function forceStateChange() {
    tasks = [...tasks]; // new array reference forces UI update
}

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
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

/* ============================================================
   TYPE ICONS + COLORS
   ============================================================ */
function typeIconSrc(type) {
    return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type}.svg`;
}

function getTypeColor(type) {
    const map = {
        normal:  "#A8A77A",
        fire:    "#EE8130",
        water:   "#6390F0",
        electric:"#F7D02C",
        grass:   "#7AC74C",
        ice:     "#96D9D6",
        fighting:"#C22E28",
        poison:  "#A33EA1",
        ground:  "#E2BF65",
        flying:  "#A98FF3",
        psychic:"#F95587",
        bug:     "#A6B91A",
        rock:    "#B6A136",
        ghost:   "#735797",
        dragon:  "#6F35FC",
        dark:    "#705746",
        steel:   "#B7B7CE",
        fairy:   "#D685AD"
    };
    return map[type] || "#888";
}

/* ============================================================
   STORAGE
   ============================================================ */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasksFromStorage() {
    const raw = localStorage.getItem("tasks");
    tasks = raw ? JSON.parse(raw) : [];
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

    if (mode === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (mode === "caught") arr.sort((a, b) => (b.completed - a.completed) || (a.dexRaw - b.dexRaw));
    else if (mode === "uncaught") arr.sort((a, b) => (a.completed - b.completed) || (a.dexRaw - b.dexRaw));
    else arr.sort((a, b) => a.dexRaw - b.dexRaw);

    return arr;
}

/* ============================================================
   RENDER LIST (NOW UPDATES INSTANTLY)
   ============================================================ */
function renderTasks() {
    taskList.innerHTML = "";
    void taskList.offsetHeight; // force DOM refresh

    const search = searchBar.value.toLowerCase();
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
        label.textContent = `#${task.dex} — ${formatPokemonName(task.name)}`;

        const moreBtn = document.createElement("button");
        moreBtn.className = "more-btn";
        moreBtn.textContent = "⋮";
        moreBtn.addEventListener("click", e => {
            e.stopPropagation();
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
   LOADING SCREEN
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
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`);
        const speciesData = await speciesRes.json();

        const evoRes = await fetch(speciesData.evolution_chain.url);
        const evoData = await evoRes.json();

        return parseEvolutionChain(evoData.chain, String(dexNumber));
    } catch {
        return { prev: null, next: null };
    }
}

function parseEvolutionChain(chain, dexNumber) {
    let prev = null;
    let next = null;

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

        node.evolves_to.forEach(evo => {
            search(evo, {
                id,
                name: node.species.name,
                method: evo.evolution_details[0]
            });
        });
    }

    search(chain, null);
    return { prev, next };
}

function formatEvolutionMethod(method) {
    if (!method) return "Unknown";

    if (method.trigger.name === "level-up") {
        if (method.min_level) return `Level ${method.min_level}`;
        if (method.min_happiness) return "Friendship";
        if (method.time_of_day) return `Level up at ${method.time_of_day}`;
        return "Level up";
    }

    if (method.trigger.name === "use-item") {
        return method.item.name.replace("-", " ");
    }

    if (method.trigger.name === "trade") return "Trade";

    return method.trigger.name.replace("-", " ");
}

/* ============================================================
   IMPORT FROM SHEET
   ============================================================ */
async function importFromSheet() {
    const response = await fetch(GOOGLE_SHEET_URL);
    const csv = await response.text();
    const rows = csv.split("\n").slice(1);

    tasks = rows
        .filter(r => r.trim())
        .map(row => {
            const [dexRaw, name] = row.split(",");
            const cleanDex = dexRaw.trim();
            return {
                dexRaw: cleanDex,
                dex: padDex(cleanDex),
                name: name.trim(),
                gen: getGeneration(cleanDex),
                completed: false
            };
        });

    saveTasks();
    renderTasks();
}

/* ============================================================
   RESET POPUP
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
    await importFromSheet();
});

/* ============================================================
   DARK MODE
   ============================================================ */
darkToggle.addEventListener("change", () => {
    const isDark = darkToggle.checked;
    document.body.classList.toggle("dark", isDark);
    localStorage.setItem("darkMode", isDark ? "1" : "0");
    forceStateChange();
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

    document.getElementById("infoSprite").innerHTML = `
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png">
    `;

    document.getElementById("infoName").textContent =
        `#${task.dex} — ${formatPokemonName(task.name)}`;

    document.getElementById("infoGames").innerHTML = `
        <p style="opacity:0.5; text-align:center;">Games will appear here</p>
    `;

    const infoTypes = document.getElementById("infoTypes");
    infoTypes.innerHTML = "";

    fetch(`https://pokeapi.co/api/v2/pokemon/${task.dexRaw}`)
        .then(res => res.json())
        .then(data => {
            data.types.forEach(t => {
                const typeName = t.type.name;

                const badge = document.createElement("div");
                badge.className = "typeBadge";
                badge.style.backgroundColor = getTypeColor(typeName);

                const icon = document.createElement("img");
                icon.src = typeIconSrc(typeName);
                icon.alt = typeName;

                badge.appendChild(icon);
                infoTypes.appendChild(badge);
            });
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
                </div>
            `;
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
                </div>
            `;
        }

        if (!evo.prev && !evo.next) {
            evoBox.innerHTML = `
                <p style="opacity:0.5; text-align:center;">No evolution data</p>
            `;
        }
    } catch {
        evoBox.innerHTML = `
            <p style="opacity:0.5; text-align:center;">Error loading evolution data</p>
        `;
    }

    panel.classList.add("open");
}

document.getElementById("closeInfoPanel").addEventListener("click", () => {
    document.getElementById("infoPanel").classList.remove("open");
});

/* ============================================================
   EVENT LISTENERS (FIXED)
   ============================================================ */
searchBar.addEventListener("input", () => {
    forceStateChange();
    renderTasks();
});

sortSelect.addEventListener("change", () => {
    forceStateChange();
    renderTasks();
});

shinyToggle.addEventListener("change", () => {
    forceStateChange();
    renderTasks();
});

/* ============================================================
   INITIAL LOAD
   ============================================================ */
async function init() {
    startLoadingDots();

    const start = Date.now();
    loadTasksFromStorage();

    if (tasks.length === 0) {
        await importFromSheet();
    } else {
        tasks.forEach(t => {
            if (!t.gen) t.gen = getGeneration(t.dexRaw);
        });
        renderTasks();
    }

    const elapsed = Date.now() - start;
    const min = 5000;
    if (elapsed < min) await new Promise(r => setTimeout(r, min - elapsed));

    await finishLoadingAnimation();
}

init();
