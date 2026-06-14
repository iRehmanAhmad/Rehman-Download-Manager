@echo off
:: Uninstall RDM Native Messaging Host for Chrome and Edge

echo Removing RDM Native Messaging Host from Windows Registry...

:: Google Chrome
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.rdm.native_messaging_host" /f

:: Microsoft Edge
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.rdm.native_messaging_host" /f

:: Mozilla Firefox
reg delete "HKCU\Software\Mozilla\NativeMessagingHosts\com.rdm.native_messaging_host" /f

echo.
echo Uninstallation successful! RDM has been disconnected from your browsers.
pause
