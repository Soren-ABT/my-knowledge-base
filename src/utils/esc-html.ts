export function escHTML(str: string): string {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
