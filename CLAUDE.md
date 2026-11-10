# LinkCard

Vocabulary: [GLOSSARY.md](GLOSSARY.md). Read it before naming anything in code or docs.
Architecture decisions: [docs/adr/](docs/adr/). Read them before changing how the extension, Collector, or page fit together.
Review standards: [CODING_STANDARDS.md](CODING_STANDARDS.md). The reviewer applies these to every diff.

## Subagent models

The main session plans, reviews, and talks with the user. Implementation is dispatched to subagents; the main session writes code directly only for trivial edits, such as a one-line fix during review. The main session runs clean fast-forward merges itself; dispatch a merger subagent only on conflicts.

Every subagent dispatch sets the model explicitly:

- **Sonnet** for major implementation: a new module, a multi-file feature, a cross-cutting change.
- **Haiku** for minor implementation: a single-file fix, a theme or `outlets.yaml` edit, docs, small refactors.
- **Opus** only after the user approves it. Ask first, stating why Sonnet is insufficient.

## Tests

Tests are scarce by design. A test earns its place only when both are true:

1. A regression would be **silent**: nobody would notice it by looking at the Card or using the page.
2. It guards a **contract** the project depends on, such as headline, Outlet, and date extraction from saved Snapshots, or acceptance of every Snapshot version ever issued.

Rendering, layout, styling, UI behavior, and Themes are verified by eye. Before writing any new test, propose it to the user with the silent-regression and contract reasoning, and wait for approval.

Run tests (`node --test`) only when a change touches parsing or Snapshot handling, once, before reporting the work done. Changes to UI, styling, Themes, docs, or the extension shell ship without a test run.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five roles (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix), recorded as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
