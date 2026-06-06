# SDD Skill Registry — Closetly

**Generated**: 2026-06-06
**Scope**: User-level skills from `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`, `~/.copilot/skills/`

---

## Project Convention Files

| File | Path | Status |
|---|---|---|
| AGENTS.md | Root | ❌ Not found |
| CLAUDE.md | Root | ❌ Not found |
| .cursorrules | Root | ❌ Not found |
| GEMINI.md | Root | ❌ Not found |
| copilot-instructions.md | Root | ❌ Not found |

---

## SDD Skills

| Name | Path | Trigger |
|---|---|---|
| sdd-init | `~/.claude/skills/sdd-init/SKILL.md` | sdd init, iniciar sdd, openspec init |
| sdd-explore | `~/.claude/skills/sdd-explore/SKILL.md` | Explore SDD ideas before committing |
| sdd-propose | `~/.claude/skills/sdd-propose/SKILL.md` | Create SDD change proposal |
| sdd-spec | `~/.claude/skills/sdd-spec/SKILL.md` | Write SDD delta specs |
| sdd-design | `~/.claude/skills/sdd-design/SKILL.md` | Create SDD technical design |
| sdd-tasks | `~/.config/opencode/skills/sdd-tasks/SKILL.md` | Break SDD change into tasks |
| sdd-apply | `~/.config/opencode/skills/sdd-apply/SKILL.md` | Implement SDD tasks |
| sdd-verify | `~/.config/opencode/skills/sdd-verify/SKILL.md` | SDD verification phase |
| sdd-archive | `~/.claude/skills/sdd-archive/SKILL.md` | Archive completed SDD change |
| sdd-onboard | `~/.claude/skills/sdd-onboard/SKILL.md` | Walk through SDD workflow |

## Other Skills

| Name | Path | Trigger |
|---|---|---|
| branch-pr | `~/.claude/skills/branch-pr/SKILL.md` | PR creation with issue-first checks |
| chained-pr | `~/.claude/skills/chained-pr/SKILL.md` | Split oversized PRs |
| cognitive-doc-design | `~/.claude/skills/cognitive-doc-design/SKILL.md` | Design docs reducing cognitive load |
| comment-writer | `~/.claude/skills/comment-writer/SKILL.md` | PR feedback, reviews, comments |
| customize-opencode | `<built-in>` | OpenCode configuration editing |
| find-skills | `~/.agents/skills/find-skills/SKILL.md` | Skill discovery and installation |
| go-testing | `~/.claude/skills/go-testing/SKILL.md` | Go test patterns |
| issue-creation | `~/.config/opencode/skills/issue-creation/SKILL.md` | GitHub issue creation |
| judgment-day | `~/.config/opencode/skills/judgment-day/SKILL.md` | Dual review, adversarial review |
| skill-creator | `~/.config/opencode/skills/skill-creator/SKILL.md` | Create LLM-first skills |
| skill-improver | `~/.config/opencode/skills/skill-improver/SKILL.md` | Audit/upgrade skills |
| skill-registry | `~/.config/opencode/skills/skill-registry/SKILL.md` | Index available skills |
| work-unit-commits | `~/.config/opencode/skills/work-unit-commits/SKILL.md` | Plan commits as reviewable units |

## Agent Instructions

| File | Path |
|---|---|
| AGENTS.md (user) | `C:\Users\johan\.config\opencode\AGENTS.md` |

---

## Next Steps

To use SDD, invoke a phase via the orchestrator:
1. `sdd-explore` — Explore an idea before committing
2. `sdd-propose` — Propose a change with scope and approach
3. `sdd-spec` — Write delta specs
4. `sdd-design` — Technical design
5. `sdd-tasks` — Break into implementation tasks
6. `sdd-apply` — Implement
7. `sdd-verify` — Verify implementation
8. `sdd-archive` — Archive and sync
