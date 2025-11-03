import sanitizeHtml, { type IOptions } from "sanitize-html";

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: [
    "p",
    "span",
    "div",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "br",
    "hr",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "figure",
    "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "style"],
    "*": ["style", "class", "id", "data-*", "align"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: true,
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      "font-size": [/^\d+(?:px|em|rem|%)$/],
      "background-color": [/^#[0-9a-fA-F]{3,6}$/, /^rgb\((\s*\d+\s*,?){3}\)$/],
      color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\((\s*\d+\s*,?){3}\)$/],
      width: [/^\d+(?:px|%)$/],
      height: [/^\d+(?:px|%)$/],
      "max-width": [/^\d+(?:px|%)$/],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

export function sanitizeRichText(input: string) {
  return sanitizeHtml(input, SANITIZE_OPTIONS);
}
