declare module "*.md" {
  const mod: import("./manifest.js").DocModule;
  export const html: string;
  export const meta: { title: string; description?: string; order?: number };
  export const toc: import("./manifest.js").TocEntry[];
  export default mod;
}

declare module "*.yaml?raw" {
  const content: string;
  export default content;
}
