@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo     Study Platform - Phase 2 AI Features Test Suite
echo ============================================================
echo.

set BASE_URL=http://localhost:8080/api
set TOKEN=
set ROADMAP_ID=

echo Configuration:
echo   Base URL: %BASE_URL%
echo.

:: Check if server is running
echo [1/12] Checking if server is running...
curl -s -o nul -w "%%{http_code}" %BASE_URL%/auth/health > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="200" (
    echo      [OK] Server is running!
) else (
    echo      [FAIL] Server is not running. Please start it first:
    echo      cd backend ^&^& mvn spring-boot:run
    pause
    exit /b 1
)
echo.

:: Test Health Endpoint
echo [2/12] Testing Health Endpoint...
curl -s %BASE_URL%/auth/health
echo.
echo.

:: Test Registration
echo [3/12] Testing User Registration...
curl -s -X POST %BASE_URL%/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"AI Test User\",\"username\":\"aitester1\",\"email\":\"aitest1@example.com\",\"password\":\"password123\"}" ^
  -o register_response.json

if exist register_response.json (
    echo      Registration response:
    type register_response.json
) else (
    echo      Registration may have failed
)
echo.
echo.

:: Test Login and Extract Token using PowerShell for reliable JSON parsing
echo [4/12] Testing User Login and extracting token...
curl -s -X POST %BASE_URL%/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"usernameOrEmail\":\"aitester1\",\"password\":\"password123\"}" ^
  -o login_response.json

echo      Login response:
type login_response.json
echo.
echo.

:: Use PowerShell for reliable JSON token extraction
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "(Get-Content -Raw 'login_response.json' | ConvertFrom-Json).token"`) do (
    set TOKEN=%%a
)

if not defined TOKEN (
    echo      [FAIL] Could not extract token from login response!
    echo      Check login_response.json manually.
    pause
    exit /b 1
)

echo      [OK] Token extracted successfully!
echo      Token: !TOKEN:~0,50!...
echo.
echo.

:: Get User Profile
echo [5/12] Testing Get User Profile...
curl -s %BASE_URL%/users/me ^
  -H "Authorization: Bearer !TOKEN!" ^
  -o profile_response.json
echo      Profile response:
type profile_response.json
echo.
echo.

:: Test Create Roadmap with AI
echo [6/12] Testing AI Roadmap Generation...
echo      This may take 30-120 seconds as AI generates the roadmap...
curl -s --max-time 300 -X POST %BASE_URL%/roadmaps ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer !TOKEN!" ^
  -d "{\"title\":\"Learn Java Programming\",\"description\":\"Master Java from basics to advanced\",\"goal\":\"Become proficient in Java programming for backend development\",\"difficulty\":\"intermediate\",\"estimatedHoursPerWeek\":10,\"currentLevel\":\"beginner\",\"preferredLearningStyle\":\"hands-on\",\"generateWithAI\":true,\"tags\":[\"programming\",\"java\",\"backend\"]}" ^
  -o roadmap_response.json

echo      Roadmap response:
type roadmap_response.json
echo.
echo.

:: Extract roadmap ID using PowerShell
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "try { (Get-Content -Raw 'roadmap_response.json' | ConvertFrom-Json).data.id } catch { '' }"`) do (
    set ROADMAP_ID=%%a
)

if defined ROADMAP_ID (
    echo      [OK] Roadmap ID: !ROADMAP_ID!
) else (
    echo      [WARN] Could not extract roadmap ID
)
echo.
echo.

:: Get User Roadmaps
echo [7/12] Testing Get User Roadmaps...
curl -s %BASE_URL%/roadmaps ^
  -H "Authorization: Bearer !TOKEN!" ^
  -o roadmaps_list.json
echo      Roadmaps list:
type roadmaps_list.json
echo.
echo.

:: Start Roadmap
echo [8/12] Testing Start Roadmap...
if defined ROADMAP_ID (
    curl -s -X POST "%BASE_URL%/roadmaps/!ROADMAP_ID!/start" ^
      -H "Authorization: Bearer !TOKEN!" ^
      -o start_response.json
    echo      Start response:
    type start_response.json
) else (
    echo      [SKIP] No roadmap ID available
)
echo.
echo.

:: Get Specific Roadmap
echo [9/12] Testing Get Specific Roadmap...
if defined ROADMAP_ID (
    curl -s "%BASE_URL%/roadmaps/!ROADMAP_ID!" ^
      -H "Authorization: Bearer !TOKEN!" ^
      -o specific_roadmap.json
    echo      Roadmap details:
    type specific_roadmap.json
) else (
    echo      [SKIP] No roadmap ID available
)
echo.
echo.

:: Test Doubt Solving
echo [10/12] Testing AI Doubt Solving...
echo      This will test the RAG system with a sample question...
curl -s --max-time 120 -X POST %BASE_URL%/doubts ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer !TOKEN!" ^
  -d "{\"doubt\":\"What is the best way to learn Java programming?\",\"includeUserHistory\":true,\"maxHistoryItems\":5}" ^
  -o doubt_response.json

echo      Doubt response:
type doubt_response.json
echo.
echo.

:: Get Doubt History
echo [11/12] Testing Get Doubt History...
curl -s "%BASE_URL%/doubts/history?limit=10" ^
  -H "Authorization: Bearer !TOKEN!" ^
  -o doubt_history.json
echo      Doubt history:
type doubt_history.json
echo.
echo.

:: Get Learning Insights
echo [12/12] Testing Get Learning Insights...
curl -s %BASE_URL%/doubts/insights ^
  -H "Authorization: Bearer !TOKEN!" ^
  -o insights_response.json
echo      Learning insights:
type insights_response.json
echo.
echo.

:: Summary
echo ============================================================
echo                    Test Summary
echo ============================================================
echo.

:: Check each response for success
for %%f in (register_response login_response profile_response roadmap_response roadmaps_list start_response specific_roadmap doubt_response doubt_history insights_response) do (
    if exist %%f.json (
        powershell -NoProfile -Command "$j = Get-Content -Raw '%%f.json' | ConvertFrom-Json; if ($j.success -eq $true) { Write-Host '  [OK] %%f' } elseif ($j.token) { Write-Host '  [OK] %%f (auth)' } else { Write-Host '  [??] %%f - check response' }" 2>nul || echo   [??] %%f - could not parse
    ) else (
        echo   [SKIP] %%f - not created
    )
)

echo.
echo ============================================================
echo              Phase 2 Testing Complete!
echo ============================================================
echo.
echo Tip: Check server console logs for detailed debug output.
echo Response files saved in current directory.
echo.
pause

:: Cleanup temp files
if exist temp_status.txt del temp_status.txt
