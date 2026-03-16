import { Router } from 'express';
import * as studentController from './students.controller.js';
import {
  authenticateToken,
  requireRole,
} from '../../middleware/auth.middleware.js';

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

// DELETE /api/students/:id - Delete student
router.delete('/:id', studentController.deleteStudent);

export default router;
