import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={isAuthenticated ? "/search" : "/"} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">EnergyLink</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {isAuthenticated && (
                <>
                  <Link 
                    to="/search" 
                    className={`text-sm font-medium transition-colors hover:text-green-600 ${
                      isActive('/search') ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    Find Partners
                  </Link>
                  <Link 
                    to="/saved" 
                    className={`text-sm font-medium transition-colors hover:text-green-600 ${
                      isActive('/saved') ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    Saved Contacts
                  </Link>
                  <Link 
                    to="/profile" 
                    className={`text-sm font-medium transition-colors hover:text-green-600 ${
                      isActive('/profile') ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    My Profile
                  </Link>
                  <Link 
                    to="/chat" 
                    className={`text-sm font-medium transition-colors hover:text-green-600 ${
                      isActive('/chat') ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    Messages
                  </Link>
                </>
              )}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-gray-600 hover:text-green-600">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-gray-600 hover:text-green-600"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-4">
                {isAuthenticated ? (
                  <>
                    <Link 
                      to="/search" 
                      className="text-sm font-medium text-gray-600 hover:text-green-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Find Partners
                    </Link>
                    <Link 
                      to="/saved" 
                      className="text-sm font-medium text-gray-600 hover:text-green-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Saved Contacts
                    </Link>
                    <Link 
                      to="/profile" 
                      className="text-sm font-medium text-gray-600 hover:text-green-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link 
                      to="/chat" 
                      className="text-sm font-medium text-gray-600 hover:text-green-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Messages
                    </Link>
                    <div className="pt-4 border-t border-gray-100">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-gray-600"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                      >
                        {isSigningOut ? 'Signing out...' : 'Sign Out'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-gray-600">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to={isAuthenticated ? "/search" : "/"} className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">EnergyLink</span>
              </Link>
              <p className="text-gray-600 text-sm max-w-md">
                The renewable energy matchmaking platform that connects developers, EPCs, consultants, and financiers in seconds.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {isAuthenticated && (
                  <>
                    <li><Link to="/search" className="hover:text-green-600">Find Partners</Link></li>
                    <li><Link to="/saved" className="hover:text-green-600">Saved Contacts</Link></li>
                    <li><Link to="/profile" className="hover:text-green-600">My Profile</Link></li>
                  </>
                )}
                <li><Link to="/how-it-works" className="hover:text-green-600">How It Works</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/help" className="hover:text-green-600">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-green-600">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-green-600">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              © 2024 EnergyLink. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
