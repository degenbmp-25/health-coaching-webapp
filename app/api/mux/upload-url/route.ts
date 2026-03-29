import { createUploadUrl } from '@/lib/mux';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // In a real app, you'd verify the user is a trainer here
    // For now, we'll add auth middleware later
    
    const { uploadId, uploadUrl } = await createUploadUrl();

    return NextResponse.json({
      success: true,
      uploadId,
      uploadUrl,
    });
  } catch (error) {
    console.error('Mux upload URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
