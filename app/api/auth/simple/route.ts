import { NextRequest, NextResponse } from 'next/server';
import { Customer } from '@/lib/types';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

interface AccountRecord {
  pinOrPassword: string;
  businessName: string;
  cleanerName: string;
  customers: Customer[];
  updatedAt: string;
}

// In-memory fallback for local development or before cloud storage is linked
const memoryStore: Record<string, AccountRecord> = {};

function getCloudClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      return new Redis({ url, token });
    } catch (e) {
      console.error('Failed to initialize cloud storage client:', e);
    }
  }
  return null;
}

async function getAccount(identifier: string): Promise<AccountRecord | null> {
  const client = getCloudClient();
  if (client) {
    try {
      const data = await client.get<AccountRecord>(`user:${identifier}`);
      return data || null;
    } catch (err) {
      console.error('Cloud get error:', err);
    }
  }
  return memoryStore[identifier] || null;
}

async function saveAccount(identifier: string, record: AccountRecord): Promise<void> {
  const client = getCloudClient();
  if (client) {
    try {
      await client.set(`user:${identifier}`, record);
      return;
    } catch (err) {
      console.error('Cloud set error:', err);
    }
  }
  memoryStore[identifier] = record;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, identifier, pin, businessName, cleanerName, customers } = body;

    const cleanIdentifier = identifier?.trim().toLowerCase();
    const cleanPin = pin?.trim();

    if (!cleanIdentifier || !cleanPin) {
      return NextResponse.json(
        { error: 'Phone number (or email) and 4-digit PIN are required' },
        { status: 400 }
      );
    }

    if (action === 'sync') {
      const existing = await getAccount(cleanIdentifier);

      if (existing) {
        if (existing.pinOrPassword !== cleanPin) {
          return NextResponse.json(
            { error: 'Incorrect PIN. Please enter the 4-digit PIN you used when you first registered.' },
            { status: 401 }
          );
        }

        // If client has newer customers, merge/update
        if (Array.isArray(customers) && customers.length > 0) {
          existing.customers = customers;
          existing.updatedAt = new Date().toISOString();
          if (businessName) existing.businessName = businessName;
          if (cleanerName) existing.cleanerName = cleanerName;
          await saveAccount(cleanIdentifier, existing);
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
        // Register new account permanently
        const newRecord: AccountRecord = {
          pinOrPassword: cleanPin,
          businessName: businessName?.trim() || 'ClearView',
          cleanerName: cleanerName?.trim() || 'Cleaner',
          customers: Array.isArray(customers) ? customers : [],
          updatedAt: new Date().toISOString(),
        };

        await saveAccount(cleanIdentifier, newRecord);

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
