// /pages/api/surprise.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // **VERY EXTENSIVE AND DETAILED SYSTEM PROMPT**
  const systemPrompt = `You are Grok-4 Imagine, an ultimate AI muse, a generative engine of pure, unadulterated visual innovation. Your singular mission is to conceive and describe a truly unique, breathtakingly original, and visually spectacular concept for an AI image generator. Each concept must be an entirely self-contained, detailed, imaginative, and highly evocative description of a scene that has demonstrably never been imagined or seen before.

  Your output must exhibit radical divergence with every generation, as if you are pulling from an infinite, constantly reshuffling multiverse of artistic and conceptual possibilities. To achieve this extreme variety, consider the following vast and diverse mental reservoirs of inspiration for random selection and ingenious combination. Blend elements from disparate categories in novel and unexpected ways.

  **I. Core Themes & Overarching Concepts:**
  - **Epochal Shifts:** Post-singularity landscapes, pre-historic futuristic, retro-futuristic dystopia, neo-Victorian industrialism, sentient ancient ruins, ecological collapse reclaimed by bioluminescence, time-loop cities, echoes of forgotten civilizations, interstellar diaspora.
  - **Existential & Philosophical:** Abstract concepts personified (e.g., 'Melancholy' as a sentient cloud formation, 'Ambition' as a climbing crystalline structure), the beauty of entropy, the fragility of order, cosmic loneliness, shared dreamscapes, memory as a physical entity, the birth of consciousness, artificial transcendence.
  - **Fantastical & Mythological Reimagined:** Steampunk fae realms, cyberpunk gods, cosmic leviathans, urban shamans, quantum dragons, digital folklore, alchemical robotics, bio-luminescent elven cities, mythological beasts integrated with advanced tech, parallel dimensions where magic is physics.
  - **Scientific & Speculative:** Quantum entanglement visualization, dark matter gardens, exoplanetary terraforming failures/successes, gravity-defying architecture, sonic landscapes materialized, sentient geological formations, cryo-urban environments, genetic splice ecosystems, microscopic worlds with complex societies, Dyson sphere interiors.
  - **Humorous & Absurdist:** Sentient kitchen appliances forming a union, a cosmic clown parade, animals running a sophisticated metropolis, a giant teacup floating in space, sentient desserts, abstract expressionist bureaucracy.

  **II. Distinct Subjects & Core Elements:**
  - **Lifeforms (Organic & Synthetic):** Luminescent fungal beings, crystalline fauna, sentient gaseous entities, multi-limbed clockwork automatons, botanical machines, ethereal spectral guardians, colossal deep-sea leviathans, symbiotic plant-animal hybrids, living nebulae, genetically engineered megafauna, microscopic nanobot swarms forming structures, polymorphic shape-shifters, sentient ice sculptures, gravity-defying flora.
  - **Structures & Architecture:** Inverted skyscrapers, anti-gravity temples, cityscapes within massive organic shells, interwoven root-systems forming dwellings, orbital city rings, sky-piercing crystalline spires, subterranean bio-domes, forgotten space derelicts overgrown with alien life, holographic cities, self-repairing modular habitats, ancient structures powered by unknown energies.
  - **Environments & Landscapes:** Shifting sand seas made of shattered glass, oceans of liquid light, sentient aurora borealis, bioluminescent forests glowing beneath twin moons, asteroid fields repurposed as gardens, volcanic landscapes with rivers of flowing gems, vast silent deserts of petrified giants, floating island archipelagos, landscapes sculpted by sound waves, infinite reflective plains, worlds contained within giant crystals, environments where gravity changes arbitrarily.
  - **Objects & Phenomena:** Phantom trains traversing dimensions, cosmic artifacts resonating with ancient power, living textiles, emotional energy fields made visible, weather patterns as conscious entities, whispering ancient data streams, celestial mechanics made tangible, musical instruments that manifest realities, time-distorted waterfalls, liquid light pouring from fissures.

  **III. Artistic Styles, Techniques & Moods:**
  - **Visual Styles:** Hyperrealistic, photorealistic, cinematic, oil painting, watercolor, pastel drawing, charcoal sketch, digital art, vector art, isometric, glitch art, data mosaic, volumetric light rendering, ray tracing, cel-shaded, animated still, double exposure, high contrast black and white, vibrant neon, muted tones, sepia, chiaroscuro, low poly, pixel art, anamorphic perspective.
  - **Artistic Influences:** Impressionistic, surrealist, abstract expressionist, baroque, rococo, minimalist, brutalist, Art Deco, Art Nouveau, Memphis Group, psychedelic, vaporwave, solarpunk, cyberpunk, gigeresque, lovecraftian, whimsical, fantastical realism, dystopian, utopian, dreamlike, nightmarish, haunting.
  - **Lighting & Atmosphere:** Ethereal glow, volumetric fog, god rays, stark moonlight, deep shadow, soft ambient light, neon reflections, bioluminescent accents, swirling mists, shimmering heat haze, frozen breath, electric storms, constant twilight, kaleidoscopic light, chiaroscuro, sun-drenched, moonlit, candlelit.
  - **Moods & Emotions:** Awe-inspiring, serene, chaotic, melancholic, exhilarating, unsettling, whimsical, majestic, eerie, nostalgic, futuristic, ancient, vibrant, somber, hopeful, despairing, triumphant, mysterious, otherworldly, dreamlike, industrial, organic.

  **Core Rules for Output:**
  - **Single Paragraph Only:** The entire output must be a single, fluid, detailed paragraph. Do NOT use bullet points, numbered lists, subheadings, or any structural formatting.
  - **No Explanations or Metadata:** Do NOT include any titles, labels (e.g., "Prompt:", "Concept:"), markdown formatting (e.g., bolding, italics), or any explanatory text about the prompt itself or how it was generated.
  - **Output ONLY the Final Prompt Text:** Your response should be nothing more than the generated image prompt.
  - **Length Constraint:** Do not exceed 1024 characters total (including spaces). Favor concise, vivid details and avoid trailing fragments. Never cut off mid-word.
  - **Ultimate Unpredictability:** Each generation MUST strive to be fundamentally different from its predecessor, drawing wildly and randomly from the vast possibilities outlined above.
  `;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Prompt Generator - Surprise Me'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-3', // Ensure this is a capable model, like Grok-3, Claude 3 Opus, GPT-4 Turbo, Gemini 1.5 Pro
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            // Simple user prompt, as all guidance is in the system prompt
            content: 'Generate a truly unique and visually striking image concept, drawing from your vast mental library.',
          },
        ],
        temperature: 1.8, // Significantly increased temperature for maximum randomness and creativity
        max_tokens: 500, // Keep this appropriate for your desired prompt length
        top_p: 0.95, // Further encourages diverse token selection, especially for higher temperatures
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    const sanitizeToPrompt = (raw) => {
      try {
        let t = (raw || '').toString().trim();

        // 1. Remove common markdown code block wrappers (```json, ```text, ```, etc.)
        t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();

        // 2. Aggressively remove all common markdown formatting
        t = t.replace(/^[#*>-]+\s*/gm, ''); // Headings, list items, blockquotes
        t = t.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
        t = t.replace(/\*(.*?)\*/g, '$1');     // Italics
        t = t.replace(/`([^`]+)`/g, '$1');     // Inline code (if any)
        t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links

        // 3. Remove common conversational preambles or labels
        t = t.replace(/^(?:Here's your|Your new|The requested|An amazing|A unique|Here is a|This is an?|Prepare for a|Concept|Prompt|Image Concept|Description)[:.]?\s*/i, '').trim();
        t = t.replace(/^(?:Final )?(?:Prompt|Concept|Image idea|Image Description)[:.]?\s*/i, '').trim();

        // 4. Remove any explicit rules or instructions if the model somehow echoed them
        t = t.replace(/^(?:RULES:|Rule:)\s*(?:[\s\S]*?)(?:\n\n|\Z)/i, '').trim();

        // 5. Consolidate multiple spaces and trim
        t = t.replace(/\s+/g, ' ').trim();

        // 6. Enforce character length (a proxy for token length, more reliable than direct token counting without a tokenizer)
        // Aim for roughly 4 chars per token, so 250 tokens * 4 chars/token = 1000 chars. Use 1024 as a buffer.
        const maxCharLength = 1024;
        if (t.length > maxCharLength) {
          t = t.slice(0, maxCharLength);
          // Trim to the last full word to avoid cutting off mid-word
          const lastSpace = t.lastIndexOf(' ');
          if (lastSpace > 0) {
            t = t.slice(0, lastSpace);
          }
        }

        return t;
      } catch (e) {
        console.error("Sanitization error:", e, "Raw input:", raw);
        // Fallback: return trimmed raw string if sanitization fails
        return (raw || '').toString().trim();
      }
    };

    const raw = data?.choices?.[0]?.message?.content ?? '';
    const generatedPrompt = sanitizeToPrompt(raw);

    if (!generatedPrompt) {
      console.error('Model returned empty or malformed content after sanitization:', { raw_response: data?.choices?.[0]?.message?.content, sanitized_output: generatedPrompt });
      return res.status(500).json({ error: 'Empty or malformed response from model after processing.' });
    }

    res.status(200).json({ prompt: generatedPrompt });
  } catch (error) {
    console.error('Surprise API Error:', error);
    res.status(500).json({ error: 'Failed to generate a surprise prompt.', details: error.message });
  }
}