import { useEffect, useState } from 'react';

const TestApi = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/products/products/')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data);
        setData(data);
      })
      .catch(err => {
        console.error('Error:', err);
        setError(err.message);
      });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test API</h1>
      {error && <div className="text-red-500">Error: {error}</div>}
      {data ? (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default TestApi;
