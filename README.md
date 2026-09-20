# Kaisro

A private, single-user, local-only mobile app for daily planning: a calendar that shows events, tasks, and spending together on one unified day view. No backend, no accounts, and zero analytics.

> **Mobile-Only Requirement:** Kaisro is designed strictly for mobile platforms (**Android** and **iOS**). The application **must be run and tested on a physical mobile device or an emulator/simulator**, not in a desktop web browser, because `expo-sqlite` requires native local device storage engines.

## Tech Stack

- **Framework:** Expo (React Native) + TypeScript
- **Routing:** Expo Router
- **Styling:** NativeWind (Tailwind CSS)
- **State Management:** Zustand
- **Database:** `expo-sqlite` with Drizzle ORM
- **Forms:** React Hook Form
- **Typography:** Inter (`@expo-google-fonts/inter`)
- **Design System:** Serene Editorial Minimal (Stitch)

---

## Database Migrations

Drizzle migration files located in `src/db/migrations/` are the **single source of truth** for creating and updating database tables.

### How to Generate a Migration When Schema Changes

1. Edit the schema definitions in [`src/db/schema.ts`](file:///src/db/schema.ts).
2. Run the Drizzle Kit generator command:
   ```bash
   npm run db:generate
   ```
   *(or `npx drizzle-kit generate`)*
3. Drizzle Kit will generate a new `.sql` migration file and update `src/db/migrations/migrations.js` with the migration entry.
4. When the app starts, `runMigrations()` in [`src/db/index.ts`](file:///src/db/index.ts) uses Drizzle's official `expo-sqlite` migrator to automatically apply any pending migrations on the user's device.

### Metro Configuration for Migrations

Metro is configured in [`metro.config.js`](file:///metro.config.js) to recognize `.sql` source extensions, and [`babel.config.js`](file:///babel.config.js) uses `babel-plugin-inline-import` to bundle the SQL statements directly into the application runtime.

---

## Development Seed Data

In development builds (`__DEV__`), sample data for the current month is seeded automatically on initial app launch. The seed script is strictly idempotent and will only execute when the database contains no existing records. A manual reset and re-seed button is available in the **Settings** tab exclusively during development.