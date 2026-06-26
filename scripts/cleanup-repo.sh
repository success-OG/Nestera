#!/bin/bash

# Repository Cleanup Script
# This script cleans up the git repository by removing large files from history
# WARNING: This rewrites git history and requires force push!

set -e  # Exit on error

echo "=========================================="
echo "Nestera Repository Cleanup Script"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This script will:"
echo "   - Rewrite git history"
echo "   - Require force push"
echo "   - Require all contributors to re-clone"
echo ""
read -p "Have you coordinated with the team? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled. Please coordinate with team first."
    exit 1
fi

echo ""
echo "Checking prerequisites..."

# Check if BFG is installed
if ! command -v bfg &> /dev/null; then
    echo "❌ BFG Repo-Cleaner not found!"
    echo "Install with: brew install bfg"
    exit 1
fi

echo "✅ BFG Repo-Cleaner found"

# Get repository URL
echo ""
read -p "Enter repository URL (e.g., https://github.com/your-org/Nestera.git): " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ Repository URL is required"
    exit 1
fi

echo ""
echo "Step 1: Creating backup..."
if [ -d "Nestera-backup.git" ]; then
    echo "⚠️  Backup already exists. Skipping..."
else
    git clone --mirror "$repo_url" Nestera-backup.git
    echo "✅ Backup created: Nestera-backup.git"
fi

echo ""
echo "Step 2: Cloning mirror for cleanup..."
if [ -d "Nestera-cleanup.git" ]; then
    echo "⚠️  Cleanup directory exists. Removing..."
    rm -rf Nestera-cleanup.git
fi

git clone --mirror "$repo_url" Nestera-cleanup.git
cd Nestera-cleanup.git

echo ""
echo "Step 3: Running BFG Repo-Cleaner..."
echo "Removing node_modules directories..."
bfg --delete-folders node_modules

echo "Removing dist directories..."
bfg --delete-folders dist

echo "Removing .next directories..."
bfg --delete-folders .next

echo "Removing build directories..."
bfg --delete-folders build

echo ""
echo "Step 4: Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "Step 5: Checking results..."
original_size=$(du -sh ../Nestera-backup.git | cut -f1)
new_size=$(du -sh . | cut -f1)

echo "Original size: $original_size"
echo "New size: $new_size"

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Test the repository"
echo "3. Force push with: git push --force"
echo ""
echo "⚠️  After force push, all contributors must re-clone:"
echo "   cd .."
echo "   rm -rf Nestera"
echo "   git clone $repo_url"
echo ""
read -p "Do you want to force push now? (yes/no): " push_confirm

if [ "$push_confirm" = "yes" ]; then
    echo ""
    echo "Force pushing..."
    git push --force
    echo ""
    echo "✅ Repository cleaned and pushed!"
    echo ""
    echo "🎉 Success! Repository size reduced from $original_size to $new_size"
    echo ""
    echo "⚠️  IMPORTANT: Notify all contributors to re-clone immediately!"
else
    echo ""
    echo "Force push skipped. You can push later with:"
    echo "   cd Nestera-cleanup.git"
    echo "   git push --force"
fi

echo ""
echo "Cleanup directory: $(pwd)"
echo "Backup directory: $(cd .. && pwd)/Nestera-backup.git"
