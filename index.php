<?php
require_once 'config.php';

$currentTab = isset($_GET['tab']) ? $_GET['tab'] : 'personal';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $title = trim($_POST['title']);
    $notifyTime = !empty($_POST['notify_time']) ? $_POST['notify_time'] : null;
    $type = $_POST['type'] ?? 'personal';
    
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

$stmt = $pdo->prepare("SELECT * FROM todos WHERE type = ? ORDER BY id DESC");
$stmt->execute([$currentTab]);
$todos = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="MyTodo - Web Todo List Organisasi.">
    <title>MyTodo Organizational UI</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <header class="app-header" role="banner">
        <div class="header-content">
            <div class="header-text">
                <h1>MyTodo</h1>
                <p>Your Personal Task Manager</p>
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
                        <input type="text" id="new-todo-title" name="title" placeholder="Apa yang anda mau lakukan?" required>
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
                            <li class="todo-item <?= $todo['completed'] ? 'task-completed' : '' ?>">
                                <div class="todo-content">
                                    <span class="task-name"><strong><?= htmlspecialchars($todo['title']) ?></strong></span>
                                    <?php if (!empty($todo['image'])): ?>
                                        <div style="margin-top: 5px;">
                                            <img src="assets/uploads/<?= htmlspecialchars($todo['image']) ?>" alt="Bukti" width="50" style="border-radius: 4px;">
                                        </div>
                                    <?php endif; ?>
                                </div>
                                <div class="todo-actions">
                                    <button class="btn-small btn-secondary" onclick="if(confirm('Yakin ingin menghapus tugas ini?')) { window.location.href='delete.php?id=<?= $todo['id'] ?>&tab=<?= $currentTab ?>'; }">Hapus</button>
                                </div>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
            </section>
        </main>
    </div>

    <footer class="app-footer" role="contentinfo">
        <p>&copy; 2026 Iron Citadel - YuHaRa. All rights reserved.</p>
    </footer>
    <script>
        const fileInput = document.getElementById('todo-image');
        const fileNameDisplay = document.getElementById('file-name-display');
        if(fileInput) {
            fileInput.addEventListener('change', function() {
                fileNameDisplay.textContent = this.files.length > 0 ? this.files[0].name : 'Tidak ada file';
            });
        }
    </script>
</body>
</html>