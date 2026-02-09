import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';

export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token && !email) {
      navigate('/unsubscribe-result?status=error&title=Invalid Link&message=This unsubscribe link is invalid or expired.');
      return;
    }

    const processUnsubscribe = async () => {
      try {
        const queryParam = token ? `token=${token}` : `email=${encodeURIComponent(email!)}`;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-unsubscribe?${queryParam}&format=json`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          }
        );

        const data = await response.json();
        navigate(`/unsubscribe-result?status=${data.status}&title=${encodeURIComponent(data.title)}&message=${encodeURIComponent(data.message)}`);
      } catch {
        navigate('/unsubscribe-result?status=error&title=Error&message=An error occurred while processing your request.');
      }
    };

    processUnsubscribe();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-5">
      <div className="bg-gray-800 rounded-2xl p-12 max-w-md w-full text-center shadow-2xl border border-gray-700">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Mail className="w-16 h-16 text-blue-500" />
            {processing && (
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin absolute -bottom-1 -right-1" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Processing...</h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Please wait while we process your unsubscribe request.
        </p>
      </div>
    </div>
  );
};
