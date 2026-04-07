import { Mark, markInputRule } from "@tiptap/core";

export interface WikiLinkOptions {
  onLinkClick: (name: string) => void;
}

export const WikiLinkExtension = Mark.create<WikiLinkOptions>({
  name: "wikiLink",

  addOptions() {
    return { onLinkClick: () => {} };
  },

  addAttributes() {
    return {
      name: {
        default:   null,
        parseHTML: (el) => el.getAttribute("data-wikilink"),
        renderHTML: (attrs) => ({ "data-wikilink": attrs.name as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wikilink]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        class: "wikilink text-[var(--accent)] underline underline-offset-2 cursor-pointer",
      },
      0,
    ];
  },

  // Teach tiptap-markdown how to serialize this mark back to [[name]] in markdown
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: unknown, mark: { attrs: { name: string } }) {
            return `[[${mark.attrs.name}`;
          },
          close(_state: unknown, _mark: unknown) {
            return "]]";
          },
          mixable:     false,
          expelEnclosingWhitespace: false,
        },
      },
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => ({ name: match[1] }),
      }),
    ];
  },
});
