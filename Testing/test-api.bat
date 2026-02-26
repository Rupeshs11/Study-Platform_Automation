@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo === Study Platform API Tests ===
echo.

set BASE_URL=http://localhost:8080/api
set TOKEN=

:: Test 1: Health Check
echo 1. Testing Health Endpoint...
curl -s %BASE_URL%/auth/health
echo.
echo.

:: Test 2: Register User
echo 2. Testing User Registration...
curl -s -X POST %BASE_URL%/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Test User\",\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
echo.
echo.

:: Test 3: Login User
echo 3. Testing User Login...
curl -s -X POST %BASE_URL%/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"usernameOrEmail\":\"testuser\",\"password\":\"password123\"}"
echo.
echo.

echo === Tests Completed ===
echo.
echo Next steps:
echo - Get the token from login response
echo - Test authenticated endpoints with: -H "Authorization: Bearer YOUR_TOKEN"
pause
