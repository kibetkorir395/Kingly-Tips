export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background; color; display; place-items; min-height; margin; padding; }
      .card { max-width; width; text-align; padding; }
      h1 { font-size; margin: 0 0 0.5rem; }
      p { color; margin: 0 0 1.5rem; }
      .actions { display; gap; justify-content; flex-wrap; }
      a, button { padding: 0.5rem 1rem; border-radius; font; cursor; text-decoration; border: 1px solid transparent; }
      .primary { background; color; }
      .secondary { background; color; border-color; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
