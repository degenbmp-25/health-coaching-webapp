#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mux credentials
const MUX_TOKEN_ID = 'f25cc1ef-9d85-4272-b06b-575c30293ebd';
const MUX_TOKEN_SECRET = 'fSy3rIXRYrkrX5PhLFYPo0KFOuf2zJqICrFhLUjaep1kO/MlNWNZaEn0xtXdKz6H0k5AUpIuYin';

const AUTH = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

const VIDEOS_DIR = '/tmp/McKelvey, Stu';

// Map database videoUrl names to actual filenames
const videoMap = {
  'Arnold Pulldowns.MOV': 'Arnold Pulldowns.MOV',
  'book opener.MOV': 'book opener.MOV',
  'DB Can raise.MOV': 'DB Can raise.MOV',
  'hexbar DL.MOV': 'hexbar DL.MOV',
  'KB arm bar end.HEIC': 'KB arm bar end.HEIC',
  'KB arm bar.MOV': 'KB arm bar.MOV',
  'Plate loaded bulgarian squat.MOV': 'Plate loaded bulgarian squat.MOV',
  'Rear Delt Fly.MOV': 'Rear Delt Fly.MOV',
  'RST Pullups.MOV': 'RST Pullups.MOV',
  'SMR trap/shoulder.MOV': 'SMR trap shoulder.MOV',  // Note: slash was removed when downloaded
  'Vertical Arm bar.MOV': 'Vertical Arm bar.MOV',
  'wall ankle mob.MOV': 'wall ankle mob.MOV',
  'wall aslr.MOV': null  // Failed to download
};

function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'api.mux.com',
      path: `/video/v1/${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function uploadFile(uploadUrl, filePath) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    console.log(`Uploading ${fileName}...`);

    const req = https.request(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/quicktime',
        'Content-Length': fs.statSync(filePath).size
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`  Upload complete: ${res.statusCode}`);
        resolve(data);
      });
    });

    req.on('error', reject);
    fs.createReadStream(filePath).pipe(req);
  });
}

async function waitForUploadComplete(uploadId, maxWait = 120000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const result = await apiRequest('GET', `uploads/${uploadId}`);
    console.log(`  Upload status: ${result.data?.status} (${Math.round((Date.now() - startTime)/1000)}s)`);
    if (result.data?.status === 'asset_created' && result.data?.asset_id) {
      return result.data.asset_id;
    }
    if (result.data?.status === 'errored') {
      throw new Error(`Upload errored: ${JSON.stringify(result)}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Timeout waiting for upload ${uploadId}`);
}

async function waitForAssetReady(assetId, maxWait = 180000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const result = await apiRequest('GET', `assets/${assetId}`);
    console.log(`  Asset status: ${result.data?.status} (${Math.round((Date.now() - startTime)/1000)}s)`);
    if (result.data?.status === 'ready') {
      console.log(`  Asset ready! Playback ID: ${result.data.playback_ids[0].id}`);
      return result.data;
    }
    if (result.data?.status === 'errored') {
      throw new Error(`Asset errored: ${JSON.stringify(result)}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Timeout waiting for asset ${assetId}`);
}

async function uploadVideo(filePath, videoName) {
  console.log(`\n=== Processing: ${videoName} ===`);

  // Create upload
  console.log('Creating upload...');
  const upload = await apiRequest('POST', 'uploads', {
    cors_origin: '*',
    new_asset_settings: {
      playback_policy: ['public']
    }
  });

  if (!upload.data || !upload.data.url) {
    throw new Error(`Failed to create upload: ${JSON.stringify(upload)}`);
  }

  const uploadId = upload.data.id;
  console.log(`  Upload ID: ${uploadId}`);

  // Upload file
  await uploadFile(upload.data.url, filePath);

  // Wait for upload to complete and get asset_id
  console.log('  Waiting for upload to process...');
  const assetId = await waitForUploadComplete(uploadId);
  console.log(`  Got asset ID: ${assetId}`);

  // Wait for asset to be ready
  const asset = await waitForAssetReady(assetId);

  return {
    videoName,
    playbackId: asset.playback_ids[0].id,
    assetId: asset.id
  };
}

async function main() {
  const results = [];

  for (const [videoName, fileName] of Object.entries(videoMap)) {
    if (!fileName) {
      console.log(`\n=== Skipping: ${videoName} (not downloaded) ===`);
      continue;
    }

    const filePath = path.join(VIDEOS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`\n=== File not found: ${filePath} ===`);
      continue;
    }

    try {
      const result = await uploadVideo(filePath, videoName);
      results.push(result);
      console.log(`SUCCESS: ${videoName} -> ${result.playbackId}`);
    } catch (e) {
      console.error(`FAILED: ${videoName} - ${e.message}`);
    }
  }

  console.log('\n\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  // Generate SQL updates
  console.log('\n\n=== SQL UPDATES ===');
  for (const r of results) {
    console.log(`-- ${r.videoName}`);
    console.log(`-- UPDATE workout_exercises SET mux_playback_id = '${r.playbackId}' WHERE video_url = '${r.videoName}';`);
  }
}

main().catch(console.error);
