# Best Practices

> [← Back to Index](./README.md) | [← Previous: Troubleshooting](./10-troubleshooting.md)

## Code Organization

**DO**:
- One class per file
- Clear file naming (kebab-case)
- Consistent directory structure
- Export through index.ts

**DON'T**:
- Multiple classes in one file
- Inconsistent naming
- Deep nesting (>3 levels)
- Direct imports (bypass index.ts)

## Security

**DO**:
- Always filter by `companyId`
- Verify ownership before modify/delete
- Use validation decorators
- Block ADMIN from business data
- Use parameterized queries (TypeORM does this)

**DON'T**:
- Trust user input without validation
- Skip ownership checks
- Use string concatenation in queries
- Allow cross-company access

## Sensitive Data Security (Advanced Modules)

For modules handling API keys, credentials, or other sensitive data:

**DO**:
- **Encrypt at rest**: Use AES-256-GCM with random salt and IV for API keys
- **Validate encryption key**: Check environment variable exists at startup (`OnModuleInit`)
- **Use `hasApiKey` pattern**: Return boolean instead of actual key in responses
- **Use `@Exclude()`**: Prevent sensitive fields from serialization
- **Separate encrypted storage**: Never log or expose encrypted values
- **Environment-based keys**: Store encryption keys only in environment variables

**DON'T**:
- Store API keys in plaintext
- Return encrypted data in API responses
- Log sensitive values (even encrypted ones)
- Use hardcoded encryption keys
- Expose key existence through error messages
- Store IV separately from encrypted data

```typescript
// GOOD: Response DTO hides sensitive data
export class ConfigurationResponseDto {
  @Expose() id: string;
  @Expose() provider: string;
  @Exclude() apiKey: string;        // Never exposed
  @Expose() hasApiKey: boolean;     // Safe boolean indicator
}

// BAD: Exposing sensitive data
export class BadConfigDto {
  apiKey: string;                   // Exposes encrypted value
  encryptedApiKey: string;          // Still reveals format
}
```

## Rate Limiting & Quotas

For modules with usage tracking and limits:

**DO**:
- Check limits **before** expensive operations
- Use atomic upsert for usage tracking (prevent race conditions)
- Implement warning thresholds (alert at 80%)
- Provide clear limit exceeded messages
- Track usage per company and optionally per user
- Use composite unique indexes for daily aggregation

**DON'T**:
- Check limits only after consuming resources
- Allow unlimited usage without quotas
- Expose internal limit details in errors
- Skip tracking for failed operations
- Use non-atomic increment operations

## Performance

**DO**:
- Add indexes on frequently queried columns
- Use pagination for large datasets
- Load relations selectively
- Use `@Index()` decorator

**DON'T**:
- Load all data without pagination
- Load unnecessary relations
- Create N+1 query problems
- Forget indexes on foreign keys

## Error Handling

**DO**:
- Use NestJS exceptions
- Provide clear error messages
- Log errors appropriately
- Return proper HTTP status codes

**DON'T**:
- Use generic `throw new Error()`
- Expose sensitive information in errors
- Swallow errors silently
- Return 200 OK on errors

---

> **Next:** [Advanced Topics](./12-advanced-topics.md)
