@echo off
title Hidden Agenda Automated Test Suite
echo ========================================================
echo   Hidden Agenda - Multi-Player Scalability & Bug Tester
echo ========================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

echo [1/3] Checking & Installing Python Dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo [2/3] Checking & Installing Playwright Chromium Browser...
playwright install chromium

echo.
echo [3/3] Launching Hidden Agenda Multi-Player Test Suite...
python test_hidden_agenda.py

echo.
echo ========================================================
echo   Testing Complete! Check the 'logs' folder for results.
echo ========================================================
pause
