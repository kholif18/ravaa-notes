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
  const lists = await prisma.notebook.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } });
  return NextResponse.json({ success: true, data: { lists } });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const nb = await prisma.notebook.create({ data: { name: body.name, color: body.color || "#4F8EF7", userId: user.id } });
  return NextResponse.json({ success: true, data: { notebook: nb } });
}
