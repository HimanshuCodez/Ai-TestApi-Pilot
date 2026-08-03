import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CodeBlock({ code, language = "json", className }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a12]", className)}>
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:text-foreground"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, background: "transparent", padding: "1rem", fontSize: "12.5px", lineHeight: 1.6 }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
      >
        {code || " "}
      </SyntaxHighlighter>
    </div>
  );
}
