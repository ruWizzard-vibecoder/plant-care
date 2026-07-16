import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { exchangeCode } from "@/server/lib/yandex-iot";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/profile?smartHome=error&reason=no_code", req.url),
    );
  }

  try {
    const tokens = await exchangeCode(code);

    await db.smartHomeConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        provider: "yandex",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL("/profile?smartHome=connected", req.url),
    );
  } catch (err) {
    console.error("[SmartHome] OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/profile?smartHome=error&reason=token_exchange", req.url),
    );
  }
}
