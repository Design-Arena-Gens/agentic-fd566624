import { NextRequest, NextResponse } from "next/server";
import { agentNext, agentSummary } from "@/lib/agent";
import { AgentResponse, AgentState } from "@/types/agent";

async function tryOpenAISummary(state: AgentState): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const sys = `You are a skilled garden designer. Given structured answers, produce a concise Markdown concept with: Top styles (3), feelings, uses, site & care, planting palette with 12-20 suggested plants suited to sun/water, 3-4 zoning ideas, and next steps. Keep it pragmatic.`;
    const user = JSON.stringify(state.answers);
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content as string | undefined;
    return content || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const state: AgentState = body.state || { answers: {}, asked: [], completed: false };
  const ask: "next" | "summary" = body.ask || "next";

  if (ask === "summary") {
    const llm = await tryOpenAISummary(state);
    const md = llm || agentSummary(state);
    const res: AgentResponse = { state: { ...state, completed: true }, summaryMarkdown: md };
    return NextResponse.json(res);
  }

  const next = agentNext(state);
  return NextResponse.json(next);
}
