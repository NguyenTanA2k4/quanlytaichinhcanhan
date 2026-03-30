@echo off
title Khoi Dong He Thong Finance Assistant
color 0A

echo ============================================================
echo      HE THONG QUAN LY TAI CHINH - MICROSERVICES ^& AI
echo ============================================================
echo.

echo [1/3] Dang dung he thong Docker (6 Containers)...
docker compose up -d
echo.

echo [2/3] Doi 3 giay de Server va Database on dinh...
timeout /t 3 /nobreak >nul
echo.

echo [3/3] Dang mo trinh duyet Web...
start http://localhost
echo.

echo ============================================================
echo      HE THONG DA KHOI DONG HOAN TAT!
echo ============================================================
echo Bam phim bat ky de CHAY LOCALTUNNEL (Phat song ra Internet cho dien thoai)
echo Hoac nhan dau (X) o goc tren de dong cua so nay neu chi dung may tinh.
pause >nul

echo.
echo Dang tao duong ham ra Internet... (Nho lay IP public cua ban)
echo.
npx localtunnel --port 80
pause
