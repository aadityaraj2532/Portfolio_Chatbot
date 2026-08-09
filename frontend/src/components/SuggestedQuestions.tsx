interface Props {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestions({
  questions,
  onSelect,
  disabled,
}: Props) {
  return (
    <div className="suggestions">
      {questions.map((q) => (
        <button
          key={q}
          className="suggestion-chip"
          onClick={() => onSelect(q)}
          disabled={disabled}
          type="button"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
