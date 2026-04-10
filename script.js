const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

// 👉 Replace with your published Google Sheets CSV link
const GOOGLE_SHEET_URL = "YOUR_CSV_LINK_HERE";

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let imported = localStorage.getItem("importedFromSheet");

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Render tasks to the page
function renderTasks() {
    taskList.innerHTML = "";
    tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = task.completed ? "completed" : "";

        li.innerHTML = `
            <div>
                <strong>#${task.dex} — ${task.name}</strong>
            </div>
            <button class="delete-btn">X</button>
        `;

        li.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            saveTasks();
            renderTasks();
        });

        li.querySelector(".delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        });

        taskList.appendChild(li);
    });
}

// Import Pokédex data (Dex + Name)
async function importFromSheet() {
    if (imported) return; // Only import once

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csv = await response.text();
        const rows = csv.split("\n").slice(1); // Skip header row

        rows.forEach(row => {
            const cols = row.split(",");
            const dex = cols[0]?.trim();
            const name = cols[1]?.trim();

            if (dex && name) {
                tasks.push({
                    dex,
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

addBtn.addEventListener("click", () => {
    const text = taskInput.value.trim();
    if (text === "") return;

    // If user manually adds something, treat it as a name-only entry
    tasks.push({ dex: "—", name: text, completed: false });
    saveTasks();
    renderTasks();
    taskInput.value = "";
});

// Load tasks
renderTasks();
importFromSheet();
