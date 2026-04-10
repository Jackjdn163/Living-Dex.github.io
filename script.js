const taskList = document.getElementById("taskList");
const searchBar = document.getElementById("searchBar");
const progressDisplay = document.getElementById("progress");
const resetBtn = document.getElementById("resetBtn");

// 👉 Replace with your published Google Sheets CSV link
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPMOWM7uf_nOXIMcGzvL5tOyCk1MLvSKE03jR5r0qJp9j5NdtWfYobBDAmzMmEL2aVsb4Z2uqIwpPD/pub?output=csv";

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
    const percent = total
