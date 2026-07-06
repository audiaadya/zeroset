import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import MathText from './MathText';
import type { Problem, WeekSet } from '../lib/types';

interface Props {
  problems: Problem[];
  week: WeekSet;
  onComplete?: () => void;
}

export default function MockSimulator({ problems, onComplete }: Props) {
  const { user, configured } = useAuth();
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 1 hour default
  const [duration, setDuration] = useState(60); // minutes
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          endSession();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    if (!user || !configured) return;
    const { data, error } = await supabase
      .from('mock_sessions')
      .insert({
        user_id: user.id,
        problem_ids: problems.map((p) => p.id),
        duration_minutes: duration,
      })
      .select('id')
      .maybeSingle();

    if (!error && data) {
      setSessionId((data as { id: string }).id);
      setActive(true);
      setTimeLeft(duration * 60);
      setAnswers({});
      setCurrentIndex(0);
    } else {
      setActive(true);
      setTimeLeft(duration * 60);
      setAnswers({});
      setCurrentIndex(0);
    }
  };

  const endSession = useCallback(async () => {
    if (!user || !configured) return;
    setActive(false);
    if (sessionId) {
      await supabase
        .from('mock_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
          answers,
        })
        .eq('id', sessionId);
    }
    onComplete?.();
  }, [user, configured, sessionId, answers, onComplete]);

  const submitAnswer = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
  };

  if (!configured || !user) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 text-sm text-ink-400">
        <AlertTriangle className="mb-1 h-4 w-4 text-yellow-400" />
        Sign in to use the Mock Simulator.
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-lg border border-accent-400/40 bg-accent-400/5 p-4 space-y-4">
        <div className="flex items-center gap-2 text-accent-300">
          <Clock className="h-5 w-5" />
          <h4 className="font-serif text-lg">AIME-Style Mock Simulator</h4>
        </div>
        <p className="text-sm text-ink-400">
          Practice under timed conditions. Solutions and discussions will be hidden.
          Your answers are saved but not submitted until you complete the session.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-300">Duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-ink-100"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
          <button
            onClick={startSession}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-400/25"
          >
            <Play className="h-4 w-4" />
            Start Mock Session
          </button>
        </div>
      </div>
    );
  }

  const currentProblem = problems[currentIndex];

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-30 -mx-4 bg-ink-900/95 backdrop-blur-sm border-b border-ink-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`font-mono text-2xl ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-accent-300'}`}>
              {formatTime(timeLeft)}
            </div>
            <span className="text-sm text-ink-400">Problem {currentIndex + 1} of {problems.length}</span>
          </div>
          <button
            onClick={() => {
              if (confirm('End this mock session? Your progress will be saved.')) {
                endSession();
              }
            }}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
          >
            <Square className="h-3.5 w-3.5" />
            End Session
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-mono transition ${
                i === currentIndex
                  ? 'bg-accent-400 text-ink-900'
                  : answers[p.id]
                    ? 'bg-accent-400/20 text-accent-300 border border-accent-400/40'
                    : 'bg-ink-800 text-ink-400 border border-ink-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl text-ink-50">{currentProblem.title}</h3>
          <span className="rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-xs text-ink-400">
            {currentProblem.difficulty}
          </span>
        </div>

        <MathText>{currentProblem.statement}</MathText>

        <div className="border-t border-ink-700 pt-4">
          <label className="mb-2 block text-sm text-ink-300">Your Answer (scratchpad)</label>
          <textarea
            value={answers[currentProblem.id] || ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [currentProblem.id]: e.target.value }))}
            rows={6}
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 p-3 text-sm text-ink-100 font-mono resize-y"
            placeholder="Work out your solution here..."
          />
          <div className="mt-2 flex justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="focus-ring rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-400/40 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={submitAnswer}
              disabled={submitting}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-400" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save Answer
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(problems.length - 1, currentIndex + 1))}
              disabled={currentIndex === problems.length - 1}
              className="focus-ring rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-accent-400/40 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
