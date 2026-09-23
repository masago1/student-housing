import "server-only";

const BUCKET = "listing-images";
const PAGE_SIZE = 100;

async function requireSuccess(operation) {
  const result = await operation;
  if (result.error) throw new Error("Account deletion step failed");
  return result.data;
}

// Paginate completely before deleting: deleting while incrementing an offset skips objects.
async function listFiles(bucket, prefix) {
  const paths = [];
  const folders = [prefix];
  while (folders.length) {
    const folder = folders.pop();
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const entries = await requireSuccess(bucket.list(folder, {
        limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" },
      }));
      if (!Array.isArray(entries)) throw new Error("Invalid storage response");
      for (const entry of entries) {
        if (!entry.name || entry.name.includes("/") || [".", ".."].includes(entry.name)) {
          throw new Error("Invalid storage path");
        }
        const path = `${folder}/${entry.name}`;
        if (entry.id == null) folders.push(path);
        else paths.push(path);
      }
      if (entries.length < PAGE_SIZE) break;
    }
  }
  return paths;
}

export async function deleteAccount(admin, userId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid authenticated account");
  }
  // Required setup RPC verifies paths and blocks further writes before any file removal.
  await requireSuccess(admin.rpc("prepare_account_deletion", { target_user_id: userId }));
  const bucket = admin.storage.from(BUCKET);
  const paths = await listFiles(bucket, userId);
  for (let i = 0; i < paths.length; i += 100) {
    await requireSuccess(bucket.remove(paths.slice(i, i + 100)));
  }
  if ((await listFiles(bucket, userId)).length) throw new Error("Storage cleanup incomplete");

  // All known relational deletions happen in one database transaction.
  await requireSuccess(admin.rpc("purge_account_data", { target_user_id: userId }));
  // Auth last: a failure leaves an authenticated retry path and the deletion guard in place.
  await requireSuccess(admin.auth.admin.deleteUser(userId, false));
}
