import { Router } from 'express';
import { authenticateToken, requireRole, } from '../../middleware/auth.middleware.js';
import * as seatsController from './seats.controller.js';
const router = Router();
router.use(authenticateToken, requireRole('superadmin', 'admin'));
router.get('/eligible-students', seatsController.getEligibleStudents);
router.get('/bookings', seatsController.getSeatBookings);
router.post('/bookings', seatsController.createSeatBooking);
router.patch('/bookings/:bookingId/release', seatsController.releaseSeatBooking);
router.get('/', seatsController.getSeats);
export default router;
//# sourceMappingURL=seats.routes.js.map