import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromRavaa, getTokenFromHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DRIVE_URL = (process.env.RAVAA_DRIVE_URL || process.env.NEXT_PUBLIC_DRIVE_URL || "http://localhost:2713").replace(/\/$/, "");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB ala Joplin attachment
const ALLOWED_MIMES = new Set([
  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
  "audio/mpeg","audio/wav","audio/ogg","audio/mp3","audio/webm",
  "video/mp4","video/webm",
]);

async function findOrCreateRavaaNotesFolder(token: string): Promise<string | null> {
  const svcUrl = DRIVE_URL;
  const headers = { Authorization: `Bearer ${token}` } as any;
  // Cari folder Ravaa Notes di root via /api/files?folderId=root (Drive list API)
  try {
    const res = await fetch(`${svcUrl}/api/files?folderId=root`, { headers, cache: "no-store" });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const folders = data?.data?.folders || [];
      const found = folders.find((f: any) => f.name === "Ravaa Notes");
      if (found) return found.id;
    }
  } catch {}
  // Buat baru
  try {
    const res = await fetch(`${svcUrl}/api/folders`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ravaa Notes", parentId: null }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.data?.folder) return data.data.folder.id;
    if (data?.folder) return data.folder.id;
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  let token: string | null = null;
  if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7).trim();
  if (!token) {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/ravaa_token=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) {
    try {
      const jar: any = await cookies();
      token = jar.get("ravaa_token")?.value || jar.get("token")?.value || null;
    } catch {}
  }
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized - no token" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const noteId = form.get("noteId") as string | null;
  if (!file) return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
  if ((file as any).size > MAX_UPLOAD_BYTES) return NextResponse.json({ success: false, error: "File too large (max 10MB)" }, { status: 413 });
  const mime = (file as any).type || "";
  if (mime && !ALLOWED_MIMES.has(mime) && !mime.startsWith("image/")) {
    return NextResponse.json({ success: false, error: `File type not allowed: ${mime}` }, { status: 415 });
  }
  // Verify note ownership jika noteId dikirim (cegah upload ke folder note orang lain)
  if (noteId) {
    const user = await getUserFromRavaa(token);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== user.id) return NextResponse.json({ success: false, error: "Invalid noteId" }, { status: 403 });
  }
  // Quota check (HOME): tanya Service + Drive, blokir jika penuh
  try {
    const svcUrlRaw = (process.env.RAVAA_SERVICE_URL || "http://localhost:2711").replace(/\/$/, "");
    const svcRes = await fetch(`${svcUrlRaw}/api/v1/me/storage`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (svcRes.ok) {
      const sData: any = await svcRes.json().catch(() => null);
      const limit = Number(sData?.storage?.limit || sData?.limit || 5368709120);
      // Coba ambil used dari Drive storage-stats (jika Drive hidup)
      try {
        const statsRes = await fetch(`${DRIVE_URL}/api/files/storage-stats`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (statsRes.ok) {
          const stats: any = await statsRes.json().catch(() => null);
          const used = Number(stats?.data?.used || stats?.used || 0);
          const fileSize = Number((file as any).size || 0);
          if (used + fileSize > limit) return NextResponse.json({ success: false, error: "Storage quota exceeded" }, { status: 413 });
        }
      } catch {}
    }
  } catch {}

  const svcUrl = DRIVE_URL;
  // Cari/bikin folder Ravaa Notes
  let folderId: string | null = null;
  try {
    folderId = await findOrCreateRavaaNotesFolder(token);
    // Opsi rapi: sub-folder per note
    if (folderId && noteId) {
      // Cek sub folder noteId via /api/files?folderId=xxx
      const res = await fetch(`${svcUrl}/api/files?folderId=${folderId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const folders = data?.data?.folders || [];
        let sub = folders.find((f: any) => f.name === noteId);
        if (!sub) {
          const cr = await fetch(`${svcUrl}/api/folders`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ name: noteId, parentId: folderId }),
          });
          const cdata = await cr.json().catch(() => null);
          sub = cdata?.data?.folder || cdata?.folder;
        }
        if (sub?.id) folderId = sub.id;
      }
    }
  } catch {}

  const fd = new FormData();
  fd.append("file", file, (file as any).name || "upload");
  if (folderId) fd.append("folderId", folderId);

  const res = await fetch(`${svcUrl}/api/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd as any,
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { return NextResponse.json({ success: false, error: "Drive error" }, { status: 502 }); }
  if (!res.ok) return NextResponse.json({ success: false, error: data?.error || "Drive upload failed" }, { status: res.status });
  return NextResponse.json(data);
}
