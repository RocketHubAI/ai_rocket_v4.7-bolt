import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  team_id: string | null;
  view_financial: boolean;
  receive_report_emails: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch from public.users table
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no record exists, create one
      if (!data) {
        const newUser: Partial<UserProfile> = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
          role: 'member',
          view_financial: false
        };

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(insertedUser);
      } else {
        setProfile(data);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: { name?: string; avatar_url?: string | null; receive_report_emails?: boolean }) => {
    if (!user) throw new Error('No user logged in');

    try {
      // Update in public.users table
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      return { success: true, data };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('No user logged in');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if it exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updateResult = await updateProfile({ avatar_url: publicUrl });
      return updateResult;
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return { success: false, error: 'No avatar to delete' };

    try {
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldPath}`]);
      }

      const updateResult = await updateProfile({ avatar_url: null });
      return updateResult;
    } catch (err: any) {
      console.error('Error deleting avatar:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refetch: fetchProfile
  };
};
