/**
 * GymDeck Member Mobile - useDocuments TanStack Query Hook
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { documentService } from '../services/api';
import { MemberDocument } from '../types';

export const DOCUMENTS_QUERY_KEY = ['member', 'documents'];

export const useDocuments = () => {
  return useQuery<MemberDocument[]>({
    queryKey: DOCUMENTS_QUERY_KEY,
    queryFn: () => documentService.getDocuments(),
    staleTime: 1000 * 60 * 15,
  });
};

export const useGetDocumentSecureUrl = () => {
  return useMutation<{ signedUrl: string }, Error, string>({
    mutationFn: (documentId: string) => documentService.getDocumentSecureUrl(documentId),
  });
};

export default useDocuments;
