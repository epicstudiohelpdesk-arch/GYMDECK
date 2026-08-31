/**
 * GymDeck Cloud Backend - Route Registration
 */

import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import memberRouter from './member';

const router = Router();

// Infrastructure & Health routes
router.use('/', healthRouter);

// Authentication API (/v1/auth)
router.use('/v1/auth', authRouter);

// Member Domain API (/v1/member)
router.use('/v1/member', memberRouter);

export default router;
