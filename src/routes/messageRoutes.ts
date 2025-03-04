import { Router } from "express";
import { user } from "../middleware/auth";
import { getChats, getConversation } from "../controllers/web-socket/messageController";

const router = Router();

router.route('/').get(user, getChats);
router.route('/:otherUserId').get(user, getConversation);

export { router as chatRoutes };