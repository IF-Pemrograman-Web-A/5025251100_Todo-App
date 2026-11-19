CREATE DATABASE IF NOT EXISTS db_mytodo;
USE db_mytodo;

DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    completed TINYINT(1) DEFAULT 0,
    image VARCHAR(255) DEFAULT NULL,
    notify_time DATETIME DEFAULT NULL,
    type ENUM('personal', 'shared') DEFAULT 'personal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_todos_type_user (type, user_id)
);

INSERT INTO users (name, email, password_hash) VALUES
('Yudith', 'yudith@example.com', '$2y$12$PxCBr7ZfRO.8hcSpyW6VteBrmFzjBWGNxp2983YYJJZGm3s8b.fVa'),
('Rani',   'rani@example.com',   '$2y$12$PxCBr7ZfRO.8hcSpyW6VteBrmFzjBWGNxp2983YYJJZGm3s8b.fVa');

INSERT INTO todos (user_id, title, description, status, completed, type) VALUES
(1, 'Menyelesaikan Laporan Keuangan', 'Laporan Q3 untuk divisi keuangan.', 'In Progress', 0, 'personal'),
(1, 'Meeting Koordinasi Proyek Citadel', 'Membahas strategi bersama tim internal.', 'Pending', 0, 'shared'),
(2, 'Review Wireframe Aplikasi', 'Tugas bersama untuk seluruh anggota.', 'Pending', 0, 'shared'),
(2, 'Desain UI/UX Wireframe', 'Membuat sketsa awal halaman utama aplikasi.', 'Completed', 1, 'personal');