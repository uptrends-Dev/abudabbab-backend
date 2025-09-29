//timeZone
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

const CAIRO_TZ = "Africa/Cairo";

export function buildCreatedAtMatch(q) {
  const isDate = (s, re) => typeof s === "string" && re.test(s);

  let start = null;
  let end   = null;

  // lastDays=N (آخر N يوم حتى الآن)
  if (q.lastDays) {
    const n = Number(q.lastDays);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: "lastDays لازم يبقى رقم موجب" };
    }
    end   = dayjs().tz(CAIRO_TZ);
    start = end.subtract(n, "day");
  }
  // day=YYYY-MM-DD
  else if (isDate(q.day, /^\d{4}-\d{2}-\d{2}$/)) {
    start = dayjs.tz(q.day, CAIRO_TZ).startOf("day");
    end   = start.add(1, "day");
  }
  // month=YYYY-MM
  else if (isDate(q.month, /^\d{4}-\d{2}$/)) {
    start = dayjs.tz(`${q.month}-01`, CAIRO_TZ).startOf("month");
    end   = start.add(1, "month");
  }
  // year=YYYY
  else if (isDate(q.year, /^\d{4}$/)) {
    start = dayjs.tz(`${q.year}-01-01`, CAIRO_TZ).startOf("year");
    end   = start.add(1, "year");
  }
  // from/to (ISO أو تاريخ فقط)
  else if (q.from || q.to) {
    if (q.from) {
      if (isDate(q.from, /^\d{4}-\d{2}-\d{2}$/)) {
        start = dayjs.tz(q.from, CAIRO_TZ).startOf("day");
      } else {
        start = dayjs(q.from);
      }
      if (!start.isValid()) return { error: "from تاريخ/وقت غير صالح" };
    }
    if (q.to) {
      if (isDate(q.to, /^\d{4}-\d{2}-\d{2}$/)) {
        // نخلي النهاية بداية اليوم التالي => exclusive
        end = dayjs.tz(q.to, CAIRO_TZ).add(1, "day").startOf("day");
      } else {
        end = dayjs(q.to);
      }
      if (!end.isValid()) return { error: "to تاريخ/وقت غير صالح" };
    }
  }

  // لو مفيش أي فيلتر زمني، رجّع null
  if (!start && !end) return { match: null };

  const createdAt = {};
  if (start) createdAt.$gte = start.toDate();
  if (end)   createdAt.$lt  = end.toDate();

  return { match: { createdAt } };
}
