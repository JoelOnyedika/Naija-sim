import { formatNaira } from '@/core/format';
import { CAMPUS_LIFE, MISSIONS } from '@/data/story';
import { initiationLabel, currentMission, inHub, missionProgress } from '@/game/story';
import { useStoryStore } from '@/stores/storyStore';

/** The campus story in the venue's Tasks tab: the current mission and its steps, the grade, and a reminder of the initiation. */
export function CampusMissions() {
  useStoryStore((s) => s.steps); useStoryStore((s) => s.mission); useStoryStore((s) => s.hubCount);
  const s = useStoryStore.getState();
  const m = currentMission(), hub = inHub();
  return (
    <div className="mb-2 rounded-2xl border border-amber-300/20 bg-white/[0.06] p-3" aria-label="Campus missions">
      <div className="flex items-center justify-between text-[12px]"><span className="font-bold">🎓 {m ? m.title : CAMPUS_LIFE.title}</span><span className="text-white/50">{m ? `Mission ${s.mission + 1} of ${MISSIONS.length}` : `Rounds done ${s.hubRounds}`}</span></div>
      <p className="mt-0.5 text-[11.5px] text-white/60">{m ? m.blurb : CAMPUS_LIFE.blurb}</p>
      {m && <ul className="mt-1.5 space-y-1">{missionProgress(m).map((st) => <li key={st.id} className={`flex items-center gap-2 text-[12.5px] ${st.done ? 'text-emerald-300' : 'text-white/85'}`}><span>{st.done ? '✅' : '⬜'}</span><span className="flex-1">{st.label}</span>{st.need > 1 && <span className="tabular-nums text-white/50">{st.have}/{st.need}</span>}</li>)}</ul>}
      {hub && <p className="mt-1 text-[12.5px] text-white/85">Do {CAMPUS_LIFE.perRound} errands, handout sales or tutoring jobs for {formatNaira(CAMPUS_LIFE.reward)}: {s.hubCount}/{CAMPUS_LIFE.perRound}</p>}
      {s.grade && <p className="mt-1 text-[11.5px] text-amber-200">Your grade: {s.grade}</p>}
      <InitiationNote />
    </div>
  );
}

/** Shown while an initiation is booked: when and where. */
export function InitiationNote() {
  const at = useStoryStore((s) => s.initiationAt), recruit = useStoryStore((s) => s.recruit);
  if (recruit !== 'invited' || at === null) return null;
  return <p className="mt-1.5 rounded-xl bg-rose-500/15 px-2.5 py-1.5 text-[12px] font-semibold text-rose-100">🌙 Initiation {initiationLabel(at)}. Be at UNILAG. Come alone.</p>;
}
