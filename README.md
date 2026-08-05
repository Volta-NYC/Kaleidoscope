# Kaleidoscope website template

A plain HTML and CSS starter site for the Folk Dance Club “Kaleidoscope.” It is
an intentionally simple outline of the current website: home, club information,
classes, news, events, gallery, press, and contacts. It has no framework, no
build step, and no packages to install.

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

Start by changing the placeholder text in `index.html`. Search for comments
such as `Replace #` and `Add` to find values that need real links, contact
details, names, and media. Save the file and refresh `http://localhost:4173` to
see your changes.

To add an image later, place the file in a new `images` folder and replace a
placeholder block with an image tag such as:

```html
<img src="images/dancers.jpg" alt="Dancers performing on stage" />
```

Always write useful `alt` text so visitors using screen readers understand what
the image shows.

## Save and upload your changes to GitHub

In Terminal, still inside the project folder:

1. Check which files changed:

   ```bash
   git status
   ```

2. Add your changes:

   ```bash
   git add index.html styles.css
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
├── index.html   # Page content and structure
├── styles.css   # Visual styles
└── README.md    # This guide
```
