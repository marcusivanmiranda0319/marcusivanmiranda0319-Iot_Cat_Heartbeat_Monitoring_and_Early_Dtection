<?php
header('Content-Type: application/json');

// Include your database connection details
const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic';

// Read the JSON data from the request body
$input = json_decode(file_get_contents('php://input'), true);

try {
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Check for required fields: ID and diagnostic text
    // The previous error was likely caused by this block requiring 'log_date' as well.
    if (empty($input['id']) || empty($input['diagnostic_text'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required ID or diagnostic text for update on server.']);
        exit;
    }

    $id = intval($input['id']);
    $diagnostic_text = $input['diagnostic_text'];
    
    // Perform the update, only setting the diagnostic_text.
    $sql = "UPDATE diagnostics SET diagnostic_text = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$diagnostic_text, $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Diagnostic entry updated successfully.']);
    } else {
        // Return success even if no rows changed, as the content might be identical, 
        // but avoid misleading the user with an "error" on non-change.
        echo json_encode(['success' => true, 'message' => 'No changes detected or diagnostic entry not found.']);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>