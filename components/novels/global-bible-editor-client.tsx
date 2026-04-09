"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { loadReaderPrefs, saveReaderPrefs, type FontSize, type ReadingTheme } from "@/lib/reader-prefs";
import { useTheme } from "@/components/theme-provider";
import { saveGlobalBible } from "@/app/(main)/library/[novelId]/actions";
import { BibleEditorToolbar } from "@/components/editor/bible-editor-toolbar";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "success" | "error";

interface Props {
  novelId:      string;
  initialBible: string;
}

export function GlobalBibleEditorClient({ novelId, initialBible }: Props) {
  const router                          = useRouter();
  const { resolvedTheme }               = useTheme();
  const [editMode, setEditMode]         = useState(true);
  const [saveState, setSaveState]       = useState<SaveState>("idle");
  const [fontSize, setFontSize]         = useState<FontSize>("md");
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("default");

  // Ref to always-fresh markdown — avoids stale closure in the keydown handler
  const latestMd     = useRef(initialBible);
  const saveInFlight = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,   // required for Next.js SSR — prevents hydration mismatch
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Placeholder.configure({ placeholder: "Write the Global Bible here…\n\n## Major Plot Points\n## Character Status\n## World Rules" }),
      Typography,
      CharacterCount,
    ],
    content: "",        // populated in useEffect once editor is ready
    editable: true,     // start in edit mode
    editorProps: {
      attributes: {
        class: "tiptap prose prose-lg dark:prose-invert max-w-none focus:outline-none font-serif",
        spellCheck: "true",
      },
    },
    onUpdate({ editor: ed }) {
      if (!ed.isEditable) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latestMd.current = (ed.storage as any).markdown.getMarkdown() as string;
    },
  });

  // Load initial content once editor is ready
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(initialBible, { emitUpdate: false });
    latestMd.current = initialBible;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Sync editMode → TipTap editable flag
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(editMode);
    if (editMode) setTimeout(() => editor.commands.focus(), 10);
  }, [editor, editMode]);

  // Load reader preferences on mount
  useEffect(() => {
    const prefs = loadReaderPrefs();
    setFontSize(prefs.fontSize);
    setReadingTheme(prefs.readingTheme);
  }, []);

  // Reset reading theme when global light/dark mode changes (sepia is light-only; warm is dark-only)
  useEffect(() => {
    setReadingTheme((current) => {
      if (resolvedTheme === "dark"  && current === "sepia") return "default";
      if (resolvedTheme === "light" && current === "warm")  return "default";
      return current;
    });
  }, [resolvedTheme]);

  const handleSave = useCallback(async () => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaveState("saving");
    try {
      await saveGlobalBible(novelId, latestMd.current);
      setSaveState("success");
      router.push(`/library/${novelId}`);
    } catch {
      setSaveState("error");
      saveInFlight.current = false;
    }
  }, [novelId, router]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "r") {
        e.preventDefault();
        setEditMode((m) => !m);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      <BibleEditorToolbar
        editor={editor}
        editMode={editMode}
        onToggleEdit={() => setEditMode((m) => !m)}
        saveState={saveState}
        onSave={() => void handleSave()}
        fontSize={fontSize}
        onFontSizeChange={(s) => { setFontSize(s); saveReaderPrefs({ fontSize: s, readingTheme }); }}
        readingTheme={readingTheme}
        onReadingThemeChange={(t) => { setReadingTheme(t); saveReaderPrefs({ fontSize, readingTheme: t }); }}
        resolvedTheme={resolvedTheme}
      />

      {/* Scrollable document area — same pattern as EditorClient */}
      <div
        className="flex-1 overflow-y-auto"
        data-reading-theme={readingTheme}
        style={{
          background: "var(--bg-editor)",
          "--reader-font-size": { sm: "16px", md: "19px", lg: "22px", xl: "26px" }[fontSize],
        } as React.CSSProperties}
        onClick={(e) => {
          if (editMode && editor && e.target === e.currentTarget) {
            editor.commands.focus("end");
          }
        }}
      >
        <div className={cn("max-w-[var(--editor-max-width)] mx-auto px-3 sm:px-6 md:px-8 py-16")}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
