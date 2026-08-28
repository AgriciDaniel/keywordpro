import { cn } from '@/lib/utils';
import type { AvatarProps } from '@radix-ui/react-avatar';
import { User2Icon } from 'lucide-react';
import Image from 'next/image';

interface UserAvatarProps extends Omit<AvatarProps, 'children'> {
  name: string;
  image: string | null | undefined;
}

/**
 * User avatar component, used in navbar and sidebar
 * Optimized to prevent layout shifts during image loading
 *
 * @param name - The name of the user
 * @param image - The image of the user
 * @param props - The props of the avatar
 * @returns The user avatar component
 */
export function UserAvatar({
  name,
  image,
  className,
  ...props
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    >
      {/* Always render fallback to maintain layout */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="sr-only">{name}</span>
        <User2Icon className="size-4" />
      </div>

      {/* Image overlay */}
      {image && (
        <Image
          alt={name}
          title={name}
          src={image}
          fill
          sizes="32px"
          className="object-cover"
          unoptimized
          onLoad={(e) => {
            // Hide fallback when image loads
            const fallback = e.currentTarget
              .previousElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.opacity = '0';
            }
          }}
          onError={(e) => {
            // Show fallback if image fails
            const fallback = e.currentTarget
              .previousElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.opacity = '1';
            }
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
