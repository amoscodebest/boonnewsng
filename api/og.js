export default async function handler(req, res) {
  const { id } = req.query;

  // Fallback defaults
  let title = "BoonNews | Latest News, Insights & In-Depth Reports";
  let description = "Read full news articles, analysis, and breaking updates on BoonNews.";
  let imageUrl = "https://boonnewsng.vercel.app/boon-news-og-banner.jpg";
  const pageUrl = `https://boonnewsng.vercel.app/reader.html?id=${id || ''}`;

  if (id) {
    try {
      // Fetch post data directly from Firebase REST API (server-side, fast response)
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/primeintelmedia-e2fe3/databases/(default)/documents/newsPosts/${id}`;
      const response = await fetch(firestoreUrl);
      
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || {};

        title = fields.title?.stringValue || title;
        description = fields.summary?.stringValue || 
                      (fields.content?.stringValue ? fields.content.stringValue.replace(/<[^>]*>?/gm, '').substring(0, 155) : description);
        imageUrl = fields.imageUrl?.stringValue || imageUrl;
      }
    } catch (err) {
      console.error("Error fetching metadata server-side:", err);
    }
  }

  // Construct static HTML response with populated Open Graph headers
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title} | BoonNews</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="BoonNews">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${pageUrl}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Redirect standard browsers to reader.html if needed -->
    <script>
      window.location.href = "/reader.html?id=${id}";
    </script>
</head>
<body>
    <p>Loading story...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}
