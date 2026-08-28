import { NextResponse } from 'next/server';

/**
 * It is used to check if the server is running.
 * You can use tools like Uptime Kuma to monitor this endpoint.
 */
export async function GET() {
  return NextResponse.json({ message: 'pong' });
}
