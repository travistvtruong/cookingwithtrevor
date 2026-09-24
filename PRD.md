# Recipe Tracker & Food Blog PRD

Sep 24, 2026 · @Travis

## Overview

cookingwithtrevor is a responsive website that combines a public food blog with a personal recipe tracker. Visitors can read, rate and comment on recipes. Signed-in users can save their own and imported recipes, then turn any recipe into a grocery list.

The site doubles as a portfolio project, so clean code, a live demo and a well-documented build matter as much as the features.

## Goals and non-goals

**Goals**

- Publish blog-style recipe posts that are easy to read and share
- Give users one place to save recipes, including ones from other sites
- Generate a combined grocery list from one or more recipes
- Let readers rate and comment on recipes
- Ship a polished, deployed project for a resume and portfolio

**Non-goals (for v1)**

- Native iOS or Android apps
- Weekly meal planning
- Nutrition or calorie tracking
- Monetization (ads, paid tiers)

## Target users

| User | Who they are | What they want |
| --- | --- | --- |
| Reader | Someone who lands on a recipe from Google or a shared link | A clean recipe without scrolling past a life story; a way to rate it |
| Home cook | A signed-in user who cooks often | One library for all their recipes, plus a quick grocery list |
| Author (admin) | You | An easy way to write, edit and publish posts |
| Recruiter | Someone reviewing your portfolio | A live, working site and a clear README |

## Platform decision

Build a responsive website first, with the option to make it an installable web app (PWA) later. A public blog needs search traffic and shareable links, which a native app can't provide.

| Option | Pros | Cons |
| --- | --- | --- |
| Responsive website (chosen) | SEO, shareable links, one codebase, easy to demo | No offline use without extra work |
| PWA (later) | Installable on phones, offline grocery list | Some extra setup |
| Native app | Best phone experience, camera access | No SEO, app store review, two platforms |

## Core features

**1. Blog posts.** Each recipe is a post with a title, hero photo, short intro, ingredients, steps, prep and cook time, servings and tags. A "Jump to recipe" button sits at the top. Posts are public and indexed by search engines.

**2. Recipe library.** Signed-in users save any blog recipe to their library with one click. They can also add private recipes by hand, search by name or tag, and add personal notes.

**3. Import from other sites.** Users paste a URL and the site pulls the recipe in. Most food sites publish recipe data in a standard format (schema.org Recipe), so the importer reads that first. Users can edit anything that comes in wrong before saving.

**4. Grocery list.** Users pick one or more recipes and get a single combined list. Matching ingredients are merged (2 eggs + 3 eggs = 5 eggs). Items can be checked off and the list works well on a phone.

**5. Comments and ratings.** Signed-in users leave a 1 to 5 star rating and a comment. Each recipe shows its average rating. The author can delete comments, and new accounts are rate-limited to cut spam.

## User stories

- As a reader, I want to jump straight to the recipe so I don't have to scroll.
- As a reader, I want to see ratings so I know if a recipe is worth trying.
- As a home cook, I want to save a blog recipe to my library in one click.
- As a home cook, I want to paste a link from another site and have the recipe saved.
- As a home cook, I want to pick three recipes and get one grocery list.
- As a home cook, I want to check items off my list at the store on my phone.
- As the author, I want to write and publish a post without touching code.
- As the author, I want to remove spam comments.

## Requirements

MVP items ship first; everything else waits until the MVP is live.

| ID | Requirement | Priority |
| --- | --- | --- |
| R1 | Public recipe posts with ingredients, steps, times, tags and photo | MVP |
| R2 | Author dashboard to create, edit and publish posts | MVP |
| R3 | User sign-up and login (email or Google) | MVP |
| R4 | Save recipes to a personal library; search by name and tag | MVP |
| R5 | Grocery list from one or more recipes, with merged items and checkboxes | MVP |
| R6 | Star ratings and comments on posts | MVP |
| R7 | Import a recipe from a URL, with an edit step before saving | Later |
| R8 | Mobile-friendly layout on all pages | MVP |
| R9 | Serving size scaler that updates ingredient amounts | Later |
| R10 | Grocery list grouped by store section | Later |
| R11 | Installable PWA with offline grocery list | Later |
| R12 | Print-friendly recipe view | Later |
| R13 | Page load under 2 seconds on mobile | MVP |

## Tech stack and data model

Suggested stack: Next.js (React) for pages and SEO, Supabase for the Postgres database, login and image storage, Tailwind for styling, and Vercel for free hosting. All of it has a free tier and looks strong on a resume.

| Table | Key fields |
| --- | --- |
| users | id, name, email, role (reader or admin) |
| recipes | id, author\_id, title, slug, intro, photo\_url, prep\_min, cook\_min, servings, tags, is\_public, source\_url |
| ingredients | id, recipe\_id, quantity, unit, name |
| steps | id, recipe\_id, order, text |
| saved\_recipes | user\_id, recipe\_id, notes |
| ratings\_comments | id, recipe\_id, user\_id, stars, comment, created\_at |
| grocery\_lists | id, user\_id, items (name, quantity, unit, checked) |

Imported recipes are stored as private recipes with source\_url set, so they never appear on the public blog.

Security basics: row-level security so users only see their own library and lists, input sanitizing on comments, and rate limits on sign-up, comments and imports.

## Success metrics

| Metric | Target (first 3 months after launch) |
| --- | --- |
| Published recipe posts | 15+ |
| Registered users | 50+ |
| URL imports that succeed without manual fixes | 80%+ |
| Grocery lists created | 100+ |
| Posts with at least one rating | 50%+ |
| Lighthouse performance score on mobile | 90+ |

Portfolio success: a live URL, a public GitHub repo with a clear README, and a short demo video.

## Milestones

Solo build over one weekend, about 20 to 24 hours of work. That is tight for this MVP, so the plan leans on Supabase's built-in login and cuts anything unfinished by Sunday night to Later.

| When | Milestone |
| --- | --- |
| Friday night | Project setup, database schema, login, deploy a blank site |
| Saturday morning | Blog post pages and a basic author dashboard |
| Saturday afternoon | Recipe library and save button |
| Saturday night | Grocery list |
| Sunday morning | Ratings and comments |
| Sunday afternoon | Mobile polish, testing and launch |
| Sunday night | README and demo video |

If time runs short, cut in this order: the author dashboard (write posts directly in Supabase instead), then comments (keep star ratings).

## Risks and open questions

| Risk | Plan |
| --- | --- |
| Some sites block scraping or lack recipe data | Fall back to a manual edit form; show a clear error |
| Copyright on imported recipes | Keep imports private and always link the source |
| Comment spam | Login required, rate limits, admin delete |
| Merging ingredients with different units (cups vs grams) | Only merge matching units in v1 |
| Scope creep | Hold "Later" items until the MVP is live |

- [x] Site name and domain? **cookingwithtrevor**
- [x] Who can comment? **Anyone can sign up**
- [ ] Will you write all the posts, or allow guest authors later?
- [x] Solo build or with teammates? **Solo**
