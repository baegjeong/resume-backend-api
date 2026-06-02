@echo off
title Smart CV Optimizer Server
echo ===================================================
echo   Starting Smart CV Optimizer...
echo ===================================================
echo.
echo [INFO] Server is running... Please keep this window open.
echo [INFO] Press Ctrl+C or close this window to stop the server.
echo.

timeout /t 2 /nobreak >nul
start http://127.0.0.1:5000

python app.py

pause
