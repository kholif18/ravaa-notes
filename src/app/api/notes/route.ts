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
    const qRaw = searchParams.get("q")?.trim() || "";
    const q = qRaw.slice(0, 100);
    const pinned = searchParams.get("pinned");
    const tag = (searchParams.get("tag") || "").slice(0, 50);
    const trash = searchParams.get("trash");
    const where: any = { userId: user.id };
    if (trash === "true") where.isTrashed = true;
    else where.isTrashed = false;
    if (notebookId) where.notebookId = notebookId === "none" ? null : notebookId;
    if (pinned === "true") where.isPinned = true;
    if (tag) where.tags = { contains: tag };
    if (q) {
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
  const title = String(body.title || "Untitled").slice(0, 200);
  const content = String(body.content || "").slice(0, 100000);
  const tags = body.tags ? String(body.tags).slice(0, 500) : null;
  if (body.notebookId) {
    const nb = await prisma.notebook.findUnique({ where: { id: String(body.notebookId) } });
    if (!nb || nb.userId !== user.id) return NextResponse.json({ success: false, error: "Invalid notebook" }, { status: 400 });
  }
  const note = await prisma.note.create({ data: { title: title || "Untitled", content, notebookId: body.notebookId || null, userId: user.id, tags, isPinned: Boolean(body.isPinned) } });
  return NextResponse.json({ success: true, data: { note } });
}
