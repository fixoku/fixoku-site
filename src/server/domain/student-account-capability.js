export function canCreateChildProfile({ activeChildCount, allowMultipleStudents }) {
  if (!Number.isInteger(activeChildCount) || activeChildCount < 0) throw new Error("CHILD_COUNT_INVALID");
  return activeChildCount === 0 || allowMultipleStudents === true;
}

export function canDisableMultipleStudents({ activeChildCount }) {
  if (!Number.isInteger(activeChildCount) || activeChildCount < 0) throw new Error("CHILD_COUNT_INVALID");
  return activeChildCount <= 1;
}
