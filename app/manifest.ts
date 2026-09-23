import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sem Performance",
    short_name: "Sem Performance",
    description: "Football conditioning, strength and recovery performance OS.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    categories: ["health", "fitness", "sports"],
  };
}
