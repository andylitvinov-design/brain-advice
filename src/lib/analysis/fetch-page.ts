import { PageSnapshot } from "@/lib/types";

function decodeHtml(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function collectTagContents(html: string, tag: string) {
  return Array.from(html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => stripTags(match[1] ?? ""))
    .filter(Boolean);
}

function collectButtonsAndLinks(html: string) {
  return Array.from(html.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/(a|button)>/gi))
    .map((match) => stripTags(match[2] ?? ""))
    .filter(Boolean);
}

function collectSections(html: string) {
  return Array.from(
    html.matchAll(
      /<(section|article|main|div)\b[^>]*(class|id)="[^"]*(section|hero|offer|faq|testimonial|proof|cta)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    ),
  )
    .map((match) => stripTags(match[4] ?? ""))
    .filter(Boolean)
    .slice(0, 24);
}

function collectTrustSignals(bodyText: string) {
  const trustPatterns = [
    /\btestimonial\b/gi,
    /\breview\b/gi,
    /\btrusted\b/gi,
    /\bclient\b/gi,
    /\bcase study\b/gi,
    /\bresults\b/gi,
    /\bguarantee\b/gi,
    /\bproof\b/gi,
    /\bexperience\b/gi,
    /\bexpert\b/gi,
  ];

  return trustPatterns.flatMap((pattern) => bodyText.match(pattern) ?? []);
}

function collectFaqItems(html: string, bodyText: string) {
  const headingHits = Array.from(html.matchAll(/<(h2|h3|summary)\b[^>]*>([\s\S]*?)<\/(h2|h3|summary)>/gi))
    .map((match) => stripTags(match[2] ?? ""))
    .filter((item) => /\bfaq\b|\bquestion\b|\bhow\b|\bwhat\b|\bwhy\b|\bwhen\b/i.test(item));

  if (headingHits.length > 0) {
    return headingHits;
  }

  return Array.from(bodyText.matchAll(/\?(?=\s|$)/g)).map(() => "Question").slice(0, 10);
}

export async function fetchPageSnapshot(pageUrl: string): Promise<PageSnapshot> {
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "AdviceMVP/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  const bodyText = stripTags(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " "),
  );
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescriptionMatch = html.match(
    /<meta\b[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i,
  );
  const headings = Array.from(html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((match) =>
    stripTags(match[1] ?? ""),
  );

  return {
    pageUrl,
    title: stripTags(titleMatch?.[1] ?? ""),
    metaDescription: stripTags(metaDescriptionMatch?.[1] ?? ""),
    headline: headings[0] ?? "",
    headings,
    ctas: collectButtonsAndLinks(html),
    forms: Array.from(html.matchAll(/<form\b/gi)).map((_, index) => `Form ${index + 1}`),
    sections: collectSections(html),
    trustSignals: collectTrustSignals(bodyText),
    faqItems: collectFaqItems(html, bodyText),
    paragraphs: collectTagContents(html, "p"),
    bodyText,
  };
}
