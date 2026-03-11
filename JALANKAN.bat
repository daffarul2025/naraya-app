@echo off
echo ==========================================
echo   NARAYA APP - Setup dan Jalankan
echo ==========================================
echo.

:: Cek apakah Node.js sudah terinstall
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall!
    echo.
    echo Download Node.js di: https://nodejs.org
    echo Pilih versi LTS, install, lalu jalankan file ini lagi.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js ditemukan: 
node -v
echo.

:: Install dependencies jika belum ada
if not exist "node_modules" (
    echo [INFO] Menginstall dependencies... ^(ini hanya sekali, tunggu ya^)
    echo.
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install gagal!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies berhasil diinstall!
    echo.
) else (
    echo [OK] Dependencies sudah ada.
    echo.
)

:: Jalankan app
echo [INFO] Menjalankan Naraya App...
echo [INFO] Buka browser ke: http://localhost:5173
echo [INFO] Tekan Ctrl+C untuk stop
echo.
npm run dev
pause
