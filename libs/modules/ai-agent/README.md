# AI Agent Module

A comprehensive AI-powered chat assistant module with RAG (Retrieval Augmented Generation) capabilities and token management for the Accounting multi-tenant SaaS platform.

## Features

### Core Capabilities

- **Multi-Provider AI Support**: Supports OpenAI and OpenRouter as AI providers
- **Conversational AI**: Create and manage chat conversations with AI assistants
- **RAG Integration**: Upload documents (PDF, TXT, MD) to provide context for AI responses
- **Token Management**: Track usage and enforce limits at company and user levels
- **Multi-Tenant Isolation**: Complete data isolation between companies
- **RBAC Integration**: Full permission control (read, write, delete)

## Architecture

```
libs/modules/ai-agent/
├── src/
│   └── lib/
│       ├── ai-agent.module.ts          # Main NestJS module
│       ├── controllers/
│       │   ├── ai-configuration.controller.ts  # Configuration management
│       │   ├── ai-conversation.controller.ts   # Conversations & RAG
│       │   └── token-usage.controller.ts       # Token tracking
│       ├── services/
│       │   ├── ai-configuration.service.ts     # Config CRUD & encryption
│       │   ├── ai-conversation.service.ts      # Chat logic
│       │   ├── ai-provider.interface.ts        # Provider abstraction
│       │   ├── openai-provider.service.ts      # OpenAI implementation
│       │   ├── openrouter-provider.service.ts  # OpenRouter implementation
│       │   ├── rag.service.ts                  # Document processing & search
│       │   ├── token-limit.service.ts          # Limit management
│       │   ├── token-usage.service.ts          # Usage tracking
│       │   └── system-company.service.ts       # Admin company handling
│       └── dto/
│           ├── create-ai-configuration.dto.ts
│           ├── update-ai-configuration.dto.ts
│           ├── create-conversation.dto.ts
│           ├── send-message.dto.ts
│           ├── set-token-limit.dto.ts
│           └── pagination.dto.ts
```

## Database Entities

The module uses the following entities (defined in `@accounting/common`):

| Entity | Description |
|--------|-------------|
| `AIConfiguration` | AI provider settings (model, system prompt, encrypted API key) |
| `AIConversation` | Chat conversations with metadata and token totals |
| `AIMessage` | Individual messages with role, content, and token counts |
| `AIContext` | Uploaded documents with extracted text and vector embeddings |
| `TokenUsage` | Daily token usage records per user |
| `TokenLimit` | Monthly token limits per company or user |

## API Endpoints

### Configuration (`/modules/ai-agent/config`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/config` | read | Get current AI configuration |
| `POST` | `/config` | ADMIN only | Create AI configuration |
| `PATCH` | `/config` | ADMIN only | Update AI configuration |

### Conversations (`/modules/ai-agent`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/conversations` | read | List user's conversations |
| `GET` | `/conversations/:id` | read | Get conversation with messages |
| `POST` | `/conversations` | write | Create new conversation |
| `POST` | `/conversations/:id/messages` | write | Send message & get AI response |
| `DELETE` | `/conversations/:id` | delete | Delete conversation |

### RAG Context (`/modules/ai-agent`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/context` | read | List uploaded documents |
| `POST` | `/context` | write | Upload document for RAG |
| `DELETE` | `/context/:id` | delete | Delete uploaded document |

### Token Management (`/modules/ai-agent/tokens`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/my-usage` | read | Get user's token usage statistics |
| `GET` | `/my-limit` | read | Get user's token limits |
| `POST` | `/company/:id/limit` | ADMIN only | Set company-wide token limit |
| `POST` | `/user/:id/limit` | COMPANY_OWNER | Set user-specific token limit |

## Configuration

### AI Provider Configuration

The module supports two AI providers:

**OpenAI:**
```typescript
{
  provider: 'OPENAI',
  model: 'gpt-4',                    // or 'gpt-3.5-turbo', etc.
  apiKey: 'sk-...',                  // Encrypted at rest
  systemPrompt: 'You are a helpful assistant...',
  temperature: 0.7,                  // 0-2, creativity level
  maxTokens: 4000                    // Max response tokens
}
```

**OpenRouter:**
```typescript
{
  provider: 'OPENROUTER',
  model: 'anthropic/claude-3-opus',  // Model path
  apiKey: 'sk-or-...',               // Encrypted at rest
  systemPrompt: 'You are a helpful assistant...',
  temperature: 0.7,
  maxTokens: 4000
}
```

### API Key Security

- API keys are encrypted using AES-256-GCM before storage
- Keys are never returned in API responses
- Only the presence of a key (`hasApiKey: true`) is indicated

## RAG (Retrieval Augmented Generation)

### How It Works

1. **Document Upload**: User uploads PDF, TXT, or MD files (max 10MB)
2. **Text Extraction**: Content is extracted from the document
3. **Embedding Generation**: OpenAI generates vector embeddings for the text
4. **Storage**: Text and embeddings stored in PostgreSQL with pgvector
5. **Semantic Search**: When user sends a message, similar context is retrieved
6. **Context Injection**: Relevant documents are added to the AI prompt

### Supported File Types

| Type | MIME Type | Description |
|------|-----------|-------------|
| PDF | `application/pdf` | PDF documents |
| TXT | `text/plain` | Plain text files |
| MD | `text/markdown` | Markdown files |

### Vector Search

Uses pgvector extension for PostgreSQL:
- Cosine similarity for semantic matching
- Retrieves top 3 most relevant documents
- Only active documents are searched

## Token Management

### Hierarchical Limits

```
Company Limit (set by ADMIN)
    └── User Limit (set by COMPANY_OWNER)
```

Both limits are checked before each message:
1. User-specific limit checked first (if exists)
2. Company-wide limit checked second (if exists)
3. Request rejected if either limit exceeded

### Usage Tracking

- Every AI response updates usage counters
- Tracks: `inputTokens`, `outputTokens`, `totalTokens`
- Aggregated daily and monthly statistics
- Accessible to users and administrators

### Limit Configuration

```typescript
{
  monthlyLimit: 100000,              // Total tokens per month
  warningThresholdPercentage: 80,    // Alert at 80% usage
  notifyOnWarning: true,             // Send warning notification
  notifyOnExceeded: true             // Send limit exceeded notification
}
```

## Multi-Tenant Architecture

### Data Isolation

- All data filtered by `companyId`
- Users can only access their company's conversations
- ADMIN users use "System Admin" virtual company
- Cross-company access is prevented at service level

### User Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Configure AI, set company limits, use System Admin company |
| `COMPANY_OWNER` | Chat, manage RAG, set user limits, view company usage |
| `EMPLOYEE` | Chat, view own usage (based on permissions) |

## Integration with RBAC

The module integrates with `@accounting/rbac`:

```typescript
@Controller('modules/ai-agent')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class AIConversationController {

  @Get('conversations')
  @RequirePermission('ai-agent', 'read')
  async findAllConversations() { ... }

  @Post('conversations')
  @RequirePermission('ai-agent', 'write')
  async createConversation() { ... }

  @Delete('conversations/:id')
  @RequirePermission('ai-agent', 'delete')
  async removeConversation() { ... }
}
```

## Error Handling

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| Token limit exceeded | 400 | Monthly limit reached |
| AI not configured | 400 | No AI configuration exists |
| Access denied | 403 | User lacks permission |
| Conversation not found | 404 | Invalid conversation ID |
| Invalid file type | 400 | Unsupported upload format |
| API key invalid | 400 | Provider rejected the key |

## Usage Example

### 1. Configure AI (ADMIN)

```bash
POST /api/modules/ai-agent/config
Authorization: Bearer <admin-token>

{
  "provider": "OPENAI",
  "model": "gpt-4",
  "apiKey": "sk-...",
  "systemPrompt": "You are a helpful accounting assistant.",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

### 2. Create Conversation

```bash
POST /api/modules/ai-agent/conversations
Authorization: Bearer <user-token>

{
  "title": "Tax Questions"
}
```

### 3. Send Message

```bash
POST /api/modules/ai-agent/conversations/<id>/messages
Authorization: Bearer <user-token>

{
  "content": "How do I calculate VAT?"
}
```

### 4. Upload Context Document

```bash
POST /api/modules/ai-agent/context
Authorization: Bearer <user-token>
Content-Type: multipart/form-data

file: <tax-guide.pdf>
```

## Building

```bash
nx build ai-agent
```

## Testing

```bash
nx test ai-agent
```

## Dependencies

- `@nestjs/common`, `@nestjs/typeorm` - NestJS framework
- `@accounting/common` - Shared entities
- `@accounting/rbac` - Permission guards
- `@accounting/auth` - JWT authentication
- `pdf-parse` - PDF text extraction
- `pgvector` - PostgreSQL vector extension
