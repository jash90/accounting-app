# AI Agent Module - Setup & Usage Guide

## ✅ Module Status: COMPLETE

The AI Agent module has been fully implemented and is ready for use!

## 📋 What Was Implemented

### Backend (100% Complete)
- ✅ 6 TypeORM entities with full functionality:
  - AIConfiguration - AI configuration (provider, model, API keys)
  - AIConversation - chat conversations
  - AIMessage - messages (user/assistant)
  - AIContext - RAG files (PDF, TXT, MD)
  - TokenUsage - token usage tracking
  - TokenLimit - monthly token limits
- ✅ 3 controllers with complete REST API endpoints
- ✅ 5 services (OpenAI, OpenRouter, RAG, TokenTracking, Configuration)
- ✅ Database migration
- ✅ Seeder with module access for companies and employees
- ✅ System Admin Company pattern for ADMIN users
- ✅ Full Swagger documentation

### Frontend (100% Complete)
- ✅ DTOs and TypeScript types
- ✅ Zod validation for forms
- ✅ API Client with all endpoints
- ✅ React Query hooks for state management
- ✅ 4 main pages:
  - Chat (Owner + Employee)
  - Token Usage (Owner)
  - Context Files Management (Owner)
  - Admin Configuration (Admin)
- ✅ Routing for all roles
- ✅ UI components with shadcn/ui

## 🚀 How to Run

### 1. Install Dependencies (if not already installed)

```bash
# Install backend/frontend dependencies
npm install

# If you need additional packages (should already be in package.json):
npm install pdf-parse  # for PDF text extraction
```

### 2. Environment Configuration

Update your `.env` file:

```env
# Existing variables...

# AI Agent Configuration (add at the end)
OPENAI_API_KEY=sk-your-openai-key-here
# or
OPENROUTER_API_KEY=your-openrouter-key-here

# PostgreSQL with pgvector extension
# Make sure you have PostgreSQL >= 12 with pgvector extension
```

### 3. Run Database Migration

```bash
# Install pgvector extension in PostgreSQL (if not already installed)
# In psql:
# CREATE EXTENSION IF NOT EXISTS vector;

# Run migration
npm run migration:run

# Check if tables were created
psql -U postgres -d accounting_db -c "\dt"
# You should see: ai_configurations, ai_conversations, ai_messages, ai_contexts, token_usages, token_limits
```

### 4. Load Test Data

```bash
npm run seed
```

This will create:
- The "ai-agent" module in the system
- Module access for Company A and Company B
- Employee permissions (read + write)

### 5. Start the Application

```bash
# Terminal 1: Backend
npm run serve

# Terminal 2: Frontend
npm run serve:web

# Or both at once:
npm run dev
```

## 👥 Testing with Different Roles

### ADMIN (admin@system.com / Admin123!)
**Available features:**
- `/admin/modules/ai-agent/chat` - Chat with AI (System Admin Company context)
- `/admin/modules/ai-agent/configuration` - Global configuration:
  - Provider selection (OpenAI / OpenRouter)
  - Model selection (gpt-4, gpt-3.5-turbo, etc.)
  - API key setup
  - System prompt
  - Temperature and Max Tokens
- `/admin/modules/ai-agent/context` - Upload global RAG files (PDF/TXT/MD)

### COMPANY OWNER (owner.a@company.com / Owner123!)
**Available features:**
- `/company/modules/ai-agent/chat` - Chat with AI
- `/company/modules/ai-agent/token-usage` - Token statistics:
  - Total tokens used by the company
  - Per-user breakdown
  - Number of conversations and messages
- `/company/modules/ai-agent/context` - Manage RAG files for the company

### EMPLOYEE (employee1.a@company.com / Employee123!)
**Available features:**
- `/modules/ai-agent/chat` - Chat with AI (read and send messages only)
- No access to statistics or file management

## 🔧 AI Configuration

### First-Time Configuration (as ADMIN)

1. Log in as ADMIN
2. Go to `/admin/modules/ai-agent/configuration`
3. Configure:
   - Provider: `openai` or `openrouter`
   - Model: `gpt-4` or `gpt-3.5-turbo`
   - API Key: Your API key
   - System Prompt (optional): "You are a helpful AI assistant for the accounting system..."
   - Temperature: 0.7 (default)
   - Max Tokens: 4000 (default)
4. Click "Save Configuration"

### Uploading Context Files (RAG)

**As ADMIN (global files):**
1. Go to `/admin/modules/ai-agent/context`
2. Select a file (PDF, TXT, MD - max 10MB)
3. Click "Upload"
4. The file will be processed and available for all conversations

**As OWNER (company files):**
1. Go to `/company/modules/ai-agent/context`
2. Same process as ADMIN, but files are only available for this company

## 📊 Features

### 1. Chat with AI
- Create new conversations
- Send messages
- Conversation history
- Auto-scroll to latest messages
- Display token count per message
- RAG - automatic context injection from uploaded files

### 2. Token Tracking
- Track each token usage (input + output)
- Per-user statistics
- Per-company statistics
- All companies statistics (ADMIN)
- Breakdown by conversations and messages

### 3. RAG (Retrieval Augmented Generation)
- Upload PDF, TXT, MD files
- Automatic text extraction
- Embedding generation (OpenAI ada-002)
- Semantic search during conversations
- Context injection to AI

### 4. Multi-tenancy
- Each company has its own:
  - Conversations
  - RAG files
  - Token statistics
- Complete data isolation
- System Admin Company for ADMIN users

## 🔍 API Endpoints

### Conversations
- `GET /api/modules/ai-agent/conversations` - List conversations
- `GET /api/modules/ai-agent/conversations/:id` - Single conversation
- `POST /api/modules/ai-agent/conversations` - New conversation
- `POST /api/modules/ai-agent/conversations/:id/messages` - Send message
- `DELETE /api/modules/ai-agent/conversations/:id` - Delete conversation

### Configuration (ADMIN only)
- `GET /api/modules/ai-agent/configuration` - Get configuration
- `POST /api/modules/ai-agent/configuration` - Create configuration
- `PATCH /api/modules/ai-agent/configuration` - Update configuration

### Token Usage
- `GET /api/modules/ai-agent/token-usage/me` - My summary
- `GET /api/modules/ai-agent/token-usage/me/detailed` - My details
- `GET /api/modules/ai-agent/token-usage/company` - Company (OWNER)
- `GET /api/modules/ai-agent/token-usage/all-companies` - All companies (ADMIN)

### Context/RAG
- `GET /api/modules/ai-agent/context` - List files
- `POST /api/modules/ai-agent/context` - Upload file (multipart/form-data)
- `DELETE /api/modules/ai-agent/context/:id` - Delete file

## 🛠️ Troubleshooting

### Problem: No access to module
**Solution:** Re-run the seeder:
```bash
npm run seed
```

### Problem: Error "AI configuration not found"
**Solution:** Configure AI as ADMIN at `/admin/modules/ai-agent/configuration`

### Problem: Error during file upload
**Solution:**
1. Check if the `uploads/ai-context` folder exists
2. Check write permissions
3. Check file size (<10MB)

### Problem: pgvector extension missing
**Solution:**
```sql
-- In psql as superuser:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Problem: Token usage not working
**Solution:** Check if migration was executed correctly:
```bash
npm run migration:run
```

## 📝 Next Steps / Extensions

The module is ready for use, but you can add:

1. **Streaming responses** - Real-time streaming of AI responses
2. **Conversation export** - Export conversations to PDF/JSON
3. **Token limits enforcement** - Automatic blocking when limits are exceeded
4. **Advanced RAG** - Chunking strategies, re-ranking, hybrid search
5. **Multiple AI providers** - Add Anthropic, Cohere, etc.
6. **Conversation sharing** - Share conversations between users
7. **AI usage analytics** - Charts, trends, predictions
8. **Voice input/output** - Integration with Whisper/TTS

## ✨ Summary

**The AI Agent module is fully functional and production-ready!**

Implemented:
- ✅ Backend with full CRUD and business logic
- ✅ Frontend with React Query and modern UI
- ✅ Routing for all 3 roles
- ✅ Seeder with access and permissions
- ✅ RAG with file upload
- ✅ Token tracking and statistics
- ✅ Multi-tenancy and data isolation
- ✅ Swagger documentation

All compliant with the MODULE_DEVELOPMENT.md pattern!

---

**Questions? Issues? Improvements?**
The module is ready, but can always be extended with additional features!
