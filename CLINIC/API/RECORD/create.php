<?php
header('Content-Type: application/json');

const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic';

try {
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $heartbeat   = intval($_POST['heartbeat'] ?? 0);
    $device_name = trim($_POST['device_name'] ?? '');

    if (empty($device_name) || $heartbeat <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Device name and heartbeat are required.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM cat WHERE device_name = ?");
    $stmt->execute([$device_name]);
    $cat = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cat) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Cat with this device name not found.']);
        exit;
    }
    $cat_id = $cat['id'];

    // Only insert into the new heartbeat_log table
    $stmt = $pdo->prepare("INSERT INTO heartbeat_log (cat_id, heartbeat) VALUES (?, ?)");
    $stmt->execute([$cat_id, $heartbeat]);

    echo json_encode(['success' => true, 'message' => 'Heartbeat logged successfully.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>