/**
 * Customise Home (the button at the foot of Home): what Home shows, and in
 * what order. Widgets on Home move up and down or come off; the rest are
 * listed by what they're for, to add (at the top, where you'll see them).
 * Every change shows on Home at once and is kept on this device
 * (lib/homeLayout.ts, lib/homeWidgets.ts).
 *
 * The search, a workout under way and the gym you're at aren't widgets:
 * they always come first.
 */

import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { PrimaryButton, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { homeLayout, useHomeWidgets } from '@/lib/homeLayout';
import { HOME_GROUPS, availableWidgets, homeWidget, shownWidgets, type HomeWidget } from '@/lib/homeWidgets';
import { LIMITED } from '@/lib/limited';
import { usePageTitle } from '@/lib/pageTitle';
import { useTapAgain } from '@/lib/tapAgain';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';

export default function HomeEditScreen() {
  useGlassRedraw();
  usePageTitle('Customise Home');
  const on = shownWidgets(useHomeWidgets(), LIMITED);
  const off = availableWidgets(LIMITED).filter((widget) => !on.includes(widget.id));
  const [resetting, setResetting] = useTapAgain();

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Customise Home
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          What Home shows, and in what order. The search, a workout under way and the gym you’re at always come first.
        </Txt>
      </View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section} accessibilityRole="header" level={2}>
        {`ON YOUR HOME · ${on.length}`}
      </Txt>
      {on.length === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary} style={styles.empty}>
          Nothing yet: add widgets from the list below.
        </Txt>
      ) : (
        <View style={styles.list}>
          {on.map((id, index) => {
            const widget = homeWidget(id);
            return (
              <View key={id} style={[styles.row, index > 0 && styles.line]}>
                <Tile icon={widget.icon} />
                <Words widget={widget} />
                <View style={styles.controls}>
                  <Small icon="chevron" turn={-90} label={`Move ${widget.title} up`} disabled={index === 0} onPress={() => homeLayout.move(id, -1)} />
                  <Small icon="chevron" turn={90} label={`Move ${widget.title} down`} disabled={index === on.length - 1} onPress={() => homeLayout.move(id, 1)} />
                  <Small icon="minus" label={`Take ${widget.title} off Home`} danger onPress={() => homeLayout.remove(id)} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {off.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section} accessibilityRole="header" level={2}>
            ADD TO HOME
          </Txt>
          {HOME_GROUPS.map((group) => {
            const here = off.filter((widget) => widget.group === group);
            if (here.length === 0) return null;
            return (
              <View key={group} style={styles.groupBlock}>
                <Txt variant="footnote" color={color.labelSecondary} style={styles.groupName}>
                  {group}
                </Txt>
                <View style={styles.list}>
                  {here.map((widget, index) => (
                    <Pressable
                      key={widget.id}
                      onPress={() => {
                        haptic.success();
                        homeLayout.add(widget.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${widget.title} to Home: ${widget.detail}`}
                      style={({ pressed }) => [styles.row, index > 0 && styles.line, pressed && { backgroundColor: color.fill }]}
                    >
                      <Tile icon={widget.icon} />
                      <Words widget={widget} />
                      <View style={styles.add}>
                        <Icon name="plus" size={13} color={color.brand} />
                        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                          Add
                        </Txt>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          label={resetting ? 'Tap again to put Home back' : 'Put Home back as it came'}
          icon="refresh"
          tone="quiet"
          onPress={() => {
            if (!resetting) return setResetting(true);
            haptic.success();
            homeLayout.reset();
            setResetting(false);
          }}
        />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Kept on this device.
        </Txt>
      </View>
    </PageScroll>
  );
}

function Tile({ icon }: { icon: IconName }) {
  return (
    <View style={styles.tile}>
      <Icon name={icon} size={16} color={color.brand} />
    </View>
  );
}

function Words({ widget }: { widget: HomeWidget }) {
  return (
    <View style={styles.flex}>
      <Txt variant="subhead" style={face('semibold')} numberOfLines={1}>
        {widget.title}
      </Txt>
      <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
        {widget.whenThere ? `${widget.detail}. ${widget.whenThere}` : widget.detail}
      </Txt>
    </View>
  );
}

function Small({ icon, label, onPress, disabled = false, danger = false, turn = 0 }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean; turn?: number }) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic.select();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.small, danger && styles.smallDanger, disabled && styles.smallOff, pressed && { opacity: 0.6 }]}
    >
      <View style={turn ? { transform: [{ rotate: `${turn}deg` }] } : undefined}>
        <Icon name={icon} size={13} color={disabled ? color.labelTertiary : danger ? color.dangerInk : color.brand} />
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[1] },
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    section: { marginTop: space[3], marginLeft: space[4] },
    empty: { marginLeft: space[4] },
    groupBlock: { gap: space[2] },
    groupName: { marginLeft: space[4], ...face('semibold') },
    list: { borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, overflow: 'hidden', ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], paddingVertical: space[3] },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    tile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    controls: { flexDirection: 'row', gap: 6 },
    small: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    smallDanger: { backgroundColor: color.dangerTint },
    smallOff: { opacity: 0.45 },
    add: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], height: 32, borderRadius: radius.pill, backgroundColor: color.brandTint },
    actions: { gap: space[2], marginTop: space[4] },
  }),
);
