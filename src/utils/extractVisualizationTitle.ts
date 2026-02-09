export function extractVisualizationTitle(htmlContent: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const h1 = doc.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  const h2 = doc.querySelector('h2');
  if (h2?.textContent?.trim()) {
    return h2.textContent.trim();
  }

  const title = doc.querySelector('title');
  if (title?.textContent?.trim()) {
    return title.textContent.trim();
  }

  const firstParagraph = doc.querySelector('p');
  if (firstParagraph?.textContent?.trim()) {
    const text = firstParagraph.textContent.trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  return 'Untitled Visualization';
}
