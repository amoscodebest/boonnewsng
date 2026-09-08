import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { id } = req.query;

  let title = "BoonNews | Latest News, Insights & In-Depth Reports";
  let description = "Read full news articles, analysis, and breaking updates on BoonNews.";
  let imageUrl = "https://boonnewsng.vercel.app/boon-news-og-banner.jpg";
  const pageUrl = `https://boonnewsng.vercel.app/reader.html?id=${id || ''}`;

  if (id) {
    try {
      // Fetch post data directly from Firebase REST API
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

  // Load the original reader.html file
  const filePath = path.join(process.cwd(), 'reader.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Inject real metadata directly into the HTML head before sending it back
  html = html
    .replace(/<title id="metaTitle">.*?<\/title>/, `<title>${title} | BoonNews</title>`)
    .replace(/content="Loading Article... \| BoonNews"/, `content="${title} | BoonNews"`)
    .replace(/id="ogTitle" content=".*?"/, `id="ogTitle" content="${title}"`)
    .replace(/id="ogDesc" content=".*?"/, `id="ogDesc" content="${description}"`)
    .replace(/id="ogImage" content=".*?"/, `id="ogImage" content="${imageUrl}"`)
    .replace(/id="ogUrl" content=".*?"/, `id="ogUrl" content="${pageUrl}"`)
    .replace(/id="twTitle" content=".*?"/, `id="twTitle" content="${title}"`)
    .replace(/id="twDesc" content=".*?"/, `id="twDesc" content="${description}"`)
    .replace(/id="twImage" content=".*?"/, `id="twImage" content="${imageUrl}"`);

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}
