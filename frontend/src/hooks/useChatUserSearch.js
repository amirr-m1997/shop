import { useEffect, useState } from 'react';
import { chatAPI } from '../services/api';

export const useChatUserSearch = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await chatAPI.searchUsers(query);
        setSearchResults(response.data?.results || []);
      } catch {
        // Search suggestions are best-effort.
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, searchResults, setSearchResults, searching };
};
