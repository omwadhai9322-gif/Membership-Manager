import {
  date,
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
  joiningDate: date("joining_date", { mode: "date" }).notNull(),
  endingDate: date("ending_date", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});