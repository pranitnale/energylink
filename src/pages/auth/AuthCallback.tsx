import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Get the token from the URL
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const token = hashParams.get('access_token');

      try {
        if (!token) {
          // Check if we have a session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Error getting session:', sessionError);
            navigate('/login?error=Unable to verify email');
            return;
          }

          if (!session) {
            // If no session, the user might need to log in
            navigate('/login?message=Please log in with your verified email');
            return;
          }

          // Session exists, user is verified
          navigate('/login?message=Email verified successfully! Please log in');
          return;
        }

        // Set the access token in Supabase
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: token,
        });

        if (setSessionError) {
          console.error('Error setting session:', setSessionError);
          navigate('/login?error=Unable to verify email');
          return;
        }

        // Successfully verified
        navigate('/login?message=Email verified successfully! Please log in');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=Unable to verify email');
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Verifying your email...</h2>
        <p className="text-gray-600">Please wait while we complete the verification process.</p>
      </div>
    </div>
  );
} 