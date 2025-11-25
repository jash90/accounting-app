# 🚀 AI Agent Module - Quick Start

## ✅ Everything Ready!

The AI Agent module has been fully implemented. Here's how to run it:

## Step 1: Start the Application

```bash
# In the main project folder
pnpm run dev
```

This will start:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:4200
- **Swagger Docs**: http://localhost:3000/docs

⚠️ **If you see Vite errors related to `@/lib/utils`:**
```bash
# Clear cache and restart
pkill -9 -f node
rm -rf web/node_modules/.vite web/.vite
pnpm run dev
```

## Step 2: Test with Different Roles

### ADMIN (admin@system.com / Admin123!)

**How to access AI Agent:**
1. After logging in, click **"AI Agent"** in the sidebar
2. You'll see a dashboard with 3 tiles:
   - **AI Chat** - Start a conversation
   - **AI Configuration** - **Start here!** Configure provider, model, API key
   - **Knowledge Base Files** - Upload PDF/TXT/MD files

**Direct URLs:**
- Dashboard: `http://localhost:4200/admin/modules/ai-agent`
- Chat: `http://localhost:4200/admin/modules/ai-agent/chat`
- Configuration: `http://localhost:4200/admin/modules/ai-agent/configuration`
- Context: `http://localhost:4200/admin/modules/ai-agent/context`

### COMPANY_OWNER (owner.a@company.com / Owner123!)

**How to access AI Agent:**
1. After logging in, click **"AI Agent"** in the sidebar
2. You'll see a dashboard with 3 tiles:
   - **AI Chat** - Conversations with AI
   - **Token Usage** - Token usage statistics
   - **Knowledge Base Files** - Company RAG files

**Direct URLs:**
- Dashboard: `http://localhost:4200/company/modules/ai-agent`
- Chat: `http://localhost:4200/company/modules/ai-agent/chat`
- Token Usage: `http://localhost:4200/company/modules/ai-agent/token-usage`
- Context: `http://localhost:4200/company/modules/ai-agent/context`

### EMPLOYEE (employee1.a@company.com / Employee123!)

**How to access AI Agent:**
1. After logging in, click **"AI Agent"** in the sidebar
2. You'll see a dashboard with a **"Start Chatting"** button
3. Click to start a conversation with AI

**Direct URLs:**
- Dashboard: `http://localhost:4200/modules/ai-agent`
- Chat: `http://localhost:4200/modules/ai-agent/chat`

## Step 3: AI Configuration (IMPORTANT!)

**Before using chat as ADMIN:**
1. Log in as ADMIN
2. Go to: Admin → AI Agent → Configuration
3. Fill in the form:
   ```
   Provider: openai
   Model: gpt-4
   API Key: sk-your-openai-key
   System Prompt: You are a helpful AI assistant for the accounting system.
   Temperature: 0.7
   Max Tokens: 4000
   ```
4. Click "Save Configuration"

## Troubleshooting

### "System Admin company not found"
✅ **FIXED!** The seeder now automatically creates the System Admin Company.

### "AI configuration not found"
➡️ Log in as ADMIN and configure AI (step 3 above)

### Configuration saving doesn't work
✅ **FIXED!**
- Endpoint changed from `/configuration` to `/config`
- Empty API key handling logic fixed
- On update, empty API key = keep current key

### Vite import errors
➡️ Clear cache:
```bash
rm -rf web/node_modules/.vite web/.vite
pkill -9 -f node
pnpm run dev
```

### Backend doesn't start
➡️ Check PostgreSQL:
```bash
docker ps | grep postgres
```

## 📚 More Information

- **Setup Guide**: `AI_AGENT_MODULE_SETUP.md`
- **Testing Guide**: `TESTING_GUIDE_AI_AGENT.md`
- **Full Summary**: `AI_AGENT_FINAL_SUMMARY.md`

## ✨ Features to Test

- [ ] Chat with AI (all roles)
- [ ] Token statistics (Owner)
- [ ] Upload PDF/TXT/MD files (Admin and Owner)
- [ ] AI Configuration (Admin)
- [ ] Multi-tenancy (different companies don't see each other's data)

## 🎉 Status: READY!

Everything is configured and ready to use!

**Next**: Open http://localhost:4200/login and start testing! 🚀
