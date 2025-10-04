<?php
// Template for: ../API/HEARTBEAT/heartbeat_display.php - Fetches filtered heartbeat history
header('Content-Type: application/json');

// --- DATABASE CONNECTION DETAILS (Ensure these match your configuration) ---
const DB_HOST = '127.0.0.1';
const DB_USER = 'root';
const DB_PASS = '';
const DB_NAME = 'vet_clinic';

try {
    // Establish PDO Connection
    $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 2. Get input data from URL query
    $catId = $_GET['cat_id'] ?? null;
    $date = $_GET['date'] ?? null;
    $range = $_GET['range'] ?? 'day'; // Default to 'day'

    // 3. Validate input
    if (!$catId || !$date) {
        http_response_code(400); 
        echo json_encode(['success' => false, 'message' => 'Missing Cat ID or date in query.']);
        exit;
    }
    
    // Validate date format (must be YYYY-MM-DD)
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400); 
        echo json_encode(['success' => false, 'message' => 'Invalid date format. Expected YYYY-MM-DD.']);
        exit;
    }

    // 4. Construct the SQL WHERE clause based on the time range
    $sql = "SELECT heartbeat, recorded_at FROM heartbeat_log WHERE cat_id = ? AND ";
    $params = [$catId];

    switch (strtolower($range)) {
        case 'day':
            // Filter by the exact day
            $sql .= "DATE(recorded_at) = ?";
            $params[] = $date;
            break;
        case 'week':
            // Filter records that fall in the same calendar week as the provided date.
            // YEARWEEK(date, 1) means the week starts on Monday (as is common).
            $sql .= "YEARWEEK(recorded_at, 1) = YEARWEEK(?, 1)";
            $params[] = $date;
            break;
        case 'month':
            // Filter by the year and month
            $sql .= "YEAR(recorded_at) = YEAR(?) AND MONTH(recorded_at) = MONTH(?)";
            $params[] = $date;
            $params[] = $date;
            break;
        case 'year':
            // Filter by the year
            $sql .= "YEAR(recorded_at) = YEAR(?)";
            $params[] = $date;
            break;
        default:
            http_response_code(400); 
            echo json_encode(['success' => false, 'message' => 'Invalid range parameter.']);
            exit;
    }
    
    $sql .= " ORDER BY recorded_at ASC";

    // 5. Prepare and Execute SQL SELECT statement
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    $heartbeat_logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Return Response
    echo json_encode(['success' => true, 'data' => $heartbeat_logs]);

} catch (Throwable $e) {
    http_response_code(500); 
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>