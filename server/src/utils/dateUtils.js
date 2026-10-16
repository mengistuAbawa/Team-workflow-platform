
function toDateOnly(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === "done") return false;

  const due = toDateOnly(dueDate);
  const today = toDateOnly(new Date());

  return Boolean(due && today && due < today);
}

function daysUntil(dueDate) {
  const due = toDateOnly(dueDate);

  if (!due) return null;

  const today = toDateOnly(new Date());
  const dueTime = Date.parse(`${due}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);

  return Math.round((dueTime - todayTime) / 86400000);
}

function isDueSoon(dueDate, days = 7) {
  const remaining = daysUntil(dueDate);

  return remaining !== null && remaining >= 0 && remaining <= days;
}

module.exports = {
  toDateOnly,
  isOverdue,
  daysUntil,
  isDueSoon,
};
