const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");

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

// Render tasks (optimized + fixed disappearing bug)
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

        // Build DOM elements manually to avoid event bubbling issues
        const img = document.createElement("img");
        img.className = "sprite";
        img.src = spriteURL;

        const label = document.createElement("strong");
        label.textContent = `#${task.dex} — ${task.name}`;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "X";

        // Toggle completion ONLY when clicking the row (not delete)
        li.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            saveTasks();
            renderTasks();
        });

        // Delete button (stops propagation so it doesn't toggle)
        delete
