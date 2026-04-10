const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const shinyToggle = document.getElementById("shinyToggle");
const sortSelect = document.getElementById("sortSelect");
const darkToggle = document.getElementById("darkModeToggle");

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
let imported = localStorage.getItem("importedFromSheet");

function padDex(num) {
    return num.toString().padStart(3, "0");
}

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

function typeIconSrc(type) {
    if (!type) return null;
    const key = type.toLowerCase();
    return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${key}.svg`;
}

async function fetchTypesFromPokeAPI(dexNumber) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${dexNumber}`);
        const data = await response.json();

        const types = data.types.map(t => {
            const name = t.type.name;
            return name.charAt(0).toUpperCase() + name.slice(1);
        });

        return types.join("/");
    } catch (error) {
        console.error("Error fetching types for Dex", dexNumber, error);
        return null;
    }
}

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem("tasks");
    tasks = saved ? JSON.parse(saved) : [];
}

function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? "0.00" : ((caught / total) * 100).toFixed(2);
    progressDisplay.textContent = `${percent}% complete`;
}

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
        const percent = total === 0 ? "0.00" : ((caught / total) * 100).toFixed(2);
        el.textContent = `Gen ${g}: ${percent}%`;
    });
}

function updateAllProgress() {
    updateOverallProgress();
    updateGenProgress();
}

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
    } else if (mode === "uncaught") {
        arr.sort((a, b) => {
            if (a.completed === b.completed) {
                return parseInt(a.dexRaw) - parseInt(b.dexRaw);
            }
            return a.completed ? 1 : -1;
        });
    } else {
        arr.sort((a, b) => parseInt(a.dexRaw) - parseInt(b.dexRaw));
    }

    return arr;
}

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

        const dexNum = parseInt(task.dexRaw, 10);
        const spriteURL = shiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${dexNum}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png`;

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = spriteURL;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        const typeContainer = document.createElement("span");
        typeContainer.className = "type-icon-container";

        if (task.type) {
            const typeParts = task.type.split("/");
            typeParts.forEach(tName => {
                const src = typeIconSrc(tName);
                if (!src) return;
                const typeImg = document.createElement("img");
                typeImg.className = "type-icon";
                typeImg.src = src;
                typeImg.alt = tName;
                typeImg.title = tName;
                typeContainer.appendChild(typeImg);
            });
        }

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
        li.appendChild(typeContainer);

        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
    updateAllProgress();
}

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

resetBtn.addEventListener("click", async () => {
    localStorage.clear();
    imported = null;
    tasks = [];
    progressDisplay.textContent = "0.00% complete";
    Object.values(genProgressEls).forEach(el => {
        if (!el) return;
        const txt = el.textContent;
        el.textContent = txt.replace(/(\d+(\.\d+)?)%/, "0.00%");
    });
    await importFromSheet();
});

searchBar.addEventListener("input", renderTasks);
shinyToggle.addEventListener("change", renderTasks);
sortSelect.addEventListener("change", renderTasks);

if (darkToggle) {
    darkToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark", darkToggle.checked);
        localStorage.setItem("darkMode", darkToggle.checked ? "1" : "0");
    });

    if (localStorage.getItem("darkMode") === "1") {
        document.body.classList.add("dark");
        darkToggle.checked = true;
    }
}

loadTasks();

if (!imported) {
    importFromSheet();
} else {
    tasks.forEach(t => {
        if (!t.gen) t.gen = getGeneration(t.dexRaw);
    });
    renderTasks();
}
