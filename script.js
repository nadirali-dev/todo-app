"use strict";

/* =========================================================
   To-Do App - script.js
   CRUD:  Create (addTask)  Read (render)
          Update (toggleTask, saveEdit)  Delete (deleteTask)
   Extras: filters, priority, progress bar, dark mode,
           and saving to localStorage so tasks survive refresh.
   ========================================================= */


/* ---------- 1. SETTINGS & ELEMENTS ---------- */
const STORAGE_KEY = "todoApp.tasks";
const THEME_KEY = "todoApp.theme";
const MAX_LENGTH = 120;

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

const els = {
  date: document.getElementById("todayDate"),
  themeToggle: document.getElementById("themeToggle"),
  form: document.getElementById("taskForm"),
  input: document.getElementById("taskInput"),
  error: document.getElementById("formError"),
  list: document.getElementById("taskList"),
  empty: document.getElementById("emptyState"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyText: document.getElementById("emptyText"),
  filterButtons: document.querySelectorAll(".filters button"),
  leftCount: document.getElementById("leftCount"),
  clearDone: document.getElementById("clearDone"),
  progressTrack: document.getElementById("progressTrack"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
};

// Small SVG icons (static strings written by us, so they are safe to use with innerHTML)
const ICONS = {
  edit: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  delete: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  save: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cancel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};


/* ---------- 2. STATE (the data of the app) ---------- */
let tasks = loadTasks();     // array of task objects
let currentFilter = "all";   // "all" | "active" | "done"
let editingId = null;        // id of the task being edited (or null)
let justAddedId = null;      // used only for the small "pop in" animation


/* ---------- 3. STORAGE HELPERS ---------- */
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    // Storage can be blocked (private mode). The app still works, it just won't remember.
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}


/* ---------- 4. CREATE ---------- */
function addTask(text, priority) {
  const task = {
    id: createId(),
    text: text,
    priority: priority,
    done: false,
    createdAt: Date.now(),
  };

  tasks.unshift(task);   // newest task goes on top
  justAddedId = task.id;
  saveTasks();
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = els.input.value.trim();
  const priority = els.form.elements.priority.value;

  if (text === "") {
    showError("Write a task first, then press Add task.");
    els.input.focus();
    return;
  }

  addTask(text, priority);
  els.input.value = "";
  clearError();

  // If we are looking at the "Done" tab, switch so the new task is visible
  if (currentFilter === "done") currentFilter = "all";

  render();
  els.input.focus();
});

els.input.addEventListener("input", clearError);

function showError(message) {
  els.error.textContent = message;
  els.input.classList.add("is-invalid");
}

function clearError() {
  els.error.textContent = "";
  els.input.classList.remove("is-invalid");
}


/* ---------- 5. UPDATE ---------- */
function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  task.done = !task.done;
  saveTasks();
  render();
}

function startEdit(id) {
  editingId = id;
  render();

  const field = els.list.querySelector(".task__edit");
  if (field) {
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }
}

function saveEdit(id) {
  const field = els.list.querySelector(".task__edit");
  const text = field.value.trim();

  if (text === "") {
    field.classList.add("is-invalid");
    field.focus();
    return;
  }

  const task = tasks.find((item) => item.id === id);
  if (task) task.text = text;

  editingId = null;
  saveTasks();
  render();
  focusTaskButton(id, "edit");
}

function cancelEdit(id) {
  editingId = null;
  render();
  focusTaskButton(id, "edit");
}

// Puts keyboard focus back on a button, so keyboard users don't lose their place
function focusTaskButton(id, action) {
  const button = els.list.querySelector(
    `.task[data-id="${id}"] [data-action="${action}"]`
  );
  if (button) button.focus();
}


/* ---------- 6. DELETE ---------- */
function deleteTask(id, itemElement) {
  if (itemElement.classList.contains("is-removing")) return;

  const removeNow = () => {
    tasks = tasks.filter((task) => task.id !== id);
    if (editingId === id) editingId = null;
    saveTasks();
    render();
  };

  if (prefersReducedMotion()) {
    removeNow();
  } else {
    itemElement.classList.add("is-removing");   // fade-out first
    setTimeout(removeNow, 220);
  }
}

els.clearDone.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  render();
});


/* ---------- 7. READ (draw everything on the screen) ---------- */
function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.done);
  if (currentFilter === "done") return tasks.filter((task) => task.done);
  return tasks;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createIconButton(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-btn icon-btn--" + action;
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = ICONS[action];
  return button;
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = "task";
  item.dataset.id = task.id;
  item.dataset.priority = task.priority;
  if (task.done) item.classList.add("is-done");
  if (task.id === justAddedId) item.classList.add("is-new");

  // Checkbox
  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "task__check";
  check.checked = task.done;
  check.setAttribute(
    "aria-label",
    (task.done ? "Mark as not done: " : "Mark as done: ") + task.text
  );

  // Middle part (text or edit box) and right part (buttons)
  const body = document.createElement("div");
  body.className = "task__body";

  const actions = document.createElement("div");
  actions.className = "task__actions";

  if (task.id === editingId) {
    // ----- Edit mode -----
    const field = document.createElement("input");
    field.type = "text";
    field.className = "task__edit";
    field.value = task.text;
    field.maxLength = MAX_LENGTH;
    field.setAttribute("aria-label", "Edit task");
    body.append(field);

    actions.append(
      createIconButton("save", "Save changes"),
      createIconButton("cancel", "Cancel editing")
    );
  } else {
    // ----- Normal mode -----
    const text = document.createElement("span");
    text.className = "task__text";
    text.textContent = task.text;   // textContent keeps user input safe from HTML injection

    const meta = document.createElement("div");
    meta.className = "task__meta";

    const priority = document.createElement("span");
    priority.className = "task__priority";
    priority.textContent = PRIORITY_LABELS[task.priority] || "Medium";

    const added = document.createElement("span");
    added.textContent = "Added " + formatDate(task.createdAt);

    meta.append(priority, added);
    body.append(text, meta);

    actions.append(
      createIconButton("edit", "Edit task"),
      createIconButton("delete", "Delete task")
    );
  }

  item.append(check, body, actions);
  return item;
}

function render() {
  const total = tasks.length;
  const doneCount = tasks.filter((task) => task.done).length;
  const activeCount = total - doneCount;
  const visible = getVisibleTasks();

  // 1) The list
  els.list.replaceChildren(...visible.map(createTaskItem));
  justAddedId = null;

  // 2) Empty message
  els.empty.hidden = visible.length > 0;
  if (visible.length === 0) {
    if (total === 0) {
      els.emptyTitle.textContent = "No tasks yet";
      els.emptyText.textContent = "Type a task above and press Add task.";
    } else if (currentFilter === "active") {
      els.emptyTitle.textContent = "All caught up";
      els.emptyText.textContent = "Every task is marked as done.";
    } else {
      els.emptyTitle.textContent = "Nothing completed yet";
      els.emptyText.textContent = "Tick a task and it will show up here.";
    }
  }

  // 3) Filter buttons and their counters
  const counts = { all: total, active: activeCount, done: doneCount };
  els.filterButtons.forEach((button) => {
    const name = button.dataset.filter;
    button.setAttribute("aria-pressed", String(name === currentFilter));
    button.querySelector(".count").textContent = counts[name];
  });

  // 4) Footer
  els.leftCount.textContent =
    activeCount + (activeCount === 1 ? " task left" : " tasks left");
  els.clearDone.disabled = doneCount === 0;

  // 5) Progress bar in the banner
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  els.progressFill.style.width = percent + "%";
  els.progressTrack.setAttribute("aria-valuenow", String(percent));

  if (total === 0) {
    els.progressText.textContent = "Nothing planned yet";
  } else if (doneCount === total) {
    els.progressText.textContent = "All " + total + " done. Nice work!";
  } else {
    els.progressText.textContent = doneCount + " of " + total + " done";
  }
}


/* ---------- 8. EVENTS ON THE LIST (event delegation) ---------- */
// One listener on the <ul> handles clicks for every task, even ones added later.
els.list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = button.closest(".task");
  const id = item.dataset.id;

  switch (button.dataset.action) {
    case "edit":   startEdit(id); break;
    case "save":   saveEdit(id); break;
    case "cancel": cancelEdit(id); break;
    case "delete": deleteTask(id, item); break;
  }
});

els.list.addEventListener("change", (event) => {
  if (event.target.classList.contains("task__check")) {
    toggleTask(event.target.closest(".task").dataset.id);
  }
});

// Enter = save, Escape = cancel while editing
els.list.addEventListener("keydown", (event) => {
  if (!event.target.classList.contains("task__edit")) return;

  const id = event.target.closest(".task").dataset.id;

  if (event.key === "Enter") {
    event.preventDefault();
    saveEdit(id);
  } else if (event.key === "Escape") {
    cancelEdit(id);
  }
});

els.list.addEventListener("input", (event) => {
  if (event.target.classList.contains("task__edit")) {
    event.target.classList.remove("is-invalid");
  }
});

els.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    editingId = null;
    render();
  });
});


/* ---------- 9. THEME (light / dark) ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (error) { /* ignore */ }

  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (systemPrefersDark ? "dark" : "light"));
}

els.themeToggle.addEventListener("click", () => {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) { /* ignore */ }
});


/* ---------- 10. START THE APP ---------- */
els.date.textContent = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

els.input.maxLength = MAX_LENGTH;
initTheme();
render();
