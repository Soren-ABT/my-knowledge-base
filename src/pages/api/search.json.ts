import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
  });

  const data = posts.map((post) => {
    const slug = post.id.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
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
