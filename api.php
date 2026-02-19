<?php
/**
 * API Backend for Monev PDB
 * Ensure config.php exists with correct database credentials.
 */

// Error handling settings to prevent HTML errors breaking JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Allow CORS from any origin
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include Database Configuration
require_once 'config.php';

// --- AUTO MIGRATION CHECK FUNCTION ---
function ensureColumnsExist($conn) {
    try {
        $migrationChecks = [
            'lecturers' => [
                'nip' => 'VARCHAR(50) DEFAULT NULL AFTER id'
            ],
            'submissions' => [
                'nip' => 'VARCHAR(50) DEFAULT NULL AFTER timestamp'
            ],
            'categories' => [
                'sort_order' => 'INT(11) DEFAULT 0'
            ],
            'questions' => [
                'sort_order' => 'INT(11) DEFAULT 0',
                'type' => "VARCHAR(20) DEFAULT 'likert'",
                'options' => "TEXT DEFAULT NULL"
            ],
            'submission_ratings' => [
                'answer_text' => "TEXT DEFAULT NULL"
            ]
        ];

        foreach ($migrationChecks as $table => $cols) {
            // Check if table exists
            $tCheck = $conn->query("SHOW TABLES LIKE '$table'");
            if ($tCheck->rowCount() > 0) {
                // Get existing columns
                $existingCols = [];
                $cStmt = $conn->query("SHOW COLUMNS FROM `$table`");
                while ($row = $cStmt->fetch(PDO::FETCH_ASSOC)) {
                    $existingCols[] = $row['Field'];
                }

                // Add missing columns
                foreach ($cols as $colName => $colDef) {
                    if (!in_array($colName, $existingCols)) {
                        $conn->exec("ALTER TABLE `$table` ADD `$colName` $colDef");
                    }
                }
            }
        }
    } catch (Exception $e) {
        // Silently continue if migration fails
    }
}

// Run migration check on every request to be safe
ensureColumnsExist($conn);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// --- HELPER FUNCTIONS ---

function getJsonInput() {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    return $data;
}

// --- API ROUTES ---

if ($method === 'GET' && $action === 'get_app_data') {
    try {
        // 1. Get Lecturers
        $stmt = $conn->prepare("SELECT * FROM lecturers ORDER BY name ASC");
        $stmt->execute();
        $lecturersDb = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $lecturers = [];
        foreach ($lecturersDb as $l) {
             $l['nip'] = isset($l['nip']) ? $l['nip'] : '';
             $lecturers[] = $l;
        }

        // 2. Get Subjects
        $stmt = $conn->prepare("SELECT * FROM subjects");
        $stmt->execute();
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Get Categories & Questions
        $stmt = $conn->prepare("SELECT * FROM categories ORDER BY sort_order ASC, title ASC");
        $stmt->execute();
        $categoriesDb = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $categories = [];
        foreach ($categoriesDb as $cat) {
            $qStmt = $conn->prepare("SELECT id, text, type, options FROM questions WHERE category_id = ? ORDER BY sort_order ASC");
            $qStmt->execute([$cat['id']]);
            $questionsDb = $qStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $questions = [];
            foreach($questionsDb as $q) {
                // Ensure defaults and decode JSON options
                $q['type'] = isset($q['type']) ? $q['type'] : 'likert';
                $q['options'] = isset($q['options']) && $q['options'] ? json_decode($q['options']) : [];
                $questions[] = $q;
            }

            $cat['questions'] = $questions;
            $categories[] = $cat;
        }

        // 4. Get Submissions
        $stmt = $conn->prepare("SELECT * FROM submissions ORDER BY timestamp DESC");
        $stmt->execute();
        $submissionsDb = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $submissions = [];
        foreach ($submissionsDb as $sub) {
            $mappedSub = [
                'id' => $sub['id'],
                'timestamp' => $sub['timestamp'],
                'nip' => isset($sub['nip']) ? $sub['nip'] : '',
                'lecturerName' => $sub['lecturer_name'],
                'subject' => $sub['subject_name'],
                'classCode' => $sub['class_code'],
                'semester' => $sub['semester'],
                'positiveFeedback' => $sub['positive_feedback'],
                'constructiveFeedback' => $sub['constructive_feedback'],
                'answers' => [] // Renamed from ratings
            ];

            // Fetch ratings/answers
            $rStmt = $conn->prepare("SELECT question_id, rating, answer_text FROM submission_ratings WHERE submission_id = ?");
            $rStmt->execute([$sub['id']]);
            $ratings = $rStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($ratings as $r) {
                // Determine value: use answer_text if available, otherwise rating (fallback for old data)
                if (isset($r['answer_text']) && $r['answer_text'] !== null) {
                    $mappedSub['answers'][$r['question_id']] = $r['answer_text'];
                } else {
                    $mappedSub['answers'][$r['question_id']] = (int)$r['rating'];
                }
            }
            
            $submissions[] = $mappedSub;
        }

        echo json_encode([
            'lecturers' => $lecturers,
            'subjects' => $subjects,
            'categories' => $categories,
            'submissions' => $submissions
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST' && $action === 'add_submission') {
    $data = getJsonInput();
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    try {
        $conn->beginTransaction();

        $stmt = $conn->prepare("INSERT INTO submissions (id, timestamp, nip, lecturer_name, subject_name, class_code, semester, positive_feedback, constructive_feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $id = $data['id'] ?? uniqid('sub_');
        $timestamp = date('Y-m-d H:i:s'); 

        $stmt->execute([
            $id,
            $timestamp,
            $data['nip'] ?? '',
            $data['lecturerName'],
            $data['subject'],
            $data['classCode'],
            $data['semester'],
            $data['positiveFeedback'],
            $data['constructiveFeedback']
        ]);

        // Insert Answers
        $rStmt = $conn->prepare("INSERT INTO submission_ratings (submission_id, question_id, rating, answer_text) VALUES (?, ?, ?, ?)");
        
        // Handle both 'ratings' (legacy) and 'answers' keys
        $answers = $data['answers'] ?? ($data['ratings'] ?? []);

        foreach ($answers as $qId => $val) {
            $ratingInt = 0;
            $answerText = (string)$val;
            
            if (is_numeric($val)) {
                $ratingInt = (int)$val;
            }
            
            $rStmt->execute([$id, $qId, $ratingInt, $answerText]);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'id' => $id]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST' && $action === 'delete_submission') {
    $data = getJsonInput();

    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid Request']);
        exit;
    }

    try {
        $conn->beginTransaction();
        
        // Delete parent record. ON DELETE CASCADE in DB should handle children, 
        // but explicit query ensures safety if constraints are missing.
        $conn->prepare("DELETE FROM submission_ratings WHERE submission_id = ?")->execute([$data['id']]);
        $conn->prepare("DELETE FROM submissions WHERE id = ?")->execute([$data['id']]);
        
        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST' && $action === 'update_lecturers') {
    $lecturers = getJsonInput();
    
    // Safety check: if json is invalid or not an array, do not proceed.
    if (!is_array($lecturers)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data format or empty input']);
        exit;
    }
    
    try {
        $conn->beginTransaction();
        
        // 1. Clear existing table
        $conn->exec("DELETE FROM lecturers"); 
        
        // 2. Prepare insert
        $stmt = $conn->prepare("INSERT INTO lecturers (id, nip, name, department) VALUES (?, ?, ?, ?)");
        
        foreach ($lecturers as $l) {
            $stmt->execute([
                $l['id'], 
                isset($l['nip']) ? trim($l['nip']) : '', 
                $l['name'], 
                $l['department']
            ]);
        }
        
        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        // If DELETE worked but INSERT failed, this rolls back the DELETE, restoring data.
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database Update Failed: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST' && $action === 'update_categories') {
    $categories = getJsonInput();
    
    if (!is_array($categories)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data format']);
        exit;
    }

    try {
        $conn->beginTransaction();
        
        $conn->exec("DELETE FROM questions");
        $conn->exec("DELETE FROM categories");
        
        $cStmt = $conn->prepare("INSERT INTO categories (id, title, description, sort_order) VALUES (?, ?, ?, ?)");
        $qStmt = $conn->prepare("INSERT INTO questions (id, category_id, text, sort_order, type, options) VALUES (?, ?, ?, ?, ?, ?)");
        
        $cOrder = 0;
        foreach ($categories as $cat) {
            $cStmt->execute([$cat['id'], $cat['title'], $cat['description'], $cOrder++]);
            
            $qOrder = 0;
            foreach ($cat['questions'] as $q) {
                $type = isset($q['type']) ? $q['type'] : 'likert';
                $options = (isset($q['options']) && is_array($q['options'])) ? json_encode($q['options']) : NULL;
                
                $qStmt->execute([$q['id'], $cat['id'], $q['text'], $qOrder++, $type, $options]);
            }
        }
        
        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Default response if no action matched
echo json_encode([
    "status" => "online", 
    "message" => "Monev PDB API Connected.",
    "version" => "1.3"
]);
?>