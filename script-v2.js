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

/* Bottom Sheet */
const bottomSheet = document.getElementById("bottomSheet");
const sheetSprite = document.getElementById("sheetSprite");
const sheetName = document.getElementById("sheetName");
const sheetDex = document.getElementById("sheetDex");
const sheetTypes = document.getElementById("sheetTypes");
const sheetEvolution = document.getElementById("sheetEvolution");
const sheetDlcTag = document.getElementById("sheetDlcTag");

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
let imported = localStorage.getItem("importedFromSheet");

/* ============================================================
   GAME AVAILABILITY (POKÉAPI → POKEDEX → GAMES)
   ============================================================ */

const ALLOWED_GAMES = {
    "lets-go-pikachu": "Let's Go Pikachu",
    "lets-go-eevee": "Let's Go Eevee",
    "sword": "Sword",
    "shield": "Shield",
    "isle-of-armor": "Isle of Armor",
    "crown-tundra": "Crown Tundra",
    "brilliant-diamond": "Brilliant Diamond",
    "shining-pearl": "Shining Pearl",
    "legends-arceus": "Legends Arceus",
    "scarlet": "Scarlet",
    "violet": "Violet",
    "the-teal-mask": "The Teal Mask",
    "the-indigo-disk": "The Indigo Disk"
};

function mapPokedexToGames(pokedexNames) {
    const games = new Set();

    pokedexNames.forEach(n => {
        n = n.toLowerCase();

        if (n.includes("lets-go")) {
            games.add("lets-go-pikachu");
            games.add("lets-go-eevee");
        }

        if (n === "galar" || n === "galar-pokedex") {
            games.add("sword");
            games.add("shield");
        }

        if (n.includes("isle-of-armor")) games.add("isle-of-armor");
        if (n.includes("crown-tundra")) games.add("crown-tundra");

        if (n.includes("hisui")) games.add("legends-arceus");

        if (n === "paldea" || n === "paldea-pokedex") {
            games.add("scarlet");
            games.add("violet");
        }

        if (n.includes("kitakami")) games.add("the-teal-mask");
        if (n.includes("blueberry")) games.add("the-indigo-disk");

        if (n.includes("sinnoh")) {
            games.add("brilliant-diamond");
            games.add("shining-pearl");
        }
    });

    return [...games].filter(g => ALLOWED_GAMES[g]);
}

function isDlcOnly(gameKeys) {
    const dlc = ["isle-of-armor", "crown-tundra", "the-teal-mask", "the-indigo-disk"];
    const base = ["sword", "shield", "scarlet", "violet"];

    const hasDlc = gameKeys.some(g => dlc.includes(g));
    const hasBase = gameKeys.some(g => base.includes(g));

    return hasDlc && !hasBase;
}

async function fetchGameAvailability(dexNumber) {
    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`);
        const speciesData = await speciesRes.json();

        const pokedexNames = (speciesData.pokedex_numbers || [])
            .map(entry => entry.pokedex.name.toLowerCase());

        return mapPokedexToGames(pokedexNames);
    } catch {
        return [];
    }
}

function clearGameList() {
    const old = bottomSheet.querySelector(".game-list-container");
    if (old) old.remove();
}

function insertGameList(gameKeys) {
    if (!gameKeys.length) return;

    const container = document.createElement("div");
    container.className = "game-list-container";

    const title = document.createElement("div");
    title.className = "game-list-title";
    title.textContent = "Appears In:";
    container.appendChild(title);

    gameKeys.forEach(key => {
        const row = document.createElement("div");
        row.className = "game-list-item";
        row.textContent = ALLOWED_GAMES[key];
        container.appendChild(row);
    });

    bottomSheet.insertBefore(container, sheetEvolution);
}

function updateDlcBadge(isDlc) {
    if (!isDlc) {
        sheetDlcTag.style.display = "none";
        return;
    }

    sheetDlcTag.style.display = "block";
    sheetDlcTag.textContent = "[DLC‑ONLY]";
    sheetDlcTag.style.background = "#FFD700";
    sheetDlcTag.style.color = "black";
    sheetDlcTag.style.fontWeight = "bold";
    sheetDlcTag.style.padding = "4px 10px";
    sheetDlcTag.style.borderRadius = "999px";
    sheetDlcTag.style.marginTop = "10px";
    sheetDlcTag.style.alignSelf = "flex-end";
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

function typeIconSrc(type) {
    return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`;
}

/* ============================================================
   FETCH TYPES
   ============================================================ */
async function fetchTypesFromPokeAPI(dexNumber) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${dexNumber}`);
        const data = await res.json();
        return data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join("/");
    } catch {
        return "";
    }
}

/* ============================================================
   EVOLUTION
   ============================================================ */
async function fetchEvolutionData(dexNumber) {
    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`);
        const speciesData = await speciesRes.json();

        const evoRes = await fetch(speciesData.evolution_chain.url);
        const evoData = await evoRes.json();

        return parseEvolutionChain(evoData.chain, dexNumber);
    } catch {
        return { prev: null, next: null };
    }
}

function parseEvolutionChain(chain, dexNumber) {
    let prev = null, next = null;

    function walk(node, parent) {
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
            walk(evo, {
                id,
                name: node.species.name,
                method: evo.evolution_details[0]
            });
        });
    }

    walk(chain, null);
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

    if (method.trigger.name === "use-item")
        return `Use ${method.item.name.replace("-", " ")}`;

    if (method.trigger.name === "trade")
        return "Trade";

    return method.trigger.name.replace("-", " ");
}

/* ============================================================
   BOTTOM SHEET
   ============================================================ */
function openBottomSheet() {
    bottomSheet.style.bottom = "0";
}

function closeBottomSheet() {
    bottomSheet.style.bottom = "-100%";
}

bottomSheet.addEventListener("click", e => {
    if (e.target === bottomSheet) closeBottomSheet();
});

/* ============================================================
   SAVE / LOAD
   ============================================================ */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasks() {
    tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
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
    const totals = {}, caught = {};

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
        arr.sort((a, b) => b.completed - a.completed || a.dexRaw - b.dexRaw);
    } else if (mode === "uncaught") {
        arr.sort((a, b) => a.completed - b.completed || a.dexRaw - b.dexRaw);
    } else {
        arr.sort((a, b) => a.dexRaw - b.dexRaw);
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

        const moreBtn = document.createElement("button");
        moreBtn.className = "more-btn";
        moreBtn.textContent = "⋮";

        moreBtn.addEventListener("click", async e => {
            e.stopPropagation();
            await loadBottomSheet(task);
            openBottomSheet();
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
   LOAD BOTTOM SHEET CONTENT
   ============================================================ */
async function loadBottomSheet(task) {
    sheetSprite.src =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${task.dexRaw}.png`;

    sheetName.textContent = task.name;
    sheetDex.textContent = `#${task.dex}`;

    sheetTypes.innerHTML = "";
    task.type.split("/").forEach(t => {
        const icon = document.createElement("img");
        icon.src = typeIconSrc(t);
        sheetTypes.appendChild(icon);
    });

    clearGameList();
    sheetDlcTag.style.display = "none";

    const gameKeys = await fetchGameAvailability(task.dexRaw);
    insertGameList(gameKeys);

    updateDlcBadge(isDlcOnly(gameKeys));

    sheetEvolution.innerHTML = "";
    const evo = await fetchEvolutionData(task.dexRaw);

    if (evo.prev) {
        const row = document.createElement("div");
        row.className = "evoRow";

        const img = document.createElement("img");
        img.src =
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.prev.id}.png`;

        const txt = document.createElement("div");
        txt.textContent = `${evo.prev.name} — ${formatEvolutionMethod(evo.prev.method)}`;

        row.appendChild(img);
        row.appendChild(txt);
        sheetEvolution.appendChild(row);
    }

    if (evo.next) {
        const row = document.createElement("div");
        row.className = "evoRow";

        const img = document.createElement("img");
        img.src =
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.next.id}.png`;

        const txt = document.createElement("div");
        txt.textContent = `${evo.next.name} — ${formatEvolutionMethod(evo.next.method)}`;

        row.appendChild(img);
        row.appendChild(txt);
        sheetEvolution.appendChild(row);
    }
}

/* ============================================================
   IMPORT FROM SHEET
   ============================================================ */
async function importFromSheet() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csv = await response.text();
        const rows = csv.split("\n").slice(1);

        tasks = [];

        for (const row of rows) {
            if (!row.trim()) continue;

            const cols = row.split(",");
            const dexRaw = cols[0]?.trim();
            const name = cols[1]?.trim();

            if (!dexRaw || !name) continue;

            const dex = padDex(dexRaw);
            const gen = getGeneration(dexRaw);
            const type = await fetchTypesFromPokeAPI(dexRaw);

            tasks.push({
                dex,
                dexRaw,
                name,
                gen,
                type,
                completed: false
            });
        }

        saveTasks();
        localStorage.setItem("importedFromSheet", "true");
        renderTasks();
    } catch (error) {
        console.error("Error importing from Google Sheets:", error);
    }
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
resetBtn.addEventListener("click", async () => {
    localStorage.clear();
    imported = null;
    tasks = [];
    progressDisplay.textContent = "0.00% complete";

    Object.values(genProgressEls).forEach(el => {
        el.textContent = el.textContent.replace(/(\d+(\.\d+)?)%/, "0.00%");
    });

    await importFromSheet();
});

searchBar.addEventListener("input", renderTasks);
shinyToggle.addEventListener("change", renderTasks);
sortSelect.addEventListener("change", renderTasks);

if (darkToggle) {
    darkToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark", darkToggle.checked);
        localStorage.setItem("darkMode", dark
