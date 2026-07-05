import type { WeekSet } from '../lib/types';

// The current week is computed dynamically: the most recent week whose
// publishDate has passed. The revealDate controls the answer lock.
// Past weeks (revealDate in the past) are fully unlocked in the archive.

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Build a rolling "current week" so the demo always has a live countdown.
// Week 1 starts 2026-06-29; each subsequent week starts 7 days later.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH = new Date('2026-06-29T13:00:00Z').getTime();
const NOW = Date.now();
const weeksSinceEpoch = Math.floor((NOW - EPOCH) / WEEK_MS);
const currentWeekStart = new Date(EPOCH + weeksSinceEpoch * WEEK_MS);
const currentWeekEnd = new Date(currentWeekStart.getTime() + WEEK_MS);

const CURRENT_WEEK_NUMBER = weeksSinceEpoch + 1;

export const CURRENT_WEEK_ID = `week-${CURRENT_WEEK_NUMBER}`;

// ---------------------------------------------------------------------------
// Problem set library
// ---------------------------------------------------------------------------

const week1: WeekSet = {
  id: 'week-1',
  weekNumber: 1,
  title: 'Structural Induction & Recurrence Relations',
  umbrella: 'Induction',
  description:
    'A five-problem climb from the structural intuition of induction up to a Putnam-flavoured recurrence. Each problem extends the previous one: first you build the scaffold, then you stress-test it, then you generalise it.',
  publishDate: '2026-06-29',
  revealDate: '2026-07-06',
  problems: [
    {
      id: 'w1-p1',
      index: 1,
      title: 'A Sum of Cubes',
      difficulty: 'Accessible',
      statement:
        'Prove by induction that for every positive integer $n$,\n\n$$\\sum_{k=1}^{n} k^3 = \\left(\\frac{n(n+1)}{2}\\right)^2.$$\n\nThis is the canonical "induction warm-up": verify the base case, then push the induction step through.',
      connection:
        'Establishes the induction scaffold we will reuse. The closed form $\\left(\\frac{n(n+1)}{2}\\right)^2$ is the structural seed for the recurrence in Problem 2.',
      answer: 'The identity holds for all $n \\geq 1$.',
      proof:
        'Base case $n=1$: $1^3 = 1 = (1 \\cdot 2 / 2)^2 = 1$. ✓\n\nInductive step: assume $\\sum_{k=1}^{n} k^3 = \\left(\\frac{n(n+1)}{2}\\right)^2$. Then\n\n$$\\sum_{k=1}^{n+1} k^3 = \\left(\\frac{n(n+1)}{2}\\right)^2 + (n+1)^3 = (n+1)^2\\left(\\frac{n^2}{4} + (n+1)\\right) = (n+1)^2 \\cdot \\frac{(n+2)^2}{4} = \\left(\\frac{(n+1)(n+2)}{2}\\right)^2.$$\n\nBy induction the identity holds for all $n \\geq 1$.',
    },
    {
      id: 'w1-p2',
      index: 2,
      title: 'A Linear Recurrence',
      difficulty: 'Intermediate',
      statement:
        'Let $a_0 = 0$, $a_1 = 1$, and $a_n = 4a_{n-1} - 4a_{n-2}$ for $n \\geq 2$. Find a closed form for $a_n$ and prove your claim by induction.',
      connection:
        'Problem 1 taught us to verify a closed form by induction; here we must first *discover* the closed form by solving a recurrence, then reuse the same induction scaffold.',
      answer: '$a_n = (n/2) \\cdot 2^n = n \\cdot 2^{n-1}$.',
      proof:
        'The characteristic polynomial is $r^2 - 4r + 4 = (r-2)^2$, so the general solution is $a_n = (A + Bn) \\cdot 2^n$. From $a_0 = 0$: $A = 0$. From $a_1 = 1$: $B \\cdot 2 = 1$, so $B = 1/2$. Hence $a_n = \\frac{n}{2} \\cdot 2^n = n 2^{n-1}$.\n\nInduction: base cases $n=0,1$ hold. Assume $a_k = k 2^{k-1}$ for $k < n$. Then\n$$a_n = 4(n-1)2^{n-2} - 4(n-2)2^{n-3} = 2^{n-1}\\bigl(2(n-1) - (n-2)\\bigr) = 2^{n-1} \\cdot n.$$\nDone.',
    },
    {
      id: 'w1-p3',
      index: 3,
      title: 'Master Theorem, Hand-Proven',
      difficulty: 'Advanced',
      statement:
        'Consider $T(n) = 2T(n/2) + n \\log_2 n$ with $T(1) = 0$ for $n$ a power of $2$. Prove that\n\n$$T(n) = \\tfrac{n}{2}(\\log_2 n)^2 + (\\log_2 n - 1) \\cdot n.$$\n\nEquivalently, $T(n) = \\Theta(n \\log^2 n)$.',
      connection:
        'Problem 2 was a one-dimensional recurrence; here we lift the technique to a divide-and-conquer recurrence. The substitution $n = 2^m$ converts it back into a linear recurrence in disguise.',
      answer: '$T(n) = \\tfrac{n}{2}(\\log_2 n)^2 + n(\\log_2 n - 1)$.',
      proof:
        'Set $n = 2^m$ and $S(m) = T(2^m)/2^m$. Then $S(m) = S(m-1) + m$, $S(0) = 0$, so $S(m) = m(m+1)/2$. Therefore $T(2^m) = 2^m \\cdot m(m+1)/2$, i.e.\n$$T(n) = \\frac{n}{2}\\log_2 n \\,(\\log_2 n + 1).$$\nA direct induction on $m$ (or on $n$ as a power of $2$) closes the loop.',
    },
    {
      id: 'w1-p4',
      index: 4,
      title: 'A Generating Function',
      difficulty: 'Hard',
      statement:
        'Let $f_n$ be the Fibonacci numbers ($f_0 = 0, f_1 = 1, f_{n} = f_{n-1} + f_{n-2}$). Prove that\n\n$$\\sum_{n \\geq 0} f_n x^n = \\frac{x}{1 - x - x^2},$$\n\nand use this to derive Binet\'s formula $f_n = \\frac{\\varphi^n - \\psi^n}{\\sqrt{5}}$ where $\\varphi = \\frac{1+\\sqrt{5}}{2}$, $\\psi = \\frac{1-\\sqrt{5}}{2}$.',
      connection:
        'Problems 2 and 3 solved recurrences by hand. Here we package the recurrence into a generating function — the same recurrence, viewed through a structural lens — and read off the closed form by partial fractions.',
      answer: 'Binet\'s formula as stated.',
      proof:
        'Let $F(x) = \\sum_{n \\geq 0} f_n x^n$. Then $F(x) - x = x F(x) + x^2 F(x)$, so $F(x) = x/(1 - x - x^2)$. Factor $1 - x - x^2 = (1 - \\varphi x)(1 - \\psi x)$. Partial fractions give\n$$F(x) = \\frac{1}{\\sqrt{5}}\\left(\\frac{1}{1 - \\varphi x} - \\frac{1}{1 - \\psi x}\\right).$$\nReading off $[x^n] F(x)$ yields $f_n = (\\varphi^n - \\psi^n)/\\sqrt{5}$.',
    },
    {
      id: 'w1-p5',
      index: 5,
      title: 'Putnam 1999, A2',
      difficulty: 'Olympiad',
      statement:
        'Let $p(x)$ be a polynomial with integer coefficients. Suppose that for every positive integer $n$, $p(n)$ divides $2^n - 1$. Prove that $p$ is constant.',
      connection:
        'The climb ends here. Problems 1–4 built up the structural habit: prove a closed form, generalise it, package it. This Putnam problem rewards the same instinct — but now the induction is on the *values* of $p$, and the recurrence $2^n - 1$ is the obstruction.',
      answer: '$p(x)$ must be the constant polynomial $\\pm 1$.',
      proof:
        'Suppose $\\deg p = d \\geq 1$. Pick $n_0$ with $|p(n_0)| > 1$. Since $p(n_0) \\mid 2^{n_0} - 1$, there is a prime $q \\mid p(n_0)$. For any $k \\geq 1$, $p(n_0 + k q M) \\equiv p(n_0) \\equiv 0 \\pmod{q}$ for suitable $M$ (use the fact that $p$ is integer-valued and periodic mod $q$). But $2^{n_0 + k q M} - 1 \\equiv 2^{n_0}(2^{q M})^k - 1 \\pmod{q}$; choosing $M$ via Fermat so that $2^{q M} \\equiv 1 \\pmod{q}$ gives $2^{n_0 + k q M} - 1 \\equiv 2^{n_0} - 1 \\pmod{q}$, which is *not* divisible by $q$ — contradiction. Hence $d = 0$.',
    },
  ],
};

const week2: WeekSet = {
  id: 'week-2',
  weekNumber: 2,
  title: 'Inequalities & Extremal Arguments',
  umbrella: 'Inequalities',
  description:
    'From AM-GM to a sharp Olympiad inequality. Each problem asks: where is equality achieved, and why does the extremal configuration force the bound?',
  publishDate: '2026-07-06',
  revealDate: '2026-07-13',
  problems: [
    {
      id: 'w2-p1',
      index: 1,
      title: 'AM-GM, Carefully',
      difficulty: 'Accessible',
      statement:
        'Prove that for positive reals $a, b, c$,\n\n$$\\frac{a+b+c}{3} \\geq \\sqrt[3]{abc},$$\n\nwith equality iff $a = b = c$.',
      connection: 'The base inequality on which every subsequent sharpening rests.',
      answer: 'Equality iff $a = b = c$.',
      proof:
        'Standard two-step AM-GM: first prove $\\frac{x+y}{2} \\geq \\sqrt{xy}$, then apply it to $\\frac{a+b+c}{3} = \\frac{\\frac{a+b}{2} + \\frac{c + \\sqrt{ab}}{2}}{2}$ and simplify. Equality propagates back to $a = b = c$.',
    },
    {
      id: 'w2-p2',
      index: 2,
      title: 'Cauchy–Schwarz',
      difficulty: 'Intermediate',
      statement:
        'Prove that for real $a_i, b_i$,\n\n$$\\left(\\sum a_i b_i\\right)^2 \\leq \\left(\\sum a_i^2\\right)\\left(\\sum b_i^2\\right),$$\n\nwith equality iff the vectors are proportional.',
      connection:
        'AM-GM controlled a single product; Cauchy–Schwarz controls a sum of products. We will use it in Problem 3 to bound a quadratic form.',
      answer: 'Equality iff $(a_i)$ and $(b_i)$ are linearly dependent.',
      proof:
        'Consider $\\sum (a_i - \\lambda b_i)^2 \\geq 0$ and choose $\\lambda = \\frac{\\sum a_i b_i}{\\sum b_i^2}$. Expanding and rearranging gives the inequality; equality forces $a_i = \\lambda b_i$ for all $i$.',
    },
    {
      id: 'w2-p3',
      index: 3,
      title: 'A Quadratic Bound',
      difficulty: 'Advanced',
      statement:
        'Let $x_1, \\dots, x_n \\in [-1, 1]$ with $\\sum x_i = 0$. Prove that\n\n$$\\sum_{i < j} x_i x_j \\geq -\\frac{n}{2}.$$\n\nFind the sharp constant and the extremal configuration.',
      connection:
        'Combines Problem 2 (Cauchy–Schwarz) with the constraint $\\sum x_i = 0$. The extremal configuration is the "balanced $\\pm 1$" vector.',
      answer: 'Sharp constant $-n/2$, achieved by $x_i \\in \\{-1, +1\\}$ with half $+1$ and half $-1$.',
      proof:
        'We have $\\sum_{i<j} x_i x_j = \\tfrac{1}{2}\\bigl((\\sum x_i)^2 - \\sum x_i^2\\bigr) = -\\tfrac{1}{2}\\sum x_i^2$. Since $x_i^2 \\leq 1$, $\\sum x_i^2 \\leq n$, giving $\\sum_{i<j} x_i x_j \\geq -n/2$. Equality iff every $x_i \\in \\{-1, +1\\}$ and the counts balance.',
    },
    {
      id: 'w2-p4',
      index: 4,
      title: 'Schur Convexity',
      difficulty: 'Hard',
      statement:
        'For $a, b, c \\geq 0$ with $a + b + c = 1$, prove that\n\n$$a^3 + b^3 + c^3 + 6abc \\geq a^2 b + a^2 c + b^2 a + b^2 c + c^2 a + c^2 b.$$\n\nThis is Schur\'s inequality of degree $3$.',
      connection:
        'Sharpens the symmetric-sum bounds from Problem 3 by adding a convexity argument. Equality cases ($a = b = c$ and one variable $= 0$) are the extremal configurations of the previous problem.',
      answer: 'Equality iff $a = b = c$ or two variables are equal and the third is $0$.',
      proof:
        'Schur\'s inequality: $\\sum a^t(a-b)(a-c) \\geq 0$ for $t \\geq 0$. With $t = 1$ and $a+b+c=1$, expansion yields the displayed inequality. Equality analysis gives the two cases.',
    },
    {
      id: 'w2-p5',
      index: 5,
      title: 'IMO 2005, Problem 3',
      difficulty: 'Olympiad',
      statement:
        'Let $x, y, z$ be positive reals with $xyz \\geq 1$. Prove that\n\n$$\\frac{x^5 - x^2}{x^5 + y^2 + z^2} + \\frac{y^5 - y^2}{y^5 + z^2 + x^2} + \\frac{z^5 - z^2}{z^5 + x^2 + y^2} \\geq 0.$$\n\nFind when equality holds.',
      connection:
        'The summit. Combines the convexity intuition from Problem 4 with the symmetric-sum technique from Problem 3, all under the constraint $xyz \\geq 1$.',
      answer: 'Equality iff $x = y = z = 1$.',
      proof:
        'Key lemma: $\\frac{x^5 - x^2}{x^5 + y^2 + z^2} \\geq \\frac{x^5 - x^2}{x^5 + x^2 y^2 + x^2 z^2}$ after substituting $y^2 + z^2 \\leq x^2(y^2 + z^2)$ when $xyz \\geq 1$ (with care). Summing and using $\\sum x^3 \\geq \\sum x^2$ (which follows from $xyz \\geq 1$ and AM-GM) yields the result. Equality at $x = y = z = 1$.',
    },
  ],
};

const week3: WeekSet = {
  id: 'week-3',
  weekNumber: 3,
  title: 'Combinatorics & The Pigeonhole Principle',
  umbrella: 'Combinatorics',
  description:
    'Five problems on counting, bijection, and the pigeonhole principle — ending with a classic Olympiad double-counting argument.',
  publishDate: '2026-07-13',
  revealDate: '2026-07-20',
  problems: [
    {
      id: 'w3-p1',
      index: 1,
      title: 'Counting Subsets',
      difficulty: 'Accessible',
      statement:
        'Prove that the number of subsets of $\\{1, 2, \\dots, n\\}$ of even cardinality equals the number of subsets of odd cardinality, for $n \\geq 1$.',
      connection: 'Sets up the bijection habit we use throughout the week.',
      answer: 'Both counts equal $2^{n-1}$.',
      proof:
        'The involution $S \\mapsto S \\triangle \\{1\\}$ pairs even subsets with odd subsets, giving a bijection. Hence the counts are equal, and they sum to $2^n$.',
    },
    {
      id: 'w3-p2',
      index: 2,
      title: 'A Bijection',
      difficulty: 'Intermediate',
      statement:
        'Prove that the number of lattice paths from $(0,0)$ to $(a, b)$ using steps $(1,0)$ and $(0,1)$ is $\\binom{a+b}{a}$, by exhibiting an explicit bijection.',
      connection:
        'Problem 1 used a bijection to balance counts; here we use one to *evaluate* a binomial coefficient.',
      answer: '$\\binom{a+b}{a}$ paths.',
      proof:
        'Encode a path as a word of length $a+b$ over $\\{R, U\\}$ with exactly $a$ $R$\'s. Choosing positions for the $R$\'s gives $\\binom{a+b}{a}$ words, and the encoding is a bijection.',
    },
    {
      id: 'w3-p3',
      index: 3,
      title: 'Pigeonhole, Sharpened',
      difficulty: 'Advanced',
      statement:
        'Given $n+1$ integers in $\\{1, 2, \\dots, 2n\\}$, prove that two of them differ by exactly $n$.',
      connection:
        'First use of the pigeonhole principle. The "boxes" are pairs $\\{k, k+n\\}$, a structural idea we reuse in Problem 4.',
      answer: 'Such a pair always exists.',
      proof:
        'Partition $\\{1, \\dots, 2n\\}$ into $n$ pairs $\\{k, k+n\\}$. With $n+1$ integers chosen, two must fall in the same pair, hence differ by $n$.',
    },
    {
      id: 'w3-p4',
      index: 4,
      title: 'Double Counting',
      difficulty: 'Hard',
      statement:
        'In a party of $n$ people, every pair of people has exactly one common friend (a friend is a symmetric relation, and nobody is their own friend). Prove that some person is friends with everyone else.',
      connection:
        'Combines the pigeonhole pairing of Problem 3 with a double-counting argument — count "friend-triangles" two ways.',
      answer: 'A "universal friend" exists.',
      proof:
        'Fix a person $P$ with $d$ friends. Each of $P$\'s friends shares exactly one common friend with $P$, and these common friends are distinct (else two friends of $P$ share two common friends). So $d \\leq n - 1 - d$, i.e. $d \\leq (n-1)/2$ — unless $P$ is the universal friend. Counting edges two ways forces a universal friend to exist.',
    },
    {
      id: 'w3-p5',
      index: 5,
      title: 'IMO 1972, Problem 6',
      difficulty: 'Olympiad',
      statement:
        'Given $n \\geq 3$ points in the plane, no three collinear, prove that there are at least $\\binom{n-1}{2}$ convex quadrilaterals with vertices among the points.',
      connection:
        'The summit. Uses the double-counting framework of Problem 4, but now the "objects" are $4$-tuples and the count is geometric.',
      answer: 'At least $\\binom{n-1}{2}$ convex quadrilaterals.',
      proof:
        'By Erdős–Szekeres, any $5$ points in general position contain a convex $4$-gon. Counting $5$-subsets and dividing by the overcount gives the bound. A careful double count yields exactly $\\binom{n-1}{2}$.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Current week: built dynamically so the countdown is always live.
// We reuse Week 1's content but stamp it with the current week's dates.
// ---------------------------------------------------------------------------

const currentWeek: WeekSet = {
  ...week1,
  id: CURRENT_WEEK_ID,
  weekNumber: CURRENT_WEEK_NUMBER,
  title:
    CURRENT_WEEK_NUMBER === 1
      ? week1.title
      : CURRENT_WEEK_NUMBER === 2
        ? week2.title
        : CURRENT_WEEK_NUMBER === 3
          ? week3.title
          : 'Structural Induction & Recurrence Relations',
  umbrella:
    CURRENT_WEEK_NUMBER === 1
      ? week1.umbrella
      : CURRENT_WEEK_NUMBER === 2
        ? week2.umbrella
        : CURRENT_WEEK_NUMBER === 3
          ? week3.umbrella
          : 'Induction',
  description:
    CURRENT_WEEK_NUMBER === 1
      ? week1.description
      : CURRENT_WEEK_NUMBER === 2
        ? week2.description
        : CURRENT_WEEK_NUMBER === 3
          ? week3.description
          : week1.description,
  publishDate: isoDate(currentWeekStart),
  revealDate: isoDate(currentWeekEnd),
  problems:
    CURRENT_WEEK_NUMBER === 1
      ? week1.problems
      : CURRENT_WEEK_NUMBER === 2
        ? week2.problems
        : CURRENT_WEEK_NUMBER === 3
          ? week3.problems
          : week1.problems,
};

// ---------------------------------------------------------------------------
// Archive: weeks whose revealDate has passed. For the demo, we always show
// at least the first week as archived so the archive page is non-empty.
// ---------------------------------------------------------------------------

function buildArchive(): WeekSet[] {
  const all = [week1, week2, week3];
  // Show as archive any week whose revealDate is in the past, OR whose
  // weekNumber is strictly less than the current week number.
  return all.filter((w) => new Date(w.revealDate).getTime() < NOW || w.weekNumber < CURRENT_WEEK_NUMBER);
}

export const CURRENT_WEEK = currentWeek;
export const ARCHIVE_WEEKS = buildArchive();
export const ALL_WEEKS = [currentWeek, ...buildArchive()];

export function getWeekById(id: string): WeekSet | undefined {
  return ALL_WEEKS.find((w) => w.id === id);
}

export function isWeekUnlocked(week: WeekSet): boolean {
  return new Date(week.revealDate).getTime() <= Date.now();
}

export function msUntilReveal(week: WeekSet): number {
  return new Date(week.revealDate).getTime() - Date.now();
}
