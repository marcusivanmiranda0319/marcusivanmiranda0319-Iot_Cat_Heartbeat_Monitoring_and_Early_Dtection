<?php
// Template for: ../API/DIAGNOSTIC/delete.php - Handles deleting a diagnostic record
header('Content-Type: application/json');

// --- DATABASE CONNECTION DETAILS (Ensure these match your configuration) ---
const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic'; 

try {
    // 1. Establish PDO Connection
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 2. Get the ID from the URL query string (sent from diagnostic_log.js deleteDiagnostic function)
    $id = $_GET['id'] ?? null;

    // Validate input
    if (!$id) {
        http_response_code(400); 
        echo json_encode(['success' => false, 'message' => 'Missing Diagnostic ID in query for deletion.']);
        exit;
    }

    // 3. Prepare and Execute SQL DELETE statement
    $sql = "DELETE FROM diagnostics WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        // 4. Return Success Response
        echo json_encode(['success' => true, 'message' => "Diagnostic ID $id deleted successfully."]);
    } else {
        // 4. Handle Case: Record not found
        echo json_encode(['success' => false, 'message' => "Diagnostic ID $id not found."]);
    }

} catch (Throwable $e) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>