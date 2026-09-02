/**
 * GymDeck Cloud Gateway - Backup, Recovery & System Diagnostics Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../middleware/rbacMiddleware';
import { BackupService } from '../../../services/backup/backupService';
import { DatabaseIntegrityService } from '../../../services/diagnostics/integrityService';
import { AppError } from '../../../shared/errors';

export const backupRouter: Router = Router();

/**
 * GET /v1/owner/backup/status
 * Operational status of backups and database health for the dashboard.
 */
backupRouter.get(
  '/status',
  requirePermission('backup.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const status = await BackupService.getBackupStatus(gymId);
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /v1/owner/backup/create
 * Creates a verified backup snapshot for the tenant.
 */
backupRouter.post(
  '/create',
  requirePermission('backup.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorId = req.user!.userId || req.user!.sub;
      const source = req.body?.source || 'CLOUD_SNAPSHOT';

      const backup = await BackupService.createBackupSnapshot(gymId, actorId, source);
      res.status(201).json({ success: true, data: backup });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /v1/owner/backup/list
 * Lists backup metadata history for the authenticated tenant.
 */
backupRouter.get(
  '/list',
  requirePermission('backup.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const backups = await BackupService.listBackups(gymId);
      res.json({ success: true, data: backups });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /v1/owner/backup/:backupId/verify
 * Cryptographically verifies a specific backup's checksum, schema, and referential integrity.
 */
backupRouter.post(
  '/:backupId/verify',
  requirePermission('backup.verify'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorId = req.user!.userId || req.user!.sub;
      const backupId = req.params.backupId as string;

      const result = await BackupService.verifyBackup(gymId, backupId, actorId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /v1/owner/backup/restore/verify
 * Validates restoring a backup into an isolated staging sandbox and outputs reconciliation plan.
 */
backupRouter.post(
  '/restore/verify',
  requirePermission('restore.verify'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorId = req.user!.userId || req.user!.sub;
      const { backupId } = req.body;

      if (!backupId) {
        throw AppError.validation('backupId is required.');
      }

      const result = await BackupService.verifyRestoreStaging(gymId, backupId, actorId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /v1/owner/diagnostics/integrity
 * Runs non-destructive, read-only system integrity audit across all domain tables.
 */
backupRouter.get(
  '/diagnostics/integrity',
  requirePermission('system.diagnostics'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const report = await DatabaseIntegrityService.runIntegrityAudit(gymId);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);
