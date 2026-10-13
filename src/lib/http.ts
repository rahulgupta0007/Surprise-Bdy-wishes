export async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok) {
    const message = data && typeof data.error === "string" ? data.error : "Something went wrong.";
    throw new Error(message);
  }
  return data as T;
}
