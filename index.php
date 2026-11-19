<?php
$allowedTabs = ['personal', 'shared'];
$currentTab = (isset($_GET['tab']) && in_array($_GET['tab'], $allowedTabs, true))
    ? $_GET['tab'] : 'personal';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="MyTodo - Web Todo List Multiuser.">
    <title>MyTodo Organizational UI</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#4F46E5">
    <link rel="icon" href="assets/icons/yuhara-icon.svg">
    <link rel="apple-touch-icon" href="assets/icons/yuhara-icon.svg">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body data-tab="<?= $currentTab ?>">
    <div id="a11y-announcer" class="sr-only" role="status" aria-live="polite"></div>

    <header class="app-header" role="banner">
        <div class="header-content">
            <div class="header-text">
                <h1>MyTodo</h1>
                <p>Your Personal/Organizational Task Manager</p>
            </div>
            <div class="header-actions">
                <div class="account-menu">
                    <button id="account-btn" class="btn-theme" type="button" aria-expanded="false" aria-controls="account-panel">
                        <span>Akun</span> <span aria-hidden="true">▾</span>
                    </button>
                    <div id="account-panel" class="account-panel" hidden></div>
                </div>
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
                <form id="create-form" class="todo-form" enctype="multipart/form-data">
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
                <ul id="todo-list" class="todo-list"></ul>
            </section>
        </main>

        <aside id="editor-panel" class="todo-detail-panel" aria-labelledby="editor-heading" hidden>
            <h2 id="editor-heading">Editor Tugas</h2>
            <form id="edit-form">
                <input type="hidden" id="edit-id">
                <div class="form-group">
                    <label for="task-title">Judul</label>
                    <input type="text" id="task-title" required aria-required="true">
                </div>
                <div class="form-group">
                    <label for="task-desc">Deskripsi</label>
                    <textarea id="task-desc" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label for="task-status">Status</label>
                    <select id="task-status">
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" id="close-editor-btn" class="btn-secondary">Tutup</button>
                    <button type="submit" id="save-task-btn">Simpan</button>
                </div>
            </form>
        </aside>
    </div>

    <footer class="app-footer" role="contentinfo">
        <p>&copy; 2026 YuHaRa. All rights reserved.</p>
    </footer>

    <script src="assets/js/auth.js" defer></script>
    <script src="assets/js/app.js" defer></script>
    <script src="assets/js/script.js" defer></script>
</body>
</html>