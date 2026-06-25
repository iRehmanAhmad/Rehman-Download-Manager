#!/usr/bin/env node
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');

const logPath = path.join(appData, 'rdm', 'native-debug.log');
function log(msg) {
  try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch(e) {}
}

log('Native host started');

// Read the bridge token from the userData directory
// On Windows, userData for electron is in %APPDATA%/rdm
let token = '';
try {
  const tokenPath = path.join(appData, 'rdm', 'bridge-token');
  token = fs.readFileSync(tokenPath, 'utf-8').trim();
  log('Token read successfully');
} catch (e) {
  log('Failed to read token: ' + e.message);
}

// Connect to the TCP bridge server inside RDM
const client = net.createConnection({ port: 19527, host: '127.0.0.1' }, () => {
  log('Connected to RDM TCP server');
});

client.on('error', (err) => {
  log('TCP Error: ' + err.message);
  process.exit(1);
});

client.on('close', () => {
  log('TCP Connection closed');
  process.exit(0);
});

// Write to Chrome Extension
function sendMessageToExtension(msg) {
  log('Sending to extension: ' + JSON.stringify(msg));
  const buf = Buffer.from(JSON.stringify(msg), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buf.length, 0);
  process.stdout.write(header);
  process.stdout.write(buf);
}

// Read from TCP server and forward to extension
let tcpBuffer = Buffer.alloc(0);
let tcpExpectedLength = 0;

client.on('data', (chunk) => {
  tcpBuffer = Buffer.concat([tcpBuffer, chunk]);

  while (true) {
    if (tcpExpectedLength === 0 && tcpBuffer.length >= 4) {
      tcpExpectedLength = tcpBuffer.readUInt32LE(0);
      tcpBuffer = tcpBuffer.subarray(4);
    }
    if (tcpExpectedLength > 0 && tcpBuffer.length >= tcpExpectedLength) {
      const msgRaw = tcpBuffer.subarray(0, tcpExpectedLength);
      tcpBuffer = tcpBuffer.subarray(tcpExpectedLength);
      tcpExpectedLength = 0;

      try {
        const msg = JSON.parse(msgRaw.toString('utf-8'));
        log('Received from TCP: ' + JSON.stringify(msg));
        sendMessageToExtension(msg);
      } catch (e) {
        log('Parse error from TCP: ' + e.message);
      }
      continue;
    }
    break;
  }
});

// Read from Chrome Extension (stdin) and forward to TCP server
let stdinBuffer = Buffer.alloc(0);
let stdinExpectedLength = 0;

process.stdin.on('data', (chunk) => {
  stdinBuffer = Buffer.concat([stdinBuffer, chunk]);

  while (true) {
    if (stdinExpectedLength === 0 && stdinBuffer.length >= 4) {
      stdinExpectedLength = stdinBuffer.readUInt32LE(0);
      stdinBuffer = stdinBuffer.subarray(4);
    }
    if (stdinExpectedLength > 0 && stdinBuffer.length >= stdinExpectedLength) {
      const msgRaw = stdinBuffer.subarray(0, stdinExpectedLength);
      stdinBuffer = stdinBuffer.subarray(stdinExpectedLength);
      stdinExpectedLength = 0;

      try {
        log('Received from stdin (raw): ' + msgRaw.toString('utf-8'));
        const msg = JSON.parse(msgRaw.toString('utf-8'));
        // Inject token
        msg.token = token;

        const outStr = JSON.stringify(msg);
        const outBuf = Buffer.from(outStr, 'utf8');
        const header = Buffer.alloc(4);
        header.writeUInt32LE(outBuf.length, 0);
        log('Writing to TCP server...');
        client.write(Buffer.concat([header, outBuf]));
      } catch (e) {
        log('Parse error from stdin: ' + e.message);
      }
      continue;
    }
    break;
  }
});
