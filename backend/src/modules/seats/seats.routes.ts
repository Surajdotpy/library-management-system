import { Router } from 'express';
import {
  authenticateToken,
  requireRole,
} from '../../middleware/auth.middleware.ts';
import * as seatsController from './seats.controller.ts';

const router = Router();

router.use(authenticateToken, requireRole('superadmin', 'admin'));

router.get('/eligible-students', seatsController.getEligibleStudents);
router.get('/bookings', seatsController.getSeatBookings);
router.post('/bookings', seatsController.createSeatBooking);
router.patch('/bookings/:bookingId/release', seatsController.releaseSeatBooking);
router.post('/bulk', seatsController.bulkCreate);
router.patch('/:seatId/assign', seatsController.assignSeat);
router.patch('/:seatId/unassign', seatsController.unassignSeat);
router.patch('/:seatId', seatsController.updateSeat);
router.get('/', seatsController.getSeats);

export default router;
