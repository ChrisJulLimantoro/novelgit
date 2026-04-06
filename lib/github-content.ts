import { octokit } from "./github";
import { REPO_OWNER, REPO_NAME } from "./config";

export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const { data } = await octokit.rest.repos.getContent({
    owner: REPO_OWNER,
    repo:  REPO_NAME,
    path,
  });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${path} is not a file`);
  }
  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha:     data.sha,
  };
}

export async function putFile(
  path:    string,
  content: string,
  sha:     string,
  message: string,
): Promise<void> {
  await octokit.rest.repos.createOrUpdateFileContents({
    owner:   REPO_OWNER,
    repo:    REPO_NAME,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha:     sha !== "" ? sha : undefined,
  });
}
