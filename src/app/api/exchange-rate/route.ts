import { NextResponse } from 'next/server';
import { readExchangeRate } from '@/lib/pricing/exchange-rate-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rate = await readExchangeRate();
  return NextResponse.json(rate);
}
