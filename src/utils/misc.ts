export function getNextYearSameDateMinusOneDay() {
  const today = new Date();

  // Create a new date object for next year same date
  const nextYearSameDate = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
  );

  // Subtract one day
  nextYearSameDate.setDate(nextYearSameDate.getDate() - 1);

  return nextYearSameDate;
}
