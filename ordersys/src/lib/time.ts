export function minutesToParts(total: number) {
  const safe = Math.max(0, Math.round(total));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return { hours, minutes };
}

export function formatMinutesLabel(total: number) {
  const { hours, minutes } = minutesToParts(total);
  if (hours === 0 && minutes === 0) return "0 min";
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
