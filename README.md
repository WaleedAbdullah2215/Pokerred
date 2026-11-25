# Pokerred

A browser-based Texas Hold’em practice table with three computer opponents and fictional chips. The game runs locally in the browser and has no accounts or payments.

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The game can also be served by any static host.

Use **How to play** for the rules and hand rankings. Each player starts with 1,000 chips. The dealer button rotates, blinds are 10/20, and players who run out of chips sit out subsequent hands. Choose **New table** to restart the session.

Run the engine checks with `node --test poker.test.mjs`.

Rules reference: [World Poker Federation’s Texas Hold’em guide](https://worldpokerfederation.org/poker/how-to-play-poker/variants-and-rules/how-to-play-texas-holdem/). DM Sans and Space Grotesk are loaded from Google Fonts with system fallbacks.
