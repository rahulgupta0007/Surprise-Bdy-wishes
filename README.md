# For you

A private birthday site in two parts.

The public page is hers. It opens with a wax seal, then a letter, a strip of photographs, any films you add, and a last page that knows whether her birthday has started.

Backstage is yours, at `/admin`. You choose a key the first time you open it. From there you can set her name, your name, the date, an optional secret word, and upload as many photographs and films as you want, with a line under each one.

## Run it

```bash
npm install
npm run build
npm start
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721) for her page, and [http://127.0.0.1:4721/admin](http://127.0.0.1:4721/admin) for backstage.

Use `npm start` after `npm run build`. The dev server (`npm run dev`) can paint the page and then ignore every click, because it blocks its own scripts when the browser uses `127.0.0.1`. If a tab still says "One moment" or "Opening backstage", close it and open the address again.

Before you send her the link:

1. Put her real name, your name, and her birthday in.
2. Rewrite the starter letter so it sounds like you.
3. Add the photographs, and films if you have them.
4. Save. Open her page and press the seal yourself once.

If you set a secret word, she cannot see anything until she types it. Tell her the word in person, or in a different message from the link. Leave the word blank and the page opens straight away.

Photographs can be jpg, png, webp, or gif, up to 20 MB each. Films should be mp4 so they play on her phone, up to 120 MB each. Empty films, or empty photographs, stay hidden on her page.

## If you forget the key

Stop the server and delete `data/auth.json`. The next visit to `/admin` lets you choose a new key. Her page is untouched.

Photographs and films live in `data/uploads`. The words live in `data/content.json`.
