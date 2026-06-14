const { createConnection } = require('node:net');

const SOCKET_PORT = 19527;

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

  const client = createConnection({ port: SOCKET_PORT }, () => {
    const payload = JSON.stringify(message);
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
