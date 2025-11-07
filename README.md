# STPL AAC Proxy Server

This lightweight Node.js + FFmpeg proxy converts Xtream Codes live streams to AAC audio so the Expo client can play them without native codecs.

## Features

- Dynamic credentials – the frontend supplies `baseUrl`, `username`, `password`, and `streamId`
- Copies video while re-encoding audio to AAC stereo
- Handles `.m3u8` and `.ts` inputs
- Streams back MPEG-TS that Expo can decode

## Setup

```bash
cd server
npm install
```

Optional `.env` overrides:

```
PORT=4000
AUDIO_BITRATE=128k
FFMPEG_LOGLEVEL=error
```

## Run

```bash
npm run start
# or with hot reload
npm run dev
```

## Endpoints

- `GET /health`
- `GET /stream?baseUrl=...&username=...&password=...&streamId=...&format=m3u8|ts`

Example:

```
http://<server-ip>:4000/stream?baseUrl=http://163.61.1.212:8080&username=sasa&password=sasa&streamId=64&format=m3u8
```

## Notes

- Ensure the Expo app points to `http://<server-ip>:4000` (not device localhost).
- FFmpeg is bundled via `ffmpeg-static`; no system install required.
- Keep the proxy close to the client (LAN/VPN) for lower latency and to avoid portal rate limits.

