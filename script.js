const DB_NAME = 'MyToDoDB';
const STORE_NAME = 'todos';
let db;
let activeTodoId = null;

const defaultTodos = [
    { 
        id: 1, 
        title: "Mengerjakan tugas Pemrograman Web", 
        desc: "Mengerjakan tugas dan modul terkait pengembangan web.", 
        status: "In Progress", 
        completed: false 
    },
    { 
        id: 2, 
        title: "Menyelesaikan pra-praktikum Jaringan Komputer", 
        desc: "Mengerjakan soal-soal pendahuluan sebelum sesi praktikum Jarkom dimulai.", 
        status: "Pending", 
        completed: false 
    },
    { 
        id: 3, 
        title: "Update website portofolio", 
        desc: "Melakukan pembaruan kode, styling, atau konten proyek pada repository portofolio.", 
        status: "Completed", 
        completed: true 
    },
    { 
        id: 4, 
        title: "Menyelesaikan modul warmup PBO", 
        desc: "Mempelajari dan menyelesaikan latihan dasar Pemrograman Berorientasi Objek.", 
        status: "Pending", 
        completed: false 
    },
    { 
        id: 5, 
        title: "Mengulik kaggle LBE MCI", 
        desc: "Eksplorasi dataset, analisis data, atau melatih model machine learning di platform Kaggle.", 
        status: "Pending", 
        completed: false 
    }
];

let todos = JSON.parse(JSON.stringify(defaultTodos));
const todoListEl = document.getElementById('todo-list');
const createForm = document.getElementById('create-form');
const newTodoTitle = document.getElementById('new-todo-title');
const todoImageInput = document.getElementById('todo-image');
const todoTimeInput = document.getElementById('todo-time');
const themeToggleBtn = document.getElementById('theme-toggle');
const announcer = document.getElementById('a11y-announcer');
const editForm = document.getElementById('edit-form');
const editIdInput = document.getElementById('edit-id');
const editTitleInput = document.getElementById('task-title');
const editDescInput = document.getElementById('task-desc');
const editStatusSelect = document.getElementById('task-status');
const saveTaskBtn = document.getElementById('save-task-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');
const imagePreviewContainer = document.getElementById('image-preview-container');
const taskImagePreview = document.getElementById('task-image-preview');

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}
themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    announceToScreenReader(`Theme changed to ${isDark ? 'dark' : 'light'} mode`);
});

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllTodos() {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b) => b.id - a.id));
    });
}

function saveTodoToDB(todo) {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(todo);
        tx.oncomplete = () => resolve();
    });
}

function deleteTodoFromDB(id) {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
    });
}

function announceToScreenReader(message) {
    announcer.textContent = message;
}

async function renderTodos() {
    const todos = await getAllTodos();
    todoListEl.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.id === activeTodoId ? 'active' : ''} ${todo.completed ? 'task-completed' : ''}`;
        
        li.innerHTML = `
            <label class="todo-content" onclick="selectTodo(${todo.id})" aria-label="Select task ${todo.title}">
                <input type="checkbox" onchange="toggleComplete(event, ${todo.id})" ${todo.completed ? 'checked' : ''} aria-label="Mark ${todo.title} as completed">
                <span class="task-name">${todo.title}</span>
            </label>
            <div class="todo-actions">
                <button class="btn-small" onclick="selectTodo(${todo.id})" aria-label="Edit task ${todo.title}">Edit</button>
                <button class="btn-small btn-secondary" onclick="deleteTodo(${todo.id})" aria-label="Delete task ${todo.title}">Delete</button>
            </div>
        `;
        todoListEl.appendChild(li);
    });

    if (activeTodoId) fillEditorForm(activeTodoId);
}

createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = newTodoTitle.value.trim();
    if (!title) return;

    let imageBase64 = null;
    if (todoImageInput.files && todoImageInput.files[0]) {
        imageBase64 = await convertFileToBase64(todoImageInput.files[0]);
    }

    const notifyTime = todoTimeInput.value;

    const newTodo = {
        id: Date.now(),
        title,
        desc: "",
        status: "Pending",
        completed: false,
        image: imageBase64,
        notifyTime: notifyTime,
        notified: false
    };

    await saveTodoToDB(newTodo);
    
    createForm.reset();
    announceToScreenReader('New task created successfully.');
    
    if (notifyTime && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    renderTodos();
});

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

window.selectTodo = async function(id) {
    activeTodoId = id;
    renderTodos();
    editTitleInput.focus(); 
};

async function fillEditorForm(id) {
    const todos = await getAllTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    editTitleInput.disabled = false;
    editDescInput.disabled = false;
    editStatusSelect.disabled = false;
    saveTaskBtn.disabled = false;
    deleteTaskBtn.disabled = false;

    editIdInput.value = todo.id;
    editTitleInput.value = todo.title;
    editDescInput.value = todo.desc || "";
    editStatusSelect.value = todo.status;

    if (todo.image) {
        taskImagePreview.src = todo.image;
        imagePreviewContainer.style.display = 'block';
        imagePreviewContainer.setAttribute('aria-hidden', 'false');
    } else {
        imagePreviewContainer.style.display = 'none';
        imagePreviewContainer.setAttribute('aria-hidden', 'true');
    }
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(editIdInput.value);
    const todos = await getAllTodos();
    const todo = todos.find(t => t.id === id);

    if (todo) {
        todo.title = editTitleInput.value;
        todo.desc = editDescInput.value;
        todo.status = editStatusSelect.value;
        todo.completed = (editStatusSelect.value === 'Completed');
        
        await saveTodoToDB(todo);
        announceToScreenReader('Task updated successfully.');
        renderTodos();
    }
});

window.deleteTodo = async function(id) {
    await deleteTodoFromDB(id);
    if (activeTodoId === id) {
        activeTodoId = null;
        editForm.reset();
        editTitleInput.disabled = true;
        editDescInput.disabled = true;
        editStatusSelect.disabled = true;
        saveTaskBtn.disabled = true;
        deleteTaskBtn.disabled = true;
        imagePreviewContainer.style.display = 'none';
    }
    announceToScreenReader('Task deleted.');
    renderTodos();
};

window.toggleComplete = async function(event, id) {
    event.stopPropagation();
    const todos = await getAllTodos();
    const todo = todos.find(t => t.id === id);
    
    if (todo) {
        todo.completed = event.target.checked;
        todo.status = todo.completed ? "Completed" : "In Progress";
        await saveTodoToDB(todo);
        announceToScreenReader(`Task marked as ${todo.status}`);
        renderTodos();
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Service Worker registered', reg);
        });
    });
}

setInterval(async () => {
    const todos = await getAllTodos();
    const now = new Date().getTime();

    todos.forEach(async (todo) => {
        if (todo.notifyTime && !todo.notified && !todo.completed) {
            const timeToNotify = new Date(todo.notifyTime).getTime();
            
            if (now >= timeToNotify) {
                if (Notification.permission === 'granted') {
                    navigator.serviceWorker.ready.then((reg) => {
                        reg.showNotification('TaskMaster Reminder!', {
                            body: todo.title,
                            icon: todo.image || null,
                            vibrate: [200, 100, 200]
                        });
                    });
                }
                todo.notified = true; 
                await saveTodoToDB(todo);
            }
        }
    });
}, 30000);

initTheme();
initDB().then(() => renderTodos());