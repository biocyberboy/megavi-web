import { cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";

type InlineToken = ReactNode;

const IMAGE_SIZE_CLASS_MAP = {
  small: "max-w-sm",
  medium: "max-w-xl",
  large: "max-w-2xl",
  full: "max-w-3xl md:max-w-4xl",
} as const;

type ImageSizeKey = keyof typeof IMAGE_SIZE_CLASS_MAP;
const DEFAULT_IMAGE_SIZE: ImageSizeKey = "medium";

const SIZE_KEYWORDS = Object.keys(IMAGE_SIZE_CLASS_MAP);

function normalizeMeta(value?: string | null) {
  if (!value) return [];
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveSizeKey(sources: string[]): ImageSizeKey {
  for (const source of sources) {
    const lower = source.toLowerCase();
    const matched = SIZE_KEYWORDS.find((keyword) => lower.includes(keyword));
    if (matched) {
      return matched as ImageSizeKey;
    }
  }
  return DEFAULT_IMAGE_SIZE;
}

function extractImageMeta(altText?: string, title?: string) {
  const altParts = normalizeMeta(altText);
  const titleParts = normalizeMeta(title);

  const alt = altParts[0] ?? altText ?? "";

  const sizeKey = resolveSizeKey([...altParts.slice(1), ...titleParts, title ?? ""]);

  const potentialCaption =
    titleParts.find((part) => !SIZE_KEYWORDS.some((keyword) => part.toLowerCase().includes(keyword))) ??
    (title && !SIZE_KEYWORDS.some((keyword) => title.toLowerCase().includes(keyword)) ? title.trim() : "") ??
    (alt ? alt : "");

  return {
    alt: alt || "Hình ảnh minh hoạ",
    caption: potentialCaption || undefined,
    sizeClass: IMAGE_SIZE_CLASS_MAP[sizeKey],
  };
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  const pushPlain = (value: string) => {
    if (!value) return;
    tokens.push(value);
  };

  while (remaining.length) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const imageMatch = remaining.match(/!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/);

    const matches = [boldMatch, italicMatch, codeMatch, imageMatch].filter(Boolean) as RegExpMatchArray[];
    if (matches.length === 0) {
      pushPlain(remaining);
      break;
    }

    const earliest = matches.reduce((prev, current) =>
      prev.index! <= current.index! ? prev : current
    );

    const index = earliest.index ?? 0;
    const [full, content] = earliest;

    pushPlain(remaining.slice(0, index));

    if (earliest === boldMatch) {
      tokens.push(<strong key={`${content}-${index}`}>{content}</strong>);
    } else if (earliest === italicMatch) {
      tokens.push(<em key={`${content}-${index}`}>{content}</em>);
    } else if (earliest === codeMatch) {
      tokens.push(
        <code key={`${content}-${index}`} className="rounded bg-white/5 px-1 py-0.5 text-xs md:text-sm">
          {content}
        </code>
      );
    } else if (earliest === imageMatch) {
      const [, altText, url, title] = earliest;
      const meta = extractImageMeta(altText, title);
      tokens.push(
        <span
          key={`img-inline-${index}`}
          className="inline-flex w-full flex-col items-center gap-2 md:gap-3 md:py-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={meta.alt}
            className={`h-auto w-full ${meta.sizeClass} rounded-2xl object-cover shadow-[0_16px_45px_rgba(0,0,0,0.35)]`}
            loading="lazy"
          />
          {meta.caption ? (
            <span className="text-center text-xs italic text-gray-400 md:text-sm">
              {meta.caption}
            </span>
          ) : null}
        </span>
      );
    }

    remaining = remaining.slice(index + full.length);
  }

  return tokens;
}

export function renderMarkdown(markdown: string): ReactNode {
  const lines = markdown.trim().split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="ml-4 md:ml-6 list-disc space-y-1.5 md:space-y-2 text-sm md:text-base text-gray-200">
        {listBuffer.map((item, idx) => (
          <li key={idx}>{parseInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm md:text-base text-gray-200 leading-relaxed">
          {parseInline(text)}
        </p>
      );
    }
    paragraphBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("#")) {
      flushList();
      flushParagraph();
      const levelMatch = trimmed.match(/^#+/);
      const level = levelMatch ? levelMatch[0].length : 1;
      const text = trimmed.replace(/^#+\s*/, "");
      const headingLevel = Math.min(level, 3);

      if (headingLevel === 1) {
        elements.push(
          <h1 key={`h-${elements.length}`} className="mt-6 md:mt-8 font-serif text-xl md:text-3xl text-white first:mt-0">
            {parseInline(text)}
          </h1>
        );
      } else if (headingLevel === 2) {
        elements.push(
          <h2 key={`h-${elements.length}`} className="mt-5 md:mt-8 font-serif text-lg md:text-2xl text-white/90 first:mt-0">
            {parseInline(text)}
          </h2>
        );
      } else {
        elements.push(
          <h3 key={`h-${elements.length}`} className="mt-4 md:mt-8 font-serif text-base md:text-xl text-white/80 first:mt-0">
            {parseInline(text)}
          </h3>
        );
      }
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imageMatch) {
      flushList();
      flushParagraph();
      const [, altText, url, title] = imageMatch;
      const meta = extractImageMeta(altText, title);
      elements.push(
        <figure key={`img-${elements.length}`} className="my-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={meta.alt}
            className={`h-auto w-full ${meta.sizeClass} rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}
            loading="lazy"
          />
          {meta.caption ? (
            <figcaption className="text-xs italic text-gray-400 md:text-sm">
              {meta.caption}
            </figcaption>
          ) : null}
        </figure>
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      paragraphBuffer = [];
      listBuffer.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushList();
      flushParagraph();
      const text = trimmed.replace(/^>\s*/, "");
      elements.push(
        <blockquote
          key={`blockquote-${elements.length}`}
          className="border-l-2 border-[#f7c948]/60 pl-3 md:pl-4 text-sm md:text-base text-gray-200 italic"
        >
          {parseInline(text)}
        </blockquote>
      );
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushList();
  flushParagraph();

  return (
    <div className="prose prose-invert prose-headings:font-serif prose-strong:text-[#f7c948]">
      {elements.map((element, idx) =>
        isValidElement(element) ? cloneElement(element, { key: element.key ?? idx }) : element
      )}
    </div>
  );
}
