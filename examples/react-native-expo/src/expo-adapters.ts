import { useMemo, useRef } from 'react';
import {
  createAudioPlayer,
  createAudioPlaylist,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import {
  createExpoRuntime,
  pcm16ToWav,
  type ExpoPcmInputBuffer,
  type ExpoRuntime,
} from '@ottervoice/runtime-react-native';

type BufferHandler = (buffer: ExpoPcmInputBuffer) => void;

function extensionFor(mimeType: string): string {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'audio';
}

function writeCacheFile(name: string, data: ArrayBuffer): string {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true, intermediates: true });
  file.write(new Uint8Array(data));
  return file.uri;
}

/**
 * Bind Expo SDK 57's native PCM microphone stream and gapless AudioPlaylist
 * to the platform-neutral OtterVoice runtime.
 */
export function useExpoAudioRuntime(): ExpoRuntime {
  const bufferHandler = useRef<BufferHandler | undefined>(undefined);
  const streamOptions = useMemo(
    () => ({
      sampleRate: 16_000,
      channels: 1,
      encoding: 'int16' as const,
      onBuffer(buffer: AudioStreamBuffer) {
        bufferHandler.current?.({
          data: buffer.data,
          encoding: 'pcm_s16le',
          sampleRate: buffer.sampleRate,
          channels: buffer.channels,
        });
      },
    }),
    [],
  );
  const { stream } = useAudioStream(streamOptions);

  return useMemo(
    () =>
      createExpoRuntime({
        input: {
          requestPermission: async () => {
            const permission = await requestRecordingPermissionsAsync();
            return permission.granted;
          },
          createPcmStream: (_options, onBuffer) => {
            bufferHandler.current = onBuffer;
            return {
              async start() {
                await setAudioModeAsync({
                  allowsRecording: true,
                  playsInSilentMode: true,
                  shouldRouteThroughEarpiece: false,
                  interruptionMode: 'doNotMix',
                });
                await stream.start();
              },
              async stop() {
                stream.stop();
                bufferHandler.current = undefined;
              },
            };
          },
        },
        output: {
          createSound: async (uri) => {
            const player = createAudioPlayer(
              { uri },
              { updateInterval: 50, downloadFirst: uri.startsWith('http') },
            );
            let statusSubscription: { remove(): void } | undefined;
            return {
              async playAsync() {
                player.play();
              },
              async pauseAsync() {
                player.pause();
              },
              async stopAsync() {
                player.pause();
                await player.seekTo(0);
              },
              async unloadAsync() {
                statusSubscription?.remove();
                player.release();
              },
              setOnPlaybackStatusUpdate(cb) {
                statusSubscription?.remove();
                statusSubscription = player.addListener('playbackStatusUpdate', (status) =>
                  cb({ didJustFinish: status.didJustFinish, error: status.error }),
                );
              },
            };
          },
          writeAudioFile: async (buffer, mimeType) =>
            writeCacheFile(
              `ottervoice-${Date.now()}.${extensionFor(mimeType)}`,
              buffer,
            ),
          createPcmPlaylist: () => {
            const playlist = createAudioPlaylist({ sources: [], updateInterval: 50 });
            let statusSubscription: { remove(): void } | undefined;
            return {
              add(uri: string) {
                playlist.add({ uri });
              },
              next() {
                playlist.next();
              },
              play() {
                playlist.play();
              },
              pause() {
                playlist.pause();
              },
              clear() {
                playlist.clear();
              },
              destroy() {
                statusSubscription?.remove();
                playlist.destroy();
              },
              setOnPlaybackStatusUpdate(cb) {
                statusSubscription?.remove();
                statusSubscription = playlist.addListener('playlistStatusUpdate', (status) =>
                  cb({
                    currentIndex: status.currentIndex,
                    currentTime: status.currentTime,
                    didJustFinish: status.didJustFinish,
                    playing: status.playing,
                    trackCount: status.trackCount,
                  }),
                );
                return () => statusSubscription?.remove();
              },
            };
          },
          writePcmChunk: async ({ data, sampleRate, channels, index }) =>
            writeCacheFile(
              `ottervoice-stream-${Date.now()}-${index}.wav`,
              pcm16ToWav(new Uint8Array(data), sampleRate, channels),
            ),
          deleteAudioFile: async (uri) => {
            const file = new File(uri);
            if (file.exists) file.delete();
          },
        },
      }),
    [stream],
  );
}
