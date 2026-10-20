"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text?: string | null;
  className?: string;
}

export function MathText({ text, className = "" }: MathTextProps) {
  if (!text) return null;

  // Render LaTeX formulas where detected
  const renderedContent = useMemo(() => {
    // Check if the text contains LaTeX delimiters or standard math commands
    const hasLatex =
      text.includes("$") ||
      text.includes("\\(") ||
      text.includes("\\[") ||
      text.includes("\\vec") ||
      text.includes("\\frac") ||
      text.includes("\\sin") ||
      text.includes("\\cos") ||
      text.includes("\\theta") ||
      text.includes("\\times") ||
      text.includes("\\cdot");

    if (!hasLatex) {
      return <span>{text}</span>;
    }

    // Split text into tokens and render LaTeX segments
    // Regex matches $...$ or \(...\) or fallback to formula tokens
    const parts = text.split(/(\$[^$]+\$|\\\([^\\]+\\\))/g);

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
