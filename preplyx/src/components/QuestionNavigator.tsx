export type QuestionState = "default" | "active" | "correct" | "incorrect" | "flagged";

interface QuestionNavigatorProps {
  total: number;
  current: number; // zero‑based index
  answers: Record<number, "correct" | "incorrect">; // answered questions
  flagged: Set<number>;
  onSelect: (index: number) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  total,
  current,
  answers,
  flagged,
  onSelect,
}) => {
  const getState = (idx: number): QuestionState => {
    if (idx === current) return "active";
    if (flagged.has(idx)) return "flagged";
    if (answers[idx] === "correct") return "correct";
    if (answers[idx] === "incorrect") return "incorrect";
    return "default";
  };

  const stateStyles: Record<QuestionState, string> = {
    default: "bg-white border border-gray-300 text-gray-600",
    active: "bg-primary text-white ring-2 ring-primary/50",
    correct: "bg-success text-white",
    incorrect: "bg-danger text-white",
    flagged: "bg-warning text-gray-800",
  };

  return (
    <div className="sticky bottom-0 md:sticky md:top-4 bg-background p-2 rounded-lg shadow-sm">
      <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
        {Array.from({ length: total }).map((_, idx) => {
          const state = getState(idx);
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className={`${stateStyles[state]} w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full text-xs md:text-sm hover:opacity-90 transition-colors focus:outline-none`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
