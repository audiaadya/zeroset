import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { solution_id } = await req.json();
    if (!solution_id) {
      return new Response(JSON.stringify({ error: "solution_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the solution
    const { data: solution, error: solError } = await supabase
      .from("solutions")
      .select("id, problem_id, body, author_id, is_correct")
      .eq("id", solution_id)
      .maybeSingle();

    if (solError || !solution) {
      return new Response(JSON.stringify({ error: "Solution not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the problem to get the official answer and proof
    const { data: problem } = await supabase
      .from("problems")
      .select("id, answer, proof, statement, title")
      .eq("id", solution.problem_id)
      .maybeSingle();

    if (!problem) {
      return new Response(JSON.stringify({ error: "Problem not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sol = solution as { id: string; body: string; is_correct: boolean; problem_id: string };
    const prob = problem as { id: string; answer: string | null; proof: string | null; statement: string; title: string };

    // AI grading logic: compare solution against official answer/proof
    // This is a heuristic-based grader that checks for key mathematical content
    const officialAnswer = (prob.answer ?? "").trim().toLowerCase();
    const officialProof = (prob.proof ?? "").trim().toLowerCase();
    const solutionBody = sol.body.trim().toLowerCase();

    let isCorrect = false;
    let confidence = 0;
    const reasoning: string[] = [];

    // Strategy 1: If there's a concise official answer, check if the solution contains it
    if (officialAnswer.length > 0 && officialAnswer.length < 200) {
      // Normalize: remove spaces around math operators for comparison
      const normalize = (s: string) => s.replace(/\s+/g, '').replace(/\\,/g, '').replace(/\\!/g, '');
      const normAnswer = normalize(officialAnswer);
      const normSolution = normalize(solutionBody);

      if (normAnswer.length > 0 && normSolution.includes(normAnswer)) {
        isCorrect = true;
        confidence = 0.85;
        reasoning.push("Solution contains the official answer.");
      }

      // Check for equivalent forms (e.g., 1/2 = 0.5)
      if (!isCorrect && normAnswer.includes('/')) {
        const [num, den] = normAnswer.split('/');
        const numN = parseFloat(num);
        const denN = parseFloat(den);
        if (!isNaN(numN) && !isNaN(denN) && denN !== 0) {
          const decimal = numN / denN;
          const decimalStr = decimal.toString();
          if (normSolution.includes(decimalStr) || normSolution.includes(decimal.toFixed(4))) {
            isCorrect = true;
            confidence = 0.75;
            reasoning.push(`Solution contains decimal equivalent (${decimalStr}) of the official answer (${officialAnswer}).`);
          }
        }
      }
    }

    // Strategy 2: Keyword overlap with the official proof
    if (!isCorrect && officialProof.length > 0) {
      const proofKeywords = officialProof
        .split(/\s+/)
        .filter((w) => w.length > 4 && !['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should', 'there', 'their', 'where', 'which', 'what', 'when', 'then', 'than', 'also', 'must', 'does', 'does', 'such', 'each', 'both', 'into', 'only', 'very', 'just', 'more', 'most', 'some', 'any', 'all', 'can', 'may', 'might', 'shall', 'ought', 'used', 'uses', 'using', 'given', 'hence', 'since', 'thus', 'therefore', 'because', 'suppose', 'assume', 'consider', 'define', 'let', 'set', 'get', 'put', 'take', 'make', 'gives', 'yields', 'implies', 'follows', 'proves', 'shown', 'q.e.d', 'qed', 'square'].includes(w));

      const solWords = new Set(solutionBody.split(/\s+/));
      let matches = 0;
      for (const kw of proofKeywords) {
        if (solWords.has(kw)) matches++;
      }
      const overlap = proofKeywords.length > 0 ? matches / proofKeywords.length : 0;
      if (overlap > 0.4) {
        isCorrect = true;
        confidence = Math.min(0.7, overlap);
        reasoning.push(`Solution shares ${Math.round(overlap * 100)}% of key proof terms with the official proof.`);
      }
    }

    // Strategy 3: Check for common correctness indicators
    if (!isCorrect) {
      const correctIndicators = ['therefore', 'hence', 'thus', 'q.e.d', 'qed', '∎', 'conclude', 'proven', 'shown', 'as required', 'as desired'];
      const hasConclusion = correctIndicators.some((ind) => solutionBody.includes(ind));
      const hasSubstance = solutionBody.length > 100;

      if (hasConclusion && hasSubstance && officialAnswer.length > 0) {
        // Check if the answer appears anywhere in a "therefore ... = answer" pattern
        const answerPattern = officialAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(answerPattern, 'i');
        if (regex.test(sol.body)) {
          isCorrect = true;
          confidence = 0.65;
          reasoning.push("Solution reaches a conclusion matching the official answer.");
        }
      }
    }

    // Update the solution with the AI grade
    const { error: updateError } = await supabase
      .from("solutions")
      .update({
        is_correct: isCorrect,
        ai_graded: true,
        ai_confidence: confidence,
        ai_reasoning: reasoning.join(' ') || 'No strong match found between solution and official answer/proof.',
      })
      .eq("id", solution_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If correct, check for first blood
    if (isCorrect) {
      const { data: existing } = await supabase
        .from("problems")
        .select("first_blood_user_id")
        .eq("id", sol.problem_id)
        .maybeSingle();

      const p = existing as { first_blood_user_id: string | null } | null;
      if (p && !p.first_blood_user_id) {
        const { data: solData } = await supabase
          .from("solutions")
          .select("author_id, author_name")
          .eq("id", solution_id)
          .maybeSingle();
        const s = solData as { author_id: string; author_name: string } | null;
        if (s) {
          await supabase
            .from("problems")
            .update({ first_blood_user_id: s.author_id, first_blood_user_name: s.author_name })
            .eq("id", sol.problem_id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      is_correct: isCorrect,
      confidence,
      reasoning: reasoning.join(' ') || 'No strong match found between solution and official answer/proof.',
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
