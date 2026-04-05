---

# 📘 Design Document: NovelGit (V.2)
**Project Status:** Initial Architecture | **Target Environment:** Vercel (Next.js) + GitHub API

## 1. Executive Summary
**NovelGit** is a private, multi-tenant novel management system. It allows a writer to manage multiple literary projects through a single web interface. It uses **GitHub as a Database**, ensuring that all prose is version-controlled, portable, and free to host, while providing a modern, "Zen" web-based writing experience.

---

## 2. System Architecture
The system follows a **Decoupled Git-CMS** pattern. The website acts as a sophisticated GUI for a GitHub repository.

* **Frontend:** Next.js 16 (App Router) for high-performance rendering.
* **Storage:** A private GitHub Repository containing all manuscripts and configurations.
* **Write Engine:** **Next.js Server Actions + Octokit**. Edits made on the web are pushed to GitHub via API, which triggers a Vercel redeploy.
* **Local Access:** The same repository can be opened in **Obsidian** on Ubuntu for offline deep-work.

---

## 3. Data Schema & File Structure

### 📂 Repository Structure
```text
/config
  novels.json          <-- The "Library Registry" (Dynamic)
/content
  /[novel-id]          <-- Folder per project
    /manuscript        <-- Chapter .md files (01-intro.md, etc.)
    /lore              <-- Character and world building .md files
    meta.json          <-- Project-specific settings (Genre, Goals)
```

### 📄 `novels.json` (The Library Registry)
This file is the "Source of Truth" for the dashboard. It is updated via the web UI.
```json
{
  "novels": [
    {
      "id": "project-void",
      "title": "The Void Chronicles",
      "path": "content/project-void",
      "status": "writing"
    }
  ]
}
```

---

## 4. Key Functional Features

### 🏛️ The Library Dashboard
* **Dynamic Discovery:** Scans `novels.json` to render project cards.
* **Project Creation:** A "New Novel" button that appends to the JSON and creates the folder structure via GitHub API.

### ✍️ The "Zen" Editor
* **Markdown Support:** Full GFM (GitHub Flavored Markdown) support.
* **Auto-save Strategy:** * **Local:** Debounced save to `localStorage` (Instant).
    * **Cloud:** Manual or event-based "Sync to GitHub" (Triggers Build).
* **Typography:** Optimized for long-form (Serif, 720px width, high line-height).

### 🧠 Integrated Wiki (World Bible)
* **Scoped Lore:** When writing in *Novel A*, the system only suggests/links characters from *Novel A*'s lore folder.
* **Bidirectional Linking:** Automatically detect `[[Character Name]]` and link to their sheet.

---

## 5. Technical Specifications

### 🛠️ The "Sync" Logic (Server Action)
To allow "Web-only" updates, the application implements the following flow:
1.  **Fetch:** Get current file content and `SHA` from GitHub API.
2.  **Update:** Merge changes and convert to Base64.
3.  **Commit:** Use `octokit.rest.repos.createOrUpdateFileContents` to push.
4.  **Revalidate:** Use `revalidatePath` to clear Next.js cache.

### 🔒 Security & Access
* **Environment Variables:** `GITHUB_TOKEN` and `GITHUB_REPO` stored securely in Vercel.
* **Access Control:** Middleware to protect `/edit` and `/admin` routes via a secret key or Auth.

---

## 6. Development Roadmap

### Phase 1: Infrastructure (The Foundation)
- [ ] Initialize Next.js App Router project.
- [ ] Set up Tailwind CSS with a Serif font stack.
- [ ] Configure Octokit and verify connection to a private GitHub repo.

### Phase 2: Library Management (The Hub)
- [ ] Build the logic to read and update `config/novels.json` via the web.
- [ ] Create the "Library" landing page.

### Phase 3: The Writer's Workspace (The Core)
- [ ] Implement the Markdown editor with file-saving capability.
- [ ] Add the "Chapter Sidebar" with drag-and-drop reordering logic.
- [ ] Build the "Reader Mode" for proofreading.

### Phase 4: Polish (The Experience)
- [ ] Add word count analytics and daily writing heatmaps.
- [ ] Implement "Export to PDF/Docx" using a server-side library.

---

## 7. Operational Notes
* **Deployment Lag:** Users must be aware that a "Sync" triggers a ~45s Vercel build. A UI indicator must manage this expectation.
* **Conflict Resolution:** If editing from multiple devices, the "Web Editor" should always perform a `GET` request for the latest `SHA` before attempting a `PUT` to avoid 409 Conflict errors.