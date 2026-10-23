export async function loginWithUsername(
  client,
  username,
  password,
  fetcher = fetch,
) {
  let response;
  try {
    response = await fetcher("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ username: username.trim(), password }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw Error("Belum dapat terhubung. Periksa koneksi lalu coba lagi.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "Endpoint login belum tersedia. Jalankan melalui Vercel atau server pengembangan API.",
    );
  }
  if (!response.ok)
    throw Error(
      typeof data.error === "string"
        ? data.error
        : "Belum dapat masuk. Coba lagi.",
    );
  if (!data.access_token || !data.refresh_token)
    throw Error("Sesi login belum dapat diverifikasi.");
  const { error } = await client.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error)
    throw Error("Sesi login belum dapat disimpan. Coba masuk kembali.");
}
