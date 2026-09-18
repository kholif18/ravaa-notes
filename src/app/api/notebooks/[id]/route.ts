import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, getUserFromRavaa } from "@/lib/auth";

async function requireAuth(req: NextRequest) {
  const token = getTokenFromHeader(req as unknown as Request);
  if (!token) return null;
  return getUserFromRavaa(token);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const nb = await prisma.notebook.findUnique({ where: { id } });
  if (!nb || nb.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.color !== undefined) data.color = String(body.color);
  if (body.parentId !== undefined) {
    if (body.parentId) {
      const parent = await prisma.notebook.findUnique({ where: { id: String(body.parentId) } });
      if (!parent || parent.userId !== user.id) return NextResponse.json({ success: false, error: "Parent not found" }, { status: 404 });
      if (parent.parentId) {
        const grandparent = await prisma.notebook.findUnique({ where: { id: parent.parentId } });
        if (grandparent?.parentId) return NextResponse.json({ success: false, error: "Maximum depth" }, { status: 400 });
      }
      if (String(body.parentId) === id) return NextResponse.json({ success: false, error: "Tidak bisa pindah ke diri sendiri" }, { status: 400 });
    }
    data.parentId = body.parentId ? String(body.parentId) : null;
  }
  const updated = await prisma.notebook.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: { notebook: updated } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const nb = await prisma.notebook.findUnique({ where: { id } });
  if (!nb || nb.userId !== user.id) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  // Move notes in this notebook to no notebook (All Notes)
  await prisma.note.updateMany({ where: { notebookId: id }, data: { notebookId: null } });
  // Move children to parent of deleted (or root)
  await prisma.notebook.updateMany({ where: { parentId: id }, data: { parentId: nb.parentId } });
  await prisma.notebook.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
