"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { MAX_COLLECTION_NAME, cleanCollectionName } from "@/lib/collections";

export type CollectionState = { error?: string; message?: string };

function validName(raw: unknown): { name: string } | { error: string } {
  const name = cleanCollectionName(raw);
  if (!name) return { error: "Give the collection a name." };
  if (name.length > MAX_COLLECTION_NAME) return { error: `Keep names under ${MAX_COLLECTION_NAME} characters.` };
  return { name };
}

// Create a collection; optionally add a recipe to it straight away
// (the "New collection" box on a recipe's library page).
export async function createCollection(
  recipeId: string | null,
  _prev: CollectionState,
  formData: FormData,
): Promise<CollectionState> {
  const { supabase } = await requireUser();
  const checked = validName(formData.get("name"));
  if ("error" in checked) return checked;

  const { data, error } = await supabase.from("collections").insert({ name: checked.name }).select("id");
  if (error) {
    if (error.code === "23505") return { error: "You already have a collection with that name." };
    if (error.code === "P0001") return { error: error.message }; // 50-collection limit
    return { error: "Could not create the collection. Please try again." };
  }
  const id = (data as { id: string }[])[0]?.id;

  if (recipeId && id) {
    const { error: addError } = await supabase.from("collection_recipes").insert({ collection_id: id, recipe_id: recipeId });
    if (addError) return { error: "Created the collection, but couldn't add this recipe to it." };
  }

  revalidatePath("/library", "layout");
  return { message: recipeId ? `Added to “${checked.name}”.` : `Created “${checked.name}”.` };
}

// Add a library recipe to a collection, or take it out.
export async function setInCollection(
  collectionId: string,
  recipeId: string,
  inCollection: boolean,
): Promise<CollectionState> {
  const { supabase } = await requireUser();
  const { error } = inCollection
    ? await supabase.from("collection_recipes").insert({ collection_id: collectionId, recipe_id: recipeId })
    : await supabase.from("collection_recipes").delete().eq("collection_id", collectionId).eq("recipe_id", recipeId);

  // Adding something that's already there is fine.
  if (error && error.code !== "23505") {
    // RLS refuses recipes that aren't in your library, or someone else's collection.
    return { error: "Couldn't update that collection. Is the recipe still in your library?" };
  }
  revalidatePath("/library", "layout");
  return {};
}

export async function renameCollection(
  collectionId: string,
  _prev: CollectionState,
  formData: FormData,
): Promise<CollectionState> {
  const { supabase, userId } = await requireUser();
  const checked = validName(formData.get("name"));
  if ("error" in checked) return checked;

  const { data, error } = await supabase
    .from("collections")
    .update({ name: checked.name })
    .eq("id", collectionId)
    .eq("user_id", userId)
    .select("id");
  if (error?.code === "23505") return { error: "You already have a collection with that name." };
  if (error || !(data as unknown[]).length) return { error: "Could not rename the collection." };

  revalidatePath("/library", "layout");
  return { message: "Renamed." };
}

// Deletes the collection only; its recipes stay in the library.
export async function deleteCollection(collectionId: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId)
    .select("id");
  if (error || !(data as unknown[]).length) return { error: "Could not delete the collection." };

  revalidatePath("/library", "layout");
  redirect("/library");
}
