<?php
header('Content-Type: application/json');

const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic';

try {
  $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
  ]);

  $cat_id = isset($_GET['cat_id']) ? intval($_GET['cat_id']) : 0;
  if ($cat_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'cat_id is required']);
    exit;
  }

  // Fetch all heartbeat records for the given cat_id, ordered by most recent
  $stmt = $pdo->prepare("SELECT * FROM heartbeat_log WHERE cat_id = ? ORDER BY recorded_at ASC");
  $stmt->execute([$cat_id]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (!$rows) {
    echo json_encode(['success' => false, 'message' => 'No heartbeat records found for this cat.']);
    exit;
  }

  echo json_encode(['success' => true, 'data' => $rows]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>