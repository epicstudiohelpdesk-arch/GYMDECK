import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import memberRouter from './member';
import syncRouter from './sync';

const router: Router = Router();

// Infrastructure & Health routes
router.use('/', healthRouter);

// Authentication API (/v1/auth)
router.use('/v1/auth', authRouter);

// Member Domain API (/v1/member)
router.use('/v1/member', memberRouter);

// Desktop & Mobile Synchronization API (/v1/sync)
router.use('/v1/sync', syncRouter);

export default router;
