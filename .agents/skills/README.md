# Agent Skills Directory

This directory stores project-scoped Agent Skills that customize the behavior of Advanced Agentic Coding assistants (like Antigravity) in this workspace.

## Folder Structure

Place each custom skill in its own subdirectory:
`.agents/skills/<skill_name>/SKILL.md`

### Guidelines
* Each skill directory must contain a `SKILL.md` file.
* `SKILL.md` must start with a YAML frontmatter block defining the skill's `name` and `description`.
* Standard helper scripts can be placed under `.agents/skills/<skill_name>/scripts/`.
