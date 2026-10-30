// App-wide settings you may want to change without touching any other file.
//
// FEEDBACK_ENDPOINT: where the in-app feedback form POSTs its JSON. Leave '' (empty) to use the built-in fallback, which opens a
// pre-filled GitHub issue on FEEDBACK_REPO and offers a "Copy feedback" button.
// To use a real inbox, create a free Formspree-style form (https://formspree.io) and paste its URL here, e.g.
//   export const FEEDBACK_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
// then run `npm run build` and publish. Any service that accepts a JSON POST and answers 2xx works (Formspree, Getform, Basin, your own
// server, a Cloudflare Worker...). See README, "Feedback".
export const FEEDBACK_ENDPOINT = '';

export const FEEDBACK_REPO = 'Goose285/chess-opening-trainer'; // GitHub "owner/repo" that receives fallback issues
export const APP_NAME = 'Gambiteer';
export const APP_VERSION = '1.3.0'; // shown in the feedback form and attached to reports; bump on release
