
import { Router } from 'express';
import { generateRandomAttendance } from '../controllers/test/attendance-controller';
import { generateRandomStores } from '../controllers/test/store-controller';
import { employeeProtect } from '../middleware/auth';

const router = Router();

router.post('/generate-attendance', generateRandomAttendance);
router.post('/generate-stores', employeeProtect, generateRandomStores);

export { router as testRouter };
