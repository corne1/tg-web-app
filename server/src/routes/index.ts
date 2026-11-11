import { Router } from "express";
import { addressRouter } from "./address.js";
import { authRouter } from "./auth.js";
import { bookingsRouter } from "./bookings.js";
import { cabinetRouter } from "./cabinet.js";
import { citiesRouter } from "./cities.js";
import { cronRouter } from "./cron.js";
import { masterRouter } from "./master.js";
import { meRouter } from "./me.js";
import { publicMasterRouter } from "./publicMaster.js";
import { serviceTypesRouter } from "./serviceTypes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/cities", citiesRouter);
apiRouter.use("/address", addressRouter);
apiRouter.use("/service-types", serviceTypesRouter);
apiRouter.use(meRouter);
apiRouter.use("/master", masterRouter);
apiRouter.use("/masters", publicMasterRouter);
apiRouter.use("/cabinet", cabinetRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/cron", cronRouter);
