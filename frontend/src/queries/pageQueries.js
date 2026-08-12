import { useQuery } from '@tanstack/react-query';
import { pagesAPI } from '../services/api';

const CONTACT_INFO_STALE_TIME = 30 * 60_000;
const CONTACT_INFO_GC_TIME = 60 * 60_000;

export const pageKeys = {
  all: ['pages'],
  contactInfo: () => [...pageKeys.all, 'contact-info'],
};

export const useContactInfoQuery = () => useQuery({
  queryKey: pageKeys.contactInfo(),
  queryFn: ({ signal }) => pagesAPI.getContactInfo({ signal }).then((response) => response.data),
  staleTime: CONTACT_INFO_STALE_TIME,
  gcTime: CONTACT_INFO_GC_TIME,
});
