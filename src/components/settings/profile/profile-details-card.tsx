'use client';

import {
  type UserProfile,
  getUserProfile,
  saveUserProfile,
} from '@/actions/settings-actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const DEFAULT_AVATAR = {
  id: 'green-wayfarer',
  url: '/avatars/avatar_green_wayfarer.svg',
};

const PRESET_AVATARS = [
  { id: 'green-wayfarer', url: '/avatars/avatar_green_wayfarer.svg' },
  { id: 'orange-wayfarer', url: '/avatars/avatar_orange_wayfarer.svg' },
  { id: 'pink-clubmaster', url: '/avatars/avatar_pink_clubmaster.svg' },
  { id: 'purple-cateye', url: '/avatars/avatar_purple_cateye.svg' },
  { id: 'red-square', url: '/avatars/avatar_red_square.svg' },
  { id: 'skyblue-wireframe', url: '/avatars/avatar_skyblue_wireframe.svg' },
  { id: 'teal-clubmaster', url: '/avatars/avatar_square_teal_clubmaster.svg' },
  { id: 'lime-wireframe', url: '/avatars/avatar_triangle_lime_wireframe.svg' },
  { id: 'violet-round', url: '/avatars/avatar_triangle_violet_round.svg' },
  { id: 'yellow-triangle', url: '/avatars/avatar_yellow_triangle.svg' },
  { id: 'green-circle', url: '/avatars/green_circle_character_avatar.svg' },
];

interface ProfileDetailsCardProps {
  className?: string;
}

export function ProfileDetailsCard({ className }: ProfileDetailsCardProps) {
  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    bio: '',
    avatar_url: null,
    preset_avatar: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await getUserProfile();
        const result = res?.data;
        if (result?.success && result.profile) {
          setProfile({
            display_name: result.profile.display_name || '',
            bio: result.profile.bio || '',
            avatar_url: result.profile.avatar_url,
            preset_avatar: result.profile.preset_avatar,
          });
        } else {
          setLoadError('Failed to load profile.');
        }
      } catch (_error) {
        setLoadError('Failed to load profile.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setProfileMessage(null);
    try {
      const res = await saveUserProfile(profile);
      if (res?.data?.success) {
        setProfileMessage({
          type: 'success',
          text: 'Profile saved successfully!',
        });
      } else {
        setProfileMessage({
          type: 'error',
          text: 'Failed to save profile',
        });
      }
    } catch (_error) {
      setProfileMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setProfileMessage(null), 3000);
    }
  };

  const selectPresetAvatar = async (avatarId: string, avatarUrl: string) => {
    const nextProfile = {
      ...profile,
      preset_avatar: avatarId,
      avatar_url: avatarUrl,
    };
    setProfile(nextProfile);
    try {
      await saveUserProfile(nextProfile);
    } catch (_error) {
      setProfileMessage({ type: 'error', text: 'Failed to save avatar' });
    }
  };

  if (isLoading) {
    return null;
  }

  if (loadError) {
    return (
      <div className={className}>
        <div className="p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {profileMessage && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            profileMessage.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {profileMessage.text}
        </div>
      )}

      <Card className="w-full overflow-hidden pt-6 pb-0 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Agent Style</CardTitle>
          <CardDescription>
            Click your avatar to change the style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative group"
            >
              <div className="relative w-20 h-20 rounded-full bg-[#2A2A2A] border-2 border-[#3E3E3E] overflow-hidden flex items-center justify-center group-hover:border-[#87A9FF] transition-colors">
                <Image
                  src={profile.avatar_url || DEFAULT_AVATAR.url}
                  alt="Avatar"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PencilIcon className="h-5 w-5 text-white" />
              </div>
            </button>
          </div>

          {showAvatarPicker && (
            <div className="mt-4 p-4 bg-[#1F1F1F] rounded-xl border border-[#3E3E3E]">
              <p className="text-sm text-[#9CA3AF] mb-3">
                Choose from preset avatars:
              </p>
              <div className="grid grid-cols-6 gap-3">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      selectPresetAvatar(avatar.id, avatar.url);
                      setShowAvatarPicker(false);
                    }}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                      profile.preset_avatar === avatar.id ||
                      (
                        !profile.preset_avatar &&
                          avatar.id === DEFAULT_AVATAR.id
                      )
                        ? 'border-[#87A9FF] ring-2 ring-[#87A9FF]/30'
                        : 'border-[#3E3E3E] hover:border-[#87A9FF]/50'
                    }`}
                  >
                    <Image
                      src={avatar.url}
                      alt={avatar.id}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardContent className="space-y-4 flex-1">
          <div>
            <label
              htmlFor="profile-display-name"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Display Name
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={profile.display_name || ''}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  display_name: e.target.value,
                }))
              }
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-[#1F1F1F] border border-[#3E3E3E] rounded-xl text-[#E2E2E5] placeholder-[#6B7280] focus:outline-none focus:border-[#87A9FF] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={profile.bio || ''}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 bg-[#1F1F1F] border border-[#3E3E3E] rounded-xl text-[#E2E2E5] placeholder-[#6B7280] focus:outline-none focus:border-[#87A9FF] transition-colors resize-none"
            />
          </div>
        </CardContent>

        <CardFooter className="mt-auto px-6 py-4 flex justify-end items-center bg-muted rounded-none">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-6 py-3 bg-[#87A9FF] hover:bg-[#9BB8FF] text-[#1F1F1F] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-[#1F1F1F]/30 border-t-[#1F1F1F] rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
