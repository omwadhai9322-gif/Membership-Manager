import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const membersTable = pgTable("gym_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  membershipType: integer("membership_type").notNull(),
  joiningDate: timestamp("joining_date", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  endingDate: timestamp("ending_date", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type GymMember = typeof membersTable.$inferSelect;