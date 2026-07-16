import "server-only";

import { createCallerFactory } from "./init";
import { appRouter } from "./router";

export const createCaller = createCallerFactory(appRouter);
