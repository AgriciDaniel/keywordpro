'use client';

import { updateLocalUserName } from '@/actions/local-user-actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useLocalUser } from '@/hooks/use-local-user';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface UpdateNameCardProps {
  className?: string;
}

const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Name must be at least 3 characters' })
    .max(30, { message: 'Name must be at most 30 characters' }),
});

/**
 * Update the local user's display name.
 *
 * Standalone build: writes straight to the `user` row through a server action
 * instead of going through better-auth's `updateUser`.
 */
export function UpdateNameCard({ className }: UpdateNameCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { data: session, refresh } = useLocalUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: session?.user?.name ?? '' },
  });

  useEffect(() => {
    if (session?.user?.name) {
      form.reset({ name: session.user.name });
    }
  }, [session?.user?.name, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    try {
      const result = await updateLocalUserName(values.name);
      if (!result.success) {
        toast.error(result.error ?? 'Could not update name.');
        return;
      }
      refresh();
      toast.success('Name updated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update name.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Name</CardTitle>
            <CardDescription>Your display name</CardDescription>
          </CardHeader>

          <CardContent>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              Use 3-30 characters
            </span>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
