import { octokit } from "@/lib/github";
import { REPO_OWNER, REPO_NAME } from "@/lib/config";

export async function GET() {
  const { data } = await octokit.rest.repos.get({ owner: REPO_OWNER, repo: REPO_NAME });
  return Response.json({ name: data.name, private: data.private });
}
