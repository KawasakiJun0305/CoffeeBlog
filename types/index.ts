export type ArticleCategory = "beans" | "brewing" | "cafe" | "equipment" | "culture";

export interface GeneratedArticle {
  title: string;
  body: string;
  category: ArticleCategory;
  topic: string;
  generatedAt: string;
}

export interface PipelineConfig {
  dryRun: boolean;
  category?: ArticleCategory;
  topic?: string;
}

export interface PipelineResult {
  success: boolean;
  article?: GeneratedArticle;
  noteUrl?: string;
  error?: string;
}
