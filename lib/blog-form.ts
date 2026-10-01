import { z } from "zod";
import { PUBLIC_BUCKET, photoRef } from "@/lib/photos";
import { slugify } from "@/lib/slugify";

export type BlogFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_photo_url: string;
  tags: string;
  is_public: boolean;
};

export type BlogFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof BlogFormValues, string>>;
  values?: BlogFormValues;
};

export const EMPTY_BLOG_POST: BlogFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_photo_url: "",
  tags: "",
  is_public: false,
};

const schema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes."),
  excerpt: z.string().trim().max(300, "Keep the summary under 300 characters."),
  body: z.string().trim().min(1, "Write something first.").max(50000),
  cover_photo_url: z
    .string()
    .trim()
    .refine((v) => v === "" || photoRef(v)?.bucket === PUBLIC_BUCKET, "Upload the photo using the button.")
    .transform((v) => v || null),
  tags: z.string().transform((v) => [...new Set(v.split(",").map(slugify).filter(Boolean))].slice(0, 10)),
  is_public: z.boolean(),
});

export type ParsedBlogPost = z.output<typeof schema>;

export function readBlogForm(formData: FormData): BlogFormValues {
  const get = (key: string) => String(formData.get(key) ?? "");
  return {
    title: get("title"),
    slug: get("slug"),
    excerpt: get("excerpt"),
    body: get("body"),
    // The shared photo uploader submits its value as "photo_url".
    cover_photo_url: get("photo_url"),
    tags: get("tags"),
    is_public: formData.get("intent") === "publish",
  };
}

export function validateBlogPost(values: BlogFormValues): { data: ParsedBlogPost } | { state: BlogFormState } {
  const parsed = schema.safeParse(values);
  if (parsed.success) {
    const data = parsed.data;
    data.slug ||= slugify(data.title);
    if (!data.slug) return { state: { fieldErrors: { slug: "Add a URL slug." }, values } };
    return { data };
  }
  const fieldErrors: BlogFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof BlogFormValues;
    fieldErrors[key] ??= issue.message;
  }
  return { state: { error: "Please fix the highlighted fields.", fieldErrors, values } };
}
