# ShopLedger repository notes

## Stack

- Node.js with CommonJS modules.
- Express 4 serves the browser app and JSON API; `body-parser` parses JSON request bodies.
- The browser UI is plain HTML, CSS, and JavaScript using `XMLHttpRequest`.
- Application records are stored in `data/db.json` through `lib/store.js`.
- Dependencies are declared in `package.json` and locked in `package-lock.json`.

## Module map

- `server.js`: Express app setup, static files, route mounting, and printable invoice route.
- `config.js`: port, shop details, tax slabs, inventory defaults, coupon rules, and admin key.
- `routes/`: HTTP endpoints for products/coupons, orders, customers/settlements, and reports/pricing preview/export.
- `lib/`: store persistence, order and inventory logic, pricing/coupons/tax, customer ledger, invoice rendering, dates, and reports.
- `public/`: browser interface (`index.html`), styling (`css/style.css`), and UI behavior (`js/app.js`).
- `data/db.json`: current products, customers, orders, settlements, counters, and audit log.
- `docs/architecture.svg`: architecture diagram.

## Commands

- `npm start` — runs `node server.js` (listens on port 3000 unless `PORT` is set).
- `npm test` — currently a placeholder that prints “no test specified” and exits with an error; no test suite is configured.

## Change rules

- Write **characterization tests** before changing behaviour.
- Change only the module the ticket is about.
- Tests never touch `data/db.json`.
- Add no dependencies.
