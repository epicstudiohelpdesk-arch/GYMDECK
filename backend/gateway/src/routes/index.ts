import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import ownerAuthRouter from './ownerAuth';
import memberRouter from './member';
import ownerRouter from './owner';
import syncRouter from './sync';
import webhookRouter from './webhooks';

const router: Router = Router();

// Infrastructure & Health routes
router.use('/', healthRouter);

// Authentication API (/v1/auth)
router.use('/v1/auth/owner', ownerAuthRouter);
router.use('/v1/auth', authRouter);

// Domain APIs
router.use('/v1/member', memberRouter);
router.use('/v1/owner', ownerRouter);

// Desktop & Mobile Synchronization API (/v1/sync)
router.use('/v1/sync', syncRouter);

// Provider Webhooks API (/v1/webhooks)
router.use('/v1/webhooks', webhookRouter);

export default router;
