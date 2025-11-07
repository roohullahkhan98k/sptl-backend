import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

const SUPPORTED_FORMATS = new Set(['m3u8', 'ts']);

app.use(cors());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.get('/stream', (req, res) => {
  const { baseUrl, username, password, streamId } = req.query;
  const format = SUPPORTED_FORMATS.has(req.query.format)
    ? req.query.format
    : 'm3u8';

  if (!baseUrl || !username || !password || !streamId) {
    return res.status(400).json({
      message: 'Missing required query params: baseUrl, username, password, streamId',
    });
  }

  const upstream = `${baseUrl.replace(/\/$/, '')}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${format}`;

  res.setHeader('Content-Type', 'video/MP2T');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const args = [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '2',
    '-i', upstream,
    '-loglevel', process.env.FFMPEG_LOGLEVEL || 'error',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', process.env.AUDIO_BITRATE || '128k',
    '-ac', '2',
    '-f', 'mpegts',
    'pipe:1',
  ];

  const ffmpeg = spawn(ffmpegPath, args, { windowsHide: true });

  const teardown = () => {
    if (!res.writableEnded) {
      res.end();
    }
    ffmpeg.kill('SIGKILL');
  };

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', (chunk) => {
    if (process.env.FFMPEG_LOGLEVEL !== 'quiet') {
      console.error(`[ffmpeg:${streamId}] ${chunk}`.trim());
    }
  });

  ffmpeg.on('error', (error) => {
    console.error(`[ffmpeg:${streamId}] spawn error`, error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Transcoder failed to start', error: error.message });
    }
    teardown();
  });

  ffmpeg.on('close', (code, signal) => {
    if (!res.headersSent) {
      res.status(502).json({
        message: 'Transcoder exited unexpectedly',
        code,
        signal,
      });
    }
    teardown();
  });

  req.on('close', teardown);
});

app.listen(PORT, () => {
  console.log(`📡 STPL proxy listening on http://0.0.0.0:${PORT}`);
});

