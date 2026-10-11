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

The app starts with no events, tasks, transactions, or notes. Default categories are initialized without sample entries. In development builds (`__DEV__`), **Settings > Load sample data** explicitly loads the existing sample dataset, with confirmation before replacing records. **Clear all data** removes user records and restores default categories. Neither tool runs automatically.

`PROJECT.MD` describes the target roadmap, including future releases. See [the current implementation comparison](docs/project-alignment.md) for implemented features, gaps, and deferred work.

## Native development build

Notifications use Notifee and require a development client. Expo Go can open the
planner and shows a native-build requirement for notification support.
Run `npm run android` for a local Android build, then
`npx expo start --dev-client` to serve JavaScript. EAS profiles live in eas.json;
no cloud build starts automatically. iOS requires macOS or EAS.

Enable notifications in Settings, then choose reminder/digest/budget preferences.
Android offers exact-time/battery settings and an optional quiet tasks-left
notification with Stop. Scheduling limits, evidence and the phone checklist are
in [build progress](docs/build-progress.md) and [project alignment](docs/project-alignment.md).
