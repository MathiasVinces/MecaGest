@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 24 para iniciar MecaGest.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto error
)
call npm run seed
if errorlevel 1 goto error
call npm run build
if errorlevel 1 goto error
echo.
echo MECAGEST - Aplicacion del taller
echo Abre http://127.0.0.1:3000/ en tu navegador.
echo Tus contrasenas estan en la carpeta .local.
echo Puedes consultarlas en otra terminal con: npm run credenciales
echo Conserva esta ventana abierta mientras usas la aplicacion.
echo.
call npm start
goto fin
:error
echo No se pudo iniciar. Revisa el mensaje anterior.
:fin
pause
