import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRunningTimerUniqueIndex1768950000000 implements MigrationInterface {
  name = 'AddRunningTimerUniqueIndex1768950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[AddRunningTimerUniqueIndex] Starting migration UP...');

    // Pre-validation: Check for existing duplicate running timers
    const duplicates = await queryRunner.query(`
      SELECT "userId", "companyId", COUNT(*) as count
      FROM "time_entries"
      WHERE "isRunning" = true AND "isActive" = true
      GROUP BY "userId", "companyId"
      HAVING COUNT(*) > 1
    `);

    if (duplicates && duplicates.length > 0) {
      console.log(`[AddRunningTimerUniqueIndex] Found ${duplicates.length} users with duplicate running timers. Auto-fixing...`);

      // Auto-fix: For each user with duplicates, keep only the most recently started timer running
      for (const dup of duplicates) {
        console.log(`[AddRunningTimerUniqueIndex] Fixing duplicates for userId=${dup.userId}, companyId=${dup.companyId} (${dup.count} running timers)`);

        // First, find the entries that will be stopped (for audit logging)
        const entriesToStop = await queryRunner.query(`
          SELECT "id", "description", "startTime"
          FROM "time_entries"
          WHERE "userId" = $1
            AND "companyId" = $2
            AND "isRunning" = true
            AND "isActive" = true
            AND "id" NOT IN (
              SELECT "id" FROM "time_entries"
              WHERE "userId" = $1
                AND "companyId" = $2
                AND "isRunning" = true
                AND "isActive" = true
              ORDER BY "startTime" DESC
              LIMIT 1
            )
        `, [dup.userId, dup.companyId]);

        // Log each auto-stopped entry to change_logs for audit trail
        // Using system user UUID placeholder since migration runs without user context
        const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
        for (const entry of entriesToStop) {
          // Capture stopTime once to ensure consistency between audit log and update
          const stopTime = new Date().toISOString();
          await queryRunner.query(`
            INSERT INTO "change_logs" ("id", "entityType", "entityId", "action", "changes", "companyId", "changedById", "createdAt")
            VALUES (
              gen_random_uuid(),
              'TimeEntry',
              $1,
              'UPDATE',
              $2::jsonb,
              $3,
              $4,
              NOW()
            )
          `, [
            entry.id,
            JSON.stringify([
              { field: '_migrationNote', newValue: 'Auto-stopped: duplicate running timer detected during migration AddRunningTimerUniqueIndex' },
              { field: 'isRunning', oldValue: true, newValue: false },
              { field: 'endTime', oldValue: null, newValue: stopTime },
            ]),
            dup.companyId,
            SYSTEM_USER_ID,
          ]);
          console.log(`[AddRunningTimerUniqueIndex] Logged auto-stop for entry ${entry.id} (started: ${entry.startTime})`);
        }

        // Stop all running timers except the most recent one (by startTime)
        await queryRunner.query(`
          UPDATE "time_entries"
          SET "isRunning" = false, "endTime" = NOW()
          WHERE "userId" = $1
            AND "companyId" = $2
            AND "isRunning" = true
            AND "isActive" = true
            AND "id" NOT IN (
              SELECT "id" FROM "time_entries"
              WHERE "userId" = $1
                AND "companyId" = $2
                AND "isRunning" = true
                AND "isActive" = true
              ORDER BY "startTime" DESC
              LIMIT 1
            )
        `, [dup.userId, dup.companyId]);
      }

      // Verify fix
      const remainingDuplicates = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM (
          SELECT "userId", "companyId"
          FROM "time_entries"
          WHERE "isRunning" = true AND "isActive" = true
          GROUP BY "userId", "companyId"
          HAVING COUNT(*) > 1
        ) AS dups
      `);

      if (remainingDuplicates[0]?.count > 0) {
        throw new Error(`Failed to fix duplicate running timers. ${remainingDuplicates[0].count} duplicates remain.`);
      }

      console.log('[AddRunningTimerUniqueIndex] Duplicate timers fixed successfully');
    } else {
      console.log('[AddRunningTimerUniqueIndex] No duplicate running timers found');
    }

    // Create unique partial index to prevent duplicate running timers per user per company
    // This provides database-level enforcement of the "one running timer per user" constraint
    console.log('[AddRunningTimerUniqueIndex] Creating unique index...');
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_time_entries_one_running_per_user"
      ON "time_entries" ("userId", "companyId")
      WHERE "isRunning" = true AND "isActive" = true
    `);

    console.log('[AddRunningTimerUniqueIndex] Migration UP completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[AddRunningTimerUniqueIndex] Starting migration DOWN...');
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_time_entries_one_running_per_user"`);
    console.log('[AddRunningTimerUniqueIndex] Migration DOWN completed successfully');
  }
}
