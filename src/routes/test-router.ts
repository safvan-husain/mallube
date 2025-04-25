
import { Router } from 'express';
import { generateRandomAttendance } from '../controllers/test/attendance-controller';
import { generateRandomStores } from '../controllers/test/store-controller';
import { getTokens } from '../controllers/test/token-controller';
import { employeeProtect } from '../middleware/auth';

const router = Router();

router.post('/generate-attendance', generateRandomAttendance);
router.post('/generate-stores', employeeProtect, generateRandomStores);
router.get('/token', getTokens);

router.get('/device-details', (req, res) => {
  const userAgent = req.headers['user-agent'];
  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress;
  const acceptLanguage = req.headers['accept-language'];
  const platform = req.headers['sec-ch-ua-platform'];
  const mobile = req.headers['sec-ch-ua-mobile'];

  const deviceDetails = {
    userAgent,
    ip: clientIP,
    language: acceptLanguage,
    platform: platform?.replace(/"/g, ''),
    isMobile: mobile === '?1',
    headers: req.headers,
    cookies: req.cookies,
    timestamp: new Date().toISOString()
  };

  res.json(deviceDetails);
});

export { router as testRouter };
