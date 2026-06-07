import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig, profileConfig } from "../config";

export async function GET() {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? !data.draft : true;
  });

  const sorted = posts.sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle,
    site: siteConfig.siteURL,
    items: sorted.map((post) => {
      const slug = post.id.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.published,
        link: `/posts/${slug}/`,
        categories: post.data.tags,
      };
    }),
    customData: `<language>${siteConfig.lang}</language>`,
  });
}
