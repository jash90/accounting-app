# Module Development Guide

Comprehensive guide for creating new business modules in the Accounting API system.

## Table of Contents

### Getting Started

1. [Introduction](./01-introduction.md) - Overview and what you'll learn
2. [Quick Start (TL;DR)](./02-quick-start.md) - Condensed checklist for experienced developers
3. [Prerequisites](./03-prerequisites.md) - Required knowledge and tools
4. [Architecture Overview](./04-architecture.md) - Multi-tenant, RBAC, and system patterns

### Implementation Guide

5. [Step-by-Step Tutorial](./05-step-by-step-tutorial.md) - Complete walkthrough (Phases 1-14)
6. [Code Examples](./06-code-examples.md) - Ready-to-use code snippets
7. [Common Patterns](./07-common-patterns.md) - Reusable implementation patterns

### Quality & Testing

8. [Testing Guide](./08-testing.md) - Unit tests, E2E tests, and test strategies
9. [Advanced AI Agent Patterns](./09-advanced-ai-agent.md) - Complex module patterns (AI Agent example)
10. [Troubleshooting](./10-troubleshooting.md) - Common issues and solutions
11. [Best Practices](./11-best-practices.md) - Recommended approaches

### Advanced Topics

12. [Advanced Topics](./12-advanced-topics.md) - Soft deletes, audit logging, caching
13. [Reference](./13-reference.md) - Decorator and pattern reference tables
14. [Final Checklist](./14-checklist.md) - Complete verification checklist

### Configuration & Frontend

15. [Module Configuration](./15-module-configuration.md) - module.json, icons, exceptions, barrel exports
16. [Frontend Patterns](./16-frontend-patterns.md) - Dashboard, navigation, localization
17. [Additional Topics](./17-additional-topics.md) - MSW mocks, accessibility, error handling

---

## Quick Links

### By Role

**First-time developer?**
Start with [Introduction](./01-introduction.md) and follow through sequentially.

**Experienced developer?**
Jump to [Quick Start](./02-quick-start.md) for the condensed checklist.

**Need specific code?**
Check [Code Examples](./06-code-examples.md) or [Common Patterns](./07-common-patterns.md).

**Building a complex module?**
See [Advanced AI Agent Patterns](./09-advanced-ai-agent.md).

### By Task

| Task | Document |
|------|----------|
| Create a new entity | [Step-by-Step Tutorial](./05-step-by-step-tutorial.md) (Phase 1-3) |
| Add RBAC to controller | [Step-by-Step Tutorial](./05-step-by-step-tutorial.md) (Phase 5) |
| Create frontend page | [Step-by-Step Tutorial](./05-step-by-step-tutorial.md) (Phase 13) |
| Configure module.json | [Module Configuration](./15-module-configuration.md) |
| Add module icon | [Module Configuration](./15-module-configuration.md) |
| Handle encryption | [Module Configuration](./15-module-configuration.md) |
| Create MSW mocks | [Additional Topics](./17-additional-topics.md) |
| Add Polish localization | [Frontend Patterns](./16-frontend-patterns.md) |
| Implement permissions UI | [Additional Topics](./17-additional-topics.md) |

---

## Module Types

### Simple Module (Tasks example)
- 1 entity, 1 controller, 1 service
- Basic CRUD operations
- Standard RBAC integration

**Follow:** [Quick Start](./02-quick-start.md) → [Step-by-Step Tutorial](./05-step-by-step-tutorial.md)

### Complex Module (AI Agent example)
- 6+ entities
- Multiple controllers with role separation
- External API integration
- Encryption for sensitive data
- Vector search / RAG capabilities

**Follow:** [Quick Start](./02-quick-start.md) → [Advanced AI Agent Patterns](./09-advanced-ai-agent.md)

---

## Related Documentation

- **ARCHITECTURE.md** - System architecture and design
- **API_ENDPOINTS.md** - Complete API endpoint reference
- **IMPLEMENTATION_PATTERNS.md** - Additional code patterns
- **FRONTEND_GUIDE.md** - Frontend development guide
- **DESIGN_SYSTEM.md** - UI/UX guidelines

---

## Support

- **Examples**: Reference `simple-text` module in `libs/modules/simple-text/`
- **Issues**: Create issues in project repository
- **Questions**: Contact development team

**Happy Coding!**
