# AI Music and Spotify Intent Research

## Product direction

Music should become a measurable focus input, not just a decorative player. Kai should know:

- what the user asked for,
- what Spotify actually played,
- what session followed,
- whether the user completed the session,
- how they rated their focus afterward.

That lets Kai learn that "Christian lofi instrumental" helps writing, while "high-energy worship" may be better for admin or cleaning.

## Spotify implementation

Current shipped direction:

- Search saved tracks and the user's playlists first.
- If the user explicitly says "from Spotify," "search Spotify," "play any playlist," or gives a broad mood/genre request, search the wider Spotify catalog.
- Resolve across playlists, tracks, albums, and artists.
- Play tracks with `uris`.
- Play playlists/albums/artists with `context_uri`.

Needed Spotify scopes:

- `user-read-playback-state`
- `user-modify-playback-state`
- `user-read-currently-playing`
- `user-library-read`
- `playlist-read-private`
- `playlist-read-collaborative`

Known limitation: Spotify playback control requires a Premium account and an active device.

## Intent matching strategy

For now, do not train a custom model. Use an LLM plus deterministic retrieval:

1. LLM extracts intent:
   - media type preference: playlist, track, album, artist, any.
   - mood: lofi, instrumental, worship, ambient, high-energy.
   - context: focus, study, deep work, break, admin.
   - source permission: library-only vs wider Spotify.

2. Retrieval searches:
   - user's playlists,
   - saved tracks,
   - public Spotify playlists/tracks/albums/artists.

3. Rank:
   - exact name match,
   - all query terms present,
   - playlist boost for generic mood/genre requests,
   - track boost for specific song/artist requests,
   - user-library boost,
   - historical focus success boost once Trends exists.

4. Learn after sessions:
   - completion rate by music item,
   - focus rating by music item,
   - average interruptions by music item,
   - best music by task type.

Only train a model later if there is enough data:

- 1,000+ labeled music requests.
- accepted/rejected result logs.
- session outcome labels.
- privacy-safe anonymization.

Possible future model:

- small reranker over Spotify candidates,
- trained on query, candidate metadata, user history, and accepted result,
- optimized for "played item user wanted" and "session outcome improved."

## AI music / generated music

Do not ship unlicensed generated focus music casually. The safe paths are:

1. **Spotify first**
   - fastest and already integrated.
   - no music hosting/licensing burden.
   - limitation: Spotify terms and Premium playback dependency.

2. **Licensed functional-music provider**
   - Feed.fm, Mubert, Soundtrack Your Brand, Tuned Global, or similar business/licensing path.
   - best if Kai needs embedded streams.

3. **Commercial-safe generated audio**
   - Mubert, Beatoven, Soundraw, Stable Audio, etc.
   - must verify commercial rights, API terms, output ownership, attribution, and whether generated loops can be embedded in a productivity app.

4. **In-house procedural audio**
   - brown noise, rain, pads, binaural-like modulation, soft synth loops.
   - easiest licensing-wise if generated in-app from original code/samples.
   - hardest to make better than Brain.fm.

## Better-than-Brain.fm product angle

Do not claim "scientifically better." Claim personalization:

- Brain.fm optimizes audio for focus.
- Kai can optimize audio choice for this user's actual task, calendar, energy, and session history.

Kai's differentiator:

- "Play what helps Naomi focus on this kind of work at this time of day."

## Sources

- Spotify Search API: https://developer.spotify.com/documentation/web-api/reference/search
- Spotify playback API: https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
- Spotify scopes: https://developer.spotify.com/documentation/web-api/concepts/scopes
- Spotify authorization code flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Brain.fm science: https://www.brain.fm/science
- Brain.fm terms: https://www.brain.fm/terms
- Mubert Render/API pricing: https://mubert.com/render/pricing
- Beatoven licensing: https://www.beatoven.ai/usage-and-licensing
- Stability AI audio: https://platform.stability.ai/docs/api-reference
- Google Page Visibility API background-state reference: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
