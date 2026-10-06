"use server";

import { redirect } from "next/navigation";
import { DELETE_CONFIRMATION } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; message?: string };

const MAX_NAME = 80;

export async function updateName(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  if (name.length > MAX_NAME) return { error: `Keep it under ${MAX_NAME} characters.` };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { error: "Please sign in again." };

  const { error } = await supabase.from("profiles").update({ name }).eq("id", userId);
  if (error) return { error: `Couldn't save your name: ${error.message}` };
  return { message: "Name saved." };
}

// Removes the user's private photos, then the account itself (which cascades
// to everything else they own, see the delete_account migration).
export async function deleteAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (typed !== DELETE_CONFIRMATION) return { error: `Type "${DELETE_CONFIRMATION}" to confirm.` };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { error: "Please sign in again." };

  // Photos first: once the account is gone, nobody may delete them any more.
  // list() returns up to 100 files at a time, so repeat until the folder is empty.
  const bucket = supabase.storage.from("user-photos");
  for (let round = 0; round < 50; round++) {
    const { data: files, error: listError } = await bucket.list(userId, { limit: 100 });
    if (listError) return { error: `Couldn't delete your photos: ${listError.message}` };
    if (!files || files.length === 0) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return { error: `Couldn't delete your photos: ${removeError.message}` };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    if (error.message.includes("admin accounts")) {
      return { error: "Admin accounts can't be deleted from the site." };
    }
    return { error: `Couldn't delete your account: ${error.message}` };
  }

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
