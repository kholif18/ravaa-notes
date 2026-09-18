import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const notebookId = searchParams.get("notebookId");
    const q = searchParams.get("q")?.trim();
    const pinned = searchParams.get("pinned");
    const tag = searchParams.get("tag");
    const trash = searchParams.get("trash");
    const where: any = { userId: user.id };
    if (trash === "true") where.isTrashed = true;
    else where.isTrashed = false;
    if (notebookId) where.notebookId = notebookId === "none" ? null : notebookId;
    if (pinned === "true") where.isPinned = true;
    if (tag) where.tags = { contains: tag };
    if (q) {
      // For SQLite, contains is case-sensitive by default, but ok
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
      ];
    }
    const notes = await prisma.note.findMany({ where, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] });
    return NextResponse.json({ success: true, data: { notes } });
  } catch (e) {
    console.error("GET /api/notes error", e);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const note = await prisma.note.create({ data: { title: body.title || "Untitled", content: body.content || "", notebookId: body.notebookId || null, userId: user.id, tags: body.tags || null, isPinned: body.isPinned || false } });
  return NextResponse.json({ success: true, data: { note } });
}
