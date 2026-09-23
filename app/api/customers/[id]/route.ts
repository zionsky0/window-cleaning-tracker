import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer, markCustomerCompleted, deleteCustomer } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();

    if (body.action === 'complete') {
      const result = await markCustomerCompleted(id);
      return NextResponse.json(result);
    }

    const result = await updateCustomer(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const result = await deleteCustomer(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
