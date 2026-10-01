import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import {
  AddMemberBody,
  AddMemberResponse,
  DeleteMemberParams,
  GetMembersResponse,
  UpdateMemberBody,
  UpdateMemberParams,
  UpdateMemberResponse,
  type Member,
} from "@workspace/api-zod";

const router: IRouter = Router();

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = month % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(day, lastDayOfTargetMonth),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

router.get("/members", async (_req, res): Promise<void> => {
  const members = await db
    .select({
      id: membersTable.id,
      name: membersTable.name,
      membershipType: membersTable.membershipType,
      joiningDate: membersTable.joiningDate,
      endingDate: membersTable.endingDate,
    })
    .from(membersTable)
    .orderBy(desc(membersTable.createdAt));

  res.json(GetMembersResponse.parse(members));
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.endingDate < parsed.data.joiningDate) {
    res.status(400).json({ error: "Membership end date must be on or after the joining date" });
    return;
  }

  const [updatedMember] = await db
    .update(membersTable)
    .set({
      joiningDate: parsed.data.joiningDate,
      endingDate: parsed.data.endingDate,
    })
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!updatedMember) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json(UpdateMemberResponse.parse(updatedMember));
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const parsed = DeleteMemberParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [deletedMember] = await db
    .delete(membersTable)
    .where(eq(membersTable.id, parsed.data.id))
    .returning({ id: membersTable.id });

  if (!deletedMember) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/addMember", async (req, res): Promise<void> => {
  const body =
    req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>)
      : {};
  const parsed = AddMemberBody.safeParse({
    ...body,
    name: typeof body.name === "string" ? body.name.trim() : body.name,
  });

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid member data");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date();
  const [member] = await db
    .insert(membersTable)
    .values({
      id: randomUUID(),
      name: parsed.data.name,
      membershipType: parsed.data.membershipType,
      joiningDate: today,
      endingDate: addCalendarMonths(today, parsed.data.membershipType),
    })
    .returning();

  if (!member) {
    res.status(500).json({ error: "Could not create member" });
    return;
  }

  res.status(201).json(AddMemberResponse.parse(member));
});

export default router;