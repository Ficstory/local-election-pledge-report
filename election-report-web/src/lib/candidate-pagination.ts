export const CANDIDATE_LIST_PAGE_SIZE = 5;

const MAX_CANDIDATE_LIST_PAGE_SIZE = 100;

type NormalizeCandidatePageInput = {
  page: number;
  pageSize: number;
  totalCount: number;
};

export function normalizeCandidatePage({
  page,
  pageSize,
  totalCount
}: NormalizeCandidatePageInput) {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0
    ? Math.min(MAX_CANDIDATE_LIST_PAGE_SIZE, pageSize)
    : CANDIDATE_LIST_PAGE_SIZE;
  const safeTotalCount =
    Number.isInteger(totalCount) && totalCount > 0 ? totalCount : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotalCount / safePageSize));
  const requestedPage = Number.isInteger(page) && page > 0 ? page : 1;

  return {
    page: Math.min(requestedPage, totalPages),
    pageSize: safePageSize,
    totalPages
  };
}
