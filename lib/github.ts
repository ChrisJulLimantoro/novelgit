import { Octokit } from "octokit";
import { assertGithubRepoConfigured } from "./config";

assertGithubRepoConfigured();

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
