/**
 * RTSP Service - Transcode RTSP to HLS for browser playback
 * Uses ffmpeg if available, otherwise returns RTSP URL directly (for VLC/external player)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HLS_DIR = process.env.HLS_OUTPUT_DIR || path.join(__dirname, '../../../data/hls');

fs.mkdirSync(HLS_DIR, { recursive: true });

interface StreamProcess {
  deviceId: string;
  process: any;
  hlsPath: string;
  startedAt: Date;
}

const activeStreams = new Map<string, StreamProcess>();

export function getHlsDir() {
  return HLS_DIR;
}

export async function startHlsStream(deviceId: string, rtspUrl: string): Promise<string> {
  if (process.env.MOCK_MODE === 'true') {
    // Return mock HLS (or placeholder)
    return `/hls/${deviceId}/index.m3u8`;
  }

  if (activeStreams.has(deviceId)) {
    const existing = activeStreams.get(deviceId)!;
    // If started within last 5 min, reuse
    if (Date.now() - existing.startedAt.getTime() < 5 * 60 * 1000) {
      return `/hls/${deviceId}/index.m3u8`;
    } else {
      stopHlsStream(deviceId);
    }
  }

  const deviceHlsDir = path.join(HLS_DIR, deviceId);
  fs.mkdirSync(deviceHlsDir, { recursive: true });

  const playlistPath = path.join(deviceHlsDir, 'index.m3u8');

  // Check ffmpeg availability
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

  // Spawn ffmpeg to transcode RTSP -> HLS
  // ffmpeg -rtsp_transport tcp -i rtsp://... -c:v libx264 -preset veryfast -tune zerolatency -c:a aac -f hls -hls_time 2 -hls_list_size 10 -hls_flags delete_segments /path/index.m3u8
  console.log(`[RTSP] Starting HLS for ${deviceId}: ${rtspUrl}`);

  try {
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-max_muxing_queue_size', '1024',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(deviceHlsDir, 'seg_%03d.ts'),
      playlistPath
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stderr.on('data', (data: Buffer) => {
      // console.log(`[ffmpeg ${deviceId}] ${data.toString().slice(0,200)}`);
    });

    proc.on('error', (err: any) => {
      console.error(`[RTSP] ffmpeg failed for ${deviceId}:`, err.message);
      activeStreams.delete(deviceId);
    });

    proc.on('close', (code: any) => {
      console.log(`[RTSP] ffmpeg exited for ${deviceId} code ${code}`);
      activeStreams.delete(deviceId);
    });

    activeStreams.set(deviceId, {
      deviceId,
      process: proc,
      hlsPath: playlistPath,
      startedAt: new Date()
    });

    // Wait a bit for playlist to appear
    await new Promise(r => setTimeout(r, 2000));

    return `/hls/${deviceId}/index.m3u8`;
  } catch (e) {
    console.error(`[RTSP] Failed to start stream for ${deviceId}`, e);
    // Return RTSP directly as fallback
    return rtspUrl;
  }
}

export function stopHlsStream(deviceId: string) {
  const stream = activeStreams.get(deviceId);
  if (stream) {
    try {
      stream.process.kill('SIGTERM');
    } catch {}
    activeStreams.delete(deviceId);
    console.log(`[RTSP] Stopped HLS for ${deviceId}`);
  }
}

export function getActiveStreams() {
  return Array.from(activeStreams.keys());
}

// Cleanup old streams periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, stream] of activeStreams) {
    if (now - stream.startedAt.getTime() > 10 * 60 * 1000) {
      stopHlsStream(id);
    }
  }
}, 60 * 1000);
