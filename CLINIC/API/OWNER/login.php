<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database connection details
$host = "127.0.0.1";
$db_name = "vet_clinic";
$username = "root"; // Your XAMPP default username
$password = ""; // Your XAMPP default password

try {
    $conn = new PDO("mysql:host={$host};dbname={$db_name}", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception){
    http_response_code(503); // Service unavailable
    echo json_encode(array("message" => "Connection error: " . $exception->getMessage()));
    exit();
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Check for required fields
if(empty($data->email) || empty($data->password)){
    http_response_code(400); // Bad Request
    echo json_encode(array("message" => "Missing email or password."));
    exit();
}

$email = $data->email;
$input_password = $data->password;

// Prepare SQL statement
$query = "SELECT id, name, email, password, image FROM owner WHERE email = :email LIMIT 0,1";
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();

if($stmt->rowCount() > 0){
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $hashed_password = $row['password'];

    // Verify password against the hash
    if(password_verify($input_password, $hashed_password)){
        http_response_code(200);
        echo json_encode(array(
            "message" => "Successful login.",
            "success" => true,
            "owner" => array(
                "id" => $row['id'],
                "name" => $row['name'],
                "email" => $row['email'],
                "image" => $row['image']
            )
        ));
    } else {
        http_response_code(401); // Unauthorized
        echo json_encode(array("message" => "Login failed. Incorrect password.", "success" => false));
    }
} else {
    http_response_code(401); // Unauthorized
    echo json_encode(array("message" => "Login failed. Email not found.", "success" => false));
}
?>