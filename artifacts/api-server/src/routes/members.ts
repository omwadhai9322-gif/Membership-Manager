import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddMemberBody,
  AddMemberResponse,
  DeleteMemberParams,
  GetMembersResponse,
  type Member,
} from "@workspace/api-zod";

const router: IRouter = Router();
const members: Member[] = [];

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

router.get("/members", (_req, res) => {
  res.json(GetMembersResponse.parse(members));
});

router.delete("/members/:id", (req, res) => {
  const parsed = DeleteMemberParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const memberIndex = members.findIndex(
    (member) => member.id === parsed.data.id,
  );
  if (memberIndex === -1) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  members.splice(memberIndex, 1);
  res.sendStatus(204);
});

router.post("/addMember", (req, res) => {
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
  const member: Member = {
    id: randomUUID(),
    name: parsed.data.name,
    membershipType: parsed.data.membershipType,
    joiningDate: today,
    endingDate: addCalendarMonths(today, parsed.data.membershipType),
  };

  members.unshift(member);
  res.status(201).json(AddMemberResponse.parse(member));
});

export default router;