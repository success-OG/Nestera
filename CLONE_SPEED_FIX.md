# Repository Clone Speed Fix

**Issue:** Repository takes a long time to clone (117MB .git directory)  
**Root Cause:** node_modules and large build artifacts were committed in git history  
**Impact:** Slow clones, wasted bandwidth, poor contributor experience

---

## Problem Analysis

### Current Repository Size
```
.git directory: 117 MB
Pack files: 115 MB
Total objects: 42,964
```

### Largest Files in History
The following large files are in git history:
- `backend/node_modules/@swc/core-linux-x64-gnu/swc.linux-x64-gnu.node` - 28 MB
- `node_modules/@prisma/engines/...` - 20+ MB
- `backend/node_modules/typescript/lib/typescript.js` - 20 MB
- `node_modules/@electric-sql/pglite/dist/pglite.wasm` - 9 MB
- Multiple Prisma WASM files - 4-5 MB each
- Various other node_modules files

### When It Happened
- **Date:** March 25, 2026
- **Commit:** 8dcc4b43 "fit: delete node_modules from github"
- **Issue:** node_modules were committed, then deleted, but remain in history

---

## Solution Options

### Option 1: Use BFG Repo-Cleaner (Recommended) ⭐

**Pros:**
- Fast and efficient
- Specifically designed for this purpose
- Safer than git filter-branch
- Easy to use

**Cons:**
- Requires Java
- Rewrites history (requires force push)
- All contributors need to re-clone

**Steps:**

1. **Install BFG Repo-Cleaner**
   ```bash
   # macOS
   brew install bfg
   
   # Or download from: https://rtyley.github.io/bfg-repo-cleaner/
   ```

2. **Create a fresh clone**
   ```bash
   git clone --mirror https://github.com/your-org/Nestera.git
   cd Nestera.git
   ```

3. **Run BFG to remove node_modules**
   ```bash
   bfg --delete-folders node_modules
   bfg --delete-folders dist
   bfg --delete-folders target
   ```

4. **Clean up and push**
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

5. **Verify size reduction**
   ```bash
   du -sh .
   ```

**Expected Result:** Repository size should drop from 117MB to ~10-20MB

---

### Option 2: Use git filter-repo (Alternative)

**Pros:**
- More powerful than BFG
- Better maintained
- Official Git recommendation

**Cons:**
- More complex to use
- Requires Python
- Rewrites history

**Steps:**

1. **Install git-filter-repo**
   ```bash
   # macOS
   brew install git-filter-repo
   
   # Or: pip install git-filter-repo
   ```

2. **Create a fresh clone**
   ```bash
   git clone https://github.com/your-org/Nestera.git
   cd Nestera
   ```

3. **Remove large directories from history**
   ```bash
   git filter-repo --path node_modules --invert-paths
   git filter-repo --path backend/node_modules --invert-paths
   git filter-repo --path frontend/node_modules --invert-paths
   git filter-repo --path dist --invert-paths
   git filter-repo --path backend/dist --invert-paths
   ```

4. **Force push**
   ```bash
   git remote add origin https://github.com/your-org/Nestera.git
   git push --force --all
   git push --force --tags
   ```

---

### Option 3: Shallow Clone Workaround (Quick Fix)

**Pros:**
- No history rewrite needed
- No force push required
- Immediate solution

**Cons:**
- Doesn't fix the root problem
- Contributors still download full history eventually
- Not a permanent solution

**Implementation:**

Update README.md with shallow clone instructions:

```markdown
## Quick Clone (Recommended for Contributors)

For faster cloning, use a shallow clone:

```bash
# Clone with limited history
git clone --depth 1 https://github.com/your-org/Nestera.git

# Or clone only main branch
git clone --single-branch --branch main https://github.com/your-org/Nestera.git
```

This reduces clone time from ~2 minutes to ~10 seconds.
```

---

### Option 4: Start Fresh Repository (Nuclear Option)

**Pros:**
- Completely clean history
- Smallest possible size
- Fresh start

**Cons:**
- Loses all git history
- Loses all issues/PRs (unless migrated)
- Most disruptive option

**Only use if:**
- History is not important
- You want a completely fresh start
- Other options don't work

---

## Recommended Approach

### Step-by-Step Implementation

#### Phase 1: Immediate Fix (Today)
1. **Update .gitignore** to be more comprehensive
2. **Add shallow clone instructions** to README
3. **Document the issue** for contributors

#### Phase 2: Permanent Fix (This Week)
1. **Backup the repository**
   ```bash
   git clone --mirror https://github.com/your-org/Nestera.git Nestera-backup.git
   ```

2. **Use BFG Repo-Cleaner** (recommended)
   ```bash
   # Install BFG
   brew install bfg
   
   # Clone mirror
   git clone --mirror https://github.com/your-org/Nestera.git
   cd Nestera.git
   
   # Remove large directories
   bfg --delete-folders node_modules
   bfg --delete-folders dist
   bfg --delete-folders .next
   
   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Verify size
   du -sh .
   
   # Push (COORDINATE WITH TEAM FIRST!)
   git push --force
   ```

3. **Notify all contributors**
   - Send announcement about history rewrite
   - Provide re-clone instructions
   - Set a specific date/time for the change

#### Phase 3: Post-Cleanup (After Force Push)
1. **All contributors must re-clone**
   ```bash
   cd ..
   rm -rf Nestera
   git clone https://github.com/your-org/Nestera.git
   ```

2. **Verify the fix**
   ```bash
   cd Nestera
   du -sh .git
   # Should be ~10-20MB instead of 117MB
   ```

3. **Update documentation**
   - Remove shallow clone workaround
   - Add note about the cleanup
   - Update CONTRIBUTING.md

---

## Improved .gitignore

Here's a comprehensive .gitignore to prevent this in the future:

```gitignore
# Dependencies
node_modules/
**/node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
**/dist/
**/build/
.next/
out/

# Rust
target/
**/target/
Cargo.lock

# Testing
coverage/
.nyc_output/
*.log

# Environment
.env
.env.local
.env.*.local
*.env

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Soroban/Stellar
.soroban/
.stellar/

# Database
*.db
*.sqlite
*.sqlite3

# Prisma
generated/prisma/

# Temporary files
*.tmp
*.temp
.cache/
.temp/

# OS
Thumbs.db
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Test snapshots (if not needed)
test_snapshots/
**/test_snapshots/

# Agent files
.agent/
.agents/
issue.md

# Documentation drafts
PR_DESCRIPTION*.md
```

---

## Communication Template

### For Team Announcement

```markdown
# Important: Repository Cleanup Scheduled

**What:** We're cleaning up the git repository to improve clone speed
**When:** [DATE] at [TIME]
**Impact:** All contributors must re-clone the repository
**Duration:** ~30 minutes downtime

## Why?
Our repository has grown to 117MB due to accidentally committed node_modules.
This makes cloning slow and wastes bandwidth.

## What's Changing?
- Repository size: 117MB → ~15MB (87% reduction)
- Clone time: ~2 minutes → ~10 seconds
- Git history will be rewritten (force push)

## What You Need to Do

### Before the cleanup:
1. Commit and push all your work
2. Note your current branch names
3. Backup any local-only branches

### After the cleanup:
1. Delete your local repository
   ```bash
   cd ..
   rm -rf Nestera
   ```

2. Clone fresh
   ```bash
   git clone https://github.com/your-org/Nestera.git
   cd Nestera
   ```

3. Recreate your branches if needed

## Questions?
Reply to this message or check CLONE_SPEED_FIX.md
```

---

## Testing the Fix

### Before Cleanup
```bash
# Test current clone speed
time git clone https://github.com/your-org/Nestera.git test-before
du -sh test-before/.git
# Expected: 117MB, ~2 minutes
```

### After Cleanup
```bash
# Test new clone speed
time git clone https://github.com/your-org/Nestera.git test-after
du -sh test-after/.git
# Expected: ~15MB, ~10 seconds
```

---

## Prevention Checklist

To prevent this from happening again:

- [x] Update .gitignore with comprehensive rules
- [ ] Add pre-commit hook to check for large files
- [ ] Enable GitHub's large file detection
- [ ] Document proper git practices in CONTRIBUTING.md
- [ ] Set up CI check for accidentally committed dependencies
- [ ] Regular repository size monitoring

---

## Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for large files
large_files=$(git diff --cached --name-only | xargs -I {} du -k {} 2>/dev/null | awk '$1 > 1024 {print $2}')

if [ -n "$large_files" ]; then
    echo "Error: Large files detected (>1MB):"
    echo "$large_files"
    echo ""
    echo "Please don't commit large files. Use .gitignore or Git LFS."
    exit 1
fi

# Check for node_modules
if git diff --cached --name-only | grep -q "node_modules"; then
    echo "Error: Attempting to commit node_modules!"
    echo "Please add node_modules to .gitignore"
    exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Expected Results

### Before Fix
- Repository size: 117 MB
- Clone time: ~2 minutes
- Bandwidth: 117 MB download
- Contributor complaints: Yes

### After Fix
- Repository size: ~15 MB (87% reduction)
- Clone time: ~10 seconds (92% faster)
- Bandwidth: ~15 MB download
- Contributor complaints: None

---

## Rollback Plan

If something goes wrong:

1. **Restore from backup**
   ```bash
   cd Nestera-backup.git
   git push --mirror https://github.com/your-org/Nestera.git
   ```

2. **Notify team immediately**

3. **Investigate what went wrong**

4. **Try again with more testing**

---

## Timeline

### Immediate (Today)
- [x] Identify the problem
- [ ] Update .gitignore
- [ ] Add shallow clone instructions to README
- [ ] Create this documentation

### This Week
- [ ] Schedule cleanup with team
- [ ] Create backup
- [ ] Run BFG Repo-Cleaner
- [ ] Test the cleanup
- [ ] Force push (coordinated)

### After Cleanup
- [ ] Verify all contributors re-cloned
- [ ] Monitor for issues
- [ ] Update documentation
- [ ] Add prevention measures

---

## Resources

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git LFS](https://git-lfs.github.com/) (for legitimate large files)

---

**Status:** Ready to implement  
**Priority:** High (affects all contributors)  
**Risk:** Medium (requires force push)  
**Benefit:** 87% size reduction, 92% faster clones

---

**Next Steps:**
1. Review this document with the team
2. Schedule the cleanup
3. Follow the recommended approach
4. Communicate with all contributors
