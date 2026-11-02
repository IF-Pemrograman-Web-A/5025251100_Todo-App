<?php
require_once 'config.php';

$allowedTabs = ['personal', 'shared'];
$currentTab = (isset($_GET['tab']) && in_array($_GET['tab'], $allowedTabs, true))
    ? $_GET['tab'] : 'personal';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $title = trim($_POST['title'] ?? '');
        $notifyTime = !empty($_POST['notify_time']) ? $_POST['notify_time'] : null;
        $type = in_array($_POST['type'] ?? '', $allowedTabs, true) ? $_POST['type'] : 'personal';

        $imageName = null;
    if (isset($_FILES['todo_image']) && $_FILES['todo_image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['todo_image']['tmp_name'];
        $fileName = $_FILES['todo_image']['name'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        if (in_array($fileExtension, $allowedExtensions)) {
            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $uploadFileDir = './assets/uploads/';
            
            if (!is_dir($uploadFileDir)) {
                mkdir($uploadFileDir, 0755, true);
            }
            
            $dest_path = $uploadFileDir . $newFileName;
            if(move_uploaded_file($fileTmpPath, $dest_path)) {
                $imageName = $newFileName;
            }
        }
    }

        if (!empty($title)) {
            $stmt = $pdo->prepare("INSERT INTO todos (title, notify_time, image, type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$title, $notifyTime, $imageName, $type]);
            header("Location: index.php?tab=" . $type);
            exit;
        }
    }

    elseif ($action === 'toggle') {
        $id = (int)($_POST['id'] ?? 0);
        $completed = isset($_POST['completed']) ? 1 : 0;
        $status = $completed ? 'Completed' : 'In Progress';
        $stmt = $pdo->prepare("UPDATE todos SET completed = ?, status = ? WHERE id = ?");
        $stmt->execute([$completed, $status, $id]);
        header("Location: index.php?tab=" . $currentTab);
        exit;
    }

    elseif ($action === 'update') {
        $id = (int)($_POST['id'] ?? 0);
        $title = trim($_POST['title'] ?? '');
        $desc = trim($_POST['description'] ?? '');
        $status = in_array($_POST['status'] ?? '', ['Pending', 'In Progress', 'Completed'], true)
            ? $_POST['status'] : 'Pending';
        $completed = ($status === 'Completed') ? 1 : 0;

        if ($title !== '') {
            $stmt = $pdo->prepare("UPDATE todos SET title = ?, description = ?, status = ?, completed = ? WHERE id = ?");
            $stmt->execute([$title, $desc, $status, $completed, $id]);
        }
        header("Location: index.php?tab=" . $currentTab . "&edit=" . $id);
        exit;
    }
}

$stmt = $pdo->prepare("SELECT * FROM todos WHERE type = ? ORDER BY id DESC");
$stmt->execute([$currentTab]);
$todos = $stmt->fetchAll();

$editTodo = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM todos WHERE id = ? AND type = ?");
    $stmt->execute([(int)$_GET['edit'], $currentTab]);
    $editTodo = $stmt->fetch() ?: null;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="MyTodo - Web Todo List Organisasi.">
    <title>MyTodo Organizational UI</title>

    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#4F46E5">
    <link rel="icon" href="assets/icons/yuhara-icon.svg">
    <link rel="apple-touch-icon" href="assets/icons/yuhara-icon.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div id="a11y-announcer" class="sr-only" role="status" aria-live="polite"></div>

    <header class="app-header" role="banner">
        <div class="header-content">
            <div class="header-text">
                <h1>MyTodo</h1>
                <p>Your Personal/Organizational Task Manager</p>
            </div>
            <div class="header-actions">
                <button id="theme-toggle" class="btn-theme" type="button" aria-label="Ganti tema terang atau gelap">Toggle Light/Dark</button>
                <button id="install-btn" class="btn-theme" type="button" hidden>Install Aplikasi</button>
            </div>
        </div>
    </header>

    <div class="layout-wrapper">
        <?php include 'menubar.php'; ?>

        <main class="todo-list-panel" role="main">
            <section class="create-todo">
                <h2>Buat list tugas baru (<?= ucfirst($currentTab) ?>)</h2>
                <form id="create-form" class="todo-form" action="index.php?tab=<?= $currentTab ?>" method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="action" value="add">
                    <input type="hidden" name="type" value="<?= $currentTab ?>">
                    
                    <div class="input-group">
                        <label for="new-todo-title" class="sr-only">Judul Tugas</label>
                        <input type="text" id="new-todo-title" name="title" placeholder="Apa yang anda mau lakukan?" required aria-required="true">
                    </div>
                    <div class="form-row">
                        <div class="input-group">
                            <span class="a11y-label">Foto Tugas</span>
                            <div class="custom-file-upload">
                                <label for="todo-image" class="btn-theme-outline">Pilih File</label>
                                <span id="file-name-display" class="file-name">Tidak ada file</span>
                                <input type="file" id="todo-image" name="todo_image" accept="image/*" class="sr-only">
                            </div>
                        </div>
                        <div class="input-group">
                            <label for="todo-time" class="a11y-label">Jadwal Notifikasi</label>
                            <input type="datetime-local" id="todo-time" name="notify_time">
                        </div>
                        <div class="todo-form-submit">
                            <button type="submit" class="btn-primary">Tambahkan Tugas</button>
                        </div>
                    </div>
                </form>
            </section>

            <section class="list-container">
                <h2>Tugas saat ini (<?= ucfirst($currentTab) ?>)</h2>
                <ul id="todo-list" class="todo-list">
                    <?php if (empty($todos)): ?>
                        <p style="color: var(--text-muted);">Belum ada tugas di kategori ini.</p>
                    <?php else: ?>
                        <?php foreach ($todos as $todo): ?>
                            <li class="todo-item <?= $todo['completed'] ? 'task-completed' : '' ?> <?= ($editTodo && $editTodo['id'] == $todo['id']) ? 'active' : '' ?>"
                                data-id="<?= (int)$todo['id'] ?>"
                                data-title="<?= htmlspecialchars($todo['title']) ?>"
                                data-completed="<?= (int)$todo['completed'] ?>"
                                <?= !empty($todo['notify_time']) ? 'data-notify="' . htmlspecialchars($todo['notify_time']) . '"' : '' ?>>

                                <div class="todo-content">

                                    <form method="POST" action="index.php?tab=<?= $currentTab ?>" class="toggle-form">
                                        <input type="hidden" name="action" value="toggle">
                                        <input type="hidden" name="id" value="<?= (int)$todo['id'] ?>">
                                        <input type="checkbox" name="completed" value="1"
                                            <?= $todo['completed'] ? 'checked' : '' ?>
                                            onchange="this.form.submit()"
                                            aria-label="Tandai <?= htmlspecialchars($todo['title']) ?> selesai">
                                    </form>
                                    <div>
                                        <span class="task-name"><strong><?= htmlspecialchars($todo['title']) ?></strong></span>
                                        <?php if (!empty($todo['notify_time'])): ?>
                                            <small class="task-meta">Jadwal Notifikasi <?= date('d M Y H:i', strtotime($todo['notify_time'])) ?></small>
                                        <?php endif; ?>
                                        <?php if (!empty($todo['image'])): ?>
                                            <div style="margin-top: 5px;">
                                                <img src="assets/uploads/<?= htmlspecialchars($todo['image']) ?>" alt="Bukti" width="50" style="border-radius: 4px;">
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <div class="todo-actions">

                                    <button type="button" class="btn-small"
                                            onclick="location.href='index.php?tab=<?= $currentTab ?>&edit=<?= (int)$todo['id'] ?>'"
                                            aria-label="Edit tugas <?= htmlspecialchars($todo['title']) ?>">Edit</button>
                                    <button type="button" class="btn-small btn-secondary"
                                            onclick="if(confirm('Yakin ingin menghapus tugas ini?')) { window.location.href='delete.php?id=<?= (int)$todo['id'] ?>&tab=<?= $currentTab ?>'; }"
                                            aria-label="Hapus tugas <?= htmlspecialchars($todo['title']) ?>">Hapus</button>
                                </div>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
            </section>
                </main>

        <?php if ($editTodo): ?>
        <aside class="todo-detail-panel" role="complementary" aria-labelledby="editor-heading">
            <h2 id="editor-heading">Editor Tugas</h2>
            <form id="edit-form" action="index.php?tab=<?= $currentTab ?>" method="POST">
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" value="<?= (int)$editTodo['id'] ?>">

                <div class="form-group">
                    <label for="task-title">Judul</label>
                    <input type="text" id="task-title" name="title" required aria-required="true" value="<?= htmlspecialchars($editTodo['title']) ?>">
                </div>
                <div class="form-group">
                    <label for="task-desc">Deskripsi</label>
                    <textarea id="task-desc" name="description" rows="4"><?= htmlspecialchars($editTodo['description'] ?? '') ?></textarea>
                </div>
                <div class="form-group">
                    <label for="task-status">Status</label>
                    <select id="task-status" name="status">
                        <?php foreach (['Pending', 'In Progress', 'Completed'] as $s): ?>
                            <option value="<?= $s ?>" <?= $editTodo['status'] === $s ? 'selected' : '' ?>><?= $s ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <?php if (!empty($editTodo['image'])): ?>
                <div id="image-preview-container">
                    <span class="a11y-label">Foto Tugas</span>
                    <img id="task-image-preview" src="assets/uploads/<?= htmlspecialchars($editTodo['image']) ?>" alt="Foto tugas">
                </div>
                <?php endif; ?>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="location.href='index.php?tab=<?= $currentTab ?>'">Tutup</button>
                    <button type="submit" id="save-task-btn">Simpan</button>
                </div>
            </form>
        </aside>
        <?php endif; ?>
    </div>

    <footer class="app-footer" role="contentinfo">
        <p>&copy; 2026 YuHaRa. All rights reserved.</p>
    </footer>
    <script src="assets/js/script.js" defer></script>
</body>
</html>