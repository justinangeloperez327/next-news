/**
 * Demo catalog. Stories are original evergreen explainers, NOT a live news feed.
 * Replace this module's in-memory catalog with a licensed server-side provider
 * before presenting Next News as a source of current news.
 */
export const CATEGORIES = [
  "World",
  "Technology",
  "Business",
  "Science",
  "Climate",
  "Culture",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type StoryTone = "blue" | "orange" | "green" | "violet" | "teal" | "rose";

export interface Story {
  slug: string;
  category: Category;
  title: string;
  excerpt: string;
  readingMinutes: number;
  tone: StoryTone;
  body: readonly string[];
}

export const STORIES: readonly Story[] = [
  {
    slug: "how-to-read-the-news-with-context",
    category: "World",
    title: "The context behind every headline matters",
    excerpt: "A practical approach to understanding the people, places, and history behind a developing story.",
    readingMinutes: 4,
    tone: "blue",
    body: [
      "A headline can tell you what happened, but it rarely tells you why. Good reporting makes room for the background that gives an event meaning: the timeline, the people involved, and the decisions that led to the present moment.",
      "Start by separating confirmed facts from statements, analysis, and speculation. Ask when an event took place, where the information originated, and whether other credible organizations have independently verified it.",
      "Context does not have to make a story complicated. The best explanations clarify what is known, what remains uncertain, and why the distinction matters.",
    ],
  },
  {
    slug: "the-technology-behind-a-trustworthy-news-feed",
    category: "Technology",
    title: "What makes a news feed trustworthy?",
    excerpt: "Source selection, timestamps, attribution, and careful curation are essential to a reliable reading experience.",
    readingMinutes: 5,
    tone: "violet",
    body: [
      "Building a news feed is more than collecting links. Every article has an origin, a publication time, a publisher, and a set of rights that determine how it can be displayed.",
      "A reliable platform preserves source attribution, distinguishes original reporting from syndicated content, and avoids presenting older stories as new. It also provides a clear route to the publisher's original article.",
      "The technology should help readers make informed decisions without concealing uncertainty. Transparent source policies and sensible caching matter as much as speed.",
    ],
  },
  {
    slug: "a-better-way-to-explain-business-numbers",
    category: "Business",
    title: "Reading business numbers beyond the chart",
    excerpt: "Learn to distinguish a meaningful trend from a striking but incomplete statistic.",
    readingMinutes: 4,
    tone: "orange",
    body: [
      "A percentage is useful only when readers understand what it measures. The starting value, time period, currency, and comparison group all change how a number should be interpreted.",
      "When a company reports growth, ask whether it refers to revenue, profit, customers, or another metric. Look for inflation effects, one-time items, and differences between forecasts and confirmed results.",
      "Clear financial reporting pairs the numbers with the assumptions and limitations needed to understand them.",
    ],
  },
  {
    slug: "how-scientific-discoveries-become-headlines",
    category: "Science",
    title: "From scientific paper to public headline",
    excerpt: "Why sample size, study design, and peer review deserve a place in science coverage.",
    readingMinutes: 5,
    tone: "teal",
    body: [
      "Scientific research often begins with a narrow question. News reports can inadvertently make a small finding sound broader than the evidence supports.",
      "Reading the original paper or a credible summary helps identify the study population, methods, and limitations. Observational findings can suggest relationships without proving causation.",
      "Responsible science reporting explains both the potential importance of a result and the questions that remain open.",
    ],
  },
  {
    slug: "climate-reporting-without-losing-the-details",
    category: "Climate",
    title: "Climate coverage needs local perspective",
    excerpt: "Explore how global patterns, regional impacts, and long-term data fit together.",
    readingMinutes: 4,
    tone: "green",
    body: [
      "Climate is measured over long periods, while weather describes conditions over shorter spans. Understanding the distinction is central to accurate environmental reporting.",
      "Local context matters. A regional report may depend on rainfall, temperature, geography, land use, or the quality and length of available records.",
      "Coverage that names its datasets and assumptions helps people understand how broad findings relate to specific communities.",
    ],
  },
  {
    slug: "the-stories-that-shape-culture",
    category: "Culture",
    title: "Why culture stories deserve close attention",
    excerpt: "Art, language, music, and shared experiences reveal how communities understand change.",
    readingMinutes: 3,
    tone: "rose",
    body: [
      "Culture reporting explores how people express themselves and respond to the world around them. It can examine both the work itself and the communities that give it meaning.",
      "A thoughtful review or profile makes clear where observation ends and interpretation begins. It also acknowledges the voices and historical context that influence a creative work.",
      "Stories about culture can be rigorous, accessible, and open to more than one informed interpretation.",
    ],
  },
];

export function getStory(slug: string): Story | undefined {
  return STORIES.find((story) => story.slug === slug);
}

export function getStories(filters: { category?: Category; query?: string } = {}): Story[] {
  const q = filters.query?.trim().toLocaleLowerCase() ?? "";

  return STORIES.filter((story) => {
    if (filters.category && story.category !== filters.category) return false;
    if (!q) return true;

    return [story.title, story.excerpt, story.category, ...story.body]
      .some((text) => text.toLocaleLowerCase().includes(q));
  });
}

export function parseCategory(value: string | undefined): Category | undefined {
  return CATEGORIES.find((category) => category.toLowerCase() === value?.toLowerCase());
}
