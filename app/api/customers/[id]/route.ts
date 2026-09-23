import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateCustomer, markCustomerCompleted, deleteCustomer } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

async function getAccessToken(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const accessToken = await getAccessToken();
    const body = await req.json();

    if (body.action === 'complete') {
      const result = await markCustomerCompleted(id, accessToken);
      return NextResponse.json(result);
    }

    const result = await updateCustomer(id, body, accessToken);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const accessToken = await getAccessToken();
    const result = await deleteCustomer(id, accessToken);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
