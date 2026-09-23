import { NextRequest, NextResponse } from 'next/server';
import { updateCustomer, markCustomerCompleted, deleteCustomer } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const customSheetId = req.headers.get('x-sheet-id') || req.nextUrl.searchParams.get('sheetId') || undefined;
    const body = await req.json();

    if (body.action === 'complete') {
      const result = await markCustomerCompleted(id, customSheetId);
      return NextResponse.json(result);
    }

    const result = await updateCustomer(id, body, customSheetId);
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
    const customSheetId = req.headers.get('x-sheet-id') || req.nextUrl.searchParams.get('sheetId') || undefined;
    const result = await deleteCustomer(id, customSheetId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
