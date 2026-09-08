export const config = {
  runtime: 'edge', // Runs on Vercel's Edge Network for instant response times
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('id');
  const baseUrl = 'https://boonnewsng.vercel.app';
  const firebaseProjectId = 'primeintelmedia-e2fe3';

  // 1. Fetch static reader.html template via URL
  const htmlResponse = await fetch(`${baseUrl}/reader.html`);
  let html = await htmlResponse.text();

  // Return base template if no article ID is present
  if (!articleId) {
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  try {
    // 2. Fetch raw article data from Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/newsPosts/${articleId}`;
    const res = await fetch(firestoreUrl);

    if (res.ok) {
      const data = await res.json();
      const fields = data.fields || {};

      // Map Firestore fields with safe fallbacks
      const rawTitle = fields.title?.stringValue || 'Boon News';
      const title = `${rawTitle} | BoonNews`;
      const summary = fields.summary?.stringValue || 
                      fields.content?.stringValue?.replace(/<[^>]*>?/gm, '').substring(0, 155) || 
                      'Read full news articles, analysis, and breaking updates on BoonNews.';
      const image = fields.imageUrl?.stringValue || `${baseUrl}/boon-news-og-banner.jpg`;
      const author = fields.authorName?.stringValue || fields.author?.stringValue || 'BoonNews Editorial';
      const currentUrl = `${baseUrl}/reader.html?id=${articleId}`;

      // 3. Inject meta tags targeted by precise IDs matching reader.html
      html = html
        .replace(/<title id="metaTitle">.*?<\/title>/, `<title id="metaTitle">${title}</title>`)
        .replace(/id="metaTitleTag" content=".*?"/, `id="metaTitleTag" content="${title}"`)
        .replace(/id="metaDesc" content=".*?"/, `id="metaDesc" content="${summary}"`)
        .replace(/id="metaCanonical" href=".*?"/, `id="metaCanonical" href="${currentUrl}"`)
        .replace(/id="ogTitle" content=".*?"/, `id="ogTitle" content="${title}"`)
        .replace(/id="ogDesc" content=".*?"/, `id="ogDesc" content="${summary}"`)
        .replace(/id="ogImage" content=".*?"/, `id="ogImage" content="${image}"`)
        .replace(/id="ogUrl" content=".*?"/, `id="ogUrl" content="${currentUrl}"`)
        .replace(/id="twTitle" content=".*?"/, `id="twTitle" content="${title}"`)
        .replace(/id="twDesc" content=".*?"/, `id="twDesc" content="${summary}"`)
        .replace(/id="twImage" content=".*?"/, `id="twImage" content="${image}"`)
        .replace(/id="twUrl" content=".*?"/, `id="twUrl" content="${currentUrl}"`);

      // Ensure explicit image dimensions exist for Facebook scraper
      if (!html.includes('og:image:width')) {
        const dimensions = `
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
        `;
        html = html.replace('</head>', `${dimensions}\n</head>`);
      }

      // 4. Update JSON-LD Schema
      const updatedSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": rawTitle,
        "image": [image],
        "description": summary,
        "author": {
          "@type": "Person",
          "name": author
        },
        "publisher": {
          "@type": "Organization",
          "name": "BoonNews",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/boon-news-og-banner.jpg`
          }
        }
      });

      html = html.replace(
        /<script type="application\/ld\+json" id="articleSchema">.*?<\/script>/s,
        `<script type="application/ld+json" id="articleSchema">${updatedSchema}</script>`
      );
    }
  } catch (err) {
    console.error('Error fetching Firestore metadata on Edge:', err);
  }

  // 5. Return updated document with cache headers
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
    },
  });
}
