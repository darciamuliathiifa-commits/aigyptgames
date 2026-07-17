import { Router, type IRouter } from "express";
import healthRouter from "./health";
import participantsRouter from "./participants";
import entriesRouter from "./entries";
import submissionsRouter from "./submissions";
import leaderboardRouter from "./leaderboard";
import votesRouter from "./votes";
import prizesRouter from "./prizes";
import settingsRouter from "./settings";
import adminRouter from "./admin";
import examplePostersRouter from "./examplePosters";

const router: IRouter = Router();

router.use(healthRouter);
router.use(participantsRouter);
router.use(entriesRouter);
router.use(submissionsRouter);
router.use(leaderboardRouter);
router.use(votesRouter);
router.use(prizesRouter);
router.use(settingsRouter);
router.use(adminRouter);
router.use(examplePostersRouter);

export default router;
