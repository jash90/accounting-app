import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

/**
 * Persisted record of an issued refresh token.
 *
 * Used to implement OWASP-recommended **refresh-token rotation with reuse
 * detection**:
 *
 * - Each refresh issues a brand-new refresh token and marks the old one
 *   as `used` (sets `usedAt`).
 * - All tokens issued during a single login session share a `family` UUID.
 * - If a `used` token is presented again (e.g. an attacker replays a
 *   leaked token while the legitimate user already rotated), the entire
 *   `family` is invalidated and the user's `tokenVersion` is bumped to
 *   kill any in-flight access tokens.
 *
 * The JWT carries `jti` (matches `RefreshToken.jti`) and `family` claims
 * so the server can look up state without trusting client-supplied data.
 *
 * @see libs/auth/src/lib/services/auth.service.ts (refreshToken method)
 */
@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user', ['userId'])
@Index('idx_refresh_tokens_family', ['family'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Per-token unique identifier. Embedded in the refresh JWT's `jti` claim
   * and used to look up this row on every refresh.
   */
  @Column({ type: 'uuid', unique: true })
  jti!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /**
   * Groups all tokens descended from a single login. When reuse is detected
   * we invalidate every row sharing this `family`.
   */
  @Column({ type: 'uuid' })
  family!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /**
   * Null while the token is still valid. Set to the moment a refresh
   * consumes this row (and a successor is issued). Re-presenting a token
   * with `usedAt != null` is treated as theft.
   */
  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  /**
   * Optional pointer to the row that succeeded this one. Useful for
   * auditing token chains; not required for the rotation itself.
   */
  @Column({ type: 'uuid', nullable: true })
  replacedById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
