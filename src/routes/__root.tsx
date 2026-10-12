import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "My Routine Tano";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Asistente personal para organizar el día, preparar mañana y equilibrar estudio, trabajo, familia y descanso.",
      },
      { property: "og:title", content: "My Routine Tano" },
      {
        property: "og:description",
        content: "Organiza hoy, construye tu mañana.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/routine-icon.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1080" },
      { property: "og:image:height", content: "1080" },
      { property: "og:image:alt", content: "Logo de My Routine Tano" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "My Routine Tano" },
      {
        name: "twitter:description",
        content: "Organiza hoy, construye tu mañana.",
      },
      { name: "twitter:image", content: "/routine-icon.png" },
      { name: "theme-color", content: "#0E5A43" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/icon-192.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
