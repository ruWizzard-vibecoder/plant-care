import { createTRPCRouter } from "./init";
import { plantsRouter } from "@/server/routers/plants";
import { speciesRouter } from "@/server/routers/species";
import { tasksRouter } from "@/server/routers/tasks";
import { logsRouter } from "@/server/routers/logs";
import { growthRouter } from "@/server/routers/growth";
import { roomsRouter } from "@/server/routers/rooms";
import { recommendationsRouter } from "@/server/routers/recommendations";
import { notificationsRouter } from "@/server/routers/notifications";
import { propagationRouter } from "@/server/routers/propagation";
import { achievementsRouter } from "@/server/routers/achievements";
import { communityRouter } from "@/server/routers/community";
import { friendsRouter } from "@/server/routers/friends";
import { wishlistRouter } from "@/server/routers/wishlist";
import { smartHomeRouter } from "@/server/routers/smart-home";

export const appRouter = createTRPCRouter({
  plants: plantsRouter,
  species: speciesRouter,
  tasks: tasksRouter,
  logs: logsRouter,
  growth: growthRouter,
  rooms: roomsRouter,
  recommendations: recommendationsRouter,
  notifications: notificationsRouter,
  propagation: propagationRouter,
  achievements: achievementsRouter,
  community: communityRouter,
  friends: friendsRouter,
  wishlist: wishlistRouter,
  smartHome: smartHomeRouter,
});

export type AppRouter = typeof appRouter;
