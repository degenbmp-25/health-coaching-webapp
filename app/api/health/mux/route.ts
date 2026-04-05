import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {
      credentials: { status: 'unknown' as 'ok' | 'missing' | 'ok' },
      authentication: { status: 'unknown' as 'ok' | 'failed' | 'error' },
      writePermissions: { status: 'unknown' as 'ok' | 'failed' | 'error' },
    },
    healthy: false,
    error: null as string | null
  };

  // Check 1: Credentials present
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    results.checks.credentials.status = 'missing';
    results.error = 'Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET';
    return NextResponse.json(results, { status: 500 });
  }
  results.checks.credentials.status = 'ok';

  try {
    // Test authentication
    const authResponse = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64')
      }
    });

    if (authResponse.status === 401) {
      results.checks.authentication.status = 'failed';
      results.error = 'Mux authentication failed - invalid credentials';
      return NextResponse.json(results, { status: 401 });
    }

    if (authResponse.status !== 200) {
      results.checks.authentication.status = 'error';
      results.error = `Mux API returned status ${authResponse.status}`;
      return NextResponse.json(results, { status: 500 });
    }

    results.checks.authentication.status = 'ok';
    
    const assetsData = await authResponse.json();
    const assetCount = assetsData.data?.length || 0;

    // Test write permissions by creating a temporary upload URL
    const uploadResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: 'public'
        }
      })
    });

    if (uploadResponse.status === 201 || uploadResponse.status === 200) {
      results.checks.writePermissions.status = 'ok';
      
      // Clean up the test upload
      const uploadData = await uploadResponse.json();
      if (uploadData.data?.id) {
        await fetch(`https://api.mux.com/video/v1/uploads/${uploadData.data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString('base64')
          }
        });
      }
    } else {
      results.checks.writePermissions.status = 'failed';
      results.error = `Mux write test returned status ${uploadResponse.status}`;
      return NextResponse.json(results, { status: 500 });
    }

    results.healthy = true;
    return NextResponse.json(results);

  } catch (error) {
    results.checks.authentication.status = 'error';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(results, { status: 500 });
  }
}
