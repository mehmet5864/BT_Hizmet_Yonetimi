import type { Guide, GuideBlock } from "@/lib/guides/types";
import { guideHeadingId } from "@/lib/guides/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function BlockView({ block }: { block: GuideBlock }) {
  if (block.t === "h1") {
    const id = guideHeadingId(block.text);
    return (
      <h2 id={id} className="scroll-mt-24 border-b pb-2 text-xl font-semibold tracking-tight">
        {block.text}
      </h2>
    );
  }
  if (block.t === "h2") {
    return <h3 className="mt-2 text-base font-semibold">{block.text}</h3>;
  }
  if (block.t === "p") {
    return <p className="text-muted-foreground text-sm leading-relaxed">{block.text}</p>;
  }
  if (block.t === "ul") {
    return (
      <ul className="text-muted-foreground ms-5 list-disc space-y-1.5 text-sm leading-relaxed">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.t === "ol") {
    return (
      <ol className="text-muted-foreground ms-5 list-decimal space-y-1.5 text-sm leading-relaxed">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }
  if (block.t === "table") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {block.headers.map((header) => (
              <TableHead key={header} className="whitespace-normal">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {block.rows.map((row, index) => (
            <TableRow key={`${row[0] ?? "row"}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${cellIndex}-${cell.slice(0, 24)}`} className="align-top whitespace-normal">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  return (
    <Alert>
      <AlertTitle>{block.title ?? "Not"}</AlertTitle>
      <AlertDescription>{block.text}</AlertDescription>
    </Alert>
  );
}

export function GuideArticle({
  guide,
  tocLabel,
  className,
}: {
  guide: Guide;
  tocLabel: string;
  className?: string;
}) {
  const headings = guide.blocks.filter((block) => block.t === "h1");
  return (
    <div className={cn("grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]", className)}>
      <nav className="lg:sticky lg:top-20 h-fit space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{tocLabel}</p>
        <ol className="space-y-1.5 text-sm">
          {headings.map((heading, index) => (
            <li key={heading.text}>
              <a className="text-muted-foreground hover:text-foreground leading-snug" href={`#${guideHeadingId(heading.text)}`}>
                {index + 1}. {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="space-y-5">
        {guide.intro ? <p className="text-sm leading-relaxed">{guide.intro}</p> : null}
        {guide.blocks.map((block, index) => (
          <BlockView key={`${block.t}-${index}`} block={block} />
        ))}
      </article>
    </div>
  );
}
