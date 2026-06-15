const { app } = require('electron');
const path = require('path');
const { initDatabase } = require('./dist/main/storage/database');
const { DownloadEngine } = require('./dist/main/download/engine');
const { evaluateRules } = require('./dist/main/automation/index');
const { v4: uuid } = require('uuid');
const { extractFilename } = require('./dist/shared/index');

app.whenReady().then(async () => {
  try {
    await initDatabase();
    const eng = new DownloadEngine(5, 0);
    const options = evaluateRules({ url: 'http://example.com/file.zip' });
    const id = uuid();
    const download = {
      id,
      url: options.url,
      filename: options.filename || 'download',
      tempDir: '',
      fileSize: -1,
      downloaded: 0,
      status: 'queued',
      priority: 'normal',
      categoryId: undefined,
      addedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      speedLimit: undefined,
      numConnections: 8,
      headers: undefined,
      referer: undefined,
      checksum: undefined,
      chunks: [],
      speed: 0,
      progress: 0,
      eta: 0,
    };
    console.log('Adding download...');
    eng.add(download);
    console.log('Added successfully!');
    setTimeout(() => {
      app.quit();
    }, 2000);
  } catch (err) {
    console.error('CRASH:', err);
    app.quit();
  }
});
