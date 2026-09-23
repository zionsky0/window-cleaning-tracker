import { NextRequest, NextResponse } from 'next/server';
import { testConnection, resetDemoData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await testConnection();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { isConnected: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'reset_demo') {
      resetDemoData();
      return NextResponse.json({ success: true, message: 'Demo data reset successfully' });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
