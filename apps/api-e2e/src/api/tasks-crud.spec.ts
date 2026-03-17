import { authHeader, getApiAgent, loginAs } from '../support/api-test-helper';

describe('Tasks CRUD E2E', () => {
  const agent = getApiAgent();
  let ownerToken: string;
  let createdTaskId: string;

  beforeAll(async () => {
    ownerToken = await loginAs('owner');
  });

  afterAll(async () => {
    if (createdTaskId) {
      try {
        await agent.delete(`/modules/tasks/${createdTaskId}`).set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
  });

  describe('POST /modules/tasks', () => {
    it('should create a task', async () => {
      const res = await agent
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({
          title: `E2E Task ${Date.now()}`,
          description: 'Created by E2E test',
          status: 'todo',
          priority: 'medium',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdTaskId = res.body.id;
    });

    it('should return validation error without title', async () => {
      await agent
        .post('/modules/tasks')
        .set(...authHeader(ownerToken))
        .send({ description: 'No title' })
        .expect(400);
    });
  });

  describe('GET /modules/tasks', () => {
    it('should list tasks with pagination', async () => {
      const res = await agent
        .get('/modules/tasks')
        .set(...authHeader(ownerToken))
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('PATCH /modules/tasks/:id', () => {
    it('should update task status', async () => {
      const res = await agent
        .patch(`/modules/tasks/${createdTaskId}`)
        .set(...authHeader(ownerToken))
        .send({ status: 'in_progress' })
        .expect(200);

      expect(res.body.status).toBe('in_progress');
    });
  });

  describe('DELETE /modules/tasks/:id', () => {
    it('should soft-delete task', async () => {
      await agent
        .delete(`/modules/tasks/${createdTaskId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      createdTaskId = undefined;
    });
  });
});
