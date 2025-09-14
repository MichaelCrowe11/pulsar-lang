#!/bin/bash

# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
# First, create a new repository on GitHub named "pulsar-lang"

# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/pulsar-lang.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_GITHUB_USERNAME/pulsar-lang.git

# Push to GitHub
git branch -M main
git push -u origin main

echo "Successfully pushed Pulsar language to GitHub!"
echo "Repository URL: https://github.com/YOUR_GITHUB_USERNAME/pulsar-lang"