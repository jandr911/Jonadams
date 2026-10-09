# CLAUDE.md

The contract is `AGENTS.md`, imported below so it is always in context. Do not rely on
following a link to it:

@AGENTS.md

Everything above applies to you in full, including **How to work**: branch from
`staging`, plan, question the plan in client terms (five questions maximum), build,
verify, review the diff, then merge and delete the branch.

**Every feature and every bug fix runs all of it, and you say which step you are on as
you go.** Answering a question, tracing code, or a docs tweak does not. The test is what
kind of work it is, not how big it looks. Only the user waives a step, and only by
saying so. On small work the steps come out short; they do not come out missing.

The rest of this file is Claude Code specifics only. It does not restate the rules.

---

## Comments

Repeated because it is the rule most often broken, and because it is non-negotiable.

- **NEVER** write narration comments describing what changed, what is new or old, or why
  you did it. No "now we do X", no "updated to…", no changelog notes in code.
- **NEVER** add a comment unless it is absolutely necessary. Default to zero comments.
- **NEVER** reference plan docs, task files, or tickets from a comment.

## Step 2: asking the five questions

Use `AskUserQuestion` for the client questions. It renders real options the user can
click, which is the difference between a decision and an interrogation. One call, up to
four questions; if you genuinely need a fifth, ask it in prose alongside.

## Step 4: looking at it

The chrome-devtools MCP tools are how you verify in the browser. Open one page at a
time; the browser restarts itself under memory pressure with two WebGL tabs. For city
work, read the frame rate through `window.__cityGL` with `evaluate_script` rather than
judging a screenshot, and drive the camera through `window.__cityControls` to reach the
street, aerial, and night views.

Restart `next dev` after editing `globals.css`; Turbopack serves the stale sheet
otherwise.

## Step 5: reviewing the diff

`/code-review` is the review skill. Run it before you report the work as done, and fix
what it finds or say why you did not.

## Skills

| Skill                 | When                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `3d-web-experience`   | Any change inside `src/components/city/`                             |
| `impeccable`          | UI work on the rooms, header, footer, loader. The incumbent dark, serif-and-gold system is real; refine it, do not replace it |
| `diagnosing-bugs`     | Something broken, throwing, or slow                                  |
| `/code-review`        | Step 5                                                               |
| `/graphify`           | "Where does X live" questions once the tree is large enough to need it |

`diagnosing-bugs`, `tdd`, and `resolving-merge-conflicts` load automatically when the
task matches; describe the task rather than hunting for a command.

## Memory

Project facts that are not in the code (client brief, hardware budget, deploy ids) live
in the Claude Code memory directory for this project and are loaded each session. When
one of those facts changes, update the memory file; do not restate it here.
