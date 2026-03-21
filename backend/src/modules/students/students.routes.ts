import { Router } from 'express';
import * as studentController from './students.controller.ts';
import {
  authenticateToken,
  requireRole,
} from '../../middleware/auth.middleware.ts';

const router = Router();

router.use(authenticateToken, requireRole('superadmin', 'admin'));

// GET /api/students - Get all students
router.get('/', studentController.getStudents);

// GET /api/students/:id - Get single student
router.get('/:id', studentController.getStudent);

// POST /api/students - Create new student
router.post('/', studentController.createStudent);

// PUT /api/students/:id - Update student
router.put('/:id', studentController.updateStudent);

// PATCH /api/students/:id/reactivate - Reactivate student
router.patch('/:id/reactivate', studentController.reactivateStudent);

// DELETE /api/students/:id - Delete student
router.delete('/:id', studentController.deleteStudent);

export default router;
