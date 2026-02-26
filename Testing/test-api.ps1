# Study Platform API Test Script
# Run this in PowerShell to test the backend API

$BASE_URL = "http://localhost:8080/api"

Write-Host "=== Study Platform API Tests ===" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BASE_URL/auth/health" -Method GET
Write-Host "   Response: $($health | ConvertTo-Json)"
Write-Host ""

# Test 2: Register User
Write-Host "2. Testing User Registration..." -ForegroundColor Yellow
$registerBody = @{
    fullName = "Test User"
    username = "testuser"
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "   Registration successful!" -ForegroundColor Green
    Write-Host "   Token: $($registerResponse.token)"
    Write-Host "   User ID: $($registerResponse.id)"
    
    # Save token for next tests
    $token = $registerResponse.token
} catch {
    Write-Host "   Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Trying login with existing user..." -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Login User
Write-Host "3. Testing User Login..." -ForegroundColor Yellow
$loginBody = @{
    usernameOrEmail = "testuser"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "   Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($loginResponse.token)"
    
    # Save token for authenticated tests
    $token = $loginResponse.token
} catch {
    Write-Host "   Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""

# Test 4: Get User Profile
Write-Host "4. Testing Get User Profile (Authenticated)..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $profile = Invoke-RestMethod -Uri "$BASE_URL/users/me" -Method GET -Headers $headers
    Write-Host "   Profile retrieved successfully!" -ForegroundColor Green
    Write-Host "   User: $($profile.data.username) ($($profile.data.email))"
} catch {
    Write-Host "   Failed to get profile: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Update User Profile
Write-Host "5. Testing Update User Profile (Authenticated)..." -ForegroundColor Yellow
$updateBody = @{
    fullName = "Updated Test User"
    learningGoal = "Learn AI and Machine Learning"
    currentLevel = "beginner"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$BASE_URL/users/me" -Method PUT -Body $updateBody -Headers $headers -ContentType "application/json"
    Write-Host "   Profile updated successfully!" -ForegroundColor Green
    Write-Host "   New learning goal: $($updateResponse.data.learningGoal)"
} catch {
    Write-Host "   Failed to update profile: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Update Preferences
Write-Host "6. Testing Update Preferences (Authenticated)..." -ForegroundColor Yellow
$prefBody = @{
    learningGoal = "Master Spring Boot and React"
    currentLevel = "intermediate"
    interests = @("Java", "Spring", "React", "AI")
} | ConvertTo-Json

try {
    $prefResponse = Invoke-RestMethod -Uri "$BASE_URL/users/me/preferences" -Method PUT -Body $prefBody -Headers $headers -ContentType "application/json"
    Write-Host "   Preferences updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "   Failed to update preferences: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== All Tests Completed ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "- Frontend development (Phase 3)" -ForegroundColor White
Write-Host "- AI Integration with NVIDIA API (Phase 2)" -ForegroundColor White
Write-Host "- Roadmap generation features (Phase 4)" -ForegroundColor White
