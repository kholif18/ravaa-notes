import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";
async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note || note.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const updated = await prisma.note.update({ where: { id }, data: { isTrashed: false } });
  return NextResponse.json({ success: true, data: { note: updated } });
}
