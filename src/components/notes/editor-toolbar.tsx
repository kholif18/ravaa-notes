"use client";
import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Code, Image as ImageIcon, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";

interface EditorToolbarProps {
  onInsert: (before: string, after: string) => void;
  onImageInsert: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function EditorToolbar({
  onInsert,
  onImageInsert,
  onIndent,
  onOutdent,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const colors = ["#000000","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7","#ec4899","#6b7280","#ffffff","#991b1b"];
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowColors(false);
    }
    if (showColors) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showColors]);

  return (
    <div className="px-2 py-1.5 border-b border-white/[0.02] flex flex-wrap gap-1 glass overflow-x-auto items-center">
      <button onClick={() => onInsert("**", "**")} title="Bold" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <Bold className="w-3 h-3" /> Bold
      </button>
      <button onClick={() => onInsert("*", "*")} title="Italic" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <Italic className="w-3 h-3" /> Italic
      </button>
      <button onClick={() => onInsert("~~", "~~")} title="Strikethrough" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        S̶
      </button>
      <button onClick={() => onInsert("# ", "")} title="H1" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <Heading1 className="w-3 h-3" /> H1
      </button>
      <button onClick={() => onInsert("## ", "")} title="H2" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        H2
      </button>
      <button onClick={() => onInsert("### ", "")} title="H3" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        H3
      </button>
      <button onClick={() => onInsert("- ", "")} title="Bullet List" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <List className="w-3 h-3" /> List
      </button>
      <button onClick={() => onInsert("1. ", "")} title="Numbered List" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <ListOrdered className="w-3 h-3" /> 1.
      </button>
      <button onClick={() => onInsert("- [ ] ", "")} title="Task" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        ☐ Task
      </button>
      <button onClick={() => onInsert("> ", "")} title="Quote" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        ❝ Quote
      </button>
      <button
        onClick={() => {
          const url = prompt("URL untuk link:");
          if (url) onInsert("[", `](${url})`);
          else onInsert("[", "](url)");
        }}
        title="Link [text](url)"
        className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap"
      >
        Link
      </button>
      <button onClick={() => onInsert("\n---\n", "")} title="HR" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        — HR
      </button>
      <button onClick={() => onInsert("```\n", "\n```")} title="Code" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <Code className="w-3 h-3" /> Code
      </button>
      <button
        onClick={() => {
          const table = "| Header 1 | Header 2 |\n|---|---|\n|  |  |\n|  |  |";
          onInsert("\n" + table + "\n", "");
        }}
        title="Table"
        className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap"
      >
        Table
      </button>
      <button onClick={() => onInsert("[[", "]]")} title="Internal Link [[Note]]" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] whitespace-nowrap">
        [[Link]]
      </button>
      <button onClick={onImageInsert} title="Image/Audio" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <ImageIcon className="w-3 h-3" /> Image
      </button>
      <button onClick={() => onInsert("<sup>", "</sup>")} title="Superscript x² (Joplin)" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <span className="font-mono text-[11px]">x<sup>2</sup></span> Sup
      </button>
      <button onClick={() => onInsert("<sub>", "</sub>")} title="Subscript x₂ (Joplin)" className="px-2 py-1 text-xs bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center gap-1 whitespace-nowrap">
        <span className="font-mono text-[11px]">x<sub>2</sub></span> Sub
      </button>
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowColors(!showColors)}
          title="Font color — LibreOffice Writer style"
          className={`px-1.5 py-1 rounded flex items-center gap-0.5 border whitespace-nowrap ${showColors ? "bg-[#232323] border-white/20" : "bg-[#1A1A1A] border-transparent hover:bg-[#232323] hover:border-white/10"}`}
        >
          <span className="flex flex-col items-center leading-none">
            <span className="font-serif font-bold text-[15px] leading-none">A</span>
            <span className="w-5 h-[3px] rounded-sm mt-[1px] border border-white/20" style={{ background: selectedColor }} />
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
        </button>
        {showColors && (
          <div className="absolute top-full mt-1 left-0 p-2 bg-[#1A1A1A] border border-white/10 rounded-lg z-50 shadow-xl min-w-[148px]">
            <div className="grid grid-cols-6 gap-1.5">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => { setSelectedColor(c); onInsert(`<span style="color:${c}">`, `</span>`); setShowColors(false); }}
                  className={`w-6 h-6 rounded-sm border hover:scale-105 transition-transform ${selectedColor===c ? "border-white ring-1 ring-white/40" : "border-white/15"}`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">Custom</span>
              <label className="relative w-6 h-6 rounded-sm border border-white/15 bg-[#232323] cursor-pointer overflow-hidden flex items-center justify-center hover:border-white/30">
                <input type="color" value={selectedColor} className="opacity-0 absolute inset-0 cursor-pointer" onChange={e => { setSelectedColor(e.target.value); onInsert(`<span style="color:${e.target.value}">`, `</span>`); setShowColors(false); }} />
                <span className="w-3 h-3 rounded-sm border border-white/30" style={{ background: selectedColor }} />
              </label>
            </div>
          </div>
        )}
      </div>
      <button onClick={onIndent} title="Increase indent" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center">
        <ArrowRight className="w-3 h-3" />
      </button>
      <button onClick={onOutdent} title="Decrease indent" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center">
        <ArrowLeft className="w-3 h-3" />
      </button>
      <button onClick={onUndo} title="Undo (Ctrl+Z)" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center disabled:opacity-30" disabled={!canUndo}>
        ↩ Undo
      </button>
      <button onClick={onRedo} title="Redo (Ctrl+Y)" className="p-1.5 bg-[#1A1A1A] rounded hover:bg-[#232323] flex items-center justify-center disabled:opacity-30" disabled={!canRedo}>
        ↪ Redo
      </button>
    </div>
  );
}
