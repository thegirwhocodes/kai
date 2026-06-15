# Kai Alexa Skill

Kai exposes a custom-skill webhook at:

```text
POST /api/alexa
```

Production endpoint:

```text
https://heykai.vercel.app/api/alexa
```

Health check:

```text
GET https://heykai.vercel.app/api/alexa
```

For local testing, expose the Next.js dev server with a 443 HTTPS tunnel, then set the Alexa skill endpoint to:

```text
https://<your-tunnel>/api/alexa
```

## Alexa Console

1. Create a custom skill.
2. Set the invocation name to `kai focus`.
3. Paste `docs/alexa-skill-model.json` into the JSON editor for the interaction model.
4. Build the model.
5. Set the default endpoint to the `/api/alexa` HTTPS URL.
6. Copy the Alexa Skill ID into `.env.local` and Vercel:

```bash
ALEXA_SKILL_ID=amzn1.ask.skill...
```

For certification/prod testing, also set this in Vercel:

```bash
ALEXA_VERIFY_SIGNATURES=true
```

That enables request signature verification using Amazon's `SignatureCertChainUrl` and `Signature-256` headers.
Keep it `false` only for local unsigned curl tests.

## Supported Utterances

- "Alexa, ask Kai Focus what should I focus on next"
- "Alexa, ask Kai Focus to plan my day"
- "Alexa, ask Kai Focus to start a focus session"
- "Alexa, ask Kai Focus to focus on grant draft"
- "Alexa, ask Kai Focus to take a break"
- "Alexa, ask Kai Focus to pause the timer"
- "Alexa, ask Kai Focus to resume the timer"
- "Alexa, ask Kai Focus to mark this done"
- "Alexa, ask Kai Focus to add reply to Sonia"
- "Alexa, ask Kai Focus to play Christian lofi instrumental from Spotify"
- "Alexa, ask Kai Focus to play deep focus from Spotify"
- "Alexa, ask Kai Focus to pause Spotify"
- "Alexa, ask Kai Focus to play Brain F M"

`StartFocusIntent` queues a `start_recommended_focus` command. If the Kai web app is open, it polls `/api/commands` and starts the adaptive timer within a few seconds.

Timer-control intents (`StartBreakIntent`, `PauseTimerIntent`, `ResumeTimerIntent`, `CompleteBlockIntent`, and `SkipBlockIntent`) also queue commands for the browser app. They require Kai to be open in the browser because the timer state lives in the web client.

Music intents call Spotify directly from the server. Spotify playback still requires:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`
- Spotify scopes: `user-read-playback-state user-modify-playback-state user-read-currently-playing user-library-read playlist-read-private playlist-read-collaborative`
- an active Spotify device, such as the Spotify app or an Echo already visible to Spotify

Brain.fm is not directly wired. Kai does not have a Brain.fm API/license to stream Brain.fm audio through Alexa. If the user asks for Brain.fm, Kai explains the limitation and offers a Spotify focus alternative.

## Test Payloads

With `ALEXA_VERIFY_SIGNATURES=false`, a local unsigned smoke test can post a current timestamp:

```bash
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
curl -s https://heykai.vercel.app/api/alexa \
  -H "content-type: application/json" \
  -d "{
    \"version\":\"1.0\",
    \"session\":{\"application\":{\"applicationId\":\"$ALEXA_SKILL_ID\"}},
    \"request\":{\"type\":\"LaunchRequest\",\"timestamp\":\"$NOW\"}
  }"
```

After `ALEXA_VERIFY_SIGNATURES=true`, use the Alexa Developer Console Test tab or an Echo device; unsigned curl requests will correctly fail.

## Notes

- Calendar/email planning uses the same `/api/recommendation` planner as the web app.
- Gmail reads metadata only: sender, subject, date, labels.
- Alexa account linking is not required for Naomi's single-user env-token setup, but it is the next step for a multi-user version. A public multi-user skill should map Alexa users to Kai accounts through OAuth account linking instead of one global env-token account.
- A deployed multi-instance/serverless app should replace the in-memory command queue with a database or realtime channel.

## References

- Amazon custom skill interface: https://developer.amazon.com/en-US/docs/alexa/reference/custom-skill-developer-reference.html
- Alexa request/response JSON: https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html
- Web-service hosting requirements and signature verification: https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html
- Account linking for future multi-user auth: https://developer.amazon.com/en-US/docs/alexa/account-linking/account-linking-for-custom-skills.html
