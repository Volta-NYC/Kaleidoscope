# Kaleidoscope website template

A plain HTML and CSS starter site for the Folk Dance Club “Kaleidoscope.” It is
an intentionally simple outline of the current website: home, club information,
classes, news, events, gallery, press, and contacts. It has no framework, no
build step, and no packages to install. It also includes a resources section
with beginner learning links, inspiration sites, and a website quality
checklist.

## What you need

Install these free tools before you begin:

- [Git](https://git-scm.com/downloads) — downloads and updates the project.
- A code editor. [Visual Studio Code](https://code.visualstudio.com/) is a good
  beginner-friendly option.
- A modern web browser, such as Chrome, Firefox, Safari, or Edge.
- Python 3 (optional, but recommended) — used below to run a simple local web
  server. Check whether it is already installed by running `python3 --version`
  in a terminal.

There are no npm packages or other project dependencies for this template.

## Download the project from GitHub

1. On GitHub, open this repository’s page.
2. Click the green **Code** button, copy the HTTPS address, and open Terminal
   (macOS) or Git Bash / PowerShell (Windows).
3. Move to the folder where you keep projects. For example:

   ```bash
   cd Documents
   ```

4. Clone the repository. Replace the example address with the one copied from
   GitHub:

   ```bash
   git clone https://github.com/your-name/kaleidoscope.git
   ```

5. Enter the new project folder:

   ```bash
   cd kaleidoscope
   ```

6. Open the folder in VS Code:

   ```bash
   code .
   ```

   If `code .` does not work, open VS Code, choose **File → Open Folder**, and
   select the `kaleidoscope` folder.

## Run the website on your computer

From the project folder, start the included Python web server:

```bash
python3 -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173) in your browser.

Keep that terminal window open while you work. To stop the server, return to
the terminal and press `Control + C` (macOS/Linux) or `Ctrl + C` (Windows).

If Python is not available, you can still double-click `index.html` to open it
in a browser. A local server is recommended because it behaves more like a real
website and will be needed as the site grows.

## Edit the template

- `index.html` contains all of the page content and section structure.
- `styles.css` contains the small amount of visual styling.
- `script.js` switches the visible content between English and Russian.

Start by changing the placeholder text in `index.html`. Search for comments
such as `Replace #` and `Add` to find values that need real links, contact
details, names, and media. Save the file and refresh `http://localhost:4173` to
see your changes.

The site starts in English. The button in the top-right corner switches the
page to Russian. The Russian wording is stored in `script.js`; update the
matching text there whenever you change English text in `index.html`.

To add an image later, place the file in a new `images` folder and replace a
placeholder block with an image tag such as:

```html
<img src="images/dancers.jpg" alt="Dancers performing on stage" />
```

Always write useful `alt` text so visitors using screen readers understand what
the image shows.

## Learn HTML, CSS, and GitHub

Learn one topic, then try it in this project. The best way to build confidence
is to make a small edit and see it work in the browser.

- [MDN Learn Web Development](https://developer.mozilla.org/en-US/docs/Learn_web_development)
  — a thorough, trustworthy place to start with HTML, CSS, and JavaScript.
- [web.dev Learn CSS](https://web.dev/learn/css) — short, free lessons focused
  on CSS.
- [freeCodeCamp Responsive Web Design](https://www.freecodecamp.org/learn/2022/responsive-web-design/)
  — hands-on HTML and CSS practice projects.
- [GitHub Skills](https://skills.github.com/) — interactive Git and GitHub
  courses.
- [W3C guide to image alt text](https://www.w3.org/WAI/tutorials/images/decision-tree/)
  — a quick decision guide for writing image descriptions.

## Add AI and Codex to your workflow

Codex is a useful coding partner for beginners: it can explain an unfamiliar
HTML or CSS file, suggest a small change, help diagnose an error, and review
your work. It works best when you give it a focused goal and enough context.

- [Codex quickstart](https://developers.openai.com/codex/quickstart) — setup
  guidance for getting started with ChatGPT and Codex.
- [Get started with Codex](https://openai.com/codex/get-started/) — an overview
  of the product and how it can support coding work.

Use this repeatable process for an update:

1. Choose one small task, such as changing the class schedule or adding one
   gallery photo.
2. Tell Codex what you want, which file to edit, and what must not change.
3. Ask it to explain the changes in beginner-friendly language.
4. Read the changed file, run the local server, and check the result in a
   browser before keeping the change.
5. Commit and push only changes you understand and want to keep.

Try prompts like these:

```text
I am new to HTML and CSS. Explain the purpose of each section in index.html
without changing any files.
```

```text
Update the event placeholder in index.html. Keep the current simple design,
then tell me exactly what you changed and how I can check it locally.
```

```text
Review my changes to this website for broken links, spelling mistakes, and
mobile readability. Do not make changes yet; explain any problems first.
```

Never share passwords, API keys, private client details, or other sensitive
information in a prompt. AI can speed up the work, but you are responsible for
reviewing, testing, and publishing the final website.

## Get ideas from Novus websites

Use the following websites to study choices, not to copy them. For each site,
open it on a computer and on a phone-sized browser window. Write down:

1. What does the first screen tell a new visitor?
2. What action does the website want the visitor to take?
3. Where are the contact details, hours, address, menu, or schedule?
4. Which sections would help a dance club website, and which would not?

Start with [Novus NYC](https://www.novusnyc.org/) and use its **Our Work** area
to find more completed projects. These are three useful direct examples:

- [Phobar](https://pho-bar.vercel.app/)
- [Taqueria El Buchon](https://taqueria-el-buchonsi.vercel.app/)
- [Papazzio](https://www.papazzio.com/)

Make an “inspiration notes” document instead of copying another website’s code,
writing, photos, or logo. Record the section idea in your own words, then adapt
it to the club’s real needs and content.

## A simple checklist for a good website

Before publishing an update, check that:

- A new visitor can quickly tell who the site is for and what it offers.
- There is one clear next step, such as **Contact us**, **Register**, or
  **Donate**.
- The phone number, email, address, and schedule are accurate and easy to find.
- Navigation labels are short and familiar.
- Headings are in a sensible order, images have `alt` descriptions, and links
  say where they go.
- The page is comfortable to read on a phone as well as a computer.
- You have checked spelling, links, and the page after every significant edit.

## Save and upload your changes to GitHub

In Terminal, still inside the project folder:

1. Check which files changed:

   ```bash
   git status
   ```

2. Add your changes:

   ```bash
   git add index.html styles.css script.js README.md
   ```

   Use `git add .` only when you have checked `git status` and want to add every
   listed change.

3. Create a saved checkpoint (a commit):

   ```bash
   git commit -m "Update club information"
   ```

4. Upload it to GitHub:

   ```bash
   git push
   ```

Git may ask you to sign in to GitHub the first time. After pushing, reload the
repository page on GitHub to confirm your update is there.

## Get updates made by someone else

Before beginning work on an existing copy, run:

```bash
git pull
```

If Git reports a conflict, do not delete anything immediately. Read the
conflict message, make a copy of your work if needed, and ask a more
experienced collaborator for help resolving it.

## Project structure

```text
kaleidoscope/
├── index.html          # The palace: markup, HUD, meta tags
├── palace.js           # The whole scene — world, camera, rooms, day/night
├── palace.css          # Styles for the palace page
├── registration.html   # Registration form
├── thank-you.html      # Post-registration confirmation
├── pages.css           # Styles shared by the flat pages
├── vendor/             # Pinned three.js build (generated — see below)
├── images/             # Photos, logo, share card
├── info/               # Source notes the room copy is written from
├── scripts/            # Maintenance scripts
├── vercel.json         # Hosting config
└── README.md           # This guide
```

`script.js`, `styles.css`, and `legacy.css` are left over from the earlier
version of the site. Nothing links to them any more.

## Running it locally

The site is plain static files — no build, no server code. Any static server
works:

```bash
npm run dev          # serves the folder at http://localhost:8765
```

Or, without Node at all:

```bash
python3 -m http.server 8765
```

Opening `index.html` directly with `file://` will **not** work: the page loads
`palace.js` as an ES module, which browsers only allow over http.

### Handy URL parameters

| Parameter | What it does |
| --- | --- |
| `?p=0.5` | Jump straight to a point on the journey, `0`–`1` |
| `?t=1140` | Freeze the clock at a time of day, in minutes past midnight |
| `?stats=1` | Log the voxel count to the console |
| `?dev=1` | Expose `window.__kal` for stepping the render loop by hand |

## Updating three.js

The renderer is committed to `vendor/` rather than pulled from a CDN, so the
site keeps working if a CDN doesn't. To move to a new version, change it in
`package.json`, then:

```bash
npm install
npm run vendor
```

That copies the pinned build into `vendor/` and stamps the version into the
import map in `index.html`. Commit both.

## Deploying

Hosted on Vercel as a static site. There is no build step: Vercel serves the
repository root as-is, which is why `vendor/` is committed.

- **First time:** import the GitHub repo at [vercel.com/new](https://vercel.com/new).
  Framework preset **Other**, build command **empty**, output directory **root**.
  `vercel.json` already sets this.
- **After that:** every push to `main` deploys. Pull requests get previews.

`vercel.json` also turns on clean URLs (`/registration`, not
`/registration.html`), caches `vendor/` forever, and sets a few security
headers. `.vercelignore` keeps `node_modules/`, `info/`, and `scripts/` out of
the deployment.
