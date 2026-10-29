// Fill the <task> slot of a step-2 safe-change template with the user's
// literal request. The stored template always carries an empty <task>
// placeholder ([Write here exactly what you want to change]); old graphs
// without the tag get one appended instead of failing silently.
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function fillTask(template: string, request: string): string {
  const safe = escapeXml(request.trim());
  if (/<task>[\s\S]*?<\/task>/.test(template)) {
    return template.replace(/<task>[\s\S]*?<\/task>/, `<task>${safe}</task>`);
  }
  return `${template}\n<task>${safe}</task>`;
}
