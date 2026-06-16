const { createConnection } = require('node:net');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const SOCKET_PORT = 19527;

// Read the shared bridge token that RDM writes to its userData directory.
// Resolved per-platform to match Electron's default userData path for app 'rdm'.
function getBridgeToken() {
  let base;
  if (process.platform === 'win32') {
    base = process.env.APPDATA;
  } else if (process.platform === 'darwin') {
    base = join(process.env.HOME || '', 'Library', 'Application Support');
  } else {
    base = process.env.XDG_CONFIG_HOME || join(process.env.HOME || '', '.config');
  }
  try {
    return readFileSync(join(base, 'rdm', 'bridge-token'), 'utf-8').trim();
  } catch {
    return '';
  }
}

let messageBuffer = Buffer.alloc(0);
let expectedLength = 0;

function readMessage() {
  while (true) {
    if (expectedLength === 0 && messageBuffer.length >= 4) {
      expectedLength = messageBuffer.readUInt32LE(0);
      messageBuffer = messageBuffer.subarray(4);
    }

    if (expectedLength > 0 && messageBuffer.length >= expectedLength) {
      const messageRaw = messageBuffer.subarray(0, expectedLength);
      messageBuffer = messageBuffer.subarray(expectedLength);
      expectedLength = 0;

      let message;
      try {
        message = JSON.parse(messageRaw.toString('utf-8'));
      } catch {
        continue;
      }

      handleMessage(message);
      continue;
    }

    break;
  }
}

function sendResponse(data) {
  const json = JSON.stringify(data);
  const buffer = Buffer.from(json, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(Buffer.concat([header, buffer]));
}

async function handleMessage(message) {
  console.error('[rdm-native-host] Received:', JSON.stringify(message));

  if (message.action === 'ping') {
    sendResponse({ status: 'ok', version: '0.1.0' });
    return;
  }

  // Attach the shared auth token to every forwarded message.
  const authedMessage = { ...message, token: getBridgeToken() };

  const client = createConnection({ port: SOCKET_PORT }, () => {
    const payload = JSON.stringify(authedMessage);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(Buffer.byteLength(payload), 0);
    client.write(Buffer.concat([header, Buffer.from(payload)]));
  });

  let responseData = Buffer.alloc(0);
  let responseExpected = 0;

  client.on('data', (chunk) => {
    responseData = Buffer.concat([responseData, chunk]);

    while (true) {
      if (responseExpected === 0 && responseData.length >= 4) {
        responseExpected = responseData.readUInt32LE(0);
        responseData = responseData.subarray(4);
      }

      if (responseExpected > 0 && responseData.length >= responseExpected) {
        const data = responseData.subarray(0, responseExpected);
        responseData = responseData.subarray(responseExpected);
        responseExpected = 0;

        try {
          const response = JSON.parse(data.toString('utf-8'));
          sendResponse(response);
        } catch {
          sendResponse({ status: 'error', error: 'Invalid response from RDM' });
        }
        client.destroy();
        return;
      }

      break;
    }
  });

  client.on('error', () => {
    sendResponse({ status: 'error', error: 'RDM not running' });
  });

  client.setTimeout(5000, () => {
    sendResponse({ status: 'error', error: 'RDM connection timed out' });
    client.destroy();
  });
}

process.stdin.on('data', (chunk) => {
  messageBuffer = Buffer.concat([messageBuffer, chunk]);
  readMessage();
});

process.stdin.on('end', () => {
  process.exit(0);
});

console.error('[rdm-native-host] Started, waiting for messages...');
