import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const notes = await prisma.note.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ success: true, data: { notes } });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const note = await prisma.note.create({ data: { title: body.title || "Untitled", content: body.content || "", notebookId: body.notebookId || null, userId: user.id, tags: body.tags || null } });
  return NextResponse.json({ success: true, data: { note } });
}
