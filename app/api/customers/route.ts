import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, addCustomer } from '@/lib/sheets';
import { getTodayDateString } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const customSheetId = req.headers.get('x-sheet-id') || req.nextUrl.searchParams.get('sheetId') || undefined;
    const data = await getCustomers(customSheetId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const customSheetId = req.headers.get('x-sheet-id') || req.nextUrl.searchParams.get('sheetId') || undefined;
    const body = await req.json();

    if (!body.name || !body.address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    const newCustomer = {
      name: body.name.trim(),
      phone: body.phone?.trim() || '',
      address: body.address.trim(),
      price: Number(body.price) || 0,
      frequencyWeeks: Number(body.frequencyWeeks) || 4,
      nextDueDate: body.nextDueDate || getTodayDateString(),
      lastCleanedDate: body.lastCleanedDate || undefined,
      status: body.status || 'active',
      notes: body.notes?.trim() || '',
      preferredContact: body.preferredContact === 'whatsapp' ? 'whatsapp' : 'sms',
    };

    const result = await addCustomer(newCustomer as any, customSheetId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add customer' },
      { status: 500 }
    );
  }
}
