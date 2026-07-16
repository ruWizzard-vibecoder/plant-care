import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { identifyPlant } from "@/lib/plantnet";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "@/server/lib/rate-limit";

const VALID_ORGANS = ["leaf", "flower", "fruit", "bark"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 per hour
    const rl = checkRateLimit(session.user.id, "plantnet", {
      windowMs: 3_600_000,
      maxRequests: 20,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
    const { image, organ } = body as { image?: string; organ?: string };

    // Validate image
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    if (base64Data.length * 0.75 > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum 10MB" }, { status: 400 });
    }

    // Validate organ
    const safeOrgan = organ && VALID_ORGANS.includes(organ as typeof VALID_ORGANS[number])
      ? organ
      : "leaf";

    const result = await identifyPlant(image, safeOrgan);
    return NextResponse.json(result, { headers: rateLimitHeaders(rl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[PlantNet]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
