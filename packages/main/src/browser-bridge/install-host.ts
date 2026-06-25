import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { execSync } from 'node:child_process';

export function installNativeHost(): void {
  if (process.platform !== 'win32') return;

  try {
    const isPackaged = app.isPackaged;
    let scriptPath = path.join(__dirname, 'native-host.js');
    
    // In production, the native-host.js might be inside the ASAR or unpacked.
    // electron-builder usually places unpacked files in app.asar.unpacked.
    if (isPackaged) {
      scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
    }
    
    // Find the system Node.js executable.
    // process.execPath in Electron points to electron.exe which cannot run
    // plain Node.js scripts — we need the real node.exe.
    let nodePath = 'node';
    try {
      const result = execSync('where node', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      const firstLine = result.trim().split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        nodePath = firstLine;
      }
    } catch {
      // 'where node' failed — fall back to just 'node' and hope it's on PATH
    }

    const manifestPath = path.join(app.getPath('userData'), 'com.rdm.native.json');
    
    // We create a .bat file to launch node with the script since native host path must be an executable or bat on Windows
    const batPath = path.join(app.getPath('userData'), 'com.rdm.native.bat');
    fs.writeFileSync(batPath, `@echo off\r\n"${nodePath}" "${scriptPath}"\r\n`, 'utf-8');

    const manifest = {
      name: "com.rdm.native",
      description: "RDM Native Messaging Host",
      path: batPath,
      type: "stdio",
      allowed_origins: [
        "chrome-extension://hddognbnlckehjdhakhemkiokjnepjlf/"
      ],
      allowed_extensions: [
        "extension@rdmapp.com"
      ]
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Add to Windows Registry for Chrome, Edge, and Firefox
    const regKeys = [
      `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.rdm.native`,
      `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.rdm.native`,
      `HKCU\\Software\\Mozilla\\NativeMessagingHosts\\com.rdm.native`
    ];
    
    for (const regKey of regKeys) {
      try {
        execSync(`reg add "${regKey}" /ve /t REG_SZ /d "${manifestPath}" /f`, { stdio: 'ignore' });
      } catch (e) {
        console.warn(`[browser-bridge] Failed to add registry key: ${regKey}`);
      }
    }
    
    console.log(`[browser-bridge] Installed Native Messaging Host across Chrome, Edge, and Firefox (node: ${nodePath})`);
  } catch (err) {
    console.error('[browser-bridge] Failed to install Native Messaging Host:', err);
  }
}

