module.exports.default = function activate(api) {
  api.log.info('YouTube Extractor plugin activated');
  api.log.info('Listening for YouTube URLs...');

  const YT_DOMAIN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)/i;
  const YT_WATCH = /\/watch\?v=([\w-]{11})/;

  const formats = [
    { label: '4K (2160p)', height: 2160, ext: 'mp4' },
    { label: '1440p', height: 1440, ext: 'mp4' },
    { label: '1080p (Full HD)', height: 1080, ext: 'mp4' },
    { label: '720p (HD)', height: 720, ext: 'mp4' },
    { label: '480p', height: 480, ext: 'mp4' },
    { label: '360p', height: 360, ext: 'mp4' },
    { label: 'Audio Only (M4A)', height: 0, ext: 'm4a' },
  ];

  async function extractVideoInfo(url) {
    const match = url.match(YT_WATCH);
    if (!match) return null;
    const videoId = match[1];

    try {
      const response = await api.network.fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      );

      if (!response.ok) {
        api.log.warn(`Could not fetch video info for ${videoId}`);
        return null;
      }

      const info = await response.json();
      return {
        videoId,
        title: info.title || `YouTube Video (${videoId})`,
        author: info.author_name || 'Unknown',
        thumbnail: info.thumbnail_url || '',
        formats,
      };
    } catch (err) {
      api.log.warn(`Failed to extract video info: ${err.message}`);
      return null;
    }
  }

  async function handleDownloadRequest(url) {
    if (!YT_DOMAIN.test(url)) return;

    api.log.info(`YouTube URL detected: ${url}`);
    const info = await extractVideoInfo(url);
    if (!info) {
      api.log.warn('Could not extract video info, adding as generic download');
      await api.downloads.add({ url });
      return;
    }

    const topFormat = formats[0];
    const filename = sanitize(
      `${info.title} - ${topFormat.label}.${topFormat.ext}`,
    );

    const downloadId = await api.downloads.add({
      url,
      filename,
      speedLimit: undefined,
      numConnections: 8,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    api.log.info(`Added YouTube download: ${filename} (${downloadId})`);
  }

  api.events.on('download:intercept', async (data) => {
    if (data && data.url) {
      await handleDownloadRequest(data.url);
    }
  });
};

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 200);
}
