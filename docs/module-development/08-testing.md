# Testing Guide

> [← Back to Index](./README.md) | [← Previous: Common Patterns](./07-common-patterns.md)

This section covers testing strategies for NestJS modules, including unit testing for services and end-to-end (E2E) testing for controllers.

---

## Unit Testing Service

Unit tests verify the behavior of individual service methods in isolation by mocking dependencies.

```typescript
describe('TaskService', () => {
  let service: TaskService;
  let repository: Repository<Task>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TaskService);
    repository = module.get(getRepositoryToken(Task));
  });

  it('should find all tasks', async () => {
    const tasks = [{ id: '1', title: 'Test' }];
    jest.spyOn(repository, 'find').mockResolvedValue(tasks as any);

    const result = await service.findAll(mockUser);
    expect(result).toEqual(tasks);
  });
});
```

### Key Testing Patterns

1. **Mock Repository Methods**: Use `jest.fn()` to create mock implementations of TypeORM repository methods
2. **Use `getRepositoryToken()`**: This NestJS utility provides the correct injection token for repository mocking
3. **Test in Isolation**: Each test should verify a single behavior without depending on external systems
4. **Create Mock Users**: Define a `mockUser` object that matches the expected user structure from JWT authentication

---

## E2E Testing Controller

End-to-end tests verify the full request/response cycle through the application, including authentication, guards, and database interactions.

```typescript
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    token = response.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/modules/tasks (GET)', () => {
    return request(app.getHttpServer())
      .get('/modules/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/modules/tasks (POST)', () => {
    return request(app.getHttpServer())
      .post('/modules/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Task',
        priority: 'high',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('Test Task');
      });
  });
});
```

### E2E Testing Best Practices

1. **Authenticate Before Tests**: Obtain a valid JWT token in `beforeAll()` for use in subsequent tests
2. **Use Real Application Instance**: Import the full `AppModule` to test the complete application stack
3. **Test Authorization**: Verify that protected endpoints require valid authentication
4. **Test Response Structure**: Validate both status codes and response body structure
5. **Clean Up Test Data**: Consider using database transactions or cleanup hooks to reset state between tests

### Running Tests

```bash
# Backend unit tests
npm test

# Frontend unit tests
npm run test:web

# E2E tests (Playwright)
npm run test:e2e
```

---

> **Next:** [Advanced Module Patterns (AI Agent)](./09-advanced-ai-agent.md)
