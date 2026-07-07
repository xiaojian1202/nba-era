# NBA Era Commit Message Convention

This project uses the **Conventional Commits** specification. This helps maintain a clean, readable project history, makes it easy to understand the context of changes, and allows for automated release note generation.

## Commit Message Format

Commit messages must follow the structure:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **Type**: Must be one of the systemic categories listed below.
- **Scope**: (Optional) Represents the component or area being changed (e.g., `deps`, `pipeline`, `compare-charts`, `team-builder`).
- **Description**: A short, imperative summary of the change (e.g., "add hand-checking rule modifier", not "added hand-checking rule modifier").

---

## Commit Categories (Types)

We support the following commit message types:

| Type | Description | Example |
| :--- | :--- | :--- |
| **`feat`** | A new feature | `feat(team-builder): add decade roll mechanic` |
| **`fix`** | A bug fix | `fix(normalizer): correct pace adjustment calculation` |
| **`docs`** | Documentation only changes | `docs: update deployment guidelines in readme` |
| **`refactor`** | A code change that neither fixes a bug nor adds a feature | `refactor(api): clean up response parsing in feedback handler` |
| **`chore`** | Other changes that don't modify src or test files | `chore: update packages and configure prettier` |
| **`revert`** | Reverts a previous commit | `revert: revert "feat(team-builder): add roll animation"` |
| **`style`** | Code formatting/style changes (spacing, semi-colons, etc.; no logic change) | `style: fix alignment and indentation in index.css` |
| **`perf`** | A code change that improves performance | `perf(pipeline): optimize data parsing speed` |
| **`test`** | Adding missing tests or correcting existing tests | `test: add unit tests for relative true shooting math` |
| **`build`** | Changes that affect the build system or external dependencies | `build: upgrade vite to version 8` |
| **`ci`** | Changes to CI configuration files and scripts | `ci: add vercel build checking workflow` |

---

## Guidelines for Good Commit Messages

1. **Use the imperative mood**: "add feature", not "added feature" or "adds feature".
2. **First letter of description**: Do not capitalize the first letter of the description.
3. **No period at the end**: Keep the description line clean without ending punctuation.
4. **Detailed body**: If the change is complex, leave a blank line after the description and describe the *what* and *why* in the body.

### Examples

**Correct:**
```
feat(compare-charts): add attribute radar chart for player comparison
```
```
fix(pipeline): resolve division by zero when league averages are missing

The compiler now checks if league average attempts is greater than 0
before dividing.
```

**Incorrect (will be blocked by git hooks):**
```
fixed bugs on the charts
```
```
Feat: add team builder!
```
```
chore(deps): upgrade react.
```

---

## Automatic Enforcement

This convention is automatically enforced locally via **Husky** and **Commitlint**. If your commit message does not match this format, the commit will be rejected with an error indicating what failed.
