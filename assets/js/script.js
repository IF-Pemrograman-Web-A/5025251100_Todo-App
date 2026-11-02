const announcer = document.getElementById('a11y-announcer');
const themeBtn = document.getElementById('theme-toggle');
const installBtn = document.getElementById('install-btn');
const fileInput = document.getElementById('todo-image');
const fileNameDisplay = document.getElementById('file-name-display');
const todoTimeInput = document.getElementById('todo-time');

function announce(msg) { if (announcer) announcer.textContent = msg; }

if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

themeBtn?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    announce(`Tema diganti ke mode ${isDark ? 'gelap' : 'terang'}`);
});

fileInput?.addEventListener('change', function () {
    fileNameDisplay.textContent = this.files.length ? this.files[0].name : 'Tidak ada file';
});

todoTimeInput?.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

function getNotified() {
    try { return JSON.parse(localStorage.getItem('notified') || '[]'); } catch { return []; }
}

function checkReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const notified = getNotified();

    document.querySelectorAll('.todo-item[data-notify]').forEach(li => {
        const id = li.dataset.id;
        if (li.dataset.completed === '1' || notified.includes(id)) return;

        const when = new Date(li.dataset.notify.replace(' ', 'T')).getTime();
        if (Date.now() >= when) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('Pengingat Tugas!', {
                    body: li.dataset.title,
                    icon: 'assets/icons/yuhara-icon.svg',
                    vibrate: [200, 100, 200]
                });
            });
            notified.push(id);
            localStorage.setItem('notified', JSON.stringify(notified));
        }
    });
}
setInterval(checkReminders, 30000);
checkReminders();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered, scope:', reg.scope))
            .catch(err => console.error('SW gagal:', err));
    });
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install:', outcome);
    deferredPrompt = null;
    installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    announce('Aplikasi berhasil diinstal');
});