import { useEffect, useState } from 'react';
import { Swords, Loader2, Send, Trophy, Users, Clock, ChevronRight, AlertCircle, Crown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, useDisplayName } from '../lib/AuthContext';
import MathText from './MathText';
import type { Problem } from '../lib/types';

interface Duel {
  id: string;
  problem_id: string;
  challenger_id: string;
  challenger_name: string;
  challenger_solution?: string;
  defender_id?: string;
  defender_name?: string;
  defender_solution?: string;
  status: 'open' | 'matched' | 'voting' | 'completed' | 'expired';
  winner_id?: string;
  votes_challenger: number;
  votes_defender: number;
  created_at: string;
}

interface Props {
  problem: Problem;
}

export default function ProofDuelArena({ problem }: Props) {
  const { user, configured } = useAuth();
  const displayName = useDisplayName();
  const [openDuels, setOpenDuels] = useState<Duel[]>([]);
  const [myDuels, setMyDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null);
  const [solution, setSolution] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !user) {
      setLoading(false);
      return;
    }
    loadDuels();
  }, [problem.id, user, configured]);

  const loadDuels = async () => {
    setLoading(true);
    const { data: openData } = await supabase
      .from('proof_duels')
      .select('*')
      .eq('problem_id', problem.id)
      .eq('status', 'open')
      .neq('challenger_id', user!.id);

    const { data: myData } = await supabase
      .from('proof_duels')
      .select('*')
      .eq('problem_id', problem.id)
      .or(`challenger_id.eq.${user!.id},defender_id.eq.${user!.id}`)
      .order('created_at', { ascending: false });

    if (openData) setOpenDuels(openData as Duel[]);
    if (myData) setMyDuels(myData as Duel[]);
    setLoading(false);
  };

  const createDuel = async () => {
    if (!user || !solution.trim()) return;
    setCreating(true);
    setError(null);
    const { error: insertError } = await supabase.from('proof_duels').insert({
      problem_id: problem.id,
      challenger_id: user.id,
      challenger_name: displayName,
      challenger_solution: solution.trim(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSolution('');
      await loadDuels();
    }
    setCreating(false);
  };

  const joinDuel = async (duel: Duel) => {
    if (!user || !solution.trim() || duel.defender_id) return;
    setJoining(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('proof_duels')
      .update({
        defender_id: user.id,
        defender_name: displayName,
        defender_solution: solution.trim(),
        status: 'voting',
      })
      .eq('id', duel.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSolution('');
      await loadDuels();
    }
    setJoining(false);
  };

  const vote = async (duelId: string, voteForId: string) => {
    if (!user) return;
    await supabase.from('duel_votes').insert({
      duel_id: duelId,
      voter_id: user.id,
      vote_for: voteForId,
    });
    await loadDuels();
  };

  if (!configured) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 text-sm text-ink-400">
        <AlertCircle className="mb-1 h-4 w-4 text-yellow-400" />
        Proof Duels require a connected database.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 text-sm text-ink-400">
        <Users className="mb-1 h-4 w-4 text-accent-400" />
        Sign in to participate in Proof Duels.
      </div>
    );
  }

  if (selectedDuel) {
    return (
      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-4">
        <button
          onClick={() => setSelectedDuel(null)}
          className="text-xs text-ink-400 hover:text-accent-200"
        >
          {'<'} Back to duels
        </button>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-4">
            <div className="flex items-center gap-2 text-sm text-ink-200 mb-2">
              <Trophy className="h-4 w-4 text-accent-400" />
              Player 1: {selectedDuel.challenger_name}
              {selectedDuel.winner_id === selectedDuel.challenger_id && (
                <Crown className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className="rounded-md border border-ink-700 bg-ink-900 p-3 text-sm">
              <MathText>{selectedDuel.challenger_solution || 'No solution submitted'}</MathText>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-ink-800 overflow-hidden">
                <div
                  className="h-full bg-accent-400"
                  style={{ width: `${(selectedDuel.votes_challenger / Math.max(1, selectedDuel.votes_challenger + selectedDuel.votes_defender)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-ink-400">{selectedDuel.votes_challenger} votes</span>
            </div>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-4">
            <div className="flex items-center gap-2 text-sm text-ink-200 mb-2">
              <Trophy className="h-4 w-4 text-accent-400" />
              Player 2: {selectedDuel.defender_name || 'Waiting...'}
              {selectedDuel.winner_id === selectedDuel.defender_id && (
                <Crown className="h-4 w-4 text-amber-400" />
              )}
            </div>
            {selectedDuel.defender_solution ? (
              <>
                <div className="rounded-md border border-ink-700 bg-ink-900 p-3 text-sm">
                  <MathText>{selectedDuel.defender_solution}</MathText>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-ink-800 overflow-hidden">
                    <div
                      className="h-full bg-accent-400"
                      style={{ width: `${(selectedDuel.votes_defender / Math.max(1, selectedDuel.votes_challenger + selectedDuel.votes_defender)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-400">{selectedDuel.votes_defender} votes</span>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-ink-600 bg-ink-900/30 p-4 text-center text-sm text-ink-400">
                Waiting for opponent
              </div>
            )}
          </div>
        </div>

        {selectedDuel.status === 'voting' && selectedDuel.defender_solution && (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => vote(selectedDuel.id, selectedDuel.challenger_id)}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm text-accent-200 hover:bg-accent-400/25"
            >
              Vote for {selectedDuel.challenger_name}
            </button>
            <button
              onClick={() => vote(selectedDuel.id, selectedDuel.defender_id!)}
              className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-4 py-2 text-sm text-accent-200 hover:bg-accent-400/25"
            >
              Vote for {selectedDuel.defender_name}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-300">
          <Swords className="h-3.5 w-3.5 text-accent-400" />
          Proof Duel Arena
        </h4>
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-850/50 p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-ink-400">Challenge someone to an elegant-off!</div>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={5}
            className="focus-ring w-full rounded-md border border-ink-700 bg-ink-900 p-3 text-sm text-ink-100 font-mono"
            placeholder="Write your proof here..."
          />
          {error && (
            <div className="text-xs text-red-300">{error}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={createDuel}
            disabled={creating || !solution.trim()}
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs font-semibold text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
            Open a Duel
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading duels...
          </div>
        ) : (
          <>
            {openDuels.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-ink-500">Open Challenges</div>
                {openDuels.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-ink-700 bg-ink-900/50 p-3">
                    <div>
                      <div className="text-sm text-ink-200">{d.challenger_name} is waiting for an opponent</div>
                      <div className="text-xs text-ink-500">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => joinDuel(d)}
                      disabled={joining || !solution.trim()}
                      className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-400/15 px-3 py-1.5 text-xs text-accent-200 hover:bg-accent-400/25 disabled:opacity-50"
                    >
                      {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}

            {myDuels.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-ink-500">Your Duels</div>
                {myDuels.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDuel(d)}
                    className="w-full flex items-center justify-between rounded-md border border-ink-700 bg-ink-900/50 p-3 hover:border-ink-600 transition text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm text-ink-200">
                        {d.challenger_id === user!.id ? `vs ${d.defender_name || 'Waiting...'}` : `vs ${d.challenger_name}`}
                        {d.winner_id === user!.id && <Crown className="h-4 w-4 text-amber-400" />}
                      </div>
                      <div className="text-xs text-ink-500">
                        Status: <span className="text-accent-300">{d.status}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </button>
                ))}
              </div>
            )}

            {openDuels.length === 0 && myDuels.length === 0 && (
              <div className="text-sm text-ink-400 text-center py-4">
                No duels yet. Be the first to open a challenge!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
