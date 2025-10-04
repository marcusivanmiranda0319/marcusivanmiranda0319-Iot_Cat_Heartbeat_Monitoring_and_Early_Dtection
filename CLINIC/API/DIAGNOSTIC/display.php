<?php
// Template for: ../API/DIAGNOSTIC/display.php - Fetches diagnostic history
header('Content-Type: application/json');

// 1. Database Connection Details
const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic'; // Using your preferred name

try {
    // Establish PDO Connection
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 2. Get input data (cat_id from URL query)
    $catId = $_GET['cat_id'] ?? null;

    // 3. Validate input
    if (!$catId) {
        http_response_code(400); 
        echo json_encode(['success' => false, 'message' => 'Missing Cat ID in query.']);
        exit;
    }

    // 4. Prepare and Execute SQL SELECT statement
    // FIX: Include the 'id' field in the SELECT statement
    $stmt = $pdo->prepare("SELECT id, diagnostic_text, log_date, created_at FROM diagnostics WHERE cat_id = ? ORDER BY created_at DESC");
    $stmt->execute([$catId]);
    
    $diagnostics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Return Response
    echo json_encode(['success' => true, 'data' => $diagnostics]);

} catch (Throwable $e) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>