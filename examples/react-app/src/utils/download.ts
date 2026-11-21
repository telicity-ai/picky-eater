/** Starts a browser download for a string, e.g. a JSON export. */
export function downloadTextFile(filename: string, contents: string, mimeType = 'text/plain'): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
