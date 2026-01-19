# Troubleshooting

> [← Back to Index](./README.md) | [← Previous: Advanced AI Agent](./09-advanced-ai-agent.md)

This section covers common errors encountered during module development and their solutions.

---

## Common Errors

### "Entity not found in connection"

**Error**:
```
EntityMetadataNotFoundError: No metadata for "Task" was found
```

**Solution**:
1. Ensure entity is exported from `libs/common/src/index.ts`
2. Ensure entity is added to TypeORM entities array in `app.module.ts`
3. Ensure entity is added to `typeorm.config.ts`

---

### "Cannot find module '@accounting/modules/tasks'"

**Error**:
```
Error: Cannot find module '@accounting/modules/tasks'
```

**Solution**:
1. Ensure `tsconfig.base.json` has path mapping:
```json
{
  "paths": {
    "@accounting/modules/tasks": ["libs/modules/tasks/src/index.ts"]
  }
}
```
2. Run `nx reset` to clear cache
3. Restart TypeScript server in your IDE

---

### Migration Generation Fails

**Error**:
```
Error: No changes in database schema were found
```

**Solution**:
1. Ensure entity is registered in `typeorm.config.ts`
2. Check database connection
3. Verify entity has `@Entity()` decorator
4. Run `npm run build` before generating migration

---

### "Access denied to module: tasks"

**Error**:
```
403 Forbidden - Access denied to module: tasks
```

**Solution**:
1. Verify module is registered in database (check seeder)
2. Admin must grant module to company
3. Company owner must grant permissions to employee
4. Check module slug matches decorator: `@RequireModule('tasks')`

---

### "Admins do not have access to business module data"

**Error**:
```
403 Forbidden - Admins do not have access to business module data
```

**Solution**:
This is expected behavior. ADMIN role cannot access business data directly. Use COMPANY_OWNER or EMPLOYEE account for testing business modules.

---

> **Next:** [Best Practices](./11-best-practices.md)
