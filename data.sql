CREATE DATABASE IF NOT EXISTS db_mytodo;
USE db_mytodo;

DROP TABLE IF EXISTS todos;

CREATE TABLE todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    completed TINYINT(1) DEFAULT 0,
    image VARCHAR(255) DEFAULT NULL,
    notify_time DATETIME DEFAULT NULL,
    type ENUM('personal', 'shared') DEFAULT 'personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO todos (title, description, status, completed, image, type) VALUES
('Menyelesaikan Laporan Keuangan', 'Laporan Q3 untuk divisi keuangan.', 'In Progress', 0, NULL, 'personal'),
('Meeting Koordinasi Proyek Citadel', 'Membahas strategi bersama tim internal.', 'Pending', 0, NULL, 'shared'),
('Desain UI/UX Wireframe', 'Membuat sketsa awal halaman utama aplikasi.', 'Completed', 1, NULL, 'personal');