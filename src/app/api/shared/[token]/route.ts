import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/share";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const password = new URL(req.url).searchParams.get("password");
  const share = await prisma.share.findUnique({ where: { shareToken: token } });
  if (!share || share.revokedAt) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return NextResponse.json({ success: false, error: "Expired" }, { status: 410 });
  if (share.maxViews !== null && share.viewCount >= share.maxViews) return NextResponse.json({ success: false, error: "Limit" }, { status: 410 });
  if (share.passwordHash) {
    if (!password) return NextResponse.json({ success: false, error: "Password required", needsPassword: true }, { status: 401 });
    if (!await verifyPassword(password, share.passwordHash)) return NextResponse.json({ success: false, error: "Invalid password", needsPassword: true }, { status: 403 });
  }
  await prisma.share.update({ where: { id: share.id }, data: { viewCount: { increment: 1 } } });
  let data: any = { share };
  if (share.shareableType === "note") data.note = await prisma.note.findUnique({ where: { id: share.shareableId } });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const { content, password } = body;
  const share = await prisma.share.findUnique({ where: { shareToken: token } });
  if (!share || share.revokedAt) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (share.permission !== "edit") return NextResponse.json({ success: false, error: "Read-only link" }, { status: 403 });
  if (share.passwordHash) {
    if (!password) return NextResponse.json({ success: false, error: "Password required", needsPassword: true }, { status: 401 });
    if (!await verifyPassword(password, share.passwordHash)) return NextResponse.json({ success: false, error: "Invalid password" }, { status: 403 });
  }
  if (share.shareableType === "note") {
    const note = await prisma.note.update({ where: { id: share.shareableId }, data: { content: String(content || "") } });
    return NextResponse.json({ success: true, data: { note } });
  }
  return NextResponse.json({ success: false, error: "Not supported" }, { status: 400 });
}
