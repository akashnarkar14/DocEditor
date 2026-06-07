# Ajaia Docs

A lightweight collaborative document editor — like Google Docs, but simple and self-hostable.

Built with **Next.js 14**, **TipTap**, **Supabase**, and **Tailwind CSS**. Deploys for free on Vercel + Supabase.

---

## Features

- **Rich text editor** — Bold, italic, underline, headings (H1–H3), bullet lists, numbered lists, text alignment
- **Auto-save** — Saves automatically as you type, no save button needed
- **File import** — Drag & drop or upload `.txt` or `.md` files as new editable documents
- **Document sharing** — Share any document by email with **view** or **edit** permission
- **Dashboard** — See all your documents and documents shared with you in one place
- **Secure** — Each user only sees their own data (Row Level Security on the database)

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Framework | Next.js 14 (App Router) | Full-stack in one repo, deploys free on Vercel |
| Editor | TipTap | Best open-source rich text editor for React |
| Database + Auth | Supabase | Free PostgreSQL + email auth, no backend needed |
| Styling | Tailwind CSS | Fast utility-first CSS |
| Tests | Vitest | Fast unit tests with TypeScript support |

---

## Local Setup (step by step)

### Prerequisites

- [Node.js](https://nodejs.org) version 18 or higher
- A free account at [supabase.com](https://supabase.com)

---

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ajaia-doc-editor
npm install
```

---

### 2. Create a Supabase project

1. Log in to [supabase.com](https://supabase.com)
2. Click **New project**, give it a name, pick a region, set a database password
3. Wait about 2 minutes for the project to be ready

---

### 3. Set up the database

1. In your Supabase project, open the **SQL Editor** from the left sidebar
2. Click **New query**
3. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy all of it, paste it into the editor
4. Click **Run**

This creates the `profiles`, `documents`, and `document_shares` tables with all security rules (RLS policies) and indexes.

---

### 4. Get your API keys

1. In Supabase, go to **Project Settings → API**
2. Copy these two values:
   - **Project URL** — example: `https://abcdefgh.supabase.co`
   - **anon / public** key — a long string starting with `eyJ...`

> Make sure you use the **Project URL** from settings, not the URL from your browser's address bar.

---

### 5. Create your environment file

Create a file named `.env.local` in the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with what you copied in step 4.

---

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up, create a document, and start writing.

---

## How to Use

### Create a document
On the dashboard, click **New document**. You'll be taken straight to the editor.

### Write and format
Use the toolbar at the top of the editor to apply formatting (bold, italic, headings, lists, etc.).  
Changes are saved automatically — watch the **Saved** indicator in the top bar.

### Rename a document
Click the document title in the top bar and type a new name. It saves on blur.

### Import a file
- **On the dashboard:** drag a `.txt` or `.md` file into the upload zone, or click it to browse
- **Inside the editor:** click the **Import** button in the top right

The file becomes a new editable document.

### Share a document
1. Open a document you own
2. Click **Share** in the top right
3. Enter the email of the person you want to share with
4. Choose **Can edit** or **Can view**
5. Click **Share**

The other person must already have an account on the app. They'll see the document in their **Shared with Me** section on the dashboard.

### Remove someone's access
Open the Share dialog → click the trash icon next to their name.

---

## Project Structure

```
ajaia-doc-editor/
│
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Sign-in page
│   │   └── signup/page.tsx       # Registration page
│   ├── api/
│   │   ├── documents/
│   │   │   ├── route.ts          # GET (list) · POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET · PUT · DELETE
│   │   │       └── share/route.ts  # POST (add) · DELETE (remove)
│   │   └── upload/route.ts       # POST — import .txt / .md file
│   ├── dashboard/                # Document list page
│   └── document/[id]/            # Editor page
│
├── components/
│   ├── editor/
│   │   ├── EditorPage.tsx        # Full editor UI + auto-save logic
│   │   ├── RichTextEditor.tsx    # TipTap editor instance
│   │   └── Toolbar.tsx           # Formatting toolbar
│   ├── dashboard/
│   │   └── DocumentCard.tsx      # Card shown in the document grid
│   ├── ShareDialog.tsx           # Share management modal
│   └── FileUploadButton.tsx      # Drag-and-drop upload zone
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase client for the browser
│   │   └── server.ts             # Supabase client for server components (uses cookies)
│   ├── fileParser.ts             # Converts .txt / .md content → TipTap JSON
│   └── utils.ts                  # Helpers: formatDate, etc.
│
├── types/index.ts                # Shared TypeScript types
├── supabase/schema.sql           # Full database schema — run this once in Supabase
└── __tests__/fileParser.test.ts  # Unit tests for the file parser
```

---

## Available Scripts

```bash
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint
npm run test    # Run unit tests
```

---

## Deploy to Vercel (free)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

Your app will be live on a `*.vercel.app` URL in about 2 minutes.

---

## Environment Variables

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / public key |

---

## Troubleshooting

**CORS error or "Invalid API key" on login**  
Make sure `NEXT_PUBLIC_SUPABASE_URL` is the project URL (`https://xxxx.supabase.co`), not the browser dashboard URL.

**"relation does not exist" database error**  
You haven't run the schema yet. Go to Supabase → SQL Editor → paste and run `supabase/schema.sql`.

**Can't share — "user not found"**  
The person you're sharing with must have already created an account on the app first.

**Document shows old content after editing and going back**  
Hard-refresh the browser (`Ctrl+Shift+R` on Windows, `Cmd+Shift+R` on Mac).

**Supabase project is paused**  
Free Supabase projects pause after 7 days of inactivity. Log in to supabase.com and click **Restore** to unpause it.

---

## Running Tests

```bash
npm run test
```

Tests live in `__tests__/` and use [Vitest](https://vitest.dev).  
Currently covers `lib/fileParser.ts` — the function that converts `.txt` and `.md` content into TipTap's editor JSON format.

---

## License

MIT — free to use, modify, and deploy.
