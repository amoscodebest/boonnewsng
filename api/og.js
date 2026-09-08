import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { id } = req.query;

  // Fallback metadata defaults
  let title = "Boon News | Latest News, Insights & In-Depth Reports";
  let description = "Read full news articles, analysis, and breaking updates on Boon News.";
  let image = "https://boonnewsng.vercel.app/boon-news-og-banner.jpg";
  let pageUrl = `https://boonnewsng.vercel.app/reader.html${id ? `?id=${id}` : ''}`;

  if (id) {
    try {
      // Fetch article data directly from Firestore REST API
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/primeintelmedia-e2fe3/databases/(default)/documents/newsPosts/${id}`;
      const response = await fetch(firestoreUrl);

      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || {};

        const postTitle = fields.title?.stringValue;
        const postSummary = fields.summary?.stringValue;
        const postContent = fields.content?.stringValue;
        const postImage = fields.imageUrl?.stringValue;

        if (postTitle) title = `${postTitle} | Boon News`;
        
        if (postSummary) {
          description = postSummary;
        } else if (postContent) {
          description = postContent.replace(/<[^>]*>?/gm, '').substring(0, 155) + '...';
        }

        if (postImage) image = postImage;
      }
    } catch (err) {
      console.error("Error fetching article metadata on server:", err);
    }
  }

  try {
    const filePath = path.join(process.cwd(), 'reader.html');
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace fallback tags and inject standard Open Graph image dimensions
    html = html
      .replace(/<title id="metaTitle">.*?<\/title>/, `<title>${title}</title>`)
      .replace(/content="Loading Article\.\.\. \| BoonNews"/g, `content="${title}"`)
      .replace(/content="Read full news articles, analysis, and breaking updates on BoonNews\."/g, `content="${description}"`)
      .replace(/https:\/\/boonnewsng\.vercel\.app\/boon-news-og-banner\.jpg/g, image)
      .replace(/content="https:\/\/boonnewsng\.vercel\.app\/reader\.html"/g, `content="${pageUrl}"`);

    // Ensure explicit image dimensions exist in HTML head
    if (!html.includes('og:image:width')) {
      const extraTags = `
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
      `;
      html = html.replace('</head>', `${extraTags}\n</head>`);
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (err) {
    console.error("Error reading reader.html:", err);
    return res.status(500).send("Internal Server Error");
  }
}
