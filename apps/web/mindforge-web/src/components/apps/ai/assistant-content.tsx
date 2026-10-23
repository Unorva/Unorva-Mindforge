import { Children, isValidElement, memo, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from '@/components/ui/code-block';
import { useHighlightedCode } from '@/hooks/use-highlighted-code';

function HighlightedCode({ value, language }: { value: string; language: string }) {
  const lines = useHighlightedCode(value, language);

  return (
    <CodeBlock className="my-4 bg-background">
      <CodeBlockHeader>
        <CodeBlockTitle>{language || '纯文本'}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={value} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers className="max-h-[36rem]">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}

/** CommonMark treats an unfinished fenced block as code while a reply is streaming. */
function MarkdownCodeBlock({ children }: { children?: ReactNode }) {
  const code = Children.toArray(children).find((child) =>
    isValidElement<{ children?: ReactNode; className?: string }>(child),
  );
  if (!isValidElement<{ children?: ReactNode; className?: string }>(code)) return null;
  const language = /(?:^|\s)language-([^\s]+)/.exec(code.props.className ?? '')?.[1] ?? '';
  const value = String(code.props.children ?? '').replace(/\n$/, '');

  return <HighlightedCode value={value} language={language} />;
}

export const AssistantContent = memo(function AssistantContent({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  return (
    <div
      data-slot="assistant-content"
      aria-busy={streaming || undefined}
      className="min-w-0 text-sm leading-7 break-words [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_hr]:my-5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-3 [&_p>code]:rounded [&_p>code]:bg-muted [&_p>code]:px-1 [&_p>code]:py-0.5 [&_p>code]:font-mono [&_li>code]:rounded [&_li>code]:bg-muted [&_li>code]:px-1 [&_li>code]:font-mono"
    >
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          pre: MarkdownCodeBlock,
          a: ({ href, children, title }) => (
            <a href={href} title={title} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ alt }) => <span className="text-muted-foreground">[图片：{alt || '图片'}]</span>,
          table: ({ children }) => (
            <div className="my-4 max-w-full overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-left text-sm [&_th]:border-b [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_tr:last-child_td]:border-b-0">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});
