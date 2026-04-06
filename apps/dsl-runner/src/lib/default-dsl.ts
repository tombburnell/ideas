export const defaultDsl = `id: example_workflow
name: Example Workflow

form:
  fields:
    - name: topic
      type: string
    - name: audience
      type: string

steps:
  - id: clarify
    type: llm
    prompt: clarify_goal
    input: context
    output:
      clarified_goal: string
    model: fast

  - id: classify
    type: llm
    prompt: classify_complexity
    output:
      classification: string
    model: fast

  - id: branch_step
    type: branch
    condition: context.classification === "complex"
    then: deep_analysis
    else: simple_analysis

  - id: deep_analysis
    type: llm
    prompt: deep_analysis_prompt
    output:
      result: string
    model: smart

  - id: simple_analysis
    type: llm
    prompt: simple_analysis_prompt
    output:
      result: string
    model: fast

  - id: generate_reports
    type: parallel
    steps:
      - report_1
      - report_2

  - id: report_1
    type: llm
    prompt: report_template_1
    tools: [web_search]
    output:
      report_1: string
    model: fast

  - id: report_2
    type: llm
    prompt: report_template_2
    tools: [web_search]
    output:
      report_2: string
    model: fast
`;
