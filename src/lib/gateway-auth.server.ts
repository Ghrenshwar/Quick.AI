export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Verifies the caller's bearer token against the auth service.
 * Returns { userId } on success or a ready-to-return error Response.
 */
export async function requireUser(request: Request): Promise<{ userId: string } | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return jsonError("Sign in to use this tool", 401);

  const baseUrl = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const apiKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!baseUrl || !apiKey) return jsonError("Authentication is not configured", 500);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
  } catch {
    return jsonError("Could not verify your session — try again", 502);
  }
  if (!res.ok) return jsonError("Your session expired — sign in again", 401);
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  if (!user?.id) return jsonError("Your session expired — sign in again", 401);
  return { userId: user.id };
}
