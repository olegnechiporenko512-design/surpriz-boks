import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Boot } from "@/components/boot";
import appCss from "../styles.css?url";

const APP_NAME = "Сюрприз бокс — Mystery Box −35%";
const FB_PIXEL_ID = "1749190629525376";

function fbPixelSnippet(viewContent: boolean): string {
  const content = viewContent
    ? `fbq('track','ViewContent',{content_name:'Сюрприз бокс',content_type:'product',value:599,currency:'UAH'});`
    : "";
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,'${FB_PIXEL_ID}');fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');${content}`;
}

function RootDocument() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: fbPixelSnippet(pathname === "/") }} />
        <noscript>
          <img
            height="1"
            width="1"
            alt=""
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <script defer src="/_vercel/insights/script.js" />
      </head>
      <body>
        <PreviewHostBridge />
        <Boot />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Сюрприз бокс з трендовими товарами. Small 599 грн, Medium 999, Maxi 1499, Ultra 1999. Акція −35%, оплата при отриманні.",
      },
      { name: "theme-color", content: "#1c140c" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});
