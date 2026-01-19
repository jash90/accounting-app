/**
 * AI Agent Module Error Codes
 *
 * Standardized error codes for the AI Agent module following
 * the pattern established in MODULE_DEVELOPMENT.md
 */
export enum AIAgentErrorCode {
  // Configuration Errors (1000-1099)
  CONFIGURATION_NOT_FOUND = 'AI_AGENT_1000',
  CONFIGURATION_INVALID = 'AI_AGENT_1001',
  CONFIGURATION_ALREADY_EXISTS = 'AI_AGENT_1002',

  // API Key Errors (1100-1199)
  API_KEY_MISSING = 'AI_AGENT_1100',
  API_KEY_INVALID = 'AI_AGENT_1101',
  API_KEY_EXPIRED = 'AI_AGENT_1102',

  // Provider Errors (1200-1299)
  PROVIDER_ERROR = 'AI_AGENT_1200',
  PROVIDER_UNAVAILABLE = 'AI_AGENT_1201',
  PROVIDER_RATE_LIMITED = 'AI_AGENT_1202',
  PROVIDER_MODEL_NOT_FOUND = 'AI_AGENT_1203',

  // Conversation Errors (1300-1399)
  CONVERSATION_NOT_FOUND = 'AI_AGENT_1300',
  CONVERSATION_ACCESS_DENIED = 'AI_AGENT_1301',
  MESSAGE_SEND_FAILED = 'AI_AGENT_1302',

  // Token Errors (1400-1499)
  TOKEN_LIMIT_EXCEEDED = 'AI_AGENT_1400',
  TOKEN_LIMIT_NOT_SET = 'AI_AGENT_1401',
  TOKEN_USAGE_ERROR = 'AI_AGENT_1402',

  // RAG/Context Errors (1500-1599)
  CONTEXT_UPLOAD_FAILED = 'AI_AGENT_1500',
  CONTEXT_NOT_FOUND = 'AI_AGENT_1501',
  CONTEXT_PROCESSING_ERROR = 'AI_AGENT_1502',
  CONTEXT_TOO_LARGE = 'AI_AGENT_1503',
}

/**
 * Human-readable error messages for each error code
 */
export const AIAgentErrorMessages: Record<AIAgentErrorCode, string> = {
  [AIAgentErrorCode.CONFIGURATION_NOT_FOUND]:
    'AI configuration not found for this company',
  [AIAgentErrorCode.CONFIGURATION_INVALID]:
    'AI configuration is invalid or incomplete',
  [AIAgentErrorCode.CONFIGURATION_ALREADY_EXISTS]:
    'AI configuration already exists for this company',

  [AIAgentErrorCode.API_KEY_MISSING]:
    'API key is required but not configured',
  [AIAgentErrorCode.API_KEY_INVALID]:
    'The provided API key is invalid or rejected by the provider',
  [AIAgentErrorCode.API_KEY_EXPIRED]:
    'The API key has expired and needs to be renewed',

  [AIAgentErrorCode.PROVIDER_ERROR]:
    'An error occurred while communicating with the AI provider',
  [AIAgentErrorCode.PROVIDER_UNAVAILABLE]:
    'The AI provider service is currently unavailable',
  [AIAgentErrorCode.PROVIDER_RATE_LIMITED]:
    'Rate limit exceeded for the AI provider',
  [AIAgentErrorCode.PROVIDER_MODEL_NOT_FOUND]:
    'The specified AI model was not found',

  [AIAgentErrorCode.CONVERSATION_NOT_FOUND]:
    'Conversation not found',
  [AIAgentErrorCode.CONVERSATION_ACCESS_DENIED]:
    'Access denied to this conversation',
  [AIAgentErrorCode.MESSAGE_SEND_FAILED]:
    'Failed to send message to AI',

  [AIAgentErrorCode.TOKEN_LIMIT_EXCEEDED]:
    'Token limit exceeded for this billing period',
  [AIAgentErrorCode.TOKEN_LIMIT_NOT_SET]:
    'Token limit has not been configured',
  [AIAgentErrorCode.TOKEN_USAGE_ERROR]:
    'Error tracking token usage',

  [AIAgentErrorCode.CONTEXT_UPLOAD_FAILED]:
    'Failed to upload context document',
  [AIAgentErrorCode.CONTEXT_NOT_FOUND]:
    'Context document not found',
  [AIAgentErrorCode.CONTEXT_PROCESSING_ERROR]:
    'Error processing context document',
  [AIAgentErrorCode.CONTEXT_TOO_LARGE]:
    'Context document exceeds maximum size limit',
};
