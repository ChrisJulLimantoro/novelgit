/** Source app repository (this Next.js UI), not the content manuscript repo. */
export const NOVELGIT_GITHUB_URL = "https://github.com/ChrisJulLimantoro/novelgit" as const;

export const COPYRIGHT_HOLDER = "ChrisJulLimantoro";

export function copyrightLine(): string {
  return `© ${new Date().getFullYear()} ${COPYRIGHT_HOLDER}`;
}
