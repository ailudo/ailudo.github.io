# On View London

**On View London** — an AI project by Studio AI Ludo, live at [ailudo.github.io/london](https://ailudo.github.io/london/).

`exhibitions.json` holds the current exhibitions at 24 London museums and galleries: venues (with map coordinates) and exhibitions (headline, official title, leading artists, dates, admission, links, and a sinophone tag).

`index.html` is the page itself. It reads `exhibitions.json` from the same folder, and falls back to a copy of the listings embedded in the page if the file can't be loaded.

The listings are gathered by re-reading each venue's own website, and are written up with AI, so check details with the venue before you travel.
