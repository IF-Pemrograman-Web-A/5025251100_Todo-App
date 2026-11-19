const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const adding = params.has('add');
const msg = $('auth-message');

if (Auth.active() && !adding) location.replace('index.php?tab=personal');
if (adding) $('auth-subtitle').textContent = 'Tambahkan akun lain. Akun yang sedang aktif tetap tersimpan.';
if (params.has('expired')) show('Sesi berakhir. Silakan masuk lagi.');

function show(text) {
    msg.textContent = text;
    msg.className = 'flash flash-error';
    msg.hidden = false;
}

function setMode(mode) {
    const isLogin = mode === 'login';
    $('login-form').hidden = !isLogin;
    $('register-form').hidden = isLogin;
    $('tab-login').setAttribute('aria-pressed', String(isLogin));
    $('tab-register').setAttribute('aria-pressed', String(!isLogin));
    msg.hidden = true;
}
$('tab-login').addEventListener('click', () => setMode('login'));
$('tab-register').addEventListener('click', () => setMode('register'));

async function submit(e, path, fields) {
    e.preventDefault();
    const prefix = e.target.id.split('-')[0];                   
    const body = Object.fromEntries(fields.map(f => [f, $(`${prefix}-${f}`).value]));
    try {
        const res = await api(path, { method: 'POST', body });
        Auth.add(res.user, res.token);                           
        location.href = 'index.php?tab=personal';
    } catch (err) {
        const detail = err.details ? ' ' + Object.values(err.details).join(' ') : '';
        show(err.message + detail);
    }
}
$('login-form').addEventListener('submit', (e) => submit(e, 'auth/login', ['email', 'password']));
$('register-form').addEventListener('submit', (e) => submit(e, 'auth/register', ['name', 'email', 'password']));