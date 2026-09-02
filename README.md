# Project

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.21.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Auth tokens

The **access token** is kept only in memory (`TokenService` field). It is lost on refresh, which is intentional.

The **refresh token** is stored in `localStorage`. A SPA cannot set an `httpOnly` cookie on its own; that requires the API to issue `Set-Cookie` on login/refresh. Until the backend does that (and CORS credentials are enabled), `localStorage` is the tradeoff: the refresh token is available to JavaScript, so XSS could steal it. Prefer fixing XSS and moving refresh tokens to `httpOnly` cookies when the API supports it.

On start-up, if a refresh token is present, the app calls `POST /api/auth/refresh` then `GET /api/auth/me` before protected routes render.

Password reset links should open `/reset-password?token=...` (optional `&email=...`).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
