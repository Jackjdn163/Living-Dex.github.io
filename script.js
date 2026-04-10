const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");
const shinyToggle = document.getElementById("shinyToggle");
const sortSelect = document.getElementById("sortSelect");
const darkToggle = document.getElementById("darkModeToggle");

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
// Sheet should have at least: Dex,Name
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

// Map type name → Sword/Shield icon path
function typeIconSrc(type) {
    if (!type) return null;
    const key = type.toLowerCase();
    const map = {
        normal: "types/normal.png",
        fire: "types/fire.png",
        water: "types/water.png",
        grass: "types/grass.png",
        electric: "types/electric.png",
        ice: "types/ice.png",
        fighting: "types/fighting.png",
        poison: "types/poison.png",
        ground: "types/ground.png",
        flying: "types/flying.png",
        psychic: "types/psychic.png",
        bug: "types/bug.png",
        rock: "types/rock.png",
        ghost: "types/ghost.png",
        dragon: "types/dragon.png",
        dark: "types/dark.png",
        steel: "types/steel.png",
        fairy: "types/fairy.png"
    };
    return map[key] || null;
}

// Fetch type(s) from PokéAPI for a given Dex number
async function fetchTypesFromPokeAPI(dexNumber) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${dexNumber}`);
        const data = await response.json();

        const types = data.types.map(t => {
            const name = t.type.name; // e.g. "grass"
            return name.charAt(0).toUpperCase() + name.slice(1); // "Grass"
        });

        return types.join("/"); // "Grass/Poison"
    } catch (error) {
        console.error("Error fetching types for Dex", dexNumber, error);
        return null;
    }
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

// Update overall % complete (2 decimals)
function updateOverallProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? "0.00" : ((caught / total) * 100).toFixed(2);
    progressDisplay.textContent = `${percent}% complete`;
}

// Update per-generation percentages (2 decimals)
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
            return a.completed ? -1 : 1; // caught first
        });
    } else if (mode === "uncaught") {
        arr.sort((a, b) => {
            if (a.completed === b.completed) {
                return parseInt(a.dexRaw) - parseInt(b.dexRaw);
            }
            return a.completed ? 1 : -1; // uncaught first
        });
    } else {
        arr.sort((a, b) => parseInt(a.dexRaw) - parseInt(b.dexRaw)); // dex
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

        const dexNum = parseInt(task.dexRaw, 10);
        const spriteURL = shiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${dexNum}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png`;

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = spriteURL;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        // Type icons (support dual types)
        const typeContainer = document.createElement("span");
        typeContainer.className = "type-icon-container";

        if (task.type) {
            const typeParts = task.type.split("/"); // e.g. ["Grass","Poison"]
            typeParts.forEach(tName => {

