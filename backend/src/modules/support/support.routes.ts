import { Router } from "express";
import { SupportController } from "./support.controller";

const router = Router();

router.post("/ticket", SupportController.createTicket);

export default router;
