
import { Router } from 'express';
import { generateRandomAttendance } from '../controllers/test/attendance-controller';
import { employeeProtect } from '../middleware/auth';

const router = Router();

router.post('/generate-attendance', employeeProtect, generateRandomAttendance);

export { router as testRouter };
