# Git & Release Workflow

## Repository
Public GitHub repository: `Anon-B/MyStockAlert`

## Branches
```text
main
├── dev
└── release/v1.0.0
```

Operationally, branches are independent refs; the initial `dev`, `main` and `release/v1.0.0` all pointed to the same release commit.

## v1.0.0
- commit: `a090cc7`
- message: `release: v1.0.0`
- tag: `v1.0.0`

## Development Rule
Future feature work should branch from `dev`. `main` is the stable line. Release branches are snapshots for release preparation and should not be rewritten after tagging.

## Typical Flow
```bash
git checkout dev
git pull --ff-only origin dev
git checkout -b feature/<name>
# work + tests
git add .
git commit -m "feat: ..."
git push -u origin feature/<name>
```

After review/merge, update `dev`. For a release, create `release/vX.Y.Z`, verify build/tests, merge/promote to `main`, then tag.

## Verification
```bash
git status
git branch -a -vv
git tag --list
git ls-remote --heads origin
git ls-remote --tags origin
```

## Generated Files
Do not commit `.next`, `node_modules`, `.env`, pytest caches or TypeScript build info. `frontend/tsconfig.tsbuildinfo` is a generated local artifact and should be ignored.
