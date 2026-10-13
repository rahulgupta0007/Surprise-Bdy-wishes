export function formatBirthday(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatBirthdayYear(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
}

export function birthdayPhase(iso: string, now = new Date()): "before" | "today" | "after" {
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "today";
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (days > 0) return "before";
  if (days === 0) return "today";
  return "after";
}

export function countdownParts(iso: string, now = new Date()) {
  const target = new Date(`${iso}T00:00:00`).getTime();
  const diff = Math.max(0, target - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function monogram(name: string) {
  const letter = name.trim().charAt(0);
  return letter ? letter.toLocaleUpperCase() : "·";
}

export function pad(value: number) {
  return String(value).padStart(2, "0");
}
