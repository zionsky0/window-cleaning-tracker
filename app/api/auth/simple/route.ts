import { NextRequest, NextResponse } from 'next/server';
import { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

// In-memory cloud sync store for serverless requests
const userStore: Record<
  string,
  {
    pinOrPassword: string;
    businessName: string;
    cleanerName: string;
    customers: Customer[];
    updatedAt: string;
  }
> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, identifier, pin, businessName, cleanerName, customers } = body;

    const cleanIdentifier = identifier?.trim().toLowerCase();
    const cleanPin = pin?.trim();

    if (!cleanIdentifier || !cleanPin) {
      return NextResponse.json(
        { error: 'Identifier (phone or email) and PIN are required' },
        { status: 400 }
      );
    }

    // 1. Sign In / Register / Sync
    if (action === 'sync') {
      const existing = userStore[cleanIdentifier];

      if (existing) {
        // Verify PIN
        if (existing.pinOrPassword !== cleanPin) {
          return NextResponse.json(
            { error: 'Incorrect PIN/password for this account' },
            { status: 401 }
          );
        }

        // If client sent newer customers, update server; otherwise return server's copy
        if (Array.isArray(customers) && customers.length > 0) {
          existing.customers = customers;
          existing.updatedAt = new Date().toISOString();
          if (businessName) existing.businessName = businessName;
          if (cleanerName) existing.cleanerName = cleanerName;
        }

        return NextResponse.json({
          success: true,
          mode: 'synced',
          businessName: existing.businessName,
          cleanerName: existing.cleanerName,
          customers: existing.customers,
          lastSyncedAt: existing.updatedAt,
        });
      } else {
        // First time registering this phone/email account
        const newRecord = {
          pinOrPassword: cleanPin,
          businessName: businessName?.trim() || 'ClearView',
          cleanerName: cleanerName?.trim() || 'Cleaner',
          customers: Array.isArray(customers) ? customers : [],
          updatedAt: new Date().toISOString(),
        };

        userStore[cleanIdentifier] = newRecord;

        return NextResponse.json({
          success: true,
          mode: 'registered',
          businessName: newRecord.businessName,
          cleanerName: newRecord.cleanerName,
          customers: newRecord.customers,
          lastSyncedAt: newRecord.updatedAt,
        });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
