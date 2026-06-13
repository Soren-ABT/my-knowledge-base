import type { APIContext, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";

import { profileConfig, siteConfig } from "../../config";
import { normalizeSlug } from "../../utils/slug";

interface FontOptions {
  data: Buffer | ArrayBuffer;
  name: string;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
}

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  if (!siteConfig.generateOgImages) return [];

  const allPosts = await getCollection("posts");
  const published = allPosts.filter((p) => !p.data.draft);

  return published.map((post) => {
    const slug = normalizeSlug(post.id);
    return { params: { slug }, props: { post } };
  });
};

let fontCache: { regular: Buffer | null; bold: Buffer | null } | null = null;

async function fetchFonts() {
  if (fontCache) return fontCache;

  try {
    const cssResp = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap",
    );
    if (!cssResp.ok) throw new Error("Google Fonts CSS fetch failed");
    const cssText = await cssResp.text();

    const getUrl = (weight: number) => {
      const re = new RegExp(`@font-face\\s*{[^}]*font-weight:\\s*${weight}[^}]*}`);
      const match = cssText.match(re);
      const urlMatch = match?.[0]?.match(/url\((https:[^)]+)\)/);
      return urlMatch?.[1] || null;
    };

    const regularUrl = getUrl(400);
    const boldUrl = getUrl(700);

    if (!regularUrl || !boldUrl) {
      fontCache = { regular: null, bold: null };
      return fontCache;
    }

    const [rResp, bResp] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
    if (!rResp.ok || !bResp.ok) {
      fontCache = { regular: null, bold: null };
      return fontCache;
    }

    const rBuf = Buffer.from(await rResp.arrayBuffer());
    const bBuf = Buffer.from(await bResp.arrayBuffer());
    fontCache = { regular: rBuf, bold: bBuf };
    return fontCache;
  } catch {
    fontCache = { regular: null, bold: null };
    return fontCache;
  }
}

export async function GET({ props }: APIContext<{ post: any }>) {
  const { post } = props;
  const { regular: fontRegular, bold: fontBold } = await fetchFonts();

  const fonts: FontOptions[] = [];
  if (fontRegular)
    fonts.push({ name: "Noto Sans SC", data: fontRegular, weight: 400, style: "normal" });
  if (fontBold) fonts.push({ name: "Noto Sans SC", data: fontBold, weight: 700, style: "normal" });

  // Fonts must be available for satori to work
  if (fonts.length === 0) {
    return new Response(null, { status: 404 });
  }

  const hue = siteConfig.themeColor.hue;
  const primary = `hsl(${hue}, 90%, 65%)`;
  const text = "hsl(0, 0%, 95%)";
  const subtle = `hsl(${hue}, 10%, 75%)`;
  const bg = `hsl(${hue}, 15%, 12%)`;

  const pubDate = post.data.published.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const template = {
    type: "div",
    props: {
      style: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        fontFamily: '"Noto Sans SC", sans-serif',
        padding: "60px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "32px",
                    fontWeight: 600,
                    color: subtle,
                  },
                  children: siteConfig.title,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              gap: "20px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "8px",
                    height: "80px",
                    backgroundColor: primary,
                    borderRadius: "6px",
                    marginTop: "10px",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "64px",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: text,
                    display: "-webkit-box",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineClamp: 3,
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  },
                  children: post.data.title,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "24px", fontWeight: 600, color: text },
                  children: profileConfig.name,
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: "24px", color: subtle },
                  children: pubDate,
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(template, { width: 1200, height: 630, fonts });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
