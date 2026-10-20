<?php
require_once 'config.php';

if (isset($_GET['id'])) {
    $id = $_GET['id'];
    $tab = $_GET['tab'] ?? 'personal';

    $stmt = $pdo->prepare("SELECT image FROM todos WHERE id = ?");
    $stmt->execute([$id]);
    $todo = $stmt->fetch();

    if ($todo) {
        if (!empty($todo['image'])) {
            $filePath = './assets/uploads/' . $todo['image'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $delStmt = $pdo->prepare("DELETE FROM todos WHERE id = ?");
        $delStmt->execute([$id]);
    }

    header("Location: index.php?tab=" . $tab);
    exit;
}
?>