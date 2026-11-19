<?php
$host = 'localhost';
$db   = 'db_mytodo';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

define('JWT_SECRET', 'ganti-dengan-string-acak-panjang');
define('JWT_TTL', 60 * 60 * 24 * 1);
define('UPLOAD_DIR', __DIR__ . '/assets/uploads/');
define('MAX_UPLOAD_BYTES', 2 * 1024 * 1024);

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>