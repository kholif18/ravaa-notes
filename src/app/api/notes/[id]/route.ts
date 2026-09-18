import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id }, include: { notebook: { select: { id: true, name: true, color: true } } } });
  if (!note || note.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: { note } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const body = await request.json();
  const data: any = {};
  if (body.title !== undefined) data.title = String(body.title).trim() || "Untitled";
  if (body.content !== undefined) data.content = String(body.content);
  if (body.notebookId !== undefined) {
    if (body.notebookId === null || body.notebookId === "") data.notebookId = null;
    else {
      const nb = await prisma.notebook.findUnique({ where: { id: String(body.notebookId) } });
      if (!nb || nb.userId !== user.id) return NextResponse.json({ success: false, error: "Invalid notebook" }, { status: 400 });
      data.notebookId = nb.id;
    }
  }
  if (body.isPinned !== undefined) data.isPinned = Boolean(body.isPinned);
  if (body.tags !== undefined) data.tags = body.tags ? String(body.tags) : null;
  const note = await prisma.note.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: { note } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.note.update({ where: { id }, data: { isTrashed: true } });
  return NextResponse.json({ success: true });
}
