import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../../api/src/app/app.module';

/**
 * E2E Tests for Client Field Definitions Management
 *
 * Test Scenarios:
 * 1. Create field definitions (all types)
 * 2. List and get field definitions
 * 3. Update field definitions
 * 4. Reorder field definitions
 * 5. Delete field definitions
 * 6. Multi-tenant isolation
 */
describe('Field Definitions E2E Tests', () => {
  let app: INestApplication;
  let ownerToken: string;
  let employeeToken: string;
  let ownerBToken: string;
  let textFieldId: string;
  let numberFieldId: string;
  let dateFieldId: string;
  let booleanFieldId: string;
  let enumFieldId: string;
  let testClientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    // Cleanup created field definitions
    if (ownerToken) {
      try {
        const fieldsToDelete = [textFieldId, numberFieldId, dateFieldId, booleanFieldId, enumFieldId];
        for (const fieldId of fieldsToDelete) {
          if (fieldId) {
            await request(app.getHttpServer())
              .delete(`/modules/clients/field-definitions/${fieldId}`)
              .set('Authorization', `Bearer ${ownerToken}`);
          }
        }
        if (testClientId) {
          await request(app.getHttpServer())
            .delete(`/modules/clients/${testClientId}`)
            .set('Authorization', `Bearer ${ownerToken}`);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  // ============================================
  // Authentication Setup
  // ============================================

  describe('Authentication Setup', () => {
    it('should login as company A owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'owner.a@company.com',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerToken = response.body.access_token;
    });

    it('should login as company A employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1.a@company.com',
          password: 'Employee123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      employeeToken = response.body.access_token;
    });

    it('should login as company B owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'owner.b@company.com',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerBToken = response.body.access_token;
    });
  });

  // ============================================
  // CREATE Field Definition Tests
  // ============================================

  describe('POST /modules/clients/field-definitions - Create Field Definitions', () => {
    it('should create a TEXT field definition', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_text_field',
          label: 'E2E Text Field',
          fieldType: 'TEXT',
          isRequired: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('e2e_text_field');
      expect(response.body.label).toBe('E2E Text Field');
      expect(response.body.fieldType).toBe('TEXT');
      expect(response.body.isRequired).toBe(false);
      expect(response.body.isActive).toBe(true);
      textFieldId = response.body.id;
    });

    it('should create a NUMBER field definition', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_number_field',
          label: 'E2E Number Field',
          fieldType: 'NUMBER',
          isRequired: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.fieldType).toBe('NUMBER');
      expect(response.body.isRequired).toBe(true);
      numberFieldId = response.body.id;
    });

    it('should create a DATE field definition', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_date_field',
          label: 'E2E Date Field',
          fieldType: 'DATE',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.fieldType).toBe('DATE');
      dateFieldId = response.body.id;
    });

    it('should create a BOOLEAN field definition', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_boolean_field',
          label: 'E2E Boolean Field',
          fieldType: 'BOOLEAN',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.fieldType).toBe('BOOLEAN');
      booleanFieldId = response.body.id;
    });

    it('should create an ENUM field definition with values', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_enum_field',
          label: 'E2E Enum Field',
          fieldType: 'ENUM',
          enumValues: ['Option A', 'Option B', 'Option C'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.fieldType).toBe('ENUM');
      expect(response.body.enumValues).toEqual(['Option A', 'Option B', 'Option C']);
      enumFieldId = response.body.id;
    });

    it('should fail to create field definition without name', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          label: 'No Name Field',
          fieldType: 'TEXT',
        })
        .expect(400);
    });

    it('should fail to create field definition without label', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'no_label_field',
          fieldType: 'TEXT',
        })
        .expect(400);
    });

    it('should fail to create field definition without fieldType', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'no_type_field',
          label: 'No Type Field',
        })
        .expect(400);
    });

    it('should fail to create field definition with invalid fieldType', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'invalid_type_field',
          label: 'Invalid Type Field',
          fieldType: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should fail to create ENUM field without enumValues', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'enum_no_values',
          label: 'Enum Without Values',
          fieldType: 'ENUM',
        })
        .expect(400);
    });

    it('should fail to create field definition without authentication', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .send({
          name: 'unauthorized_field',
          label: 'Unauthorized Field',
          fieldType: 'TEXT',
        })
        .expect(401);
    });

    it('should fail to create duplicate field name', async () => {
      await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'e2e_text_field', // Same as existing
          label: 'Duplicate Name Field',
          fieldType: 'TEXT',
        })
        .expect(400);
    });
  });

  // ============================================
  // READ Field Definition Tests
  // ============================================

  describe('GET /modules/clients/field-definitions - List Field Definitions', () => {
    it('should list all field definitions with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(5); // Our 5 created fields
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .query({ page: 1, limit: 3 })
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.limit).toBe(3);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    it('should return fields ordered by displayOrder', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const displayOrders = response.body.data.map((f: { displayOrder: number }) => f.displayOrder);
      const sortedOrders = [...displayOrders].sort((a, b) => a - b);
      expect(displayOrders).toEqual(sortedOrders);
    });
  });

  describe('GET /modules/clients/field-definitions/:id - Get Single Field', () => {
    it('should get field definition by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.id).toBe(textFieldId);
      expect(response.body.name).toBe('e2e_text_field');
    });

    it('should return 404 for non-existent field', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients/field-definitions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should fail with invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/modules/clients/field-definitions/invalid-uuid')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });

  // ============================================
  // Multi-Tenant Isolation Tests
  // ============================================

  describe('Multi-Tenant Isolation', () => {
    it('should not allow company B to access company A field definitions', async () => {
      await request(app.getHttpServer())
        .get(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });

    it('should not allow company B to list company A field definitions', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(200);

      const fieldIds = response.body.data.map((f: { id: string }) => f.id);
      expect(fieldIds).not.toContain(textFieldId);
      expect(fieldIds).not.toContain(numberFieldId);
    });

    it('should not allow company B to update company A field', async () => {
      await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .send({ label: 'Hacked Label' })
        .expect(404);
    });

    it('should not allow company B to delete company A field', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerBToken}`)
        .expect(404);
    });
  });

  // ============================================
  // UPDATE Field Definition Tests
  // ============================================

  describe('PATCH /modules/clients/field-definitions/:id - Update Field', () => {
    it('should update field label', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'E2E Text Field Updated' })
        .expect(200);

      expect(response.body.label).toBe('E2E Text Field Updated');
    });

    it('should update field required status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${textFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isRequired: true })
        .expect(200);

      expect(response.body.isRequired).toBe(true);
    });

    it('should update enum values', async () => {
      const newEnumValues = ['Option X', 'Option Y', 'Option Z', 'Option W'];

      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${enumFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ enumValues: newEnumValues })
        .expect(200);

      expect(response.body.enumValues).toEqual(newEnumValues);
    });

    it('should deactivate field definition', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${dateFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should reactivate field definition', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/modules/clients/field-definitions/${dateFieldId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('should not update non-existent field', async () => {
      await request(app.getHttpServer())
        .patch('/modules/clients/field-definitions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'Ghost Field' })
        .expect(404);
    });
  });

  // ============================================
  // Reorder Field Definitions Tests
  // ============================================

  describe('PUT /modules/clients/field-definitions/reorder - Reorder Fields', () => {
    it('should reorder field definitions', async () => {
      // New order: boolean, date, number, text, enum
      const orderedIds = [booleanFieldId, dateFieldId, numberFieldId, textFieldId, enumFieldId];

      const response = await request(app.getHttpServer())
        .put('/modules/clients/field-definitions/reorder')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ orderedIds })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify order
      const responseIds = response.body.map((f: { id: string }) => f.id);
      expect(responseIds).toEqual(orderedIds);
    });

    it('should persist reordered displayOrder', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Find our test fields
      const testFields = response.body.data.filter((f: { id: string }) =>
        [textFieldId, numberFieldId, dateFieldId, booleanFieldId, enumFieldId].includes(f.id)
      );

      // Boolean should have lower displayOrder than text
      const booleanField = testFields.find((f: { id: string }) => f.id === booleanFieldId);
      const textField = testFields.find((f: { id: string }) => f.id === textFieldId);

      if (booleanField && textField) {
        expect(booleanField.displayOrder).toBeLessThan(textField.displayOrder);
      }
    });

    it('should fail with incomplete orderedIds', async () => {
      // Only some IDs - should fail
      await request(app.getHttpServer())
        .put('/modules/clients/field-definitions/reorder')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ orderedIds: [textFieldId, numberFieldId] })
        .expect(400);
    });

    it('should fail with invalid UUID in orderedIds', async () => {
      await request(app.getHttpServer())
        .put('/modules/clients/field-definitions/reorder')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ orderedIds: ['invalid-uuid'] })
        .expect(400);
    });
  });

  // ============================================
  // Custom Field Values Tests
  // ============================================

  describe('Custom Field Values on Clients', () => {
    it('should create a test client', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'E2E Custom Fields Test Client',
        })
        .expect(201);

      testClientId = response.body.id;
    });

    it('should set custom field values for client', async () => {
      const response = await request(app.getHttpServer())
        .put(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          values: {
            [textFieldId]: 'Custom text value',
            [numberFieldId]: '42',
            [booleanFieldId]: 'true',
            [enumFieldId]: 'Option X',
          },
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get custom field values for client', async () => {
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Find our text field value
      const textValue = response.body.find(
        (v: { fieldDefinitionId: string }) => v.fieldDefinitionId === textFieldId
      );
      if (textValue) {
        expect(textValue.value).toBe('Custom text value');
      }
    });

    it('should update custom field values', async () => {
      await request(app.getHttpServer())
        .put(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          values: {
            [textFieldId]: 'Updated custom value',
            [numberFieldId]: '100',
          },
        })
        .expect(200);

      // Verify update
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const textValue = response.body.find(
        (v: { fieldDefinitionId: string }) => v.fieldDefinitionId === textFieldId
      );
      if (textValue) {
        expect(textValue.value).toBe('Updated custom value');
      }
    });

    it('should clear custom field value with null', async () => {
      await request(app.getHttpServer())
        .put(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          values: {
            [textFieldId]: null,
          },
        })
        .expect(200);

      // Verify cleared
      const response = await request(app.getHttpServer())
        .get(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const textValue = response.body.find(
        (v: { fieldDefinitionId: string }) => v.fieldDefinitionId === textFieldId
      );
      // Value should be null or not present
      if (textValue) {
        expect(textValue.value).toBeNull();
      }
    });

    it('should fail to set value for non-existent field definition', async () => {
      await request(app.getHttpServer())
        .put(`/modules/clients/${testClientId}/custom-fields`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          values: {
            '00000000-0000-0000-0000-000000000000': 'Invalid field value',
          },
        })
        .expect(400);
    });
  });

  // ============================================
  // DELETE Field Definition Tests
  // ============================================

  describe('DELETE /modules/clients/field-definitions/:id - Delete Field', () => {
    let fieldToDeleteId: string;

    it('should create a field to delete', async () => {
      const response = await request(app.getHttpServer())
        .post('/modules/clients/field-definitions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'field_to_delete',
          label: 'Field To Delete',
          fieldType: 'TEXT',
        })
        .expect(201);

      fieldToDeleteId = response.body.id;
    });

    it('should delete field definition', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/clients/field-definitions/${fieldToDeleteId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('should not find deleted field', async () => {
      await request(app.getHttpServer())
        .get(`/modules/clients/field-definitions/${fieldToDeleteId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should fail to delete non-existent field', async () => {
      await request(app.getHttpServer())
        .delete('/modules/clients/field-definitions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
