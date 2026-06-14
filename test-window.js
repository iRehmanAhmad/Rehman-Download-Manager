const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('fs');
const { join } = require('path');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('use-gl', 'swiftshader');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: true,
    center: true,
    show: true,
    alwaysOnTop: true,
  });

  win.loadURL('data:text/html,<html><body style="background:red;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:48px"><h1>CAN YOU SEE ME?</h1></body></html>');

  win.webContents.on('did-finish-load', () => {
    // Wait a moment then capture screenshot
    setTimeout(async () => {
      try {
        const image = await win.webContents.capturePage();
        const pngData = image.toPNG();
        const outPath = join(__dirname, 'screenshot.png');
        writeFileSync(outPath, pngData);
        console.log('Screenshot saved to:', outPath);
        console.log('Screenshot size:', image.getSize());
        console.log('PNG bytes:', pngData.length);
      } catch (err) {
        console.error('Screenshot failed:', err);
      }
      // Now quit
      app.quit();
    }, 2000);
  });
});
