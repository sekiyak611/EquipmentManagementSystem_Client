@echo off
setlocal
rem ============================================================
rem  備品管理システム：画面（Client）を開発用に起動する（npm run dev）
rem  置き場所：Client のフォルダの中か、3つのリポジトリが並んだフォルダ
rem  （例：F:\development\workspace）のどちらでもよい。
rem  止めるときは、開いた画面で Ctrl + C を押すか、client-stop.bat を使う。
rem ============================================================

rem --- Client のフォルダを探す ---
set "CLIENT_DIR=%~dp0"
if exist "%CLIENT_DIR%package.json" goto FOUND
set "CLIENT_DIR=%~dp0EquipmentManagementSystem_Client\"
if exist "%CLIENT_DIR%package.json" goto FOUND
echo Client のフォルダが見つかりません。
echo このファイルを、Client のフォルダの中か、3つのリポジトリが並んだフォルダに置いてください。
goto END

:FOUND
cd /d "%CLIENT_DIR%"

rem --- Node.js があるかを確かめる ---
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js が見つかりません。環境構築手順書の手順8で入れてください。
    goto END
)

rem --- 5173番がもう使われていれば、起動しない ---
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo 画面はもう動いています。ブラウザで http://localhost:5173 を開いてください。
    goto END
)

rem --- 部品が入っていなければ入れる ---
if not exist "node_modules\" (
    echo 部品（node_modules）がないので、npm install を動かします。
    call npm.cmd install
    if errorlevel 1 (
        echo npm install に失敗しました。上のメッセージを確かめてください。
        goto END
    )
)

echo.
echo 画面を起動します。「Local: http://localhost:5173/」と出たら、ブラウザで開いてください。
echo この画面は閉じないでください。閉じると画面が止まります。
echo ログインするには、サーバー（Server のフォルダで .\gradlew.bat bootRun）と MySQL も動かしておきます。
echo.
call npm.cmd run dev

:END
echo.
pause
