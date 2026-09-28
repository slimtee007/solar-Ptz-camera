# Solar PTZ Central - Ubox + V380 Dashboard

Central portal to monitor, control, and review playback for **Solar PTZ cameras** using **Ubox** and **V380** platforms.

> This is an aggregator / NVR-lite that unifies both ecosystems into one dashboard.

## Features

- **Unified Device Registry** - Add Ubox (UID) or V380 (Device ID) cameras + RTSP/ONVIF fallback
- **Live Grid Dashboard** - 1/4/9/16 view, battery/solar/signal status, online/offline
- **PTZ Controls** - Pan/Tilt/Zoom, presets, cruise, speed control, IR/night, light control
- **Playback & Review** - Calendar view, timeline scrubber, event-based clips, download
- **Solar Health** - Battery %, charging state, solar voltage, storage usage, 4G/WiFi signal
- **Events / Alerts** - Motion, human detection, PIR with thumbnails
- **Mock Mode** - Works without real cameras for demo/dev

### Supported Integration Methods

| Platform | Method | Notes |
|----------|--------|-------|
| **Ubox** | P2P UID + Cloud API (unofficial) + RTSP relay | Requires Ubox app credentials OR RTSP enabled in camera |
| **V380** | P2P ID + HTTP CGI API + RTSP | Many V380 cams expose `http://ip:5050` API + RTSP `554` |
| **Generic** | ONVIF + RTSP `rtsp://user:pass@ip:554/live/ch1` | Recommended for local NVR mode |

> **Reality Check:** Ubox and V380 are closed P2P systems. There is no official public API. This project provides an adapter architecture:
> 1. If camera exposes RTSP/ONVIF locally (many solar PTZ do after enabling in app) - we use direct RTSP -> HLS transcoding.
> 2. If not, we proxy via vendor cloud using credentials (reverse-engineered endpoints) - see `server/src/services/ubox` and `v380`.
> 3. For production, recommend flashing or enabling RTSP, or using a local gateway that bridges P2P to RTSP.

## Quick Start

```bash
npm run install:all
npm run dev
# client: http://localhost:5173
# server: http://localhost:3001
```

Or Docker:
```bash
docker-compose up --build
```

## Architecture

```
client/ (Vite + React + Tailwind)
  -> REST / WebSocket -> server/ (Express + SQLite + WS)
      -> adapters: UboxAdapter, V380Adapter, OnvifAdapter, RtspAdapter
      -> services: streamService (ffmpeg -> HLS), ptzService, playbackService
      -> db: SQLite devices, recordings, events
```

### API

- `GET /api/devices` - list
- `POST /api/devices` - add { name, platform: 'ubox'|'v380'|'onvif'|'rtsp', uid, rtspUrl, ip, ... }
- `GET /api/devices/:id/status` - battery, storage, signal
- `GET /api/devices/:id/stream/hls` - returns HLS playlist URL
- `POST /api/devices/:id/ptz` - { action: 'up'|'down'|'left'|'right'|'zoomIn'|'zoomOut'|'stop', speed }
- `GET /api/devices/:id/playback/days?month=2026-09` - days with recordings
- `GET /api/devices/:id/playback?date=2026-09-28` - timeline
- `GET /api/devices/:id/events` - motion events
- WebSocket `ws://localhost:3001/ws` - real-time status, events

## Configuration

Server `.env`:

```
PORT=3001
DB_PATH=./data/db.sqlite
MOCK_MODE=true # set false when you have real cameras
FFMPEG_PATH=ffmpeg
HLS_OUTPUT_DIR=./data/hls
ENABLE_TRANSCODING=true
UBOX_APP_KEY= # if you have reverse engineered
V380_API_URL=
```

## Adding a Real Camera

1. **Enable RTSP in app**: Ubox App > Device Settings > Local Settings > Enable RTSP / ONVIF
   Typically: `rtsp://admin:password@192.168.1.XX:554/live/ch0` or `ch1`
2. Add device in dashboard as platform `rtsp` or `onvif` with that URL
3. For remote solar cameras (4G), set up port forwarding or use P2P adapter with UID + cloud credentials

## Roadmap

- [ ] WebRTC low-latency instead of HLS
- [ ] AI detection proxy
- [ ] Mobile PWA
- [ ] Multi-user RBAC
- [ ] Cloud recording backup to S3

## License

MIT
