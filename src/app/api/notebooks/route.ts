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
  const lists = await prisma.notebook.findMany({ where: { userId: user.id }, orderBy: { position: "asc" }, include: { children: true } });
  return NextResponse.json({ success: true, data: { lists } });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ success: false, error: "Name required" }, { status: 400 });
  if (body.parentId) {
    const parent = await prisma.notebook.findUnique({ where: { id: String(body.parentId) } });
    if (!parent || parent.userId !== user.id) return NextResponse.json({ success: false, error: "Parent not found" }, { status: 404 });
    // Cek level parent: root=0, child=1, cucu=2 — cucu tidak boleh punya anak (max 2 level)
    if (parent.parentId) {
      const grandparent = await prisma.notebook.findUnique({ where: { id: parent.parentId } });
      if (grandparent?.parentId) return NextResponse.json({ success: false, error: "Maximum depth reached — this notebook cannot have children" }, { status: 400 });
    }
  }
  const nb = await prisma.notebook.create({ data: { name: body.name, color: body.color || "#4F8EF7", userId: user.id, parentId: body.parentId || null } });
  return NextResponse.json({ success: true, data: { notebook: nb } });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, name, color, parentId } = body;
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  const nb = await prisma.notebook.update({ where: { id }, data: { name, color, parentId } });
  return NextResponse.json({ success: true, data: { notebook: nb } });
}
