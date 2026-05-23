import type { ReactNode } from "react";

type MarkdownTextProps = {
  text: string;
  emptyText?: string;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "unordered"; items: string[] };

export function MarkdownText({ text, emptyText = "暂无内容。" }: MarkdownTextProps) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return <p className="text-sm leading-6 text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-3 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\*{2,}$/.test(line));

  let paragraph: string[] = [];
  let ordered: string[] = [];
  let unordered: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph });
      paragraph = [];
    }
  };
  const flushOrdered = () => {
    if (ordered.length) {
      blocks.push({ type: "ordered", items: ordered });
      ordered = [];
    }
  };
  const flushUnordered = () => {
    if (unordered.length) {
      blocks.push({ type: "unordered", items: unordered });
      unordered = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushOrdered();
    flushUnordered();
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,4}\s+(.+)$/) ?? line.match(/^\*\*(.+?)\*\*[:：]?$/);
    if (heading) {
      flushAll();
      blocks.push({ type: "heading", text: cleanupInlineMarkdown(heading[1]) });
      continue;
    }

    const orderedItem = line.match(/^\d+[.、]\s*(.+)$/);
    if (orderedItem) {
      flushParagraph();
      flushUnordered();
      ordered.push(orderedItem[1]);
      continue;
    }

    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    if (unorderedItem) {
      flushParagraph();
      flushOrdered();
      unordered.push(unorderedItem[1]);
      continue;
    }

    flushOrdered();
    flushUnordered();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

function renderBlock(block: Block, index: number) {
  if (block.type === "heading") {
    return (
      <h4 key={index} className="text-sm font-semibold text-foreground">
        {renderInline(block.text)}
      </h4>
    );
  }

  if (block.type === "ordered") {
    return (
      <ol key={index} className="list-decimal space-y-1 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`} className="pl-1">
            {renderInline(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "unordered") {
    return (
      <ul key={index} className="list-disc space-y-1 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`} className="pl-1">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index} className="space-y-1">
      {block.lines.map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`} className="block">
          {renderInline(line)}
        </span>
      ))}
    </p>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(cleanupInlineMarkdown(text.slice(lastIndex, match.index)));
    }
    nodes.push(
      <strong key={`${match.index}-${match[1]}`} className="font-semibold text-foreground">
        {cleanupInlineMarkdown(match[1])}
      </strong>,
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(cleanupInlineMarkdown(text.slice(lastIndex)));
  }

  return nodes;
}

function cleanupInlineMarkdown(text: string) {
  return text.replace(/\*{2,}/g, "").trim();
}
