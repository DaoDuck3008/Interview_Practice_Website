const LANGUAGE_ALIASES: Record<string, string> = {
  csharp: "csharp",
  "c#": "csharp",
  cs: "csharp",
  "c++": "cpp",
  cpp: "cpp",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
};

export function getMarkdownCodeLanguage(className?: string) {
  const match = /(?:^|\s)language-([^\s]+)/.exec(className ?? "");
  if (!match) return null;

  const rawLanguage = match[1]
    .trim()
    .replace(/^[(\[{<]+|[)\]}>]+$/g, "")
    .toLowerCase();

  if (!rawLanguage) return null;

  return LANGUAGE_ALIASES[rawLanguage] ?? rawLanguage;
}

export function getMarkdownLanguageLabel(language: string) {
  const labels: Record<string, string> = {
    bash: "Bash",
    cpp: "C++",
    csharp: "C#",
    css: "CSS",
    html: "HTML",
    javascript: "JavaScript",
    json: "JSON",
    jsx: "JSX",
    python: "Python",
    sql: "SQL",
    tsx: "TSX",
    typescript: "TypeScript",
  };

  return labels[language] ?? language;
}
