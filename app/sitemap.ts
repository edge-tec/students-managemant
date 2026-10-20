import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const currentDate = new Date();

  const routes = [
    "",
    "/ssc",
    "/hsc",
    "/medical",
    "/university",
    "/pricing",
    "/questions",
    "/library",
    "/ai-assistant",
    "/terms",
    "/privacy",
    "/refund",
    "/login",
    "/register",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
    priority: route === "" ? 1.0 : route.startsWith("/ssc") || route.startsWith("/hsc") ? 0.9 : 0.7,
  }));
}
