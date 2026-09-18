import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";
import { generateShareToken, hashPassword } from "@/lib/share";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const noteId = new URL(req.url).searchParams.get("noteId");
    const where: any = { sharedById: user.id };
    if (noteId) { where.shareableType = "note"; where.shareableId = noteId; }
    const shares = await prisma.share.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: { shares } });
  } catch (e) {
    console.error("GET /api/share error", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { noteId, shareableType, shareableId, visibility = "LINK", permission = "view", password, expiresAt, maxViews, allowDownload, email } = body;
    const type = shareableType || (noteId ? "note" : null);
    const id = shareableId || noteId;
    if (!type || !id) return NextResponse.json({ success: false, error: "shareableType/Id required" }, { status: 400 });

    // FAMILY via email
    if (visibility === "FAMILY" && email) {
      if (email.toLowerCase() === user.email.toLowerCase()) return NextResponse.json({ success: false, error: "Cannot share with yourself" }, { status: 400 });
      // For HOME, store email as sharedWithId if not found in service (no FK, plain string)
      const sharedWithId = email;
      const existing = await prisma.share.findFirst({ where: { shareableType: type, shareableId: id, sharedWithId, revokedAt: null } });
      if (existing) {
        const updated = await prisma.share.update({ where: { id: existing.id }, data: { permission, visibility: "FAMILY" } });
        return NextResponse.json({ success: true, data: { share: updated } });
      }
      const share = await prisma.share.create({ data: { shareableType: type, shareableId: id, sharedById: user.id, sharedWithId, visibility: "FAMILY", permission, expiresAt: expiresAt ? new Date(expiresAt) : null } });
      return NextResponse.json({ success: true, data: { share } });
    }

    // LINK
    let hash: string | null = null;
    if (password) hash = await hashPassword(password);
    let token: string | null = null;
    if (visibility === "LINK") {
      // Generate unique token, retry if duplicate
      for (let i = 0; i < 3; i++) {
        token = generateShareToken();
        const exists = await prisma.share.findUnique({ where: { shareToken: token } });
        if (!exists) break;
        token = null;
      }
      if (!token) return NextResponse.json({ success: false, error: "Failed to generate token" }, { status: 500 });
    }
    const share = await prisma.share.create({
      data: {
        shareableType: type,
        shareableId: id,
        sharedById: user.id,
        shareToken: token,
        visibility,
        permission,
        passwordHash: hash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews: maxViews ? Number(maxViews) : null,
        allowDownload: allowDownload ?? true,
      },
    });
    return NextResponse.json({ success: true, data: { share } });
  } catch (e: any) {
    console.error("POST /api/share error", e);
    return NextResponse.json({ success: false, error: e.message || "Internal error" }, { status: 500 });
  }
}
