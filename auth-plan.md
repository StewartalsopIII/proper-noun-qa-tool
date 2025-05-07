# Auth-plan: Migrating from Passcode to Clerk Authentication

> **Project:** Proper-Noun-QA-Tool (Next.js 14 – App Router, TypeScript, Tailwind)
> **Goal:** Replace the current client-side passcode gate with production-grade authentication powered by [Clerk](https://clerk.com/).

---

## 1. Why Clerk?

| Current State | Limitations | Clerk Benefits |
|---------------|-------------|----------------|
| Hard-coded passcode in `page.tsx` | • One secret shared by all users  
• No user identification  
• No social/OAuth login  
• No session management  | • Password-less, social & magic-link auth  
• Managed user/organization data  
• RBAC & multi-tenancy out-of-the-box  
• Drop-in React components & hooks  
• Server helpers (`auth()`, `currentUser()`) that fit **App Router** |

---

## 2. High-Level Migration Flow

1. Create **feature branch** (details in §8).  
2. Create/claim a Clerk application in the dashboard.  
3. Install Clerk SDK & type defs.  
4. Add environment variables.  
5. Wrap the app in `<ClerkProvider/>`.  
6. Add `middleware.ts` and configure route protection.  
7. Replace passcode UI with Clerk Sign-in/Sign-up UI.  
8. Protect API routes with `auth()` helper.  
9. Remove legacy passcode codepaths.  
10. QA locally & on a Vercel preview.  
11. Open PR → code-review → merge.

---

## 3. Prerequisites

| Item | Notes |
|------|-------|
| Clerk account | https://dashboard.clerk.com  |
| Publishable & secret keys | Dashboard → API Keys. Use **development instance** while local. |
| Vercel project access | (optional) for preview deployments. |
| Node ≥ 18, Next.js 14 (already satisfied) | |

---

## 4. Step-by-Step Implementation

### 4.1 Install SDK
```bash
pnpm add @clerk/nextjs   # or npm/yarn
```
*Refs:* [Clerk Next.js Quickstart – App Router](https://clerk.com/docs/quickstarts/nextjs)

### 4.2 Configure Environment Variables
Create `.env.local` (git-ignored):
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
Add a sanitized `.env.example` so collaborators know what to set.

### 4.3 Add `middleware.ts`
`/src/middleware.ts` (if using `/src`, else at root):
```ts
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();
export const config = {
  matcher: [
    // Run on all app + api routes, skip static assets
    "/((?!_next|[^?]*\\.(?:[\w]+)$).*)",
    "/(api)(.*)"
  ]
};
```
By default **all routes stay public**; we opt-in later.

### 4.4 Wrap Root Layout
Edit `src/app/layout.tsx`:
```tsx
import { ClerkProvider } from "@clerk/nextjs";
// ...existing imports...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      {/* existing <html> markup */}
    </ClerkProvider>
  );
}
```
ClerkProvider injects context & themes.

### 4.5 Replace Passcode Gate
1. Delete passcode state & UI in `page.tsx`.  
2. At top of main page, show:
```tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

<SignedOut>
  <div className="flex flex-col items-center gap-4">
    <p>Please sign in to continue</p>
    <SignInButton mode="modal" />
  </div>
</SignedOut>
<SignedIn>
  {/* existing app (TranscriptInput etc.) */}
  <div className="fixed top-4 right-4">
    <UserButton afterSignOutUrl="/" />
  </div>
</SignedIn>
```
No code changes are needed in child components.

### 4.6 Protect API Routes
`src/app/api/identify-nouns/route.ts` (top of `POST` handler):
```ts
import { auth } from "@clerk/nextjs/server";
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...existing logic...
}
```
If you have other route handlers, add similar guards or use `requireAuth()` from Clerk.

### 4.7 Optional: Server Components / Actions
Use `currentUser()` in server actions to obtain metadata without serializing via client.

### 4.8 Clean Up Legacy Code
* Remove `CORRECT_PASSCODE`, `handleVerifyPasscode`, and related JSX.  
* Delete `.env` entry `NEXT_PUBLIC_PASSCODE` if no longer needed.

### 4.9 Styling Clerk Modals
Clerk components accept an `appearance` prop or you can use CSS variables.  Docs: <https://clerk.com/docs/customization/appearance>.

### 4.10 Testing Matrix
| Environment | What to test |
|-------------|--------------|
| Local dev (`npm run dev`) | – Sign-up / Sign-in flows  
– API route returns 401 when signed-out  
– Existing transcript flow when signed-in |
| Vercel Preview | Same as local + social OAuth redirects |
| Production | Check custom domain & origins in Clerk Dashboard |

---

## 5. Deployment Notes
1. Add the two Clerk keys in *Vercel → Settings → Environment Variables* (scope: Production & Preview).  
2. Redeploy.  
3. If using a custom domain, add it in **Clerk Dashboard → Allowlist**.

---

## 6. Optional Enhancements
* **Role-based access control:** Use Clerk Organizations or user metadata to gate features (e.g., admin export).
* **Invite-only beta:** Toggle `users` → **Allowlist identifiers**.
* **Magic links / OAuth providers:** Enable in **Dashboard → Authentication → Social**.
* **Analytics:** Clerk emits events via Webhooks → can sync to segment.

---

## 7. Rollback Plan
Because changes are isolated in a feature branch, rollback is trivial:
1. Re-deploy commit SHA prior to merge.
2. Remove Clerk keys from env.
3. Revert passcode logic (kept in git history).

---

## 8. Git Branching Strategy

### Scenario
You are already on a long-running branch (`feature/transcript-qa`) and don't want to merge yet.

### Options
1. **Nested Branch (recommended)**  
   ```bash
   git checkout -b feature/clerk-auth
   ```
   *Base:* current feature branch. When ready, open PR **into** that branch. Merge later into `main` once both features are QA-ed.
2. **Parallel Branch from `main`**  
   ```bash
   git checkout main && git pull
   git checkout -b feature/clerk-auth
   ```
   Cherry-pick or re-implement only auth-related changes. Merge independently; later rebase the other feature.
3. **Git Worktree** – keep two worktrees checked-out simultaneously to avoid context switches:
   ```bash
   git worktree add ../proper-noun-auth feature/clerk-auth
   ```

### Tips
* Use clear naming: `feature/clerk-auth` or `chore/auth-integration`.
* Commit early; push often to remote for CI & backup.
* If you need some WIP commits but keep PR clean, use interactive rebase (`git rebase -i`) before opening PR.

---

## 9. Reference Links
* Quickstart (App Router): <https://clerk.com/docs/quickstarts/nextjs>
* SDK Server Helpers: <https://clerk.com/docs/references/nextjs/auth>
* Middleware Config: <https://clerk.com/docs/references/nextjs/clerk-middleware>
* Custom UI Components: <https://clerk.com/docs/components/overview>
* Example repo: <https://github.com/clerk/clerk-nextjs-app-quickstart>

---

### 📌 You now have a battle-tested blueprint to migrate from a single passcode to full Clerk authentication while maintaining a clean Git history. 