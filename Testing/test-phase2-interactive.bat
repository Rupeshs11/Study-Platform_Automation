@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo     Study Platform - Phase 2 Quick Test Menu
echo ============================================================
echo.

set BASE_URL=http://localhost:8080/api
set TOKEN=

:: Check if server is running
curl -s -o nul -w "%%{http_code}" %BASE_URL%/auth/health > temp.txt 2>nul
set /p STATUS=<temp.txt
del temp.txt

if "%STATUS%"=="200" (
    echo Server Status: RUNNING 
) else (
    echo Server Status: NOT RUNNING
    echo Please start the server first: cd backend ^&^& mvn spring-boot:run
    pause
    exit /b 1
)
echo.

:: Menu
:MENU
echo.
echo ============================================================
echo                    TEST MENU - Phase 2
echo ============================================================
echo.
echo AUTHENTICATION:
echo   1. Register new user
echo   2. Login and get token
echo   3. Get user profile
echo.
echo ROADMAP (AI-POWERED):
echo   4. Create AI roadmap (Java Programming)
echo   5. List all roadmaps
echo   6. Get specific roadmap
echo   7. Start roadmap
echo   8. Generate content for topic
echo.
echo DOUBTS (RAG SYSTEM):
echo   9. Ask a doubt (with AI)
echo  10. View doubt history
echo  11. Get learning insights
echo.
echo OPTIONS:
echo   12. Run ALL tests automatically
echo   13. Exit
echo.
echo ============================================================
set /p choice="Enter your choice (1-13): "

if "%choice%"=="1" goto REGISTER
if "%choice%"=="2" goto LOGIN
if "%choice%"=="3" goto PROFILE
if "%choice%"=="4" goto CREATE_ROADMAP
if "%choice%"=="5" goto LIST_ROADMAPS
if "%choice%"=="6" goto GET_ROADMAP
if "%choice%"=="7" goto START_ROADMAP
if "%choice%"=="8" goto GENERATE_CONTENT
if "%choice%"=="9" goto ASK_DOUBT
if "%choice%"=="10" goto DOUBT_HISTORY
if "%choice%"=="11" goto INSIGHTS
if "%choice%"=="12" goto RUN_ALL
if "%choice%"=="13" goto EXIT
echo Invalid choice!
goto MENU

:REGISTER
echo.
echo === Registering new user ===
curl -s -X POST %BASE_URL%/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"AI Test User\",\"username\":\"aitester\",\"email\":\"aitest@example.com\",\"password\":\"password123\"}"
echo.
pause
goto MENU

:LOGIN
echo.
echo === Logging in ===
curl -s -X POST %BASE_URL%/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"usernameOrEmail\":\"aitester\",\"password\":\"password123\"}" > login_temp.json

type login_temp.json
echo.

:: Extract token
for /f "tokens=*" %%a in ('type login_temp.json ^| findstr "token"') do (
    set LINE=%%a
    set TOKEN=!LINE:"token":"=!
    set TOKEN=!TOKEN:",=!
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN:}=!
    set TOKEN=!TOKEN: =!
)
del login_temp.json

if defined TOKEN (
    echo.
    echo Token saved! Ready for authenticated requests.
    echo Token: !TOKEN:~0,50!...
) else (
    echo.
    echo Warning: Could not extract token automatically
)
pause
goto MENU

:PROFILE
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
echo === Getting user profile ===
curl -s %BASE_URL%/users/profile ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:CREATE_ROADMAP
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
echo === Creating AI-powered roadmap ===
echo This may take 15-30 seconds...
curl -s -X POST %BASE_URL%/roadmaps ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"title\":\"Learn Java Programming\",\"description\":\"Master Java from basics to advanced\",\"goal\":\"Become proficient in Java programming for backend development\",\"difficulty\":\"intermediate\",\"estimatedHoursPerWeek\":10,\"currentLevel\":\"beginner\",\"preferredLearningStyle\":\"hands-on\",\"generateWithAI\":true,\"tags\":[\"programming\",\"java\",\"backend\"]}"
echo.
pause
goto MENU

:LIST_ROADMAPS
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
echo === Listing your roadmaps ===
curl -s %BASE_URL%/roadmaps ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:GET_ROADMAP
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
set /p RID="Enter Roadmap ID: "
echo === Getting roadmap details ===
curl -s %BASE_URL%/roadmaps/%RID% ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:START_ROADMAP
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
set /p RID="Enter Roadmap ID: "
echo === Starting roadmap ===
curl -s -X POST %BASE_URL%/roadmaps/%RID%/start ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:GENERATE_CONTENT
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
set /p TID="Enter Topic ID: "
echo === Generating AI content for topic ===
echo This may take 10-20 seconds...
curl -s -X POST "%BASE_URL%/roadmaps/topics/%TID%/generate-content?contentType=THEORY" ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:ASK_DOUBT
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
set /p ROADMAP_ID="Enter Roadmap ID (optional, press Enter to skip): "
set /p QUESTION="Enter your question: "
echo === Asking AI tutor ===
curl -s -X POST %BASE_URL%/doubts ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"roadmapId\":\"%ROADMAP_ID%\",\"doubt\":\"%QUESTION%\",\"includeUserHistory\":true}"
echo.
pause
goto MENU

:DOUBT_HISTORY
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
echo === Getting your doubt history ===
curl -s "%BASE_URL%/doubts/history?limit=10" ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:INSIGHTS
echo.
if not defined TOKEN (
    echo ERROR: Please login first (option 2)
    pause
    goto MENU
)
echo === Getting learning insights ===
curl -s %BASE_URL%/doubts/insights ^
  -H "Authorization: Bearer %TOKEN%"
echo.
pause
goto MENU

:RUN_ALL
echo.
echo Running all tests automatically...
echo Check test-phase2.bat for detailed automated testing
start test-phase2.bat
goto MENU

:EXIT
echo.
echo Thank you for testing Phase 2!
echo.
exit /b 0
