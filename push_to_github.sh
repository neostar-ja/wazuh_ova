#!/bin/bash
# Script to easily commit and push changes to GitHub
# Repository: https://github.com/neostar-ja/wazuh_ova

# Change to the correct directory
cd /opt/code/wazuh_ova || { echo "❌ Cannot change to /opt/code/wazuh_ova"; exit 1; }

echo "🔍 Checking repository status..."

# Ensure remote is correct (optional, but good for safety)
REMOTE_URL=$(git config --get remote.origin.url)
if [[ "$REMOTE_URL" != *"neostar-ja/wazuh_ova"* ]]; then
    echo "⚠️ Remote origin is not set to neostar-ja/wazuh_ova. Setting it now..."
    git remote set-url origin https://github.com/neostar-ja/wazuh_ova.git
fi

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    echo "✅ No local changes found to commit."
    
    # Still attempt to push any committed but unpushed changes
    CURRENT_BRANCH=$(git branch --show-current)
    echo "🚀 Pushing local commits to GitHub (branch: main)..."
    git push origin "$CURRENT_BRANCH:main"
    exit 0
fi

# Get commit message from argument or use default timestamp
COMMIT_MSG="${1:-Auto-update Wazuh OVA configs & scripts $(date '+%Y-%m-%d %H:%M:%S')}"

echo "📦 Adding all changes to Git..."
git add .

echo "📝 Committing with message: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG"

# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 Pushing to GitHub (origin/main)..."
git push origin "$CURRENT_BRANCH:main"

if [ $? -eq 0 ]; then
    echo "=========================================================="
    echo "✅ Successfully pushed to https://github.com/neostar-ja/wazuh_ova"
    echo "=========================================================="
else
    echo "=========================================================="
    echo "❌ Failed to push. You might need to pull first or check your git credentials."
    echo "=========================================================="
    exit 1
fi
