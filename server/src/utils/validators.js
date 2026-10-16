
const PROJECT_STATUSES = [
  "planning",
  "active",
  "completed",
  "archived",
];

const TASK_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];

const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
];

function isValidId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function isValidProjectStatus(status) {
  return PROJECT_STATUSES.includes(status);
}

function isValidTaskStatus(status) {
  return TASK_STATUSES.includes(status);
}

function isValidTaskPriority(priority) {
  return TASK_PRIORITIES.includes(priority);
}

function isNonEmptyString(value, maxLength = 255) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

module.exports = {
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  isValidId,
  isValidEmail,
  isValidProjectStatus,
  isValidTaskStatus,
  isValidTaskPriority,
  isNonEmptyString,
  isValidDate,
};
