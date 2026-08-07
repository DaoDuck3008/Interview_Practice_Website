export interface TopicQuestionCandidate {
  id: string;
  topicId: string;
}

/**
 * Chọn câu hỏi gần đều giữa các topic từ danh sách ứng viên đã lấy trong một query.
 * Topic thiếu câu sẽ được bù bằng phần còn lại của các topic khác.
 */
export function selectDistributedQuestionIds(
  candidates: TopicQuestionCandidate[],
  topicIds: string[],
  take: number,
): string[] {
  if (take <= 0 || topicIds.length === 0 || candidates.length === 0) {
    return [];
  }

  const candidatesByTopic = new Map<string, TopicQuestionCandidate[]>(
    topicIds.map((topicId) => [topicId, []]),
  );
  for (const candidate of candidates) {
    candidatesByTopic.get(candidate.topicId)?.push(candidate);
  }

  const perTopicCounts = splitEvenly(take, topicIds.length);
  const selectedIds: string[] = [];
  const selectedIdSet = new Set<string>();

  for (const [index, topicId] of topicIds.entries()) {
    const topicCandidates = shuffle(candidatesByTopic.get(topicId) ?? []);
    for (const candidate of topicCandidates.slice(0, perTopicCounts[index])) {
      selectedIds.push(candidate.id);
      selectedIdSet.add(candidate.id);
    }
  }

  // Bù quota của topic thiếu câu từ toàn bộ ứng viên chưa được chọn.
  if (selectedIds.length < take) {
    const remainingCandidates = shuffle(
      candidates.filter((candidate) => !selectedIdSet.has(candidate.id)),
    );
    for (const candidate of remainingCandidates) {
      if (selectedIds.length >= take) break;
      selectedIds.push(candidate.id);
      selectedIdSet.add(candidate.id);
    }
  }

  return selectedIds;
}

function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from(
    { length: parts },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[nextIndex]] = [output[nextIndex], output[index]];
  }
  return output;
}
