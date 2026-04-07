"use client";

import Editor, { type Monaco } from "@monaco-editor/react";

const JINJA_PROMPT_LANG = "jinja-prompt";

const registerJinjaPromptLanguage = (monaco: Monaco): void => {
  if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === JINJA_PROMPT_LANG)) {
    return;
  }

  monaco.languages.register({ id: JINJA_PROMPT_LANG });
  monaco.languages.setMonarchTokensProvider(JINJA_PROMPT_LANG, {
    defaultToken: "text",
    tokenizer: {
      root: [
        [/\{\{/, { token: "jinja.brace", next: "@jinjaBody" }],
        [/[^\\{]+/, "text"],
        [/[{}]/, "text"]
      ],
      jinjaBody: [
        [/\}\}/, { token: "jinja.brace", next: "@pop" }],
        [/[^}]+/, "jinja.var"]
      ]
    }
  });

  monaco.editor.defineTheme("jinja-prompt-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "jinja.brace", foreground: "56b6c2", fontStyle: "bold" },
      { token: "jinja.var", foreground: "c678dd" },
      { token: "text", foreground: "abb2bf" }
    ],
    colors: {}
  });
};

interface PromptTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const PromptTemplateEditor = ({ value, onChange }: PromptTemplateEditorProps): React.ReactElement => (
  <div className="overflow-hidden rounded-xl border border-zinc-800">
    <Editor
      beforeMount={registerJinjaPromptLanguage}
      defaultLanguage={JINJA_PROMPT_LANG}
      height="520px"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: "on",
        scrollBeyondLastLine: false
      }}
      theme="jinja-prompt-dark"
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
    />
  </div>
);
