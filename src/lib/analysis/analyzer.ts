import {
  AnalysisResult,
  CriterionScore,
  DashboardConfig,
  DashboardCriterionId,
  PageSnapshot,
} from "@/lib/types";

export interface Analyzer {
  analyze(pageSnapshot: PageSnapshot, dashboard: DashboardConfig): AnalysisResult;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function firstWords(value: string, count: number) {
  return value.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function headlineScore(snapshot: PageSnapshot) {
  const headline = snapshot.headline.trim();
  const words = headline.split(/\s+/).filter(Boolean);
  let score = 35;
  if (headline.length >= 18) score += 18;
  if (headline.length <= 92) score += 16;
  if (words.length >= 4 && words.length <= 12) score += 18;
  if (snapshot.metaDescription && snapshot.title) score += 8;
  if (snapshot.title && headline && snapshot.title.toLowerCase().includes(firstWords(headline, 2).toLowerCase())) {
    score += 5;
  }
  return clampScore(score);
}

function ctaScore(snapshot: PageSnapshot) {
  const ctaCount = snapshot.ctas.length;
  const bodyText = snapshot.ctas.join(" ").toLowerCase();
  let score = 24;
  if (ctaCount >= 1) score += 22;
  if (ctaCount >= 2 && ctaCount <= 4) score += 18;
  if (/(book|start|get|talk|request|try|contact|learn|apply|join|improve)/i.test(bodyText)) score += 18;
  if (snapshot.forms.length > 0) score += 10;
  return clampScore(score);
}

function offerScore(snapshot: PageSnapshot) {
  const body = snapshot.bodyText.toLowerCase();
  let score = 22;
  if (/\bfor\b|\bwho\b|\bincludes\b|\bwhat you get\b|\bpackage\b|\bservice\b|\bplan\b/i.test(body)) score += 22;
  if (/\bprice\b|\bpricing\b|\bfrom \$|\bfrom £|\bfrom €|\bper month\b|\bper week\b/i.test(body)) score += 14;
  if (snapshot.sections.length >= 3) score += 10;
  if (snapshot.headings.length >= 3) score += 8;
  return clampScore(score);
}

function trustScore(snapshot: PageSnapshot) {
  const body = snapshot.bodyText.toLowerCase();
  let score = 18;
  if (snapshot.trustSignals.length >= 2) score += 22;
  if (/\btestimonial\b|\breview\b|\bclient\b|\btrusted\b|\bresults\b/i.test(body)) score += 18;
  if (/\bexperience\b|\bexpert\b|\byears\b|\bcase study\b/i.test(body)) score += 14;
  if (snapshot.faqItems.length >= 2) score += 8;
  return clampScore(score);
}

function structureScore(snapshot: PageSnapshot) {
  let score = 28;
  if (snapshot.headings.length >= 3) score += 18;
  if (snapshot.sections.length >= 3) score += 18;
  if (snapshot.paragraphs.length >= 4) score += 8;
  return clampScore(score);
}

function readabilityScore(snapshot: PageSnapshot) {
  const words = snapshot.bodyText.split(/\s+/).filter(Boolean);
  const avgParagraphLength =
    snapshot.paragraphs.length > 0
      ? snapshot.paragraphs.reduce((sum, paragraph) => sum + paragraph.split(/\s+/).filter(Boolean).length, 0) /
        snapshot.paragraphs.length
      : words.length;
  let score = 30;
  if (words.length >= 120 && words.length <= 900) score += 20;
  if (avgParagraphLength <= 34) score += 18;
  if (snapshot.headings.length >= 3) score += 12;
  return clampScore(score);
}

function hierarchyScore(snapshot: PageSnapshot) {
  let score = 24;
  if (snapshot.headline) score += 16;
  if (snapshot.ctas.length >= 1) score += 18;
  if (snapshot.headings.length >= 3) score += 14;
  if (snapshot.sections.length >= 4) score += 10;
  if (snapshot.forms.length > 0 || snapshot.ctas.length >= 2) score += 10;
  return clampScore(score);
}

function focusScore(snapshot: PageSnapshot) {
  let score = 35;
  if (snapshot.ctas.length >= 1 && snapshot.ctas.length <= 3) score += 22;
  if (snapshot.forms.length <= 1) score += 10;
  if (snapshot.headings.length >= 2) score += 10;
  if (snapshot.ctas.length > 4) score -= 12;
  return clampScore(score);
}

function technicalScore(snapshot: PageSnapshot) {
  let score = 48;
  if (snapshot.title) score += 12;
  if (snapshot.metaDescription) score += 10;
  if (snapshot.headings.length >= 1) score += 8;
  if (snapshot.sections.length >= 2) score += 6;
  if (snapshot.bodyText.length > 0) score += 6;
  return clampScore(score);
}

function criterionScore(id: DashboardCriterionId, label: string, snapshot: PageSnapshot): CriterionScore {
  const externalMap: Record<string, Omit<CriterionScore, "id">> = {
    clarity: {
      label,
      score: headlineScore(snapshot),
      summary:
        snapshot.headline.length > 0
          ? `Current headline: "${firstWords(snapshot.headline, 12)}".`
          : "No strong H1 headline was detected.",
    },
    cta: {
      label,
      score: ctaScore(snapshot),
      summary: snapshot.ctas.length > 0 ? `${snapshot.ctas.length} CTA-like actions detected.` : "No clear CTA actions were detected.",
    },
    proof: {
      label,
      score: trustScore(snapshot),
      summary:
        snapshot.trustSignals.length > 0
          ? `${snapshot.trustSignals.length} trust-related signals were detected.`
          : "Trust proof appears thin or missing.",
    },
    offer: {
      label,
      score: offerScore(snapshot),
      summary: snapshot.metaDescription
        ? "Meta description exists, but offer detail depends on page structure."
        : "Offer framing likely stays weak because the page lacks a usable meta description.",
    },
    hierarchy: {
      label,
      score: hierarchyScore(snapshot),
      summary: "Estimated from the first headline, CTA density, and section rhythm.",
    },
    focus: {
      label,
      score: focusScore(snapshot),
      summary: `${snapshot.ctas.length} CTA actions and ${snapshot.forms.length} forms were detected.`,
    },
    technical: {
      label,
      score: technicalScore(snapshot),
      summary: `Title: ${snapshot.title ? "yes" : "no"}, description: ${snapshot.metaDescription ? "yes" : "no"}, sections: ${snapshot.sections.length}.`,
    },
  };

  const fallbackMap: Record<string, Omit<CriterionScore, "id">> = {
    "headline-clarity": externalMap.clarity,
    "cta-strength": externalMap.cta,
    "offer-clarity": externalMap.offer,
    "trust-elements": externalMap.proof,
    structure: {
      label,
      score: structureScore(snapshot),
      summary: `${snapshot.headings.length} headings and ${snapshot.sections.length} sections detected.`,
    },
    readability: {
      label,
      score: readabilityScore(snapshot),
      summary: `${snapshot.bodyText.split(/\s+/).filter(Boolean).length} words detected in total.`,
    },
    "visual-hierarchy": externalMap.hierarchy,
  };

  return { id, ...(externalMap[id] ?? fallbackMap[id] ?? fallbackMap.readability) };
}

function recommendation(id: DashboardCriterionId) {
  return (
    {
      clarity: "Simplify the promise so the page is understandable in one fast read.",
      cta: "Make the main CTA more explicit and reduce branching around the next step.",
      proof: "Add stronger trust proof such as testimonials, specifics, results, or grounded evidence.",
      offer: "Clarify what is included, who it is for, and what happens next.",
      hierarchy: "Improve scan paths, section emphasis, and first-screen visual hierarchy.",
      focus: "Reduce competing actions so the page drives one clearer decision path.",
      technical: "Tighten structural and metadata quality so the page is more stable and production-ready.",
      "headline-clarity": "Simplify the first-screen headline so the core promise lands in one read.",
      "cta-strength": "Make the primary CTA more explicit and repeat it with less ambiguity.",
      "offer-clarity": "Clarify what is included, who it is for, and what happens next.",
      "trust-elements": "Add stronger proof such as testimonials, results, or credibility cues.",
      structure: "Restructure the page so each section advances one clear decision step.",
      readability: "Shorten paragraphs and increase scan-friendly headings and lists.",
      "visual-hierarchy": "Strengthen visual emphasis around the hero, CTA, and section transitions.",
    }[id] ?? "Improve the weakest part of the page with a clearer and more focused structure."
  );
}

export class RuleBasedAnalyzer implements Analyzer {
  analyze(pageSnapshot: PageSnapshot, dashboard: DashboardConfig): AnalysisResult {
    const scores = dashboard.criteria.map((criterion) => criterionScore(criterion.id, criterion.label, pageSnapshot));
    const overallScore = clampScore(
      scores.reduce((sum, score) => sum + score.score * (dashboard.weights[score.id] / 100), 0),
    );
    const weakest = [...scores].sort((left, right) => left.score - right.score);

    return {
      overallScore,
      criterionScores: scores,
      mainWeakPoints: weakest.slice(0, 4).map((item) => item.label.toLowerCase()),
      recommendations: weakest.slice(0, 4).map((item) => recommendation(item.id)),
      priorityImprovements: weakest
        .slice(0, 3)
        .map((item, index) => `${index + 1}. ${recommendation(item.id)}`),
      sourceSnapshot: {
        title: pageSnapshot.title,
        metaDescription: pageSnapshot.metaDescription,
        pageUrl: pageSnapshot.pageUrl,
        headline: pageSnapshot.headline,
        headingCount: pageSnapshot.headings.length,
        sectionCount: pageSnapshot.sections.length,
        ctaCount: pageSnapshot.ctas.length,
        formCount: pageSnapshot.forms.length,
        trustSignalCount: pageSnapshot.trustSignals.length,
        faqCount: pageSnapshot.faqItems.length,
        wordCount: pageSnapshot.bodyText.split(/\s+/).filter(Boolean).length,
      },
    };
  }
}
