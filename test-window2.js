const { app, BrowserWindow } = require('electron');

app.commandLine.appendSwitch('enable-logging');
app.commandLine.appendSwitch('v', '1');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Let's try WITHOUT disableHardwareAcceleration() to see if we can capture the exact GPU error
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    x: 100,
    y: 100,
    frame: true,
    show: true
  });

  win.loadURL('data:text/html,<html><body style="background:blue;color:white;font-size:50px">TEST WINDOW NO. 2</body></html>');

  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded');
    win.show();
    win.focus();
  });
});
