const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");

// 👉 Replace with your published Google Sheets CSV link
const GOOGLE_SHEET_URL = "YOUR_CSV_LINK_HERE";

let tasks = [];
let imported = localStorage.getItem("importedFromSheet");

// Pad dex numbers to 3 digits (1 → 001)
function padDex(num) {
    return num.toString().padStart(3, "0");
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

// Update % complete
function updateProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((caught / total) * 100);
    progressDisplay.textContent = `${percent}% complete`;
}

// Render tasks (no delete button)
function renderTasks() {
    const search = searchBar.value.toLowerCase();
    taskList.innerHTML = "";

    const fragment = document.createDocumentFragment();

    tasks.forEach((task, index) => {
        if (
            !task.name.toLowerCase().includes(search) &&
            !task.dex.includes(search) &&
            !task.dexRaw.includes(search)
        ) return;

        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        const spriteURL = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${parseInt(task.dexRaw)}.png`;

        const img = document.createElement("img");
        img.className = "sprite";
        img.src = spriteURL;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        // Toggle completion
        li.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            saveTasks();
            renderTasks();
        });

        li.appendChild(img);
        li.appendChild(label);

        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
    updateProgress();
}

// Import Pokédex data (Dex + Name)
async function importFromSheet() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csv = await response.text();
        const rows = csv.split("\n").slice(1);

        tasks = []; // clear before import

        rows.forEach(row => {
            const cols = row.split(",");
            const dexRaw = cols[0]?.trim();
            const name = cols[1]?.trim();

            if (dexRaw && name) {
                const dex = padDex(dexRaw);

                tasks.push({
                    dex,
                    dexRaw,
                    name,
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

// Reset button — clears everything and re-imports
resetBtn.addEventListener("click", async () => {
    localStorage.clear();
    imported = null;
    tasks = [];
    progressDisplay.textContent = "0% complete";
    await importFromSheet();
});

// Search bar listener
searchBar.addEventListener("input", renderTasks);

// INITIAL LOAD
loadTasks();

if (!imported) {
    importFromSheet();
} else {
    renderTasks();
}

