import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse<unknown>> {
  try {
    // In a real implementation, check database connectivity
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
      },
      { status: 503 },
    );
  }
}
