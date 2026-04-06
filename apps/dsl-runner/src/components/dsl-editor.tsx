"use client";

import Editor from "@monaco-editor/react";
import type { ValidationResult } from "@/shared/dsl";

interface DslEditorProps {
  value: string;
  onChange: (value: string) => void;
  validation: ValidationResult | null;
}

export const DslEditor = ({ value, onChange, validation }: DslEditorProps): JSX.Element => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-zinc-100">DSL Editor</h2>
      <span className={`text-sm ${validation?.valid ? "text-emerald-400" : "text-amber-400"}`}>
        {validation ? (validation.valid ? "Valid" : `${validation.issues.length} issue(s)`) : "Unvalidated"}
      </span>
    </div>
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <Editor
        defaultLanguage="yaml"
        height="520px"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on"
        }}
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
      />
    </div>
    {validation && !validation.valid ? (
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        {validation.issues.map((issue) => (
          <p key={`${issue.path}-${issue.message}`}>{issue.path}: {issue.message}</p>
        ))}
      </div>
    ) : null}
  </section>
);
