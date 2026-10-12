import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  if (!room || !username) {
    return NextResponse.json({ error: 'Missing "room" or "username" query parameter' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası: JWT_SECRET tanımlı değil' }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli: Token bulunamadı' }, { status: 401 });
  }

  try {
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secretKey);

    if (payload.id && payload.id !== username) {
      return NextResponse.json({ error: 'Yetkisiz erişim: Kullanıcı kimliği uyuşmuyor' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: username });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  const livekitToken = await at.toJwt();
  return NextResponse.json({ token: livekitToken });
}
