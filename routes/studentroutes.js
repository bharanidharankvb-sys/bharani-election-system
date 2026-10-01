import express from 'express';
import { store, logAuditAction } from '../db/store.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ADMIN: LIST ALL STUDENTS WITH SEARCH & FILTER
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const { search, department, year, is_blocked } = req.query;

  let students = store.users.filter(u => u.role === 'student');

  if (search) {
    const q = search.toLowerCase();
    students = students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.register_number.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q)
    );
  }

  if (department) {
    students = students.filter(s => s.department.toLowerCase() === department.toLowerCase());
  }

  if (year) {
    students = students.filter(s => s.year.toLowerCase() === year.toLowerCase());
  }

  if (is_blocked !== undefined) {
    const blockedBool = is_blocked === 'true';
    students = students.filter(s => s.is_blocked === blockedBool);
  }

  const sanitized = students.map(({ password, ...rest }) => rest);

  res.json({ students: sanitized, total: sanitized.length });
});

// ADMIN: BLOCK / UNBLOCK STUDENT
router.patch('/:id/block', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { is_blocked } = req.body;

  const student = store.users.find(u => u.id === id && u.role === 'student');
  if (!student) {
    return res.status(404).json({ error: 'Student account not found.' });
  }

  student.is_blocked = Boolean(is_blocked);

  const actionType = student.is_blocked ? 'STUDENT_BLOCKED' : 'STUDENT_UNBLOCKED';
  logAuditAction(req.user.name, actionType, `${student.is_blocked ? 'Blocked' : 'Unblocked'} student: ${student.name} (${student.register_number})`);

  res.json({
    message: `Student account ${student.is_blocked ? 'blocked' : 'unblocked'} successfully.`,
    student: {
      id: student.id,
      name: student.name,
      register_number: student.register_number,
      is_blocked: student.is_blocked
    }
  });
});

export default router;
