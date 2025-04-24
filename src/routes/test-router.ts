
import { Router } from 'express';
import { generateRandomAttendance } from '../controllers/test/attendance-controller';
import { generateRandomStores } from '../controllers/test/store-controller';
import { employeeProtect } from '../middleware/auth';
import {onCatchError} from "../controllers/service/serviceContoller";

const router = Router();

router.post('/generate-attendance', generateRandomAttendance);
router.post('/generate-stores', employeeProtect, generateRandomStores);

router.get('/device-details', (req, res) => {
  try {
    const userAgent = req.headers['user-agent'];
    const clientIP = req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress;
    const t_platform = req.headers['sec-ch-ua-platform'];
    const acceptLanguage = req.headers['accept-language'];
    const platform = Array.isArray(t_platform) ? t_platform[0] : t_platform;
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
  } catch (e) {
      onCatchError(e, res);
  }

});

export { router as testRouter };
