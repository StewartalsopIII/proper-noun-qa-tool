# Debugging Git Branch Sprawl: Merging Container Fixes & Clerk Auth

**Scenario:**
You now have two divergent feature branches:

| Branch | Purpose | Status |
|--------|---------|--------|
| `feature/containerize-qa-tool` | Docker & server-side fixes (remote on GitHub) | **Working** | 
| `feature/clerk-auth` | Added Clerk authentication locally | **Working** |
| `main` | Production baseline | **Stable** |

Goal → produce **one branch** that contains *both* the containerization work **and** Clerk auth, QA it, then merge to `main`.

---
## 1  Prepare
```bash
# Make sure your remotes are current
git fetch --all --prune
```

---
## 2  Start from the Container branch (keeps Docker fixes)
```bash
git checkout feature/containerize-qa-tool
# Create an integration branch on top of it
git checkout -b integrate/clerk-plus-container
```

---
## 3  Bring Clerk commits across
### Option A – cherry-pick specific commits (cleanest)
```bash
# In another terminal list Clerk commits
git log feature/clerk-auth --oneline
# Copy top N SHAs, then back on integrate branch:
git cherry-pick <sha1> <sha2> <sha3>
# For conflicts:
#   – edit files, `git add`, then
#   – `git cherry-pick --continue`
```

### Option B – merge the whole branch (quicker)
```bash
git merge feature/clerk-auth
# Resolve conflicts, commit
```

---
## 4  Compile & test locally
```bash
npm install          # container branch may have new deps
npm run dev          # verify Clerk sign-in + Docker fixes
npm run build        # ensure production build passes
```

Checklist after running:
* [ ] Sign-in modal appears when signed-out
* [ ] Transcript UI only visible when signed-in
* [ ] Dockerfile still builds with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` arg

---
## 5  Typical conflict hotspots & what to keep
| File | Keep |
|------|------|
| `Dockerfile` | Container branch base **plus** Clerk build-arg line<br>`ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `src/app/layout.tsx` | Clerk `<ClerkProvider>` header **plus** any CSS tweaks from container branch |
| `src/app/page.tsx` | `<SignedIn>/<SignedOut>` gating + latest UX fixes |
| `src/app/api/identify-nouns/route.ts` | Ensure `auth()` guard **and** diagnostics merged |

---
## 6  Push integration branch & open PR
```bash
git push -u origin integrate/clerk-plus-container
```
Open a PR **into** `main`, review CI/Vercel preview.

---
## 7  Clean-up (after PR merged)
```bash
git checkout main
git pull origin main
# delete local branches no longer needed
git branch -d feature/clerk-auth
git branch -d feature/containerize-qa-tool
git branch -d integrate/clerk-plus-container
```

---
## 8  Quick diff sanity-check
```bash
git diff --cached | diffstat   # after conflict resolution but before commit
```

---
### Why this flow?
1. **Safety:** main remains deployable until final merge.
2. **Single conflict session:** resolve overlaps only once.
3. **CI preview:** Vercel/Actions test the combined feature set automatically.

Once the PR is merged, you have a clean, linear history with all fixes intact. 