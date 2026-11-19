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

async function showReminder(title, options) {
    const reg = navigator.serviceWorker
        ? await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))])
        : null;
    if (reg) return reg.showNotification(title, options);
    new Notification(title, options);
}

let checking = false;
async function checkReminders() {
    if (checking || !('Notification' in window) || Notification.permission !== 'granted') return;
    checking = true;
    try {
        const notified = getNotified();
        for (const li of document.querySelectorAll('.todo-item[data-notify]')) {
            const key = `${li.dataset.id}@${li.dataset.notify}`;
            if (li.dataset.completed === '1' || notified.includes(key)) continue;

            const when = new Date(li.dataset.notify.replace(' ', 'T')).getTime();
            if (Date.now() >= when) {
                await showReminder('Pengingat Tugas!', {
                    body: li.dataset.title,
                    icon: 'assets/icons/maskable_icon_x192.png',   
                    tag: key
                });
                notified.push(key);                                
                localStorage.setItem('notified', JSON.stringify(notified));
            }
        }
    } catch (err) {
        console.error('Pengingat gagal:', err);
    } finally {
        checking = false;
    }
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