const TAB = document.body.dataset.tab;
const me = Auth.active();
if (!me) location.replace('auth.html');         

const $ = (id) => document.getElementById(id);
const listEl = $('todo-list');
const createForm = $('create-form');
const editPanel = $('editor-panel');
const editForm = $('edit-form');
let activeId = null;

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v == null) continue;
        if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v === true ? '' : v);
    }
    node.append(...children.filter(c => c !== false && c != null));
    return node;
}

function showError(err) {
    const detail = err.details ? ' ' + Object.values(err.details).join(' ') : '';
    announce(err.message + detail);
    alert(err.message + detail);
}

function renderItem(t) {
    const li = el('li', {
        class: `todo-item ${t.completed ? 'task-completed' : ''} ${t.id === activeId ? 'active' : ''}`,
        'data-id': t.id,
        'data-title': t.title,
        'data-completed': t.completed ? 1 : 0,
        'data-notify': t.notify_time ? t.notify_time.replace('T', ' ') : false  
    });

    const checkbox = el('input', {
        type: 'checkbox',
        checked: t.completed,
        'aria-label': `Tandai ${t.title} selesai`,
        onchange: async (e) => {
            try {
                await api(`todos/${t.id}`, { method: 'PATCH', body: { completed: e.target.checked } });
                announce('Status tugas diperbarui.');
            } catch (err) { showError(err); }
            loadTodos();
        }
    });

    const info = el('div', {}, el('span', { class: 'task-name' }, el('strong', {}, t.title)));
    if (TAB === 'shared') {
        info.append(el('small', { class: 'task-meta' }, 'Dibuat oleh ' + (t.is_owner ? 'Anda' : t.owner.name)));
    }
    if (t.notify_time) {
        info.append(el('small', { class: 'task-meta' }, 'Jadwal Notifikasi ' + new Date(t.notify_time).toLocaleString('id-ID')));
    }
    if (t.image_url) {
        info.append(el('div', { style: 'margin-top:5px' },
            el('img', { src: t.image_url, width: 50, style: 'border-radius:4px', alt: `Foto bukti untuk tugas ${t.title}` })));
    }

    const actions = el('div', { class: 'todo-actions' });
    if (t.is_owner) {                                    
        actions.append(
            el('button', { type: 'button', class: 'btn-small', 'aria-label': `Edit tugas ${t.title}`, onclick: () => openEditor(t.id) }, 'Edit'),
            el('button', { type: 'button', class: 'btn-small btn-secondary', 'aria-label': `Hapus tugas ${t.title}`, onclick: () => removeTodo(t) }, 'Hapus')
        );
    }

    li.append(el('div', { class: 'todo-content' }, checkbox, info), actions);
    return li;
}

async function loadTodos() {                             
    try {
        const { data } = await api(`todos?type=${TAB}`);
        listEl.replaceChildren();
        if (!data.length) listEl.append(el('li', { class: 'empty-state' }, 'Belum ada tugas di kategori ini.'));
        else data.forEach(t => listEl.append(renderItem(t)));
        if (typeof checkReminders === 'function') checkReminders();
    } catch (err) {
        listEl.replaceChildren(el('li', { class: 'empty-state', role: 'alert' }, err.message));
    }
}

createForm.addEventListener('submit', async (e) => {     
    e.preventDefault();
    const form = new FormData(createForm);
    form.set('type', TAB);
    if (!form.get('notify_time')) form.delete('notify_time');
    if (!form.get('todo_image') || !form.get('todo_image').size) form.delete('todo_image');
    if (form.get('notify_time') && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    try {
        await api('todos', { method: 'POST', form });
        createForm.reset();
        $('file-name-display').textContent = 'Tidak ada file';
        announce('Tugas baru berhasil ditambahkan.');
        loadTodos();
    } catch (err) { showError(err); }
});

async function openEditor(id) {                          
    try {
        const { data: t } = await api(`todos/${id}`);
        activeId = id;
        $('edit-id').value = t.id;
        $('task-title').value = t.title;
        $('task-desc').value = t.description || '';
        $('task-status').value = t.status;
        editPanel.hidden = false;
        $('task-title').focus();
        loadTodos();
    } catch (err) { showError(err); }
}

editForm.addEventListener('submit', async (e) => {        
    e.preventDefault();
    try {
        await api(`todos/${$('edit-id').value}`, {
            method: 'PUT',
            body: { title: $('task-title').value, description: $('task-desc').value, status: $('task-status').value }
        });
        announce('Tugas berhasil diperbarui.');
        loadTodos();
    } catch (err) { showError(err); }
});

$('close-editor-btn').addEventListener('click', () => {
    activeId = null;
    editPanel.hidden = true;
    loadTodos();
});

async function removeTodo(t) {                           
    if (!confirm(`Yakin ingin menghapus tugas "${t.title}"?`)) return;
    try {
        await api(`todos/${t.id}`, { method: 'DELETE' });
        if (activeId === t.id) { activeId = null; editPanel.hidden = true; }
        announce('Tugas berhasil dihapus.');
        loadTodos();
    } catch (err) { showError(err); }
}

const accountBtn = $('account-btn');
const accountPanel = $('account-panel');

function renderAccountMenu() {
    const state = Auth.load();
    accountBtn.firstElementChild.textContent = me.user.name;
    accountPanel.replaceChildren(
        el('p', { class: 'account-label' }, 'Akun tersimpan'),
        ...state.list.map(a => {
            const isActive = a.user.id === state.active;
            return el('button', {
                type: 'button',
                class: 'account-item' + (isActive ? ' current' : ''),
                'aria-current': isActive ? 'true' : false,
                onclick: () => { if (!isActive) { Auth.switchTo(a.user.id); location.reload(); } }
            }, el('strong', {}, a.user.name), el('small', {}, a.user.email + (isActive ? ' (aktif)' : '')));
        }),
        el('a', { class: 'account-action', href: 'auth.html?add=1' }, '+ Tambah akun'),
        el('button', { type: 'button', class: 'account-action', onclick: () => logout(false) }, 'Keluar dari akun ini'),
        (state.list.length > 1
            ? el('button', { type: 'button', class: 'account-action', onclick: () => logout(true) }, 'Keluar dari semua akun')
            : [])
    );
}

function logout(all) {
    if (all) Auth.save({ active: null, list: [] });
    else Auth.remove(me.user.id);
    location.href = Auth.active() ? 'index.php?tab=' + TAB : 'auth.html';
}

function closeAccountMenu() {
    accountPanel.hidden = true;
    accountBtn.setAttribute('aria-expanded', 'false');
}
accountBtn.addEventListener('click', () => {
    const opening = accountPanel.hidden;
    accountPanel.hidden = !opening;
    accountBtn.setAttribute('aria-expanded', String(opening));
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !accountPanel.hidden) { closeAccountMenu(); accountBtn.focus(); }
});
document.addEventListener('click', (e) => {
    if (!accountPanel.hidden && !accountPanel.contains(e.target) && !accountBtn.contains(e.target)) closeAccountMenu();
});

if (me) { renderAccountMenu(); loadTodos(); }