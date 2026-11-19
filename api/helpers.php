<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const TYPES    = ['personal', 'shared'];

function respond(int $status, $data = null, array $headers = []) {
    http_response_code($status);
    foreach ($headers as $name => $value) header("$name: $value");
    if ($status !== 204 && $data !== null) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

function fail(int $status, string $message, array $details = [], array $headers = []) {
    respond($status, ['error' => [
        'status'  => $status,
        'message' => $message,
        'details' => $details ?: null,
    ]], $headers);
}

function allow(array $methods) {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        fail(405, 'Method tidak diizinkan untuk endpoint ini.', [], ['Allow' => implode(', ', $methods)]);
    }
}

function read_input(): array {
    $type   = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    $method = $_SERVER['REQUEST_METHOD'];

    if (str_starts_with($type, 'application/json')) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) fail(400, 'Body harus berupa JSON object yang valid.');
        return $data;
    }
    if ($method === 'POST' && (str_starts_with($type, 'multipart/form-data') || str_starts_with($type, 'application/x-www-form-urlencoded'))) {
        return $_POST;
    }
    fail(415, 'Content-Type tidak didukung. Gunakan application/json (atau multipart/form-data untuk POST).');
}

function b64url(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }

function jwt_encode(array $payload, string $secret): string {
    $h = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64url(json_encode($payload));
    $s = b64url(hash_hmac('sha256', "$h.$p", $secret, true));
    return "$h.$p.$s";
}

function jwt_decode(string $jwt, string $secret): ?array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = b64url(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($expected, $s)) return null;
    $payload = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function issue_token(array $user): array {
    $now = time();
    return [
        'token'      => jwt_encode(['sub' => $user['id'], 'iat' => $now, 'exp' => $now + JWT_TTL], JWT_SECRET),
        'token_type' => 'Bearer',
        'expires_in' => JWT_TTL,
        'user'       => $user,
    ];
}

function auth_user(PDO $pdo): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(\S+)$/i', $header, $m)) {
        fail(401, 'Token autentikasi tidak ditemukan.', [], ['WWW-Authenticate' => 'Bearer']);
    }
    $payload = jwt_decode($m[1], JWT_SECRET);
    if (!$payload) {
        fail(401, 'Token tidak valid atau sudah kedaluwarsa.', [], ['WWW-Authenticate' => 'Bearer error="invalid_token"']);
    }
    $st = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $st->execute([(int)$payload['sub']]);
    $user = $st->fetch();
    if (!$user) fail(401, 'Akun tidak ditemukan.', [], ['WWW-Authenticate' => 'Bearer error="invalid_token"']);
    $user['id'] = (int)$user['id'];
    return $user;
}

function find_todo(PDO $pdo, int $id): ?array {
    $st = $pdo->prepare('SELECT t.*, u.name AS owner_name FROM todos t JOIN users u ON u.id = t.user_id WHERE t.id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function todo_json(array $r, int $uid): array {
    return [
        'id'          => (int)$r['id'],
        'title'       => $r['title'],
        'description' => $r['description'],
        'status'      => $r['status'],
        'completed'   => (bool)$r['completed'],
        'type'        => $r['type'],
        'image_url'   => $r['image'] ? 'assets/uploads/' . $r['image'] : null,
        'notify_time' => $r['notify_time'] ? date('Y-m-d\TH:i:s', strtotime($r['notify_time'])) : null,
        'created_at'  => $r['created_at'],
        'owner'       => ['id' => (int)$r['user_id'], 'name' => $r['owner_name']],
        'is_owner'    => (int)$r['user_id'] === $uid,
    ];
}

function todo_fields(array $in, array $required): array {
    $f = []; $err = [];
    foreach ($required as $k) {
        if (!array_key_exists($k, $in)) $err[$k] = "Field $k wajib diisi.";
    }

    if (array_key_exists('title', $in) && !isset($err['title'])) {
        $t = is_string($in['title']) ? trim($in['title']) : '';
        if ($t === '' || mb_strlen($t) > 255) $err['title'] = 'Judul wajib diisi (maksimal 255 karakter).';
        else $f['title'] = $t;
    }
    if (array_key_exists('description', $in) && !isset($err['description'])) {
        $d = is_string($in['description']) ? trim($in['description']) : null;
        if ($d === null || mb_strlen($d) > 5000) $err['description'] = 'Deskripsi harus teks (maksimal 5000 karakter).';
        else $f['description'] = $d;
    }
    if (array_key_exists('status', $in) && !isset($err['status'])) {
        if (!in_array($in['status'], STATUSES, true)) {
            $err['status'] = 'Status harus salah satu dari: ' . implode(', ', STATUSES) . '.';
        } else {
            $f['status']    = $in['status'];
            $f['completed'] = $in['status'] === 'Completed' ? 1 : 0;
        }
    } elseif (array_key_exists('completed', $in)) {
        if (!is_bool($in['completed'])) {
            $err['completed'] = 'Field completed harus boolean (true/false).';
        } else {
            $f['completed'] = $in['completed'] ? 1 : 0;
            $f['status']    = $in['completed'] ? 'Completed' : 'In Progress';
        }
    }
    if (array_key_exists('notify_time', $in)) {
        if ($in['notify_time'] === null || $in['notify_time'] === '') {
            $f['notify_time'] = null;
        } elseif (is_string($in['notify_time']) && ($ts = strtotime($in['notify_time'])) !== false) {
            $f['notify_time'] = date('Y-m-d H:i:s', $ts);
        } else {
            $err['notify_time'] = 'Format tanggal tidak valid.';
        }
    }
    return [$f, $err];
}

function save_upload(string $field): ?string {
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) return null;
    $file = $_FILES[$field];

    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > MAX_UPLOAD_BYTES) {
        fail(413, 'Ukuran gambar maksimal 2 MB.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) fail(400, 'Upload gambar gagal.');

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $ext  = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif'][$mime] ?? null;
    if (!$ext) fail(415, 'Format gambar harus JPG, PNG, atau GIF.');

    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $name)) fail(500, 'Gagal menyimpan gambar.');
    return $name;
}