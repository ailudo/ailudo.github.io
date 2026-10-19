# On View Paris

An AI project by Studio AI Ludo. Single-page guide to exhibitions at Paris museums and non-profit spaces, served at https://ailudo.github.io/paris/.

- `index.html`: the page. It loads `exhibitions.json` and prefers it when newer than the copy embedded in the page (kept as a fallback).
- `exhibitions.json`: venues, exhibitions, `checked` date and `updated` timestamp. Refreshed nightly by a scheduled task. Commercial galleries are deliberately excluded.
