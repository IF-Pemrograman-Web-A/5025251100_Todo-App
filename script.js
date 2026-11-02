const DB_NAME = 'MyToDoDB';
const STORE_NAME = 'todos';
let db;
let activeTodoId = null;
let activeCameraStream = null; 

const fileNameDisplay = document.getElementById('file-name-display');
const todoListEl = document.getElementById('todo-list');
const createForm = document.getElementById('create-form');
const newTodoTitle = document.getElementById('new-todo-title');
const todoImageInput = document.getElementById('todo-image');
const cameraCaptureBtn = document.getElementById('camera-capture-btn');
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

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database belum diinisialisasi"));
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result.sort((a, b) => b.id - a.id));
        request.onerror = (e) => reject(e.target.error);
        tx.onerror = (e) => reject(tx.target.error);
        tx.onabort = (e) => reject(tx.error);
    });
}

function saveTodoToDB(todo) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database belum diinisialisasi"));
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).put(todo);
        
        tx.oncomplete = () => resolve();
        request.onerror = (e) => reject(e.target.error);
        tx.onerror = (e) => reject(tx.target.error);
        tx.onabort = (e) => reject(tx.error);
    });
}

function deleteTodoFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Database belum diinisialisasi"));
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).delete(id);
        
        tx.oncomplete = () => resolve();
        request.onerror = (e) => reject(e.target.error);
        tx.onerror = (e) => reject(tx.target.error);
        tx.onabort = (e) => reject(tx.error);
    });
}

function announceToScreenReader(message) {
    announcer.textContent = message;
}

async function renderTodos() {
    try {
        const todos = await getAllTodos();
        todoListEl.innerHTML = '';
        
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.id === activeTodoId ? 'active' : ''} ${todo.completed ? 'task-completed' : ''}`;
            
            const safeTitle = escapeHtml(todo.title);

            li.innerHTML = `
                <label class="todo-content" onclick="selectTodo(${todo.id})" aria-label="Pilih tugas ${safeTitle}">
                    <input type="checkbox" onchange="toggleComplete(event, ${todo.id})" ${todo.completed ? 'checked' : ''} aria-label="Tandai ${safeTitle} selesai">
                    <span class="task-name">${safeTitle}</span>
                </label>
                <div class="todo-actions">
                    <button class="btn-small" onclick="selectTodo(${todo.id})" aria-label="Edit tugas ${safeTitle}">Edit</button>
                    <button class="btn-small btn-secondary" onclick="deleteTodo(${todo.id})" aria-label="Hapus tugas ${safeTitle}">Hapus</button>
                </div>
            `;
            todoListEl.appendChild(li);
        });

        if (activeTodoId) fillEditorForm(activeTodoId);
    } catch (error) {
        console.error("Gagal memuat daftar tugas:", error);
        announceToScreenReader("Gagal memuat data dari database.");
    }
}

function stopCameraStream() {
    if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(track => track.stop());
        activeCameraStream = null;
    }
}

cameraCaptureBtn.addEventListener('click', async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Media Capture API tidak didukung oleh browser ini.");
        }

        activeCameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });

        stopCameraStream();
        announceToScreenReader("Kamera berhasil diakses dan dihentikan.");
        
    } catch (error) {
        console.warn("Media Capture API gagal atau izin ditolak. Beralih ke file input standar.", error);
        stopCameraStream();
        todoImageInput.click();
    }
});

todoImageInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
        fileNameDisplay.textContent = this.files[0].name;
    } else {
        fileNameDisplay.textContent = 'Tidak ada file';
    }
    stopCameraStream();
});

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

    try {
        await saveTodoToDB(newTodo);
        createForm.reset();
        fileNameDisplay.textContent = 'Tidak ada file';
        announceToScreenReader('Tugas baru berhasil dibuat.');
        renderTodos();
    } catch (error) {
        console.error("Gagal menyimpan tugas:", error);
        announceToScreenReader("Gagal menyimpan tugas ke database.");
    }
    
});

async function requestNotificationPermissionContextually() {
    if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            announceToScreenReader("Izin notifikasi diaktifkan.");
        } else {
            announceToScreenReader("Izin notifikasi ditolak.");
        }
    }
}

todoTimeInput.addEventListener('focus', () => {
    requestNotificationPermissionContextually();
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
    try {
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
    } catch (error) {
        console.error("Gagal memuat detail tugas:", error);
    }
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(editIdInput.value);
    try {
        const todos = await getAllTodos();
        const todo = todos.find(t => t.id === id);

        if (todo) {
            todo.title = editTitleInput.value;
            todo.desc = editDescInput.value;
            todo.status = editStatusSelect.value;
            todo.completed = (editStatusSelect.value === 'Completed');
            
            await saveTodoToDB(todo);
            announceToScreenReader('Tugas berhasil diperbarui.');
            renderTodos();
        }
    } catch (error) {
        console.error("Gagal memperbarui tugas:", error);
        announceToScreenReader("Gagal memperbarui tugas.");
    }
});

deleteTaskBtn.addEventListener('click', async () => {
    const id = parseInt(editIdInput.value);
    if (id) {
        await deleteTodo(id);
    }
});

window.deleteTodo = async function(id) {
    try {
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
        announceToScreenReader('Tugas berhasil dihapus.');
        renderTodos();
    } catch (error) {
        console.error("Gagal menghapus tugas:", error);
        announceToScreenReader("Gagal menghapus tugas dari database.");
    }
};

window.toggleComplete = async function(event, id) {
    event.stopPropagation();
    try {
        const todos = await getAllTodos();
        const todo = todos.find(t => t.id === id);
        
        if (todo) {
            todo.completed = event.target.checked;
            todo.status = todo.completed ? "Completed" : "In Progress";
            await saveTodoToDB(todo);
            announceToScreenReader(`Tugas ditandai sebagai ${todo.status}`);
            renderTodos();
        }
    } catch (error) {
        console.error("Gagal mengubah status tugas:", error);
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
    try {
        const todos = await getAllTodos();
        const now = new Date().getTime();

        todos.forEach(async (todo) => {
            if (todo.notifyTime && !todo.notified && !todo.completed) {
                const timeToNotify = new Date(todo.notifyTime).getTime();
                
                if (now >= timeToNotify) {
                    if (Notification.permission === 'granted') {
                        navigator.serviceWorker.ready.then((reg) => {
                            reg.showNotification('Pengingat Tugas!', {
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
    } catch (error) {
        console.error("Error pada background interval notifikasi:", error);
    }
}, 30000);

initTheme();
initDB().then(() => renderTodos()).catch(err => console.error("Gagal menginisialisasi DB:", err));