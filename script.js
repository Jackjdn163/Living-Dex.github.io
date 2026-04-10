const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");

// 👉 Replace with your published Google Sheets CSV link
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let imported = localStorage.getItem("importedFromSheet");

// Pad dex numbers to 3 digits (1 → 001)
function padDex(num) {
    return num.toString().padStart(3, "0");
}

// Save tasks
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Update % complete
function updateProgress() {
    const total = tasks.length;
    const caught = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((caught / total) * 100);
    progressDisplay.textContent = `${percent}% complete`;
}

// Render tasks (optimized)
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

        li.innerHTML = `
            <img class="sprite" src="${spriteURL}" alt="${task.name}">
            <strong>#${task.dex} — ${task.name}</strong>
            <button class="delete-btn">X</button>
        `;

        // Toggle completion
        li.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            saveTasks();
            renderTasks();
        });

        // Delete button
        li.querySelector(".delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        });

        fragment.appendChild(li);
    });

    taskList.appendChild(fragment);
    updateProgress();
}

// Import Pokédex data (Dex + Name)
async function importFromSheet() {
    if (imported) return;

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csv = await response.text();
        const rows = csv.split("\n").slice(1);

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

// Search bar listener
searchBar.addEventListener("input", renderTasks);

// Load tasks
renderTasks();
importFromSheet();
