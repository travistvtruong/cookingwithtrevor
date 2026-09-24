import { RecipeForm } from "../recipe-form";

export default function NewRecipePage() {
  return (
    <main className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">New post</h1>
      <RecipeForm
        initial={{
          title: "",
          slug: "",
          intro: "",
          photo_url: "",
          prep_min: "",
          cook_min: "",
          servings: "",
          tags: "",
          ingredients: "",
          steps: "",
          is_public: false,
        }}
      />
    </main>
  );
}
