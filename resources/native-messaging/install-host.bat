@echo off
:: Install RDM Native Messaging Host for Chrome and Edge
set "MANIFEST_PATH=%~dp0com.rdm.native_messaging_host.json"

echo Registering RDM Native Messaging Host...
echo Manifest Path: %MANIFEST_PATH%

:: Google Chrome
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.rdm.native_messaging_host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

:: Microsoft Edge
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.rdm.native_messaging_host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

:: Mozilla Firefox
reg add "HKCU\Software\Mozilla\NativeMessagingHosts\com.rdm.native_messaging_host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo.
echo Installation successful! RDM is now connected to your browsers.
pause
