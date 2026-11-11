import { difficultyLabel } from '@/lib/format'
import type { Difficulty } from '@nowpass/api-contracts'

export function DifficultyBadge({ value }: { value: Difficulty | string | null | undefined }) {
  const difficulty = value === 'easy' || value === 'medium' || value === 'hard' ? value : 'easy'
  return (
    <span className={`difficulty difficulty--${difficulty}`}>
      <span className="difficulty__dot" aria-hidden="true" />
      {difficultyLabel(difficulty)}
    </span>
  )
}
