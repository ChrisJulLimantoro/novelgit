const raw = (process.env.GITHUB_REPO ?? "").trim();
const parts = raw.split("/");
export const REPO_OWNER = parts[0] ?? "";
export const REPO_NAME = parts[1] ?? "";

export function assertGithubRepoConfigured(): void {
  if (!raw || parts.length !== 2 || !REPO_OWNER || !REPO_NAME || REPO_NAME.includes("/")) {
    throw new Error(
      'GITHUB_REPO must be set to "owner/repo" (e.g. myuser/novelgit-content).',
    );
  }
}
