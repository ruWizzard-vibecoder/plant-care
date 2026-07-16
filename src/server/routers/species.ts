import { z } from "zod";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "@/trpc/init";

export const speciesRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = input.search
        ? {
            OR: [
              { commonNameRu: { contains: input.search, mode: "insensitive" as const } },
              { commonNameEn: { contains: input.search, mode: "insensitive" as const } },
              { scientificName: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const categoryFilter = input.category
        ? { category: input.category as "SUCCULENTS" | "FOLIAGE" | "TROPICAL" | "FLOWERING" | "FERNS" | "PALMS" | "CLIMBING" | "LARGE" }
        : {};

      const where = { ...searchFilter, ...categoryFilter };

      let items = await ctx.db.plantSpecies.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { commonNameRu: "asc" },
        include: { catalogPhotos: { take: 1 } },
      });

      // Fuzzy search fallback: if exact search found nothing and user typed 2+ chars
      let fuzzy = false;
      if (items.length === 0 && input.search && input.search.length >= 2 && !input.cursor) {
        const q = input.search;
        const params: (string | number)[] = [q];
        const catClause = input.category
          ? (params.push(input.category), `AND category::text = $${params.length}`)
          : "";
        params.push(input.limit);
        const limitParam = `$${params.length}`;
        const fuzzyRows = await ctx.db.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM plant_species
           WHERE (
             similarity("commonNameRu", $1) > 0.2
             OR similarity("scientificName", $1) > 0.2
             OR similarity(COALESCE("commonNameEn",''), $1) > 0.2
           ) ${catClause}
           ORDER BY GREATEST(
             similarity("commonNameRu", $1),
             similarity("scientificName", $1),
             similarity(COALESCE("commonNameEn",''), $1)
           ) DESC
           LIMIT ${limitParam}`,
          ...params
        );

        if (fuzzyRows.length > 0) {
          const ids = fuzzyRows.map((r) => r.id);
          items = await ctx.db.plantSpecies.findMany({
            where: { id: { in: ids } },
            include: { catalogPhotos: { take: 1 } },
          });
          // Preserve similarity order
          const idOrder = new Map(ids.map((id, i) => [id, i]));
          items.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
          fuzzy = true;
        }
      }

      let nextCursor: string | undefined;
      if (!fuzzy && items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor, fuzzy };
    }),

  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.plantSpecies.findUniqueOrThrow({
        where: { id: input.id },
        include: { catalogPhotos: true },
      });
    }),

  findByScientificNames: baseProcedure
    .input(z.object({ names: z.array(z.string()).min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      const lower = input.names.map((n) => n.toLowerCase());
      const species = await ctx.db.plantSpecies.findMany({
        where: {
          scientificName: { in: lower, mode: "insensitive" },
        },
      });
      // Return as a map: scientificName (lowercase) → species
      const result: Record<string, typeof species[number]> = {};
      for (const s of species) {
        result[s.scientificName.toLowerCase()] = s;
      }
      return result;
    }),
});
