export function getLastResetDate(period: string): Date | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "monthly":
      return new Date(year, month, 1);
    case "quarterly": {
      const quarterMonths = [0, 3, 6, 9];
      const lastQuarterMonth = [...quarterMonths].reverse().find((startMonth) => month >= startMonth) ?? 0;
      return new Date(year, lastQuarterMonth, 1);
    }
    case "semi-annual": {
      const semiAnnualMonths = [0, 6];
      const lastSemiAnnualMonth = [...semiAnnualMonths].reverse().find((startMonth) => month >= startMonth) ?? 0;
      return new Date(year, lastSemiAnnualMonth, 1);
    }
    case "annual":
      return new Date(year, 0, 1);
    case "one-time":
      return null;
    default:
      return null;
  }
}

export function shouldReset(period: string, usedAt: string): boolean {
  const lastResetDate = getLastResetDate(period);
  if (!lastResetDate) {
    return false;
  }

  const usedAtDate = new Date(usedAt);
  if (Number.isNaN(usedAtDate.getTime())) {
    return false;
  }

  return usedAtDate < lastResetDate;
}
