import { Html, Head, Main, NextScript } from "next/document";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://lost-media-dev.vercel.app");

export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* Title & Favicon - sama dengan logo navbar */}
        <title>Lost Media</title>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* Metadata */}
        <meta name="application-name" content="Lost Media" />
        <meta name="description" content="Lost Media - Platform untuk media yang jarang orang ketahui" />
        <meta name="theme-color" content="#0a0a0a" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Lost Media" />
        <meta property="og:title" content="Lost Media - Platform Media Sosial" />
        <meta property="og:description" content="Platform untuk media yang jarang orang ketahui" />
        <meta property="og:image" content={`${SITE_URL}/logo.png`} />
        <meta property="og:locale" content="id_ID" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Lost Media" />
        <meta name="twitter:description" content="Platform untuk media yang jarang orang ketahui" />
        <meta name="twitter:image" content={`${SITE_URL}/logo.png`} />

        {/* Font Awesome 5 Free - for role badges (god_badge, vip_badge, mvp_badge) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
          integrity="sha512-1ycn6IcaQQ40/MKBW2W4Rhis/DbILU74C1vSrLJxCq57o941Ym01SwNsOMqvEBFlcgUa6xLiPY/NS5R+E6ztJQ=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
