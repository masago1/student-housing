export default function robots() {
  const baseUrl = "https://shaus.ro";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/dashboard/",
        "/adaugaproprietate",
        "/adaugaproprietate/",
      ],
    },

    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
