import express from 'express';
import { store } from '../db/store.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ADMIN: GET SYSTEM AUDIT LOGS
router.get('/', verifyToken, requireAdmin, (req, res) => {
  res.json({ logs: store.audit_logs });
});

export default router;
