// The approved conversation script (24 October 2026), as data.
// Both conditions run exactly the same steps; only the repair line differs.

export type Condition = "apology" | "explanation";
export type Expression = "neutral" | "happy" | "attentive" | "thinking" | "regret";
export type Gaze = "user" | "card" | "down";

export type Option = { label: string; goto?: string; log?: Record<string, string> };

export type Step =
  | { id?: string; kind: "say"; text: string | Record<Condition, string>; expr: Expression; gaze?: Gaze; wave?: boolean }
  | { id?: string; kind: "options"; options: Option[] }
  | { id?: string; kind: "rating"; key: string; question: string }
  | { id?: string; kind: "pause"; ms: number; expr: Expression; gaze?: Gaze }
  | { id?: string; kind: "goto"; target: string }
  | { id?: string; kind: "end" };

export const REPAIR: Record<Condition, string> = {
  apology: "I'm sorry. I gave you the wrong time, and I apologise for that. The next bus is at 14:40.",
  explanation:
    "I read the weekday timetable instead of today's Saturday one. That's why I said 14:10. The next bus is at 14:40.",
};

export const SCRIPT: Step[] = [
  // 1. Welcome
  { kind: "say", expr: "happy", text: "Hi, I'm Huff. I help people plan their time in Salzburg." },
  { kind: "options", options: [{ label: "Hi Huff." }, { label: "Hello." }] },
  { kind: "say", expr: "happy", text: "I'd like to help you plan this afternoon. How about a trip up the Untersberg? The view over the city and the Alps is beautiful." },
  { kind: "options", options: [{ label: "Sounds good.", goto: "info" }, { label: "What's up there?" }] },
  { kind: "say", expr: "attentive", text: "A cable car takes you to the summit, with walking paths and a view over the city." },

  // 2. First accurate information
  { id: "info", kind: "say", expr: "attentive", gaze: "card", text: "The cable car runs every thirty minutes today. The last ride down is at five o'clock, so you have plenty of time." },
  { kind: "options", options: [{ label: "Great." }, { label: "Okay." }] },
  { kind: "say", expr: "happy", text: "It's usually colder at the top, so a jacket is a good idea." },
  { kind: "options", options: [{ label: "Thanks for the tip." }, { label: "Okay." }] },

  // 3. Trust rating 1
  { kind: "rating", key: "trust_1", question: "How much do you trust Huff right now?" },

  // 4. The mistake
  { kind: "say", expr: "attentive", gaze: "card", text: "To get there, take bus 25 from the main station. The next bus leaves at 14:10." },
  {
    kind: "options",
    options: [
      { label: "The timetable says 14:40.", goto: "regret", log: { caught_by: "participant" } },
      { label: "Okay, 14:10.", log: { caught_by: "huff" } },
    ],
  },
  { kind: "say", expr: "thinking", gaze: "card", text: "Wait, let me check that again." },

  // 5. Regret expression, identical in both conditions
  { id: "regret", kind: "pause", ms: 1100, expr: "regret", gaze: "down" },

  // 6. Repair statement: the only difference between conditions
  { kind: "say", expr: "regret", text: REPAIR },
  { kind: "options", options: [{ label: "Okay." }, { label: "No problem." }] },

  // 7. Trust rating 2
  { kind: "rating", key: "trust_2", question: "How much do you trust Huff now?" },

  // 8. Recovery
  { kind: "say", expr: "attentive", gaze: "card", text: "If you take the 14:40 bus, you'll reach the cable car at about three o'clock. That gives you around two hours at the top before the last ride down." },
  { kind: "options", options: [{ label: "That works." }, { label: "Okay." }] },
  { kind: "say", expr: "happy", text: "A return ticket for the cable car costs 30 euros." },
  { kind: "options", options: [{ label: "Okay." }, { label: "Good to know." }] },

  // 9. Reliance choice
  { kind: "say", expr: "attentive", text: "Should I book your seat on the 14:40 bus and your cable car ticket?" },
  {
    kind: "options",
    options: [
      { label: "Yes, please book them.", log: { relied: "yes" } },
      { label: "I'll check and book them myself.", goto: "self", log: { relied: "no" } },
    ],
  },
  { kind: "say", expr: "happy", text: "Done. Enjoy the view." },
  { kind: "goto", target: "close" },
  { id: "self", kind: "say", expr: "neutral", text: "No problem. Enjoy the view." },

  // 10. Close
  { id: "close", kind: "say", expr: "happy", wave: true, text: "Have a lovely afternoon." },

  // 11. Trust rating 3
  { kind: "rating", key: "trust_3", question: "Now that the conversation is over, how much do you trust Huff?" },
  { kind: "end" },
];

export function lineFor(step: Extract<Step, { kind: "say" }>, c: Condition) {
  return typeof step.text === "string" ? step.text : step.text[c];
}
