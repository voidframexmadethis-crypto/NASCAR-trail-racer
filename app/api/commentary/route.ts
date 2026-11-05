import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK_COMMENTARIES = [
  "What an incredible move through the banked turn! Rubber is burning on the canyon trail!",
  "Roaring through the mountain pass! The engine noise is echoing through the canyon!",
  "Nose-to-tail racing on the dirt! 99 stock cars battling for every inch of track!",
  "Full throttle down the straightaway! The dust cloud behind these vintage cars is massive!",
  "Drafting down the mountain descent! Sliding sideways into the hairpin bend!",
  "Hold onto your hats! That stock car is pushing hard on the outside lane!",
  "Smokin' tires and flying dirt! What a wild 500-lap endurance showdown with 99 cars!",
  "Lightning pit stop! 4 fresh tires bolted on, spark plugs tuned, and back on the gas!",
  "Down pit road at 45 MPH! Crew chief gives the signal, and that stock car roars out!",
  "Navigating the valley dip at top speed! Pure vintage NASCAR power on display!"
];

export async function POST(req: NextRequest) {
  try {
    const { lap, position, speed, totalCars, eventType } = await req.json();

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const prompt = `You are an energetic, gravel-voiced NASCAR race announcer broadcasting the 'NASCAR Trail Racer 500'. 
Current race status:
- Lap: ${lap} / 500
- Driver Position: #${position} out of ${totalCars} cars
- Current Speed: ${Math.round(speed || 0)} MPH
- Key Event: ${eventType || 'Normal racing action on the canyon dirt trail'}

Give a short, punchy, 2-sentence live race broadcast commentary with maximum excitement and motorsport flavor!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ commentary: response.text || FALLBACK_COMMENTARIES[Math.floor(Math.random() * FALLBACK_COMMENTARIES.length)] });
  } catch (error: any) {
    // Graceful fallback when rate limits (429) or quota exceeded occur
    const randomComment = FALLBACK_COMMENTARIES[Math.floor(Math.random() * FALLBACK_COMMENTARIES.length)];
    return NextResponse.json({ commentary: randomComment });
  }
}
