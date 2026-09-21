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
let activeTodoId = 1; 
const todoListEl = document.getElementById('todo-list');
const createForm = document.getElementById('create-form');
const newTodoTitleInput = document.getElementById('new-todo-title');
const themeToggleBtn = document.getElementById('theme-toggle');
const editForm = document.getElementById('edit-form');
const editIdInput = document.getElementById('edit-id');
const editTitleInput = document.getElementById('task-title');
const editDescInput = document.getElementById('task-desc');
const editStatusSelect = document.getElementById('task-status');
const saveTaskBtn = document.getElementById('save-task-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');

function renderTodos() {
    todoListEl.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.id === activeTodoId ? 'active' : ''} ${todo.completed ? 'task-completed' : ''}`;
        li.innerHTML = `
            <label class="todo-content" onclick="selectTodo(${todo.id})">
                <input type="checkbox" onchange="toggleComplete(event, ${todo.id})" ${todo.completed ? 'checked' : ''}>
                <span class="task-name">${todo.title}</span>
            </label>
            <div class="todo-actions">
                <button class="btn-small" onclick="selectTodo(${todo.id})">Edit</button>
                <button class="btn-small btn-del" onclick="deleteTodo(${todo.id})">Delete</button>
            </div>
        `;
        todoListEl.appendChild(li);
    });

    if(activeTodoId) {
        fillEditorForm(activeTodoId);
    }
}

createForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const newTitle = newTodoTitleInput.value.trim();
    
    if (newTitle) {
        const newTodo = {
            id: Date.now(), 
            title: newTitle,
            desc: "",
            status: "Pending",
            completed: false
        };
        
        todos.unshift(newTodo); 
        newTodoTitleInput.value = '';
        renderTodos();
    }
});

function fillEditorForm(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    editTitleInput.disabled = false;
    editDescInput.disabled = false;
    editStatusSelect.disabled = false;
    saveTaskBtn.disabled = false;
    deleteTaskBtn.disabled = false;
    editIdInput.value = todo.id;
    editTitleInput.value = todo.title;
    editDescInput.value = todo.desc;
    editStatusSelect.value = todo.status;
}

window.selectTodo = function(id) {
    activeTodoId = id;
    renderTodos(); 
};

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(editIdInput.value);
    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex > -1) {
        todos[todoIndex].title = editTitleInput.value;
        todos[todoIndex].desc = editDescInput.value;
        todos[todoIndex].status = editStatusSelect.value;
        
        if (editStatusSelect.value === 'Completed') {
            todos[todoIndex].completed = true;
        } else {
            todos[todoIndex].completed = false;
        }
        
        renderTodos();
    }
});

window.deleteTodo = function(id) {
    todos = todos.filter(t => t.id !== id);
    
    if (activeTodoId === id) {
        activeTodoId = null;
        editForm.reset();
        editTitleInput.disabled = true;
        editDescInput.disabled = true;
        editStatusSelect.disabled = true;
        saveTaskBtn.disabled = true;
        deleteTaskBtn.disabled = true;
    }
    
    renderTodos();
};

deleteTaskBtn.addEventListener('click', () => {
    if (activeTodoId) deleteTodo(activeTodoId);
});

window.toggleComplete = function(event, id) {
    event.stopPropagation(); 
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = event.target.checked;
        todo.status = todo.completed ? "Completed" : "In Progress";
        renderTodos();
    }
};

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

renderTodos();