const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const shinyToggle = document.getElementById("shinyToggle");
const sortSelect = document.getElementById("sortSelect");

// Per-generation progress elements
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

// 👉 Replace with your published Google Sheets CSV link
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

let tasks = [];
let imported = localStorage.getItem("importedFromSheet");

// Pad dex numbers to 3 digits (1 → 001)
function padDex(num) {
    return num.toString().padStart(3, "0");
}

// Determine generation from dex number
function getGeneration(dexNum) {
    const n = parseInt(dexNum, 10);
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

// Save tasks
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Load tasks from storage
function loadTasks() {
    const saved = localStorage.getItem("tasks");
    tasks = saved ? JSON.parse(saved) : [];
}

// Update overall % complete
function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((caught / total) * 100);
    progressDisplay.textContent = `${percent}% complete`;
}

// Update per-generation percentages
function updateGenProgress() {
    const genTotals = {};
    const genCaught = {};

    tasks.forEach(task => {
        const g = task.gen;
        if (!genTotals[g]) {
            genTotals[g] = 0;
            genCaught[g] = 0;
        }
        genTotals[g]++;
        if (task.completed) genCaught[g]++;
    });

    Object.keys(genProgressEls).forEach(genStr => {
        const g = parseInt(genStr, 10);
        const el = genProgressEls[g];
        if (!el) return;

        const total = genTotals[g] || 0;
        const caught = genCaught[g] || 0;
        const percent = total === 0 ? 0 : Math.round((caught / total) * 100);
        el.textContent = `Gen ${g}: ${percent}%`;
    });
}

// Combined progress update
function updateAllProgress() {
    updateOverallProgress();
    updateGenProgress();
}

// Sort tasks based on current sort selection
function getSortedTasks() {
    const mode = sortSelect.value;
    const arr = [...tasks];

    if (mode === "name") {
        arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "caught") {
        arr.sort((a, b) => {
            if (a.completed === b.completed) {
                return parseInt(a.dexRaw) - parseInt(b.dexRaw);
            }
            return a.completed ? -1 : 1;
        });
    } else {
        arr.sort((a, b) => parseInt(a.dexRaw) - parseInt(b.dexRaw));
    }

    return arr;
}

// Render tasks
function renderTasks() {
    const search = searchBar.value.toLowerCase();
    taskList.innerHTML = "";

    const fragment = document.createDocumentFragment();
    const shiny = shinyToggle.checked;

    const sortedTasks = getSortedTasks();

    sortedTasks.forEach(task => {
        if (
            !task.name.toLowerCase().includes(search) &&
            !task.dex.includes(search) &&
            !task.dexRaw.includes(search)
        ) return;

        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        if (task.type) {
            li.classList.add(`type-${task.type.toLowerCase()}`);
        }

        const dexNum = parseInt(task.dexRaw);
        const spriteURL = shiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${dexNum}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png`;

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = spriteURL;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        li.addEventListener("click", () => {
            const realIndex = tasks.findIndex(t => t.dexRaw === task.dexRaw);
            if (realIndex === -1) return;

            tasks[realIndex].completed = !tasks[realIndex].completed;
            saveTasks();

            li.classList.add("caught-anim");
            setTimeout(() => li.classList.remove("caught-anim"), 250);

            renderTasks();
        });

        li.appendChild(img);
        li.appendChild(label);

        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
    updateAllProgress();
}

// Import Pokédex data
async function importFromSheet() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csv = await response.text();
        const rows = csv.split("\n").slice(1);

        tasks = [];

        rows.forEach(row => {
            if (!row.trim()) return;
            const cols = row.split(",");
            const dexRaw = cols[0]?.trim();
            const name = cols[1]?.trim();
            const type = cols[2]?.trim() || null;

            if (dexRaw && name) {
                const dex = padDex(dexRaw);
                const gen = getGeneration(dexRaw);

                tasks.push({
                    dex,
                    dexRaw,
                    name,
                    gen,
                    type,
                    completed: false
                });
            }
        });

        saveTasks();
        localStorage.setItem("importedFromSheet", "true");
        renderTasks();
    } catch (error) {
        console.error("Error importing from Google Sheets:", error);
    }
}

// Reset button
resetBtn.addEventListener("click", async () => {
    localStorage.clear();
    imported = null;
    tasks = [];
    progressDisplay.textContent = "0% complete";
    Object.values(genProgressEls).forEach(el => el.textContent = el.textContent.replace(/\d+%/, "0%"));
    await importFromSheet();
});

// Listeners
searchBar.addEventListener("input", renderTasks);
shinyToggle.addEventListener("change", renderTasks);
sortSelect.addEventListener("change", renderTasks);

// INITIAL LOAD
loadTasks();

if (!imported) {
    importFromSheet();
} else {
    tasks.forEach(t => {
        if (!t.gen) t.gen = getGeneration(t.dexRaw);
    });
    renderTasks();
}
