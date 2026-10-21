"use client";

import React, { useMemo } from "react";
import katex from "katex";
import { TextCleanerService } from "@/lib/pdf/textCleaner";

interface MathTextProps {
  text?: string | null;
  className?: string;
}

export function MathText({ text, className = "" }: MathTextProps) {
  // Render LaTeX formulas and clean HTML entities where detected
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Decode any lingering HTML entities (e.g. &#xA0;, &#986;, &nbsp;)
    const sanitizedText = TextCleanerService.decodeHtmlEntities(text);

    // Check if the text contains LaTeX delimiters or standard math commands
    const hasLatex =
      sanitizedText.includes("$") ||
      sanitizedText.includes("\\(") ||
      sanitizedText.includes("\\[") ||
      sanitizedText.includes("\\vec") ||
      sanitizedText.includes("\\frac") ||
      sanitizedText.includes("\\sin") ||
      sanitizedText.includes("\\cos") ||
      sanitizedText.includes("\\theta") ||
      sanitizedText.includes("\\times") ||
      sanitizedText.includes("\\cdot");

    if (!hasLatex) {
      return <span>{sanitizedText}</span>;
    }

    // Split text into tokens and render LaTeX segments
    // Regex matches $...$ or \(...\) or fallback to formula tokens
    const parts = sanitizedText.split(/(\$[^$]+\$|\\\([^\\]+\\\))/g);

    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
            const formula = part.slice(1, -1);
            try {
              const html = katex.renderToString(formula, { throwOnError: false });
              return (
                <span
                  key={index}
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="inline-block mx-1"
                />
              );
            } catch {
              return <span key={index}>{part}</span>;
            }
          }

          if (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4) {
            const formula = part.slice(2, -2);
            try {
              const html = katex.renderToString(formula, { throwOnError: false });
              return (
                <span
                  key={index}
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="inline-block mx-1"
                />
              );
            } catch {
              return <span key={index}>{part}</span>;
            }
          }

          // If the part contains inline raw commands like \vec{A} without $
          if (part.includes("\\vec") || part.includes("\\frac") || part.includes("\\sin") || part.includes("\\cos")) {
            try {
              const html = katex.renderToString(part, { throwOnError: false });
              return (
                <span
                  key={index}
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="inline-block mx-1"
                />
              );
            } catch {
              return <span key={index}>{part}</span>;
            }
          }

          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  }, [text, className]);

  return <>{renderedContent}</>;
}
