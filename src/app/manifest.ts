import type { MetadataRoute } from "next";

// Lets you "Add to Home Screen" on your phone so VA Hub opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VA Hub",
    short_name: "VA Hub",
    description: "Clients, projects, tasks and leads in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#fbfbfa",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
