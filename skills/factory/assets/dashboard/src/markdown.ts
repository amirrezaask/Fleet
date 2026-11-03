import { Marked } from "marked";
import { parseFrontmatter } from "./model.ts";

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

// Raw HTML in a document is shown as text; only http(s) links and links to other task
// documents survive, so rendered output can be injected into the page as is.
const marked = new Marked({
  gfm: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);

      if (/^https?:\/\//i.test(href)) {
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }

      if (/^[\w./-]+\.md(#[\w-]*)?$/.test(href)) {
        return `<a href="#" data-rel="${escapeHtml(href)}">${label}</a>`;
      }

      return label;
    },
  },
});

export const renderMarkdown = (source: string): string =>
  marked.parse(parseFrontmatter(source).body, { async: false });
