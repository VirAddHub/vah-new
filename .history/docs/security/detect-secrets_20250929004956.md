# docs/security/detect-secrets.md
When committing, if the pre-commit hook updates `.secrets.baseline`:
1) `git add .secrets.baseline`
2) `git commit -m "chore(security): refresh detect-secrets baseline"`
