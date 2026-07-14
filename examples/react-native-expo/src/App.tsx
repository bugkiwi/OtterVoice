import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type ColorValue,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getLocales } from 'expo-localization';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createVoiceSession,
  type VoiceSession,
  type VoiceSessionState,
} from '@ottervoice/core';
import { useExpoAudioRuntime } from './expo-adapters';
import { copy, languageFromLocales, type AppLanguage } from './i18n';
import { createMobileProviders } from './providers';

type TurnRow = { id: string; role: 'user' | 'assistant'; text: string };

function upsertTurn(current: TurnRow[], next: TurnRow): TurnRow[] {
  const index = current.findIndex((turn) => turn.id === next.id);
  if (index === -1) return [...current, next];
  const updated = [...current];
  updated[index] = next;
  return updated;
}

const light = {
  background: '#F2EEE3',
  panel: '#F7E9ED',
  ink: '#123A32',
  muted: '#647870',
  accent: '#EF654B',
  border: '#264A41',
  tint: '#CBE6D6',
  error: '#9F2F27',
};

const dark = {
  background: '#13251F',
  panel: '#2B2529',
  ink: '#F2EEE3',
  muted: '#AFC3BA',
  accent: '#FF8067',
  border: '#AFC3BA',
  tint: '#315448',
  error: '#FF9B8E',
};

function stateLabel(
  state: VoiceSessionState,
  language: AppLanguage,
): string {
  return copy[language].states[state] ?? state;
}

function DemoScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  const runtime = useExpoAudioRuntime();
  const providers = useMemo(() => createMobileProviders(), []);
  const sessionRef = useRef<VoiceSession | null>(null);
  const cleanupsRef = useRef<Array<() => void>>([]);
  const userAudioEndedAt = useRef<number | undefined>(undefined);
  const liveAssistantTurnIdRef = useRef<string | undefined>(undefined);
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageFromLocales(getLocales()),
  );
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [partial, setPartial] = useState('');
  const [liveTurnId, setLiveTurnId] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const t = copy[language];
  const active = !['idle', 'finished', 'error'].includes(state);

  useEffect(() => runtime.audioInput.onVolume((value) => setLevel(Math.min(1, value / 0.1))), [runtime]);

  const releaseSession = useCallback(async () => {
    for (const off of cleanupsRef.current) off();
    cleanupsRef.current = [];
    const previous = sessionRef.current;
    sessionRef.current = null;
    if (previous) await previous.dispose();
  }, []);

  useEffect(
    () => () => {
      void releaseSession();
    },
    [releaseSession],
  );

  const start = useCallback(async () => {
    setError(undefined);
    setTurns([]);
    setPartial('');
    setLiveTurnId(undefined);
    liveAssistantTurnIdRef.current = undefined;
    setLatencyMs(undefined);
    await releaseSession();
    const granted = await runtime.audioInput.requestPermission();
    if (!granted) {
      setState('error');
      setError(
        language === 'zh'
          ? '需要麦克风权限才能开始语音对话。'
          : 'Microphone permission is required to start a voice session.',
      );
      return;
    }

    const session = createVoiceSession({
      mode: 'full_duplex',
      pipeline: 'audio_llm',
      runtime,
      providers,
      audioLlmSystemPrompt:
        '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
        '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。',
      audioLlmMaxTokens: 80,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 180,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.025,
      },
      interruptionDetection: {
        minSpeechMs: 160,
        silenceTimeoutMs: 350,
        volumeThreshold: 0.018,
      },
      policy: {
        autoStartListening: true,
        allowInterruption: true,
        interruptionTailIgnoreMs: 200,
        falseInterruptionSilenceMs: 400,
        falseInterruptionTimeoutMs: 1_200,
        interruptionCooldownMs: 500,
      },
    });
    sessionRef.current = session;
    cleanupsRef.current = [
      session.on('statechange', ({ to }) => {
        setState(to);
        if (to === 'user_speaking') {
          const staleTurnId = liveAssistantTurnIdRef.current;
          if (staleTurnId) {
            setTurns((current) => current.filter((turn) => turn.id !== staleTurnId));
            setLiveTurnId((current) => (
              current === staleTurnId ? undefined : current
            ));
            liveAssistantTurnIdRef.current = undefined;
          }
        }
        if (to === 'listening' || to === 'user_speaking') setPartial('');
      }),
      session.on('asr_partial', ({ text, turnId }) => {
        setPartial(text);
        setLiveTurnId(turnId);
        if (text.trim()) {
          setTurns((current) => upsertTurn(current, { id: turnId, role: 'user', text }));
        }
      }),
      session.on('asr_final', ({ text, turnId }) => {
        setPartial('');
        setLiveTurnId((current) => (current === turnId ? undefined : current));
        if (!text.trim()) {
          setTurns((current) => current.filter((turn) => turn.id !== turnId));
          return;
        }
        setTurns((current) => upsertTurn(current, { id: turnId, role: 'user', text }));
      }),
      session.on('assistant_text_delta', ({ text, turnId }) => {
        const staleTurnId = liveAssistantTurnIdRef.current;
        liveAssistantTurnIdRef.current = turnId;
        setLiveTurnId(turnId);
        setTurns((current) => upsertTurn(
          staleTurnId && staleTurnId !== turnId
            ? current.filter((turn) => turn.id !== staleTurnId)
            : current,
          { id: turnId, role: 'assistant', text },
        ));
      }),
      session.on('assistant_text', ({ text, turnId }) => {
        const staleTurnId = liveAssistantTurnIdRef.current;
        if (staleTurnId === turnId) liveAssistantTurnIdRef.current = undefined;
        setLiveTurnId((current) => (current === turnId ? undefined : current));
        setTurns((current) => upsertTurn(
          staleTurnId && staleTurnId !== turnId
            ? current.filter((turn) => turn.id !== staleTurnId)
            : current,
          { id: turnId, role: 'assistant', text },
        ));
      }),
      session.on('user_audio_end', () => {
        userAudioEndedAt.current = performance.now();
      }),
      session.on('assistant_audio_start', () => {
        const endedAt = userAudioEndedAt.current;
        if (endedAt !== undefined) setLatencyMs(performance.now() - endedAt);
      }),
      session.on('error', (event) => {
        const staleTurnId = liveAssistantTurnIdRef.current;
        if (staleTurnId) {
          setTurns((current) => current.filter((turn) => turn.id !== staleTurnId));
          setLiveTurnId((current) => (
            current === staleTurnId ? undefined : current
          ));
          liveAssistantTurnIdRef.current = undefined;
        }
        setError(event.message);
        setState('error');
      }),
    ];
    await session.start();
  }, [language, providers, releaseSession, runtime]);

  const finish = useCallback(async () => {
    await sessionRef.current?.finish();
    await releaseSession();
    setState('finished');
    setLevel(0);
  }, [releaseSession]);

  const meterBars = Array.from({ length: 9 }, (_, index) => {
    const threshold = (index + 1) / 9;
    const lit = level >= threshold;
    return (
      <View
        key={index}
        style={{
          width: 7,
          height: 7 + index * 2,
          borderRadius: 99,
          backgroundColor: lit ? colors.accent : `${colors.accent}3A`,
        }}
      />
    );
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        minHeight: '100%',
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: Math.max(insets.bottom, 28),
        paddingHorizontal: 22,
        gap: 28,
        backgroundColor: colors.background,
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../assets/icon.png')}
            accessibilityIgnoresInvertColors
            style={{ width: 42, height: 42, borderRadius: 11 }}
          />
          <Text
            selectable
            style={{ color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.6 }}
          >
            OtterVoice
          </Text>
        </View>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 99 }}
        >
          {(['zh', 'en'] as const).map((item) => {
            const selected = language === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setLanguage(item)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: selected ? colors.ink : 'transparent',
                }}
              >
                <Text style={{ color: selected ? colors.background : colors.ink, fontWeight: '700' }}>
                  {item === 'zh' ? '中文' : 'EN'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 11 }}>
        <Text selectable style={{ color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.7 }}>
          {t.eyebrow}
        </Text>
        <Text
          selectable
          style={{ color: colors.ink, fontFamily: 'serif', fontSize: 50, lineHeight: 57, letterSpacing: -2.2 }}
        >
          {t.headline}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 17, lineHeight: 27, maxWidth: 560 }}>
          {t.subhead}
        </Text>
      </View>

      <View
        accessibilityLabel={stateLabel(state, language)}
        style={{
          padding: 22,
          gap: 20,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 28,
          borderCurve: 'continuous',
          backgroundColor: colors.panel,
          boxShadow: scheme === 'dark' ? undefined : '10px 12px 0 #CBE6D6',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ gap: 7, flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>
              LIVE CHANNEL
            </Text>
            <Text selectable style={{ color: error ? colors.error : colors.ink, fontSize: 19, lineHeight: 27 }}>
              {error ?? stateLabel(state, language)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: state === 'error' ? `${colors.error}22` : colors.tint,
            }}
          >
            <Text style={{ color: state === 'error' ? colors.error : colors.ink, fontSize: 11, fontWeight: '900' }}>
              {state.replaceAll('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ height: 28, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {meterBars}
        </View>

        {partial ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>{t.partial}</Text>
            <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 24 }}>{partial}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <ActionButton
            label={t.start}
            disabled={active}
            colors={colors}
            filled
            onPress={() => void start()}
          />
          <ActionButton
            label={t.finish}
            disabled={!active}
            colors={colors}
            onPress={() => void finish()}
          />
        </View>

        <View style={{ borderTopWidth: 1, borderColor: `${colors.border}2E`, paddingTop: 14, gap: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{t.latency}</Text>
          <Text
            selectable
            style={{ color: colors.ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}
          >
            {latencyMs === undefined ? '—' : `${Math.round(latencyMs)} ms`}
          </Text>
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <Text selectable style={{ color: colors.ink, fontFamily: 'serif', fontSize: 30 }}>
          {t.transcript}
        </Text>
        {turns.length === 0 ? (
          <Text selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 25 }}>{t.empty}</Text>
        ) : (
          turns.map((turn) => (
            <View
              key={turn.id}
              style={{
                borderTopWidth: 1,
                borderColor: `${colors.border}36`,
                paddingTop: 14,
                flexDirection: 'row',
                gap: 14,
              }}
            >
              <Text style={{ width: 48, color: colors.accent, fontSize: 11, fontWeight: '900', paddingTop: 4 }}>
                {turn.role === 'user' ? t.you.toUpperCase() : t.otter.toUpperCase()}
              </Text>
              <Text selectable style={{ flex: 1, color: colors.ink, fontSize: 17, lineHeight: 27 }}>
                {turn.text}
                {liveTurnId === turn.id ? ' ▍' : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={{ gap: 5, paddingTop: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{t.gateway}</Text>
        <Text selectable style={{ color: colors.ink, fontSize: 12, lineHeight: 18 }}>
          {t.gatewayDescription}
        </Text>
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  disabled,
  filled = false,
  colors,
  onPress,
}: {
  label: string;
  disabled: boolean;
  filled?: boolean;
  colors: typeof light;
  onPress(): void;
}) {
  const foreground: ColorValue = filled ? colors.background : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        justifyContent: 'center',
        paddingHorizontal: 19,
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: disabled ? `${colors.border}42` : colors.border,
        backgroundColor: filled && !disabled ? colors.ink : 'transparent',
        opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text style={{ color: disabled ? colors.muted : foreground, fontSize: 15, fontWeight: '800' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoScreen />
    </SafeAreaProvider>
  );
}
