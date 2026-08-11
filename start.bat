@echo off
chcp 65001 >nul
title Kost Management

echo ============================================
echo     APLIKASI MANAJEMEN KOST
echo ============================================
echo.
echo Memeriksa dependensi...

:: --- Backend ---
if not exist "backend\node_modules" (
    echo.
    echo [1/2] Menginstall dependensi backend...
    cd backend
    call npm install
    cd ..
) else (
    echo [1/2] Dependensi backend sudah ada.
)

:: --- Frontend ---
if not exist "frontend\node_modules" (
    echo.
    echo [2/2] Menginstall dependensi frontend...
    cd frontend
    call npm install
    cd ..
) else (
    echo [2/2] Dependensi frontend sudah ada.
)

echo.
echo ============================================
echo     Menjalankan backend dan frontend...
echo ============================================
echo.
echo Backend akan berjalan di port 3001
echo Frontend akan berjalan di port 5173
echo Buka browser di: http://localhost:5173
echo Login: admin / admin123
echo.
echo JANGAN TUTUP JENDELA INI! Tutup jendela backend dan frontend
echo dengan menekan Ctrl+C di masing-masing jendela.
echo ============================================
echo.

:: Jalankan backend di jendela baru
start "Kost - Backend" cmd /k "cd backend && echo Menjalankan backend... && npm start"

:: Tunggu backend siap (3 detik)
echo Menunggu backend siap...
timeout /t 3 /nobreak >nul

:: Jalankan frontend di jendela baru
start "Kost - Frontend" cmd /k "cd frontend && echo Menjalankan frontend... && npm run dev"

:: Tunggu frontend siap (3 detik)
echo Menunggu frontend siap...
timeout /t 3 /nobreak >nul

:: Buka browser
start http://localhost:5173

echo.
echo Aplikasi sudah berjalan! Buka http://localhost:5173 di browser.
echo Login: admin / admin123
echo.
echo Tutup jendela ini jika sudah selesai.
pause