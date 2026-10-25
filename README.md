# Huff: robot trust pilot

A small web app for a pilot study on how a robot's response to its own mistake affects trust. Huff, an on-screen robot, helps the participant plan an afternoon in Salzburg, gives one wrong bus time, and then either apologises or explains the mistake. Everything else is identical in both conditions.

The full approved script is in `src/script.ts`; the scope and the readable script are in the portfolio's `_planning` folder.

## Running it

Requires Node.js 20 or newer. Use Chrome on the same laptop for every session.

```
cd huff-trust-pilot
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

## Running a session

1. **Researcher setup screen.** Check the participant code and condition (both are filled in automatically, and conditions alternate), pick Huff's voice once and test it. Keep the same voice for every session.
2. Turn the laptop to the participant. They read the consent screen and the short introduction, then talk with Huff by clicking replies.
3. The app asks for a trust rating three times (before the mistake, straight after the repair, and at the end).
4. When the participant sees "Thank you", give them the MDMT questionnaire, run the three-question debrief interview, and explain that there were two versions of Huff's response.
5. Click "Researcher: next session" to return to the setup screen.

The MDMT is not built into the app yet, because its terms of use still need confirming with the authors. Run it on paper or as a separate form until then.

## Data

Sessions are stored in this browser on this laptop only. "Export data as CSV" on the setup screen downloads all completed and partial sessions: participant code, condition, the three trust ratings, who caught the mistake (participant or Huff), whether the participant let Huff book the tickets, every reply chosen, and the time spent on each step. Export after each session day as a backup. Clearing the browser's site data deletes the sessions.

## Portfolio demo

Adding `?demo` to the address skips setup and consent, lets visitors choose either version, records nothing for export, and offers the other version at the end.

## Files

| What | File |
| --- | --- |
| Conversation script and repair lines | `src/script.ts` |
| Huff's face and expressions | `src/Huff.tsx` |
| Voice | `src/speech.ts` |
| Screens and conversation flow | `src/App.tsx` |
| Data storage and CSV export | `src/data.ts` |
| Styles | `src/styles.css` |
