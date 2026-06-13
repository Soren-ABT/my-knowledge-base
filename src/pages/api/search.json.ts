import { getCollection } from "astro:content";
import { normalizeSlug } from "../../utils/slug";

export async function GET() {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
  });

  const data = posts.map((post) => {
    const slug = normalizeSlug(post.id);
    return {
      title: post.data.title,
      slug,
      description: post.data.description,
      tags: post.data.tags,
    };
  });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
