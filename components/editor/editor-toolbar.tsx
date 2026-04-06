"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough,
  List, ListOrdered, Quote,
  GitBranch, Eye, Pencil, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FontSize, ReadingTheme } from "@/lib/reader-prefs";

type SyncState = "idle" | "syncing" | "success" | "error";

interface Props {
  editor:              Editor;
  editMode:            boolean;
  onToggleEdit:        () => void;
  syncState:           SyncState;
  onSync:              () => void;
  sidebarOpen:         boolean;
  onToggleSidebar:     () => void;
  fontSize:            FontSize;
  onFontSizeChange:    (s: FontSize) => void;
  readingTheme:        ReadingTheme;
  onReadingThemeChange:(t: ReadingTheme) => void;
  resolvedTheme:       "light" | "dark";
}

const FONT_SIZES: FontSize[] = ["sm", "md", "lg", "xl"];

const LIGHT_THEMES: { value: ReadingTheme; bg: string; title: string }[] = [
  { value: "default", bg: "#ffffff",  title: "Default" },
  { value: "sepia",   bg: "#f5efe0",  title: "Sepia"   },
];
const DARK_THEMES: { value: ReadingTheme; bg: string; title: string }[] = [
  { value: "default", bg: "#3e2b1a",  title: "Default" },
  { value: "warm",    bg: "#241509",  title: "Warm"    },
];

function Btn({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)]",
        disabled && "opacity-40 pointer-events-none",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-[var(--border-default)] mx-0.5 shrink-0" />;
}

export function EditorToolbar({
  editor, editMode, onToggleEdit, syncState, onSync, sidebarOpen, onToggleSidebar,
  fontSize, onFontSizeChange, readingTheme, onReadingThemeChange, resolvedTheme,
}: Props) {
  const themes = resolvedTheme === "dark" ? DARK_THEMES : LIGHT_THEMES;
  const words = editor.storage.characterCount?.words() ?? 0;

  const headingValue =
    editor.isActive("heading", { level: 1 }) ? "h1" :
    editor.isActive("heading", { level: 2 }) ? "h2" :
    editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  const currentSizeIdx = FONT_SIZES.indexOf(fontSize);

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-x-auto shrink-0">

      {/* Sidebar toggle */}
      <Btn onClick={onToggleSidebar} title={sidebarOpen ? "Hide chapters" : "Show chapters"}>
        {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
      </Btn>

      <Sep />

      {/* Read / Edit toggle */}
      <Btn onClick={onToggleEdit} active={editMode} title={editMode ? "Read mode (⌘⇧R)" : "Edit mode (⌘⇧R)"}>
        {editMode ? <Pencil size={15} /> : <Eye size={15} />}
      </Btn>

      {/* Formatting — only shown in edit mode */}
      {editMode && (
        <>
          <Sep />

          {/* Heading select */}
          <select
            value={headingValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") editor.chain().focus().setParagraph().run();
              else editor.chain().focus().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
            }}
            className="text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <Sep />

          <Btn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive("bold")}        title="Bold (⌘B)"><Bold size={14} /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive("italic")}      title="Italic (⌘I)"><Italic size={14} /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive("strike")}      title="Strikethrough"><Strikethrough size={14} /></Btn>

          <Sep />

          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive("bulletList")}  title="Bullet list"><List size={14} /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={14} /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive("blockquote")}  title="Blockquote"><Quote size={14} /></Btn>
        </>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 shrink-0 pl-2">
        <span className="font-mono text-xs text-[var(--text-muted)] hidden sm:inline select-none">
          {words.toLocaleString()} words
        </span>

        <Sep />

        {/* Font size controls */}
        <div className="flex items-center gap-0.5">
          <Btn
            onClick={() => onFontSizeChange(FONT_SIZES[currentSizeIdx - 1])}
            disabled={currentSizeIdx === 0}
            title="Decrease text size"
          >
            <span className="font-serif text-[11px] font-semibold leading-none">A−</span>
          </Btn>
          <Btn
            onClick={() => onFontSizeChange(FONT_SIZES[currentSizeIdx + 1])}
            disabled={currentSizeIdx === FONT_SIZES.length - 1}
            title="Increase text size"
          >
            <span className="font-serif text-[13px] font-semibold leading-none">A+</span>
          </Btn>
        </div>

        <Sep />

        {/* Reading theme swatches */}
        <div className="flex items-center gap-1">
          {themes.map(({ value, bg, title }) => (
            <button
              key={value}
              type="button"
              title={title}
              onClick={() => onReadingThemeChange(value)}
              className={cn(
                "w-4 h-4 rounded-full border transition-all shrink-0",
                readingTheme === value
                  ? "ring-2 ring-offset-1 ring-[var(--accent)] border-[var(--accent)]"
                  : "border-[var(--border-default)] hover:border-[var(--text-muted)]",
              )}
              style={{ background: bg }}
            />
          ))}
        </div>

        <Sep />

        <button
          onClick={onSync}
          disabled={syncState === "syncing"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent)] text-white text-xs hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          <GitBranch size={12} />
          <span className="hidden sm:inline">
            {syncState === "syncing" ? "Syncing…" : "Sync"}
          </span>
        </button>
      </div>
    </div>
  );
}
