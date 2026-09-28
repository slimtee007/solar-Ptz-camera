# Solar PTZ Central - Ubox + V380 Dashboard (Production Ready)

Central portal to monitor, control, and review playback for **Solar PTZ cameras** using **Ubox** and **V380** platforms.

> Unified NVR-lite that supports real production APIs: ONVIF, V380 CGI (5050), Ubox local, RTSP→HLS, snapshots, cloud proxies, JWT auth.

## Live Demo (Mock Mode)
- 4 demo solar cameras (2 Ubox, 2 V380)
- Battery/solar/charging simulation
- PTZ, playback timeline, events via WebSocket

## Features

### Core
- **Unified Device Registry** - Ubox UID, V380 ID, ONVIF xaddr, RTSP URL
- **Live Grid** - 1/4/9 view, HLS via FFmpeg, battery/solar/signal
- **PTZ Controls** - Pan/Tilt/Zoom, presets, cruise, speed, light, siren
- **Playback & Review** - Calendar, timeline scrubber, event clips, download
- **Solar Health** - Battery %, charging, solar voltage, storage, 4G/WiFi
- **Events** - Motion, human, PIR with thumbnails (WS real-time)
- **Mock Mode** - Works without real cameras

### Production APIs Added ✅

#### Auth & Security
- `POST /api/auth/login` - JWT login (default admin/admin123)
- `POST /api/auth/register/public` - first user public register
- `GET /api/auth/me` - current user
- Helmet, CORS, Rate limiting, Bearer JWT
- `AUTH_DISABLED=true` bypass for dev, `MOCK_MODE=true` bypass

#### Device Production
- `GET /api/devices/:id/snapshot` - JPEG snapshot via V380/Ubox/ONVIF
- `GET /api/devices/:id/sdcard` - SD card total/used/free
- `POST /api/devices/:id/reboot` - reboot camera
- `GET /api/devices/:id/presets` - PTZ presets (ONVIF)
- `POST /api/devices/:id/goto-preset` - goto preset

#### ONVIF Production (Real)
- `GET /api/onvif/discover?timeout=10000` - WS-Discovery scan LAN
- `POST /api/onvif/connect { xaddr, username, password }` - get info, streamUri, snapshotUri, presets
- `POST /api/onvif/ptz { xaddr, username, password, action, speed }` - continuousMove, stop, gotoPreset
- Uses `onvif` npm lib (Cam), supports media2

#### V380 Production
**Local CGI (port 5050) - Full Implementation:**
- `V380CloudAPI` class in `server/src/services/v380/cloud.ts`
- `GET /cgi-bin/get_status.cgi` - battery, wifi, fw
- `GET /cgi-bin/get_sdcard_status.cgi` - storage
- `GET /cgi-bin/get_record_list.cgi?date=YYYYMMDD` - SD recordings
- `GET /cgi-bin/snapshot.cgi?channel=1` - JPEG
- `GET /cgi-bin/ptz.cgi?move=up|down|left|right|zoomin|zoomout|stop&speed=0-7`
- `GET /cgi-bin/set_light.cgi?on=1`, `set_siren.cgi`
- RTSP: `rtsp://admin:888888@IP:554/live/ch1`

**Cloud:**
- `POST /api/cloud/v380/login { username, password }` - reverse engineered cloud login
- `GET /api/cloud/v380/devices?token=` - cloud device list
- `GET /api/cloud/v380/:ip/status?username=&password=` - local status via API
- `GET /api/cloud/v380/:ip/snapshot` - snapshot via API

#### Ubox Production
**Local:**
- `UboxLocalAPI` - status, PTZ via CGI, snapshot, RTSP discovery
- RTSP candidates: `/live/ch0`, `/live/ch1`, `/ucast/11`, `/ucast/12`
- CGI: `/cgi-bin/get_status.cgi`, `/cgi-bin/ptz.cgi`, `/snapshot.cgi`, `/tmpfs/auto.jpg`

**Cloud (Reverse Engineered):**
- `UboxCloudAPI` - login, device list, status, stream token, PTZ
- `POST /api/cloud/ubox/login { username, password, apiKey, apiSecret, baseUrl }`
- `GET /api/cloud/ubox/devices?token=`
- `GET /api/cloud/ubox/:uid/status?token=`
- `GET /api/cloud/ubox/:uid/stream?token=` - returns P2P URL or gateway URL
- Gateway support: `GATEWAY_URL` env converts `p2p://` to RTSP via gateway

**Gateway for 4G Solar Cams:**
- `GET /api/cloud/gateway/instructions` - how to deploy P2P→RTSP gateway
- Requires vendor SDK (C lib), deploy as separate service

#### Streaming
- RTSP → HLS via FFmpeg (`server/src/services/rtsp`)
- Auto cleanup old streams, reuse if <5min
- HLS static serve with CORS, `.m3u8` no-cache, `.ts` cache 10s
- WebSocket `/ws` - status every 5s, motion events, ping/pong, auth token via query

## Quick Start

```bash
git clone https://github.com/slimtee007/solar-Ptz-camera.git
cd solar-Ptz-camera
git checkout arena/01a0e734-solar-ptz-camera
npm run install:all
npm run dev
# client: http://localhost:5173
# server: http://localhost:3001/api/docs
# login: admin / admin123
```

### Production Env

`server/.env`:
```
NODE_ENV=production
PORT=3001
MOCK_MODE=false
JWT_SECRET=your-32-char-secret-change-me
JWT_EXPIRES=7d
AUTH_DISABLED=false
CORS_ORIGIN=https://yourdomain.com
DB_PATH=./data/db.json
HLS_OUTPUT_DIR=./data/hls
FFMPEG_PATH=ffmpeg
UBOX_CLOUD_USER=your ubox account
UBOX_CLOUD_PASS=...
UBOX_APP_KEY=from supplier
UBOX_CLOUD_API=https://api.ubox.com:8443
V380_CLOUD_API=https://api.v380s.com:8443
GATEWAY_URL=http://gateway:8554
```

Install FFmpeg:
```bash
apt install ffmpeg # ubuntu
apk add ffmpeg # alpine
```

## API Docs

Visit `GET /api/docs` for full list.

**Auth:**
```
POST /api/auth/login
Body: { username, password }
Response: { token, user }
Header: Authorization: Bearer <token>
```

**Devices:**
```
GET /api/devices
POST /api/devices { name, platform: ubox|v380|onvif|rtsp, uid, ip, rtspUrl, username, password, location, groupName }
GET /api/devices/:id/stream -> { hlsUrl, rtspUrl, type }
GET /api/devices/:id/snapshot -> JPEG
POST /api/devices/:id/ptz { action, speed }
```

**ONVIF:**
```
GET /api/onvif/discover
POST /api/onvif/connect { xaddr, username, password }
```

**Cloud:**
```
POST /api/cloud/v380/login
POST /api/cloud/ubox/login
GET /api/cloud/gateway/instructions
```

## Architecture

```
client/ (Vite + React + Tailwind + hls.js)
  -> REST / WS (JWT) -> server/ (Express + Helmet + RateLimit)
      -> auth: JWT + bcrypt
      -> adapters: UboxAdapter (local+cloud+gateway), V380Adapter (local CGI + cloud), OnvifAdapter (Cam), RtspAdapter
      -> services: rtsp (ffmpeg HLS), onvif/discovery, v380/cloud, ubox/cloud
      -> db: JSON file (devices, status, users)
      -> ws: realtime status/events
```

## Adding Real Camera

1. **Enable RTSP/ONVIF in app:**
   - Ubox: Settings → Local → RTSP ON, ONVIF ON
   - V380: RTSP default on, ONVIF enable in settings if available

2. **Find IP:** Router DHCP or app Device Info

3. **Test RTSP:**
   ```bash
   ffprobe rtsp://admin:888888@192.168.1.102:554/live/ch1
   ```

4. **Add in portal:** Devices → Add Camera → platform rtsp/onvif + RTSP URL + IP + credentials

5. **For 4G remote (no local IP):**
   - Use cloud login to get UID list
   - Deploy P2P gateway (request SDK from supplier)
   - Set `GATEWAY_URL` env
   - Add as RTSP: `rtsp://gateway:8554/uid`

## Docker

```bash
docker-compose up --build
```

## Roadmap

- [x] Production ONVIF discovery + PTZ
- [x] V380 local CGI full
- [x] Ubox local + cloud
- [x] Snapshot, SD card, reboot, presets
- [x] JWT auth, Helmet, RateLimit
- [x] HLS with CORS, WS auth
- [ ] WebRTC low-latency
- [ ] S3 recording backup
- [ ] MQTT for solar events
- [ ] Mobile PWA

## License

MIT
