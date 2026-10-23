export const TABLES = {
  agents: "ps_agents",
  shifts: "ps_shifts",
  posts: "ps_posts",
};
export const BUCKET = "pojok-media";
export const emptyState = () => ({ agents: [], shifts: [], posts: [] });
export const isInlineImage = (value) =>
  typeof value === "string" &&
  /^data:image\/(jpeg|png|webp);base64,/.test(value);

export function readableError(error) {
  if (error?.code === "23505")
    return "Data sudah ada. Periksa penugasan pada tanggal dan sesi yang sama.";
  if (error?.code === "23503")
    return "Data terkait sudah berubah. Muat ulang lalu coba lagi.";
  if (error?.code === "23514")
    return "Data belum sesuai aturan. Periksa status, tanggal, jam, dan tautan publikasi.";
  if (error?.code === "42501")
    return "Akses ditolak. Masuk menggunakan akun admin yang telah diizinkan.";
  if (["42P01", "PGRST205", "PGRST202"].includes(error?.code))
    return "Workspace belum diaktifkan di Supabase. Terapkan migrasi dan daftarkan akun admin terlebih dahulu.";
  if (error?.code === "CONFLICT")
    return "Data ini telah berubah di perangkat lain. Muat ulang sebelum menyimpan lagi.";
  if (error?.code === "NOT_ADMIN")
    return "Akun ini belum terdaftar sebagai admin workspace.";
  if (error?.code === "SESSION_REQUIRED")
    return "Sesi berakhir. Silakan masuk kembali.";
  if (error?.code === "MEDIA_UNAVAILABLE")
    return "Media belum dapat dimuat. Coba muat ulang sebelum mengedit data.";
  return "Permintaan belum berhasil. Periksa koneksi dan coba lagi. Perubahan belum dikonfirmasi.";
}

export function findChange(before, after) {
  const changes = [];
  for (const collection of Object.keys(TABLES)) {
    const previous = new Map(before[collection].map((row) => [row.id, row]));
    const next = new Map(after[collection].map((row) => [row.id, row]));
    for (const [id, row] of next) {
      if (!previous.has(id))
        changes.push({ collection, kind: "insert", row, old: null });
      else if (JSON.stringify(previous.get(id)) !== JSON.stringify(row))
        changes.push({
          collection,
          kind: "update",
          row,
          old: previous.get(id),
        });
    }
    for (const [id, row] of previous)
      if (!next.has(id))
        changes.push({ collection, kind: "delete", row: null, old: row });
  }
  if (changes.length !== 1)
    throw new Error("One record per operation is required.");
  return changes[0];
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
function rowToModel(collection, row, signed) {
  if (collection === "agents")
    return {
      id: row.id,
      name: row.name,
      division: row.division,
      position: row.position,
      active: row.active,
      period: row.period,
      initials: initials(row.name),
      photo: row.photo_path ? signed.get(row.photo_path) || "" : "",
      _photoPath: row.photo_path,
      _version: row.version,
    };
  if (collection === "shifts")
    return {
      id: row.id,
      agent: row.agent_id,
      date: row.date,
      session: row.session,
      pj: row.is_pj,
      status: row.status,
      time: row.arrival_time?.slice(0, 5) || "",
      _version: row.version,
    };
  return {
    id: row.id,
    title: row.title,
    date: row.publish_date,
    time: row.publish_time.slice(0, 5),
    format: row.format,
    status: row.status,
    agent: row.agent_id,
    category: row.category,
    brief: row.brief,
    caption: row.caption,
    link: row.instagram_url,
    images: row.image_paths.map((path) => signed.get(path) || ""),
    _imagePaths: row.image_paths,
    _version: row.version,
  };
}

export function createRepository(
  client,
  { publicUrl, uuid = () => crypto.randomUUID() },
) {
  const media = client.storage.from(BUCKET);
  const signedPrefix = `${new URL(publicUrl).origin}/storage/v1/object/sign/${BUCKET}/`;
  const isSafeMedia = (value) =>
    isInlineImage(value) ||
    (typeof value === "string" && value.startsWith(signedPrefix));

  async function requireAdmin() {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw { code: "SESSION_REQUIRED" };
    const result = await client
      .from("ps_admin")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw { code: "NOT_ADMIN" };
    return data.user;
  }

  async function fetchRows(table) {
    const rows = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await client
        .from(table)
        .select("*")
        .order("id")
        .range(start, start + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }

  async function load() {
    const collections = Object.keys(TABLES);
    const rows = await Promise.all(
      collections.map((key) => fetchRows(TABLES[key])),
    );
    const raw = Object.fromEntries(collections.map((key, i) => [key, rows[i]]));
    const paths = [
      ...new Set(
        [
          ...raw.agents.map((a) => a.photo_path),
          ...raw.posts.flatMap((p) => p.image_paths),
        ].filter(Boolean),
      ),
    ];
    const signed = new Map();
    for (let start = 0; start < paths.length; start += 100) {
      const { data, error } = await media.createSignedUrls(
        paths.slice(start, start + 100),
        3600,
      );
      if (error || data.some((item) => item.error || !item.signedUrl))
        throw { code: "MEDIA_UNAVAILABLE" };
      for (const item of data) signed.set(item.path, item.signedUrl);
    }
    return Object.fromEntries(
      collections.map((key) => [
        key,
        raw[key].map((row) => rowToModel(key, row, signed)),
      ]),
    );
  }

  async function uploadInline(value, folder, uploaded) {
    if (!isInlineImage(value)) throw new Error("Invalid media");
    const blob = await (await fetch(value)).blob();
    if (blob.size > 5 * 1024 * 1024) throw new Error("Image exceeds 5 MB");
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[blob.type];
    if (!extension) throw new Error("Invalid image type");
    const path = `${folder}/${uuid()}.${extension}`;
    const { error } = await media.upload(path, blob, {
      contentType: blob.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) throw error;
    uploaded.push(path);
    return path;
  }
  async function removeFiles(paths) {
    if (!paths.length) return;
    try {
      await media.remove(paths);
    } catch {
      /* Orphaned files are safer than deleting referenced media. */
    }
  }

  async function commit(before, after) {
    const change = findChange(before, after);
    const { collection, kind, row, old } = change;
    const table = TABLES[collection];
    const uploaded = [];
    let obsolete = [];
    let payload;
    try {
      if (kind !== "delete") {
        if (collection === "agents") {
          const photoPath =
            row.photo === old?.photo
              ? old?._photoPath || null
              : row.photo
                ? await uploadInline(row.photo, `agents/${row.id}`, uploaded)
                : null;
          payload = {
            id: row.id,
            name: row.name,
            division: row.division,
            position: row.position,
            active: row.active,
            period: row.period,
            photo_path: photoPath,
          };
          if (old?._photoPath && old._photoPath !== photoPath)
            obsolete.push(old._photoPath);
        } else if (collection === "posts") {
          const imagePaths = [];
          for (const source of row.images) {
            const index = old?.images.indexOf(source) ?? -1;
            imagePaths.push(
              index >= 0
                ? old._imagePaths[index]
                : await uploadInline(source, `posts/${row.id}`, uploaded),
            );
          }
          payload = {
            id: row.id,
            title: row.title,
            publish_date: row.date,
            publish_time: row.time,
            format: row.format,
            status: row.status,
            agent_id: row.agent,
            category: row.category,
            brief: row.brief,
            caption: row.caption,
            instagram_url: row.link,
            image_paths: imagePaths,
          };
          obsolete = (old?._imagePaths || []).filter(
            (path) => !imagePaths.includes(path),
          );
        } else
          payload = {
            id: row.id,
            agent_id: row.agent,
            date: row.date,
            session: row.session,
            is_pj: row.pj,
            status: row.status,
            arrival_time: row.status === "Hadir" ? row.time : null,
          };
      }
      let request;
      if (kind === "insert") request = client.from(table).insert(payload);
      if (kind === "update")
        request = client
          .from(table)
          .update(payload)
          .eq("id", old.id)
          .eq("version", old._version);
      if (kind === "delete")
        request = client
          .from(table)
          .delete()
          .eq("id", old.id)
          .eq("version", old._version);
      const { data, error } = await request.select("*").maybeSingle();
      if (error) throw error;
      if (!data) throw { code: "CONFLICT" };
      const result = structuredClone(after);
      if (kind !== "delete") {
        const index = result[collection].findIndex(
          (item) => item.id === row.id,
        );
        const canonical = { ...row, _version: data.version };
        if (collection === "agents") canonical._photoPath = data.photo_path;
        if (collection === "posts") canonical._imagePaths = data.image_paths;
        result[collection][index] = canonical;
      } else
        obsolete =
          collection === "posts"
            ? old._imagePaths || []
            : collection === "agents" && old._photoPath
              ? [old._photoPath]
              : [];
      // Database commit is the success boundary. Cleanup failures never mask a saved row.
      void removeFiles(obsolete);
      return result;
    } catch (error) {
      // Only remove freshly uploaded objects on a definite server rejection.
      // A transport failure may have happened after the DB committed: retain them.
      if (
        error?.code &&
        !["PGRST000", "PGRST001", "PGRST002"].includes(error.code)
      )
        await removeFiles(uploaded);
      throw error;
    }
  }
  async function previewLegacyAgents() {
    const rows = await fetchRows("agen");
    return rows.map((row) => {
      if (row.id == null || !row.nama?.trim() || !row.divisi?.trim()) {
        throw new Error(
          "Data agen lama belum lengkap. Lengkapi ID, nama, dan divisi sebelum impor.",
        );
      }
      return {
        legacy_id: String(row.id),
        name: row.nama.trim(),
        division: row.divisi.trim(),
        position: row.is_bph ? "BPH" : "Anggota",
      };
    });
  }
  async function importLegacyAgents(records) {
    const { data, error } = await client.rpc("ps_import_agents", { records });
    if (error) throw error;
    return data;
  }
  return {
    requireAdmin,
    load,
    commit,
    isSafeMedia,
    previewLegacyAgents,
    importLegacyAgents,
  };
}
