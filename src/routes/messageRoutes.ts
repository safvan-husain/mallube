import { Router } from "express";
import {protect, user} from "../middleware/auth";
import { getChats, getConversation } from "../controllers/web-socket/messageController";

const router = Router();

router.route('/').get(protect, getChats);
router.route('/:otherUserId').get(protect, getConversation);

export { router as chatRoutes };