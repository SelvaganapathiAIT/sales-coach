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

  if (loading) return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Loading Admin Panel…</h1>
    </main>
  );

  if (!isAdmin) return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="mt-2 text-muted-foreground">You must be an admin to view this page.</p>
    </main>
  );

  return (
    <main className="container mx-auto px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users and roles.</p>
          <link rel="canonical" href={`${window.location.origin}/admin`} />
        </div>
        <Button onClick={() => setInviteOpen(true)}>Add User</Button>
      </header>

      <section aria-labelledby="users-heading" className="space-y-4">
        <h2 id="users-heading" className="text-xl font-semibold">Users</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell className="capitalize">{u.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell className="capitalize">{u.is_admin ? 'admin' : (u.profile_role || 'user')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingUser(u); setForm({ first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '', is_active: u.is_active }); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => makeAdmin(u)} disabled={u.is_admin}>Make Admin</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="first">First Name</Label>
              <Input id="first" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last">Last Name</Label>
              <Input id="last" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingUser) return;
              try {
                const { error } = await supabase
                  .from('profiles')
                  .upsert({ user_id: editingUser.user_id, email: form.email, first_name: form.first_name, last_name: form.last_name, is_active: form.is_active, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
                if (error) throw error;
                toast({ title: 'Profile updated', description: form.email });
                setEditingUser(null);
                await fetchAllUsers();
              } catch (err: any) {
                console.error(err);
                toast({ title: 'Save failed', description: err.message || 'Unknown error', variant: 'destructive' });
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inv-first">First Name</Label>
              <Input id="inv-first" value={invite.first_name} onChange={(e) => setInvite({ ...invite, first_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-last">Last Name</Label>
              <Input id="inv-last" value={invite.last_name} onChange={(e) => setInvite({ ...invite, last_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Assign to Coach</Label>
              <Select value={invite.coach_id} onValueChange={(v) => setInvite({ ...invite, coach_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {coachesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                const payload = { ...invite } as any;
                const { error } = await supabase.functions.invoke('coach-invite-user', { body: payload });
                if (error) throw error;
                toast({ title: 'User invited', description: invite.email });
                setInviteOpen(false);
                setInvite({ first_name: '', last_name: '', email: '', coach_id: '' });
                await fetchAllUsers();
              } catch (err: any) {
                console.error(err);
                toast({ title: 'Invite failed', description: err.message || 'Unknown error', variant: 'destructive' });
              }
            }}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section aria-labelledby="coaches-heading" className="space-y-4 mt-10">
        <h2 id="coaches-heading" className="text-xl font-semibold">Coaches</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...salesLegends, ...industryCoaches, ...coachesList].map((c) => (
                <TableRow key={c.name}>
                  <TableCell>{c.name}{defaultCoachEmail === c.email ? ' (Default)' : ''}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.title}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/company-coach?name=${encodeURIComponent(c.name)}&email=${encodeURIComponent(c.email)}&title=${encodeURIComponent(c.title)}`)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const { error: upsertError } = await (supabase.from as any)('app_settings')
                                                          .upsert({
                                                            key: 'default_home_coach',
                                                            value: {
                                                              email: c.email,
                                                              name: c.name,
                                                              title: c.title
                                                            },
                                                            updated_at: new Date().toISOString()
                                                          });
                        if (upsertError) throw upsertError;
                        // Update profile only if coach has an ID
                        if (c.id) {
                          const { error: profileError } = await supabase
                            .from('profiles')
                            .update({ default_coach_id: c.id })
                            .eq('user_id', userId);

                          if (profileError) throw profileError;
                        }

                        setDefaultCoachEmail(c.email);
                        toast({ title: 'Default coach set', description: c.email });
                      } catch (err: any) {
                        console.error(err);
                        toast({ title: 'Update failed', description: err.message || 'Unknown error', variant: 'destructive' });
                      }
                    }} disabled={defaultCoachEmail === c.email}>Make Default</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
};

export default Admin;
