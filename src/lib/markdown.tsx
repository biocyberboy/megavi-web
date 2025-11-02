import { cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";

type InlineToken = ReactNode;

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

    const matches = [boldMatch, italicMatch, codeMatch].filter(Boolean) as RegExpMatchArray[];
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
