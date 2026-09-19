"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { EditorToolbar } from "@/components/notes/editor-toolbar";

export default function SharedNotePage() {
  const params = useParams() as { token: string };
  const token = params.token;
  const [note, setNote] = useState<any>(null);
  const [share, setShare] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const historyMapRef = useRef(new Map<string, { stack: string[]; index: number }>());

  const getHistory = (noteId: string) => {
    if (!historyMapRef.current.has(noteId)) {
      historyMapRef.current.set(noteId, { stack: [editContent], index: 0 });
    }
    return historyMapRef.current.get(noteId)!;
  };

  async function load(pwd?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/shared/${token}${pwd ? `?password=${encodeURIComponent(pwd)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNote(data.data.note);
        setShare(data.data.share);
        setEditContent(data.data.note?.content || "");
        setNeedsPassword(false);
        if (data.data.note?.id) {
          const h = getHistory(data.data.note.id);
          h.stack = [data.data.note.content || ""];
          h.index = 0;
        }
      } else {
        if (data.needsPassword) setNeedsPassword(true);
        setError(data.error || "Failed to load");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!share || share.permission !== "edit") return;
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/shared/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, password: password || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setNote({ ...note, content: editContent });
        setSaveStatus({ type: "success", message: "Saved successfully" });
        setIsEditing(false);
      } else {
        setSaveStatus({ type: "error", message: data.error || "Gagal save" });
      }
    } catch (e: any) {
      setSaveStatus({ type: "error", message: e.message || "Gagal save" });
    }
    setTimeout(() => setSaveStatus(null), 3000);
  }

  async function toggleGuestTask(lineNumber: number) {
    const src = isEditing ? editContent : note.content;
    const lines = (src || "").split("\n");
    const idx = lineNumber - 1;
    if (idx >= 0 && idx < lines.length) {
      let line = lines[idx];
      if (/^\s*(?:[-*+]|\d+\.)\s*\[ \]/i.test(line)) {
        lines[idx] = line.replace(/\[ \]/, "[x]");
      } else if (/^\s*(?:[-*+]|\d+\.)\s*\[[xX]\]/.test(line)) {
        lines[idx] = line.replace(/\[[xX]\]/, "[ ]");
      }
    }
    const newContent = lines.join("\n");
    setNote((prev: any) => (prev ? { ...prev, content: newContent } : prev));
    setEditContent(newContent);

    if (share?.permission === "edit") {
      try {
        await fetch(`/api/shared/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent, password: password || undefined }),
        });
      } catch {}
    }
    if (note?.id) {
      const h = getHistory(note.id);
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(newContent);
      h.index = h.stack.length - 1;
    }
  }

  const insertAtCursor = (before: string, after: string) => {
    const ta = document.getElementById("guest-note-content") as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart,
      e = ta.selectionEnd;
    const v = ta.value;
    const sel = v.substring(s, e);
    const newContent = v.substring(0, s) + before + sel + after + v.substring(e);
    setEditContent(newContent);
    if (note?.id) {
      const h = getHistory(note.id);
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(newContent);
      h.index = h.stack.length - 1;
    }
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
    }, 0);
  };

  const handleIndent = () => {
    const ta = document.getElementById("guest-note-content") as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart,
      e = ta.selectionEnd;
    const v = ta.value;
    const before = v.substring(0, s);
    const after = v.substring(e);
    const sel = v.substring(s, e);
    if (s === e) {
      const lines = before.split("\n");
      const cur = lines[lines.length - 1];
      lines[lines.length - 1] = "  " + cur;
      const nc = lines.join("\n") + after;
      setEditContent(nc);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
        ta.focus();
      }, 0);
    } else {
      const indented = sel.split("\n").map((l) => "  " + l).join("\n");
      const nc = v.substring(0, s) + indented + v.substring(e);
      setEditContent(nc);
      setTimeout(() => {
        ta.selectionStart = s + 2;
        ta.selectionEnd = e + 2 * sel.split("\n").length;
        ta.focus();
      }, 0);
    }
    if (note?.id) {
      const h = getHistory(note.id);
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(v);
      h.index = h.stack.length - 1;
    }
  };

  const handleOutdent = () => {
    const ta = document.getElementById("guest-note-content") as HTMLTextAreaElement;
    if (!ta) return;
    const start = ta.selectionStart,
      end = ta.selectionEnd;
    const val = ta.value;
    if (start === end) {
      const beforeLines = val.substring(0, start).split("\n");
      const cur = beforeLines[beforeLines.length - 1];
      if (cur.startsWith("→ ")) {
        beforeLines[beforeLines.length - 1] = cur.slice(2);
        const newContent = beforeLines.join("\n") + val.substring(end);
        setEditContent(newContent);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start - 2;
          ta.focus();
        }, 0);
      } else if (cur.startsWith("  ")) {
        beforeLines[beforeLines.length - 1] = cur.slice(2);
        const newContent = beforeLines.join("\n") + val.substring(end);
        setEditContent(newContent);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start - 2;
          ta.focus();
        }, 0);
      }
    } else {
      const sel = val.substring(start, end);
      const lines = sel.split("\n");
      const outdented = lines.map((l) => {
        if (l.startsWith("→ ")) return l.slice(2);
        if (l.startsWith("  ")) return l.slice(2);
        return l;
      }).join("\n");
      const newContent = val.substring(0, start) + outdented + val.substring(end);
      setEditContent(newContent);
      setTimeout(() => {
        ta.selectionStart = start;
        ta.selectionEnd = start + outdented.length;
        ta.focus();
      }, 0);
    }
    if (note?.id) {
      const h = getHistory(note.id);
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(val);
      h.index = h.stack.length - 1;
    }
  };

  const handleUndo = () => {
    if (!note?.id) return;
    const h = getHistory(note.id);
    if (h.index > 0) {
      h.index--;
      const val = h.stack[h.index];
      setEditContent(val);
      setTimeout(() => {
        const ta = document.getElementById("guest-note-content") as HTMLTextAreaElement;
        if (ta) {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = val.length;
        }
      }, 0);
    }
  };

  const handleRedo = () => {
    if (!note?.id) return;
    const h = getHistory(note.id);
    if (h.index < h.stack.length - 1) {
      h.index++;
      const val = h.stack[h.index];
      setEditContent(val);
      setTimeout(() => {
        const ta = document.getElementById("guest-note-content") as HTMLTextAreaElement;
        if (ta) {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = val.length;
        }
      }, 0);
    }
  };

  const handleImageInsert = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,audio/*,video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !note?.id) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", note.id);
      try {
        const res = await fetch("/api/upload-proxy", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          insertAtCursor(`![](${data.url})`, "");
        }
      } catch (e) {
        alert("Upload gagal");
      }
    };
    input.click();
  };

  useEffect(() => {
    load();
  }, [token]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        Loading...
      </div>
    );
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4">
        <div className="w-full max-w-sm p-6 rounded-2xl border bg-white/5 backdrop-blur-xl border-white/10">
          <h1 className="font-semibold text-white">Link diproteksi password</h1>
          <p className="text-sm text-zinc-400 mt-1">Masukkan password yang dibagikan</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(password);
            }}
            className="mt-4 space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white"
              autoFocus
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              Buka
            </button>
          </form>
        </div>
      </div>
    );
  }
  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        <p className="text-zinc-400">{error || "Not found"}</p>
      </div>
    );
  }

  const canEdit = share?.permission === "edit";
  const h = note?.id ? getHistory(note.id) : { index: 0, stack: [] };
  const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      span: [...(defaultSchema.attributes?.span || []), ["style", /^color:\s*(#[0-9a-fA-F]{3,6}|rgb\(.*\)|rgba\(.*\))$/]],
      sup: [], sub: [],
      code: [...(defaultSchema.attributes?.code || []), ["className", /^language-.*$/]],
    },
    tagNames: [...(defaultSchema.tagNames || []), "sup", "sub", "span"],
  } as any;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-xs text-zinc-500 mb-2">
          Shared via Ravaa Notes • {share?.permission === "edit" ? "✏️ Bisa edit" : "👁️ Read-only"} •{" "}
          {note.isPinned ? "📌 Pinned" : ""}
        </p>
        <h1 className="text-2xl font-bold">{note.title}</h1>
        {note.tags && <p className="text-xs text-zinc-400 mt-1">Tags: {note.tags}</p>}
        {canEdit && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs rounded-lg ${
                isEditing ? "bg-blue-600 text-white" : "bg-[#1A1A1A] hover:bg-[#232323] text-zinc-300"
              }`}
            >
              {isEditing ? "Preview" : "Edit"}
            </button>
            {isEditing && (
              <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Save
              </button>
            )}
            {saveStatus && (
              <span className={`text-xs px-2.5 py-1 rounded flex items-center ${saveStatus.type === "success" ? "bg-green-900/40 text-green-300 border border-green-700/50" : "bg-red-900/40 text-red-300 border border-red-700/50"}`}>
                {saveStatus.message}
              </span>
            )}
          </div>
        )}
        {isEditing && canEdit && (
          <EditorToolbar
            onInsert={insertAtCursor}
            onImageInsert={handleImageInsert}
            onIndent={handleIndent}
            onOutdent={handleOutdent}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={h.index > 0}
            canRedo={h.index < h.stack.length - 1}
          />
        )}
        <div className="mt-6 prose prose-invert max-w-none bg-[#0A0A0A] p-6 rounded-xl border border-white/10 prose-p:whitespace-pre-wrap prose-p:break-words prose-p:break-all prose-pre:bg-[#141414] prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-hidden prose-code:whitespace-pre-wrap prose-code:break-words prose-code:break-all prose-code:text-zinc-200 prose-pre:text-zinc-200 prose-a:text-blue-400 prose-a:break-words prose-a:whitespace-pre-wrap prose-a:break-all prose-headings:text-white prose-strong:text-white prose-blockquote:border-l-blue-500 prose-li:has-[input:checked]:line-through prose-li:has-[input:checked]:text-zinc-500">
          {isEditing && canEdit ? (
            <textarea
              id="guest-note-content"
              value={editContent}
              onChange={(e) => {
                const newVal = e.target.value;
                setEditContent(newVal);
                if (note?.id) {
                  const hist = getHistory(note.id);
                  hist.stack = hist.stack.slice(0, hist.index + 1);
                  hist.stack.push(newVal);
                  hist.index = hist.stack.length - 1;
                }
              }}
              onKeyDown={(e) => {
                const ta = e.currentTarget as HTMLTextAreaElement;
                // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
                  e.preventDefault();
                  handleUndo();
                  return;
                }
                if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
                  e.preventDefault();
                  handleRedo();
                  return;
                }
                if (e.key === "Enter") {
                  const val = ta.value;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const before = val.substring(0, start);
                  const after = val.substring(end);
                  const lines = before.split("\n");
                  const currentLine = lines[lines.length - 1];
                  const taskMatch = currentLine.match(/^(\s*)(- \[[ x]\] )(.*)$/i);
                  const bulletMatch = currentLine.match(/^(\s*)(- )(.*)$/);
                  const numberedMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
                  let insert = "";
                  if (taskMatch) {
                    const rest = taskMatch[3];
                    if (rest.trim() === "") {
                      e.preventDefault();
                      lines[lines.length - 1] = "";
                      setEditContent(lines.join("\n") + after);
                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                      return;
                    }
                    insert = "\n" + taskMatch[1] + "- [ ] ";
                  } else if (bulletMatch) {
                    const rest = bulletMatch[3];
                    if (rest.trim() === "") {
                      e.preventDefault();
                      lines[lines.length - 1] = "";
                      setEditContent(lines.join("\n") + after);
                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                      return;
                    }
                    insert = "\n" + bulletMatch[1] + bulletMatch[2];
                  } else if (numberedMatch) {
                    const rest = numberedMatch[3];
                    const num = parseInt(numberedMatch[2], 10);
                    if (rest.trim() === "") {
                      e.preventDefault();
                      lines[lines.length - 1] = "";
                      setEditContent(lines.join("\n") + after);
                      setTimeout(() => { ta.selectionStart = ta.selectionEnd = before.lastIndexOf("\n") + 1; }, 0);
                      return;
                    }
                    insert = "\n" + numberedMatch[1] + (num + 1) + ". ";
                  }
                  if (insert) {
                    e.preventDefault();
                    const newContent = before + insert + after;
                    setEditContent(newContent);
                    if (note?.id) {
                      const hist = getHistory(note.id);
                      hist.stack = hist.stack.slice(0, hist.index + 1);
                      hist.stack.push(newContent);
                      hist.index = hist.stack.length - 1;
                    }
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
                  }
                }
                // Tab = indent
                if (e.key === "Tab") {
                  e.preventDefault();
                  const val = ta.value;
                  const s = ta.selectionStart, en = ta.selectionEnd;
                  const newContent = val.substring(0, s) + "  " + val.substring(en);
                  setEditContent(newContent);
                  if (note?.id) {
                    const hist = getHistory(note.id);
                    hist.stack = hist.stack.slice(0, hist.index + 1);
                    hist.stack.push(newContent);
                    hist.index = hist.stack.length - 1;
                  }
                  setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
                }
              }}
              className="w-full min-h-[400px] bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
              components={{
                a: ({ children, href, node, ...props }: any) => {
                  if (href?.startsWith("#internal:")) {
                    return (
                      <span className="text-blue-400 font-medium break-words whitespace-pre-wrap">
                        {children} ↗
                      </span>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words whitespace-pre-wrap break-all"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                img: ({ src, alt, node, ...props }: any) => (
                  <img
                    src={src}
                    alt={alt}
                    {...props}
                    className="max-w-full rounded-lg border border-white/[0.04]"
                    loading="lazy"
                  />
                ),
                input: ({ type, checked, node, ...props }: any) => {
                  if (type === "checkbox") {
                    return null;
                  }
                  return <input type={type} {...props} />;
                },
                li: ({ children, node, ...props }: any) => {
                  const firstChild: any = node?.children?.[0];
                  const isTask = firstChild?.tagName === "input" && firstChild?.properties?.type === "checkbox";
                  if (isTask) {
                    const lineNumber: number | undefined = node?.position?.start?.line;
                    const isChecked = Boolean(firstChild.properties.checked);
                    const filteredChildren = Array.isArray(children) ? (children as any[]).filter(Boolean) : children;
                    return (
                      <li className="flex items-start gap-2 list-none" {...props}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (lineNumber) toggleGuestTask(lineNumber);
                          }}
                          className="mt-1 cursor-pointer accent-blue-600 w-4 h-4 flex-shrink-0"
                          aria-label="Toggle task"
                        />
                        <span className={`break-words whitespace-pre-wrap flex-1 ${isChecked ? "line-through text-zinc-500" : ""}`}>{filteredChildren}</span>
                      </li>
                    );
                  }
                  return <li className="break-words whitespace-pre-wrap" {...props}>{children}</li>;
                },
                code: ({ children, className, node, ...props }: any) => {
                  const isInline = !className || !String(className).includes("language-");
                  if (isInline) {
                    return (
                      <code
                        className="bg-[#1A1A1A] text-amber-300 px-1 py-0.5 rounded text-sm break-words"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={String(className) + " bg-transparent p-0"} {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children, node, ...props }: any) => {
                  const text = String(children);
                  if (
                    typeof text === "string" &&
                    (text.startsWith("→ ") ||
                      text.startsWith("  ") ||
                      text.startsWith("\u00a0") ||
                      text.startsWith("\u200B"))
                  ) {
                    const clean = text
                      .replace(/^→\s*/, "")
                      .replace(/^\u200B\s*/, "")
                      .replace(/^\u00a0+/, "")
                      .replace(/^  /, "")
                      .trimStart();
                    return (
                      <p className="ml-6 break-words whitespace-pre-wrap" {...props}>
                        {clean || children}
                      </p>
                    );
                  }
                  return (
                    <p className="break-words whitespace-pre-wrap" {...props}>
                      {children}
                    </p>
                  );
                },
                pre: ({ children, node, ...props }: any) => (
                  <div className="relative group">
                    <pre
                      className="bg-[#141414] p-3 rounded-lg overflow-auto whitespace-pre-wrap break-words break-all"
                      {...props}
                    >
                      {children}
                    </pre>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          String((children as any)?.props?.children || children)
                        )
                      }
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#232323] hover:bg-[#2a2a2a] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy
                    </button>
                  </div>
                ),
              }}
            >
              {(isEditing ? editContent : note.content || "*No content*").replace(
                /\[\[(.+?)\]\]/g,
                (m: string, p1: string) => `[${p1.trim()}](#internal:${encodeURIComponent(p1.trim())})`
              )}
            </ReactMarkdown>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          {canEdit
            ? "Bisa edit — klik Edit di atas"
            : "Read-only • minta link Edit dari pemilik untuk bisa edit"}
        </p>
      </div>
    </div>
  );
}
