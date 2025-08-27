import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AuthModal from './AuthModal';
import { Link, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const Header = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCeo, setIsCeo] = useState(false);

  // Check for existing user session
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) { setIsAdmin(false); return; }
    setTimeout(() => {
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data, error }) => {
        if (!error) setIsAdmin(!!data);
      });

    }, 0);
    
    if (!isAdmin) {
      if (!user?.id) { setIsCeo(false); return; }
      setTimeout(() => {
        supabase.rpc('has_role', { _user_id: user.id, _role: 'ceo' }).then(({ data, error }) => {
          if (!error) setIsCeo(!!data);
        });
      }, 0);
    }

  }, [user]);

  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    // Show toast notification based on sign out result
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
      localStorage.clear();
      navigate('/');
    }
  };

  return (
    <>
      <header className="bg-background border-b border-border w-full h-[100%]">
        <div className="w-full px-4 py-4 mx-auto max-w-none 2xl:px-8 3xl:px-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/728a3509-3701-4108-901b-0d852b1ec407.png"
                alt="SalesCoaches.ai Logo"
                className="h-8 w-auto"
              />
            </div>


            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  {(isCeo || isAdmin) && (
                    <>
                      <Link to="/sales-desk">
                        <Button variant="outline" size="sm">Sales Desk</Button>
                      </Link>
                      <Link to="/coach-management">
                        <Button variant="outline" size="sm">Coach Management</Button>
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm">Admin</Button>
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 rounded-full hover:bg-muted">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt={user?.email || 'User'} />
                          <AvatarFallback>{(user?.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="font-medium">My Account</div>
                        <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <Link to="/profile-settings">
                        <DropdownMenuItem className="cursor-pointer">Profile Settings</DropdownMenuItem>
                      </Link>
                      <Link to="/sales-desk">
                        <DropdownMenuItem className="cursor-pointer">Sales Desk</DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In</span>
                  </Button>
                  <Button variant="premium">Start Free Trial</Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2 pt-4">
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      <Link to="/sales-desk">
                        <Button variant="outline" className="w-full">Sales Desk</Button>
                      </Link>
                      <Link to="/profile-settings">
                        <Button variant="outline" className="w-full">Profile Settings</Button>
                      </Link>
                      <Link to="/coach-management">
                        <Button variant="outline" className="w-full">Coach Management</Button>
                      </Link>
                      {isAdmin && (
                        <Link to="/admin">
                          <Button variant="outline" className="w-full">Admin</Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleSignOut}
                        className="w-full"
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowAuthModal(true)}
                      >
                        Sign In
                      </Button>
                      <Button variant="premium">Start Free Trial</Button>
                    </>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          toast({
            title: "Welcome!",
            description: "You are now signed in and ready to start coaching",
          });
        }}
      />
    </>
  );
};

export default Header;