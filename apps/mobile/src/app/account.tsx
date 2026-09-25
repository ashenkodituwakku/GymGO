/**
 * Account: who you are to GymGO and how you sign in. Your name, your email,
 * your password (or setting one, for an account made with Google or Apple),
 * Google and Apple connected or not, your data, signing out, and deleting
 * the account.
 */

import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FADE_IN, FADE_OUT, GLIDE, rise } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { GoogleMark, SocialButtons, useSignInProviders, type TokenHandler } from '@/components/SocialSignIn';
import { PrimaryButton, Txt } from '@/components/ui';
import { ApiError, OfflineError, api, type SignInMethods, type SignInProvider } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { downloadMyData } from '@/lib/exportData';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';

const PROVIDER_NAME: Record<SignInProvider, string> = { google: 'Google', apple: 'Apple' };

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return 'Can’t reach the GymGO server just now.';
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export default function AccountScreen() {
  const { account, billing } = useApp();
  const router = useRouter();
  const me = account.state === 'signed_in' ? account.account : null;
  const token = account.state === 'signed_in' ? account.token : null;
  const providers = useSignInProviders();
  const [methods, setMethods] = useState<SignInMethods | null>(null);
  const [editing, setEditing] = useState<'name' | 'password' | null>(null);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadMethods = useCallback(() => {
    if (!token) return;
    api
      .signInMethods(token)
      .then(setMethods)
      .catch(() => setMethods(null));
  }, [token]);
  useEffect(loadMethods, [loadMethods]);

  useEffect(() => {
    if (account.state === 'signed_out') router.replace('/profile');
  }, [account.state, router]);

  if (!me || !token) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: 'Account' }} />
      </View>
    );
  }

  const say = (text: string, good: boolean) => {
    (good ? haptic.success : haptic.warn)();
    setNotice({ text, good });
  };
  const hasPassword = methods?.password ?? me.hasPassword !== false;
  const connected = (provider: SignInProvider) => methods?.identities.find((item) => item.provider === provider) ?? null;

  const connect: TokenHandler = async (provider, idToken, nonce) => {
    try {
      await api.connect(token, provider, { idToken, nonce });
      say(`${PROVIDER_NAME[provider]} connected. You can sign in with it now.`, true);
      loadMethods();
    } catch (caught) {
      say(messageFor(caught), false);
    }
  };
  const disconnect = async (provider: SignInProvider) => {
    try {
      await api.disconnect(token, provider);
      say(`${PROVIDER_NAME[provider]} disconnected.`, true);
      loadMethods();
    } catch (caught) {
      say(messageFor(caught), false);
    }
  };

  const offered = (['apple', 'google'] as const).filter((provider) => (provider === 'google' ? providers?.google : providers?.apple) || connected(provider));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: 'Account' }} />

      <Animated.View entering={rise(0)} style={styles.head}>
        <View style={styles.avatar}>
          <Txt variant="largeTitle" color={color.onBrand}>
            {me.displayName.slice(0, 1).toUpperCase()}
          </Txt>
        </View>
        <Txt variant="title2" style={styles.center}>
          {me.displayName}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {me.email}
        </Txt>
        {billing.isPro && (
          <View style={styles.pro}>
            <Icon name="crown" size={12} color={color.brand} />
            <Txt variant="caption" color={color.brand} style={face('semibold')}>
              GYMGO PRO
            </Txt>
          </View>
        )}
      </Animated.View>

      {notice && (
        <Animated.View entering={FADE_IN} exiting={FADE_OUT} style={[styles.notice, notice.good ? styles.noticeGood : styles.noticeBad]}>
          <Icon name={notice.good ? 'done' : 'info'} size={16} color={notice.good ? color.goodInk : color.dangerInk} />
          <Txt variant="footnote" color={notice.good ? color.goodInk : color.dangerInk} style={styles.flex}>
            {notice.text}
          </Txt>
        </Animated.View>
      )}

      <Section title="Profile">
        <Line icon="person" title="Name" value={me.displayName} onPress={() => setEditing(editing === 'name' ? null : 'name')} open={editing === 'name'} />
        {editing === 'name' && (
          <NameForm
            current={me.displayName}
            onSave={async (name) => {
              try {
                await account.rename(name);
                setEditing(null);
                say('Name changed.', true);
              } catch (caught) {
                say(messageFor(caught), false);
              }
            }}
          />
        )}
        <Line icon="mail" title="Email" value={me.email} first={false} />
      </Section>

      <Section
        title="Signing in"
        footer={
          offered.length
            ? 'Connect Apple or Google to sign in with a tap. You can always have more than one way in, and GymGO never lets you remove the last.'
            : 'Signing in with Apple or Google turns on when this GymGO server is set up for it (see README).'
        }
      >
        <Line
          icon="key"
          title="Password"
          value={hasPassword ? 'Change' : 'Set a password'}
          onPress={() => setEditing(editing === 'password' ? null : 'password')}
          open={editing === 'password'}
        />
        {editing === 'password' && (
          <PasswordForm
            needsCurrent={hasPassword}
            onSave={async (current, next) => {
              try {
                await account.changePassword(current, next);
                setEditing(null);
                loadMethods();
                void account.refreshAccount();
                say(hasPassword ? 'Password changed. Any other device signed in as you has been signed out.' : 'Password set. You can sign in with your email too now.', true);
              } catch (caught) {
                say(messageFor(caught), false);
              }
            }}
          />
        )}
        {offered.map((provider) => {
          const link = connected(provider);
          return (
            <Line
              key={provider}
              first={false}
              icon={provider === 'apple' ? 'account' : 'google'}
              mark={provider === 'google' ? <GoogleMark /> : undefined}
              title={PROVIDER_NAME[provider]}
              value={link ? (link.email ?? 'Connected') : 'Not connected'}
              action={link ? { label: 'Disconnect', onPress: () => void disconnect(provider) } : undefined}
            />
          );
        })}
      </Section>
      {offered.some((provider) => !connected(provider)) && (
        <Animated.View layout={GLIDE} style={styles.connect}>
          <SocialButtons intent="connect" onToken={connect} hide={offered.filter((provider) => connected(provider))} onError={(text) => say(text, false)} />
        </Animated.View>
      )}

      <Section title="Your data">
        <Line
          icon="download"
          title="Download my data"
          value={exported ?? undefined}
          onPress={async () => {
            try {
              setExported('Preparing…');
              await downloadMyData(token);
              setExported('Saved');
            } catch {
              setExported('Couldn’t reach the server');
            }
          }}
        />
        <Line icon="signOut" title="Sign out" first={false} onPress={() => void account.signOut()} />
      </Section>

      <Section
        footer={
          confirmDelete
            ? `This removes your account, saved gyms, workouts, training log, reviews, photos and your reports from the server.${billing.isPro ? ' Your Pro subscription is cancelled first.' : ''}`
            : undefined
        }
      >
        <Line
          icon="trash"
          title={confirmDelete ? 'Tap again to delete everything' : 'Delete account'}
          destructive
          onPress={async () => {
            if (!confirmDelete) return setConfirmDelete(true);
            try {
              await account.deleteAccount();
            } catch (caught) {
              setConfirmDelete(false);
              say(`${messageFor(caught)} Nothing was deleted.`, false);
            }
          }}
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <Animated.View layout={GLIDE} style={styles.section}>
      {title && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.sectionTitle}>
          {title.toUpperCase()}
        </Txt>
      )}
      <View style={styles.group}>{children}</View>
      {footer && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.footer}>
          {footer}
        </Txt>
      )}
    </Animated.View>
  );
}

function Line({
  icon,
  title,
  value,
  onPress,
  open,
  first = true,
  destructive = false,
  action,
  mark,
}: {
  icon: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  open?: boolean;
  first?: boolean;
  destructive?: boolean;
  action?: { label: string; onPress: () => void };
  /** A brand's own mark in place of the icon. */
  mark?: ReactNode;
}) {
  const body = (
    <>
      {mark ?? <Icon name={icon} size={18} color={destructive ? color.dangerInk : color.brand} />}
      <Txt variant="body" color={destructive ? color.dangerInk : color.label} style={styles.flex}>
        {title}
      </Txt>
      {value !== undefined && (
        <Txt variant="subhead" color={color.labelSecondary} numberOfLines={1} style={styles.value}>
          {value}
        </Txt>
      )}
      {action && (
        <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={`${action.label} ${title}`} hitSlop={8}>
          <Txt variant="subhead" color={color.dangerInk} style={face('medium')}>
            {action.label}
          </Txt>
        </Pressable>
      )}
      {onPress && !destructive && <Icon name="chevron" size={13} color={color.labelTertiary} />}
    </>
  );
  const style = [styles.line, !first && styles.lineRule];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={open === undefined ? undefined : { expanded: open }}
      style={({ pressed }) => [...style, pressed && { backgroundColor: color.pressed }]}
    >
      {body}
    </Pressable>
  );
}

function NameForm({ current, onSave }: { current: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  return (
    <Animated.View entering={FADE_IN} style={styles.form}>
      <TextInput value={name} onChangeText={setName} autoFocus maxLength={40} autoComplete="name" style={styles.input} accessibilityLabel="Your name" placeholderTextColor={color.labelTertiary} />
      <PrimaryButton
        label="Save name"
        busy={busy}
        disabled={!name.trim() || name.trim() === current}
        onPress={async () => {
          setBusy(true);
          await onSave(name.trim());
          setBusy(false);
        }}
      />
    </Animated.View>
  );
}

function PasswordForm({ needsCurrent, onSave }: { needsCurrent: boolean; onSave: (current: string, next: string) => Promise<void> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Animated.View entering={FADE_IN} style={styles.form}>
      {needsCurrent && (
        <TextInput
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="Current password"
          autoComplete="current-password"
          style={styles.input}
          accessibilityLabel="Current password"
          placeholderTextColor={color.labelTertiary}
        />
      )}
      <TextInput
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholder="New password, 8 characters or more"
        autoComplete="new-password"
        style={styles.input}
        accessibilityLabel="New password"
        placeholderTextColor={color.labelTertiary}
      />
      <PrimaryButton
        label={needsCurrent ? 'Change password' : 'Set password'}
        busy={busy}
        disabled={(needsCurrent && !current) || next.length < 8}
        onPress={async () => {
          setBusy(true);
          await onSave(current, next);
          setBusy(false);
        }}
      />
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[2], width: '100%', maxWidth: 560, alignSelf: 'center' },
    head: { alignItems: 'center', gap: 4, paddingVertical: space[4] },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: color.brandFill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
    center: { textAlign: 'center' },
    pro: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space[1], paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.brandTint },
    flex: { flex: 1 },
    notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md },
    noticeGood: { backgroundColor: color.goodTint },
    noticeBad: { backgroundColor: color.dangerTint },
    section: { marginTop: space[3] },
    sectionTitle: { marginLeft: space[4], marginBottom: space[2], letterSpacing: 0.4 },
    group: { borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, overflow: 'hidden' },
    footer: { marginHorizontal: space[4], marginTop: space[2] },
    line: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48, paddingHorizontal: space[4], paddingVertical: space[3] },
    lineRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    value: { maxWidth: '55%' },
    form: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[4] },
    input: {
      height: 46,
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      backgroundColor: color.fill,
      fontSize: 17,
      color: color.label,
      ...face('regular'),
    },
    connect: { marginTop: space[2] },
  }),
);
