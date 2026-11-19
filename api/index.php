<?php
require_once __DIR__ . '/helpers.php';

ini_set('display_errors', '0');
set_exception_handler(function (Throwable $e) {error_log((string)$e); fail(500, 'Terjadi kesalahan pada server.');});

require_once __DIR__ . '/../config.php';          

function register(PDO $pdo) {
    $in    = read_input();
    $name  = is_string($in['name'] ?? null) ? trim($in['name']) : '';
    $email = is_string($in['email'] ?? null) ? strtolower(trim($in['email'])) : '';
    $pass  = is_string($in['password'] ?? null) ? $in['password'] : '';

    $err = [];
    if (mb_strlen($name) < 2 || mb_strlen($name) > 100) $err['name'] = 'Nama harus 2–100 karakter.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) $err['email'] = 'Format email tidak valid.';
    if (strlen($pass) < 8 || strlen($pass) > 72) $err['password'] = 'Password harus 8–72 karakter.';
    if ($err) fail(422, 'Data tidak valid.', $err);

    $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) fail(409, 'Email sudah terdaftar.');

    try {
        $st = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
        $st->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') fail(409, 'Email sudah terdaftar.');  
        throw $e;
    }
    $user = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'email' => $email];
    respond(201, issue_token($user), ['Location' => 'auth/me']);
}

function login(PDO $pdo) {
    $in    = read_input();
    $email = is_string($in['email'] ?? null) ? strtolower(trim($in['email'])) : '';
    $pass  = is_string($in['password'] ?? null) ? $in['password'] : '';

    $err = [];
    if ($email === '') $err['email'] = 'Email wajib diisi.';
    if ($pass === '')  $err['password'] = 'Password wajib diisi.';
    if ($err) fail(422, 'Data tidak valid.', $err);

    $st = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    if (!$u || !password_verify($pass, $u['password_hash'])) fail(401, 'Email atau password salah.');

    respond(200, issue_token(['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']]));
}

function list_todos(PDO $pdo, array $me) {
    $type = $_GET['type'] ?? 'personal';
    if (!in_array($type, TYPES, true)) fail(422, 'Parameter tidak valid.', ['type' => 'type harus personal atau shared.']);

    $sql  = 'SELECT t.*, u.name AS owner_name FROM todos t JOIN users u ON u.id = t.user_id WHERE t.type = ?';
    $args = [$type];
    if ($type === 'personal') { $sql .= ' AND t.user_id = ?'; $args[] = $me['id']; }   // privat milik sendiri
    if (isset($_GET['status'])) {
        if (!in_array($_GET['status'], STATUSES, true)) fail(422, 'Parameter tidak valid.', ['status' => 'Status tidak dikenal.']);
        $sql .= ' AND t.status = ?'; $args[] = $_GET['status'];
    }
    $st = $pdo->prepare($sql . ' ORDER BY t.id DESC');
    $st->execute($args);
    $rows = $st->fetchAll();

    respond(200, ['data' => array_map(fn($r) => todo_json($r, $me['id']), $rows), 'meta' => ['count' => count($rows)],]);
}

function create_todo(PDO $pdo, array $me) {
    $in = read_input();
    [$f, $err] = todo_fields($in, ['title']);
    $type = $in['type'] ?? 'personal';
    if (!in_array($type, TYPES, true)) $err['type'] = 'type harus personal atau shared.';
    if ($err) fail(422, 'Data tidak valid.', $err);

    $image = save_upload('todo_image');           
    $f += ['description' => '', 'status' => 'Pending', 'completed' => 0, 'notify_time' => null];

    $st = $pdo->prepare('INSERT INTO todos (user_id, title, description, status, completed, image, notify_time, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $st->execute([$me['id'], $f['title'], $f['description'], $f['status'], $f['completed'], $image, $f['notify_time'], $type]);

    $id = (int)$pdo->lastInsertId();
    respond(201, ['data' => todo_json(find_todo($pdo, $id), $me['id'])], ['Location' => "todos/$id"]);
}

function update_todo(PDO $pdo, array $me, array $row, bool $full) {
    $in = read_input();
    [$f, $err] = todo_fields($in, $full ? ['title', 'description', 'status'] : []);
    if ($err) fail(422, 'Data tidak valid.', $err);
    if (!$f)  fail(422, 'Tidak ada field yang dapat diubah.');

    if ((int)$row['user_id'] !== $me['id']) {
        if (array_diff(array_keys($f), ['status', 'completed'])) {
            fail(403, 'Anda hanya boleh mengubah status pada tugas milik orang lain.');
        }
    }

    $sets = implode(', ', array_map(fn($k) => "$k = ?", array_keys($f)));
    $st = $pdo->prepare("UPDATE todos SET $sets WHERE id = ?");
    $st->execute([...array_values($f), $row['id']]);

    respond(200, ['data' => todo_json(find_todo($pdo, (int)$row['id']), $me['id'])]);
}

function delete_todo(PDO $pdo, array $me, array $row) {
    if ((int)$row['user_id'] !== $me['id']) fail(403, 'Hanya pemilik yang boleh menghapus tugas ini.');

    $pdo->prepare('DELETE FROM todos WHERE id = ?')->execute([$row['id']]);
    if ($row['image']) {
        $path = UPLOAD_DIR . basename($row['image']);
        if (is_file($path)) unlink($path);
    }
    respond(204);                                 
}

$method = $_SERVER['REQUEST_METHOD'];
$base   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');                      
$path   = trim(substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen($base)), '/');
$seg    = $path === '' ? [] : explode('/', $path);

switch ($seg[0] ?? '') {
    case '':
        respond(200, ['name' => 'MyTodo API', 'version' => '1.0']);

    case 'auth':
        switch ($seg[1] ?? '') {
            case 'register': allow(['POST']); register($pdo);
            case 'login':    allow(['POST']); login($pdo);
            case 'me':       allow(['GET']);  respond(200, ['data' => auth_user($pdo)]);
        }
        break;

    case 'todos':
        if (count($seg) === 1) {
            allow(['GET', 'POST']);
            $me = auth_user($pdo);
            $method === 'GET' ? list_todos($pdo, $me) : create_todo($pdo, $me);
        }
        if (count($seg) === 2) {
            allow(['GET', 'PUT', 'PATCH', 'DELETE']);
            $me = auth_user($pdo);
            if (!ctype_digit($seg[1])) fail(400, 'ID harus berupa angka.');

            $row = find_todo($pdo, (int)$seg[1]);
            if (!$row || ($row['type'] === 'personal' && (int)$row['user_id'] !== $me['id'])) {
                fail(404, 'Tugas tidak ditemukan.');
            }
            switch ($method) {
                case 'GET':    respond(200, ['data' => todo_json($row, $me['id'])]);
                case 'PUT':    update_todo($pdo, $me, $row, true);
                case 'PATCH':  update_todo($pdo, $me, $row, false);
                case 'DELETE': delete_todo($pdo, $me, $row);
            }
        }
        break;
}
fail(404, 'Endpoint tidak ditemukan.');