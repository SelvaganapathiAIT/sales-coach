import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { salesLegends, industryCoaches } from "@/data/coaches";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthLayout } from "@/components/AuthLayout";
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Shield, 
  UserCheck, 
  UserX, 
  Crown, 
  Star,
  Settings,
  Activity,
  Mail,
  Calendar,
  Search,
  Filter
} from "lucide-react";

interface ProfileRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
}

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_role: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at?: string;
}

const Admin: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', is_active: true });
  const [defaultCoachEmail, setDefaultCoachEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ first_name: '', last_name: '', email: '', coach_id: '' });
  const [coachesList, setCoachesList] = useState<{ id: string; name: string; email: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Admin Panel – SalesCoaches.ai";
  }, []);

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        checkAdmin(session.user.id);
        setUserId(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Then fetch current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await checkAdmin(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      const admin = Boolean(data);
      setIsAdmin(admin);
      if (admin) {
        await Promise.all([fetchAllUsers(), fetchDefaultCoach(), fetchCoaches()]);
      } else {
        // Non-admin users should not have access
        toast({ title: "Access denied", description: "You do not have permission to access this page.", variant: "destructive" });
        navigate("/");
      }
    } catch (err) {
      console.error("Admin check failed", err);
      toast({ title: "Access error", description: "Unable to verify admin permissions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        body: { limit: 1000 }
      });
      if (error) throw error;
      setUsers((data || []) as AdminUser[]);
    } catch (err) {
      console.warn('Falling back to table-based fetch', err);
      await fetchUsersFromTables();
    }
  };

  const fetchUsersFromTables = async () => {
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from('profiles').select('user_id, first_name, last_name, email, role, is_active, created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('user_roles').select('user_id, role')
    ]);
    if (pErr) {
      console.error(pErr);
      toast({ title: 'Failed to load users', description: pErr.message, variant: 'destructive' });
      return;
    }
    if (rErr) {
      console.error(rErr);
      toast({ title: 'Failed to load roles', description: rErr.message, variant: 'destructive' });
    }
    const adminSet = new Set<string>((roles || []).filter(r => r.role === 'admin').map(r => r.user_id));
    const mapped: AdminUser[] = (profiles || []).map(p => ({
      user_id: p.user_id || '',
      email: p.email || '',
      first_name: p.first_name,
      last_name: p.last_name,
      profile_role: p.role,
      is_admin: p.user_id ? adminSet.has(p.user_id) : false,
      is_active: (p as any).is_active ?? true,
      created_at: (p as any).created_at,
    }));
    setUsers(mapped);
  };

  const fetchDefaultCoach = async () => {
    const { data, error } = await (supabase.from as any)('app_settings')
      .select('value')
      .eq('key', 'default_home_coach')
      .maybeSingle();
    if (!error && data?.value?.email) setDefaultCoachEmail(data.value.email);
  };

  const fetchCoaches = async () => {
    const { data, error } = await supabase.from('coaches').select('id, name, email').order('name');
    if (error) {
      console.error('Failed to load coaches', error);
      return;
    }
    if (!data) {
      console.warn('No coaches found');
      setCoachesList([]);
      return;
    } else {
      const title = "Customized Coaches";
      // add title for data
      setCoachesList(data.map(coach => ({ ...coach, title })));
    }
  };

  const makeAdmin = async (user: AdminUser) => {
    if (!user.user_id) {
      toast({ title: "Cannot assign", description: "User has no linked auth account.", variant: "destructive" });
      return;
    }
    try {
      const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: user.user_id, role: 'admin' });
      if (roleErr && !roleErr.message.includes('duplicate key')) throw roleErr;
      toast({ title: 'Admin assigned', description: `${user.email || 'User'} is now an admin.` });
      await fetchAllUsers();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Assignment failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  };

  const toggleActive = async (user: AdminUser) => {
    try {
      const next = !user.is_active;
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.user_id, email: user.email, is_active: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: next ? 'User activated' : 'User deactivated', description: user.email });
      await fetchAllUsers();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Update failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Settings className="w-8 h-8 text-white animate-spin" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-700">Loading Admin Panel…</h1>
        <p className="text-slate-500">Verifying permissions and fetching data</p>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600">You must be an admin to view this page.</p>
        </div>
        <Button onClick={() => navigate("/")} variant="outline">
          Return Home
        </Button>
      </div>
    </div>
  );

  return (
    <AuthLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-6 py-8">
          {/* Modern Header */}
          <header className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Admin Panel
                    </h1>
                    <p className="text-slate-500 mt-1 text-lg">Manage users, roles, and system settings</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setInviteOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
            <link rel="canonical" href={`${window.location.origin}/admin`} />
          </header>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.is_admin).length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Total Coaches</p>
                  <p className="text-2xl font-bold text-orange-600">{[...salesLegends, ...industryCoaches, ...coachesList].length}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Users Section */}
          <section className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-800">User Management</h2>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-slate-500">Manage user accounts, permissions, and access levels</p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="font-semibold text-slate-700">User</TableHead>
                      <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Role</TableHead>
                      <TableHead className="font-semibold text-slate-700">Joined</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User"}
                              </p>
                              <p className="text-sm text-slate-500">ID: {user.user_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{user.email || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.is_admin ? (
                              <div className="flex items-center space-x-1">
                                <Crown className="w-4 h-4 text-purple-600" />
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Admin</span>
                              </div>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                                {user.profile_role || 'User'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => { 
                                setEditingUser(user); 
                                setForm({ 
                                  first_name: user.first_name || '', 
                                  last_name: user.last_name || '', 
                                  email: user.email || '', 
                                  is_active: user.is_active 
                                }); 
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className={user.is_active ? "hover:bg-red-50 hover:text-red-700" : "hover:bg-green-50 hover:text-green-700"}
                              onClick={() => toggleActive(user)}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="w-4 h-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="hover:bg-purple-50 hover:text-purple-700"
                              onClick={() => makeAdmin(user)} 
                              disabled={user.is_admin}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              {user.is_admin ? 'Admin' : 'Make Admin'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          {/* Coaches Section */}
          <section>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-800">Coach Management</h2>
                      <p className="text-slate-500">Configure available coaches and default assignments</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="font-semibold text-slate-700">Coach</TableHead>
                      <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                      <TableHead className="font-semibold text-slate-700">Specialization</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...salesLegends, ...industryCoaches, ...coachesList].map((coach, index) => (
                      <TableRow key={`${coach.name}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{coach.name}</p>
                              {defaultCoachEmail === coach.email && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-amber-600 font-medium">Default Coach</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{coach.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-700 font-medium">
                            {coach.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm text-green-600 font-medium">Available</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => {
                                if (coach.id) {
                                  navigate(`/company-coach?edit=${encodeURIComponent(coach.id)}`);
                                } else {
                                  navigate(`/company-coach?name=${encodeURIComponent(coach.name)}&email=${encodeURIComponent(coach.email)}&title=${encodeURIComponent(coach.title)}`);
                                }
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="hover:bg-amber-50 hover:text-amber-700"
                              onClick={async () => {
                                try {
                                  const { error: upsertError } = await (supabase.from as any)('app_settings')
                                    .upsert({
                                      key: 'default_home_coach',
                                      value: {
                                        email: coach.email,
                                        name: coach.name,
                                        title: coach.title
                                      },
                                      updated_at: new Date().toISOString()
                                    });
                                  if (upsertError) throw upsertError;
                                  
                                  // Update profile only if coach has an ID
                                  if ((coach as any).id) {
                                    const { error: profileError } = await supabase
                                      .from('profiles')
                                      .update({ default_coach_id: (coach as any).id })
                                      .eq('user_id', userId);

                                    if (profileError) throw profileError;
                                  }

                                  setDefaultCoachEmail(coach.email);
                                  toast({ title: 'Default coach set', description: `${coach.name} is now the default coach` });
                                } catch (err: any) {
                                  console.error(err);
                                  toast({ title: 'Update failed', description: err.message || 'Unknown error', variant: 'destructive' });
                                }
                              }} 
                              disabled={defaultCoachEmail === coach.email}
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              {defaultCoachEmail === coach.email ? 'Default' : 'Make Default'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          {/* Edit User Dialog */}
          <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Edit User Profile</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="first" className="text-sm font-medium">First Name</Label>
                  <Input 
                    id="first" 
                    value={form.first_name} 
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last" className="text-sm font-medium">Last Name</Label>
                  <Input 
                    id="last" 
                    value={form.last_name} 
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <DialogFooter className="space-x-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    if (!editingUser) return;
                    try {
                      const { error } = await supabase
                        .from('profiles')
                        .upsert({ 
                          user_id: editingUser.user_id, 
                          email: form.email, 
                          first_name: form.first_name, 
                          last_name: form.last_name, 
                          is_active: form.is_active, 
                          updated_at: new Date().toISOString() 
                        }, { onConflict: 'user_id' });
                      if (error) throw error;
                      toast({ title: 'Profile updated', description: `Changes saved for ${form.email}` });
                      setEditingUser(null);
                      await fetchAllUsers();
                    } catch (err: any) {
                      console.error(err);
                      toast({ title: 'Save failed', description: err.message || 'Unknown error', variant: 'destructive' });
                    }
                  }}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add User Dialog */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  <span>Add New User</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-first" className="text-sm font-medium">First Name</Label>
                  <Input 
                    id="inv-first" 
                    value={invite.first_name} 
                    onChange={(e) => setInvite({ ...invite, first_name: e.target.value })}
                    className="focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-last" className="text-sm font-medium">Last Name</Label>
                  <Input 
                    id="inv-last" 
                    value={invite.last_name} 
                    onChange={(e) => setInvite({ ...invite, last_name: e.target.value })}
                    className="focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-email" className="text-sm font-medium">Email Address</Label>
                  <Input 
                    id="inv-email" 
                    type="email" 
                    value={invite.email} 
                    onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                    className="focus:ring-green-500 focus:border-green-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assign Coach (Optional)</Label>
                  <Select value={invite.coach_id} onValueChange={(v) => setInvite({ ...invite, coach_id: v })}>
                    <SelectTrigger className="focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Select a coach..." />
                    </SelectTrigger>
                    <SelectContent>
                      {coachesList.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-orange-500" />
                            <span>{coach.name}</span>
                            <span className="text-slate-500">({coach.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="space-x-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const payload = { ...invite } as any;
                      const { error } = await supabase.functions.invoke('coach-invite-user', { body: payload });
                      if (error) throw error;
                      toast({ title: 'Invitation sent', description: `User ${invite.email} has been invited` });
                      setInviteOpen(false);
                      setInvite({ first_name: '', last_name: '', email: '', coach_id: '' });
                      await fetchAllUsers();
                    } catch (err: any) {
                      console.error(err);
                      toast({ title: 'Invite failed', description: err.message || 'Unknown error', variant: 'destructive' });
                    }
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Admin;