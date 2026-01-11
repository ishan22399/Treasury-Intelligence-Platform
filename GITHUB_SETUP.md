# GitHub Setup Instructions

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon (top right) → **"New repository"**
3. Fill in details:
   - **Repository name**: `treasury-intelligence-platform` (or your choice)
   - **Description**: "Global Treasury Intelligence & Automation Platform with liquidity management, cash pooling, and data import"
   - **Visibility**: Choose Public or Private
   - **Do NOT** initialize with README, .gitignore, or license (we have these already)
4. Click **"Create repository"**

## Step 2: Configure Git Locally

Open PowerShell in the project folder and run these commands:

```powershell
# Navigate to project root
cd I:\TAPP

# Initialize git repository
git init

# Configure your git identity (use your GitHub email and name)
git config user.email "your-email@example.com"
git config user.name "Your Name"

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Treasury Intelligence Platform with Excel import and API integration"

# Add your GitHub repository as remote (replace USERNAME and REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Replace USERNAME and REPO_NAME

After creating your GitHub repo, you'll see commands like:

```bash
git remote add origin https://github.com/YourUsername/treasury-platform.git
```

Copy the URL from your GitHub page and use it.

## Complete Commands (Copy-Paste Ready)

```powershell
cd I:\TAPP
git init
git config user.email "your-email@example.com"
git config user.name "Your Name"
git add .
git commit -m "Initial commit: Treasury Intelligence Platform"
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## If You Already Have Git Initialized

```powershell
cd I:\TAPP
git add .
git commit -m "Treasury Intelligence Platform with Excel import"
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Verify Files Before Push

```powershell
# Check which files will be committed
git status

# View changes
git diff
```

## Important Notes

⚠️ **Before pushing:**
- The `.env` files are ignored (they contain your MongoDB password)
- Only `.env.example` files are included as templates
- After cloning, users need to create their own `.env` files

✅ **Files that will be pushed:**
- Frontend: React app, components, pages
- Backend: FastAPI server with MongoDB
- Documentation: README, QUICKSTART
- Configuration: package.json, requirements.txt

❌ **Files that won't be pushed (in .gitignore):**
- node_modules/
- __pycache__/
- .env (with your MongoDB credentials)
- build/
- Cache and log files

## After Pushing to GitHub

Your repository will be visible at:
```
https://github.com/USERNAME/REPO_NAME
```

Others can clone it with:
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# Setup backend
cd backend
cp .env.example .env
# Edit .env with MongoDB credentials
pip install -r requirements.txt
python server.py

# Setup frontend
cd ../frontend
cp .env.example .env
npm install
npm start
```

## Common Issues

**Issue: "fatal: remote origin already exists"**
```powershell
git remote remove origin
git remote add origin https://github.com/USERNAME/REPO_NAME.git
```

**Issue: Authentication failed**
- Use GitHub Personal Access Token instead of password
- Generate at: Settings → Developer settings → Personal access tokens → Tokens (classic)
- Use token as password when pushing

**Issue: Large files**
```powershell
# Remove node_modules if accidentally added
git rm -r --cached node_modules
git commit -m "Remove node_modules"
```

## GitHub Desktop Alternative

If you prefer GUI:
1. Download [GitHub Desktop](https://desktop.github.com/)
2. File → Add Local Repository → Select `I:\TAPP`
3. Publish repository to GitHub
4. Done! ✅
