<?php
// Simple PHP availability check
header('Content-Type: application/json');
echo json_encode(['php_available' => true]);
?>
