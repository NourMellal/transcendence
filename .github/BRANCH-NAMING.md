# Branch Naming Guidelines

This document outlines our branch naming conventions to maintain a clean, organized repository that makes the development process more efficient.

## Branch Structure

All branches should follow this naming pattern:

```
<type>/<scope>[-<issue-number>]
```

## Branch Types

| Type       | Description                                | Examples                      |
| ---------- | ------------------------------------------ | ----------------------------- |
| `feat`     | New feature or functionality               | `feat/user-authentication`    |
| `fix`      | Bug fix                                    | `fix/websocket-reconnect-#42` |
| `docs`     | Documentation changes                      | `docs/api-documentation`      |
| `refactor` | Code refactoring without changing behavior | `refactor/game-engine`        |
| `test`     | Adding or updating tests                   | `test/auth-integration`       |
| `chore`    | Maintenance tasks, dependency updates      | `chore/update-dependencies`   |
| `ci`       | CI/CD related changes                      | `ci/fix-github-workflow`      |
| `infra`    | Infrastructure or deployment changes       | `infra/docker-optimization`   |

## Scope

The scope should be a brief descriptor of the area being modified:

- Component or feature name (`auth`, `game-physics`, `chat`)
- Area of the codebase (`frontend`, `backend`, `shared`)
- Specific module (`user-model`, `game-state`, `websocket`)

## Issue Number (Optional)

If the branch addresses a specific GitHub issue, add the issue number with a hyphen and hash symbol:

```
feat/user-profile-#123
```

## Main Branches

- `main`: Production code
- `dev`: Development branch

## Examples

- `feat/user-authentication`
- `fix/game-crash-on-disconnect`
- `docs/readme-update`
- `refactor/game-physics-engine`
- `test/auth-integration-tests`
- `chore/update-dependencies`
- `ci/github-actions-update`
- `infra/docker-compose-optimization-#87`

## Commit Messages

While not strictly part of branch naming, commit messages should also follow a similar pattern:

```
<type>(<scope>): <description>
```

Example: `feat(auth): add two-factor authentication`

This helps maintain a clean, descriptive commit history.
