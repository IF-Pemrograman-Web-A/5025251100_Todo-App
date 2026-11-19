const STORE_KEY = 'mytodo.accounts';
const API_BASE = new URL('api/', document.baseURI).href;   

const Auth = {
    load() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { active: null, list: [] }; }
        catch { return { active: null, list: [] }; }
    },
    save(state) { localStorage.setItem(STORE_KEY, JSON.stringify(state)); },
    active() {
        const s = this.load();
        return s.list.find(a => a.user.id === s.active) || null;
    },
    add(user, token) {                     
        const s = this.load();
        s.list = s.list.filter(a => a.user.id !== user.id);
        s.list.push({ user, token });
        s.active = user.id;
        this.save(s);
    },
    switchTo(id) {                         
        const s = this.load();
        if (s.list.some(a => a.user.id === id)) { s.active = id; this.save(s); }
    },
    remove(id) {                            
        const s = this.load();
        s.list = s.list.filter(a => a.user.id !== id);
        if (s.active === id) s.active = s.list.length ? s.list[0].user.id : null;
        this.save(s);
    }
};

async function api(path, { method = 'GET', body, form } = {}) {
    const acc = Auth.active();
    const headers = { Accept: 'application/json' };
    if (acc) headers.Authorization = 'Bearer ' + acc.token;

    let payload;
    if (form) {
        payload = form;                      
    } else if (body) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let res;
    try {
        res = await fetch(API_BASE + path, { method, headers, body: payload });
    } catch {
        throw Object.assign(new Error('Tidak ada koneksi ke server (offline).'), { status: 0 });
    }

    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        if (res.status === 401 && acc && !path.startsWith('auth/')) {
            Auth.remove(acc.user.id);
            location.href = 'auth.html?expired=1';
        }
        throw Object.assign(
            new Error(data?.error?.message || 'Terjadi kesalahan.'),
            { status: res.status, details: data?.error?.details || null }
        );
    }
    return data;
}