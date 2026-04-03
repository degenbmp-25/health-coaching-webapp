#!/usr/bin/env node

/**
 * Mux Health Check Script
 * 
 * Tests Mux API connectivity and authentication.
 * Exit codes:
 *   0 = healthy (credentials valid, API accessible)
 *   1 = unhealthy (authentication failed or API error)
 *   2 = configuration error (missing credentials)
 */

const https = require('https');

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function checkCredentials() {
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    log('ERROR', 'Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET environment variables');
    log('ERROR', 'MUX_TOKEN_ID is set:', !!MUX_TOKEN_ID);
    log('ERROR', 'MUX_TOKEN_SECRET is set:', !!MUX_TOKEN_SECRET);
    return false;
  }
  return true;
}

function makeMuxRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');
    
    const options = {
      hostname: 'api.mux.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function checkMuxHealth() {
  log('INFO', 'Starting Mux health check...');
  
  // Check credentials are present
  if (!checkCredentials()) {
    log('ERROR', 'Credential check failed');
    return { healthy: false, error: 'Missing credentials', exitCode: 2 };
  }

  try {
    // Test 1: List assets (tests authentication)
    log('INFO', 'Testing Mux API authentication...');
    const assetsResult = await makeMuxRequest('/video/v1/assets');
    
    if (assetsResult.status === 401) {
      log('ERROR', 'Mux authentication failed - invalid credentials');
      return { healthy: false, error: 'Authentication failed - invalid credentials', exitCode: 1 };
    }
    
    if (assetsResult.status === 200) {
      const assets = assetsResult.data.data || [];
      log('INFO', `Mux authentication successful. Found ${assets.length} assets.`);
      
      // Test 2: Try to create an upload URL (tests write permissions)
      log('INFO', 'Testing Mux write permissions...');
      const uploadResult = await makeMuxRequest('/video/v1/uploads', 'POST');
      
      if (uploadResult.status === 201 || uploadResult.status === 200) {
        log('INFO', 'Mux write permissions OK');
        
        // If we created an upload URL, we should delete it to avoid clutter
        if (uploadResult.data && uploadResult.data.data && uploadResult.data.data.id) {
          const uploadId = uploadResult.data.data.id;
          log('INFO', `Cleaning up test upload ${uploadId}...`);
          await makeMuxRequest(`/video/v1/uploads/${uploadId}`, 'DELETE');
          log('INFO', 'Test upload cleaned up');
        }
        
        log('INFO', '✅ Mux health check PASSED');
        return { 
          healthy: true, 
          assets: assets.length,
          exitCode: 0 
        };
      } else {
        log('WARN', `Mux write test returned status ${uploadResult.status}`);
        // Write test failed, but auth succeeded
        return { 
          healthy: true, 
          assets: assets.length,
          warning: 'Write permissions test returned non-200 status',
          exitCode: 0 
        };
      }
    } else {
      log('ERROR', `Mux API returned unexpected status: ${assetsResult.status}`);
      return { 
        healthy: false, 
        error: `API returned status ${assetsResult.status}`,
        data: assetsResult.data,
        exitCode: 1 
      };
    }
  } catch (error) {
    log('ERROR', `Mux health check failed: ${error.message}`);
    return { healthy: false, error: error.message, exitCode: 1 };
  }
}

// Run if called directly
if (require.main === module) {
  checkMuxHealth().then((result) => {
    console.log('\n=== Mux Health Check Result ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode);
  }).catch((error) => {
    console.error('Health check crashed:', error);
    process.exit(1);
  });
}

module.exports = { checkMuxHealth };
