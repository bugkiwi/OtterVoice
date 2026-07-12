/**
 * Bridges the real Expo audio APIs (`expo-av` + `expo-file-system`) to the
 * injected interfaces that `@ottervoice/runtime-react-native` expects. Copy
 * this into a real Expo app (`npx expo install expo-av expo-file-system`).
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createExpoRuntime, type ExpoRuntime } from '@ottervoice/runtime-react-native';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return globalThis.btoa(binary);
}

/** Build an OtterVoice runtime backed by Expo. */
export function createExpoAudioRuntime(): ExpoRuntime {
  return createExpoRuntime({
    input: {
      requestPermission: async () => {
        const { granted } = await Audio.requestPermissionsAsync();
        return granted;
      },
      createRecording: async () => {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        // `createAsync` prepares *and* starts the recording.
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        return {
          startAsync: async () => {},
          stopAndUnloadAsync: () => recording.stopAndUnloadAsync(),
          getURI: () => recording.getURI(),
        };
      },
      readAudioFile: async (uri) => {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64ToArrayBuffer(base64);
      },
    },
    output: {
      createSound: async (uri) => {
        const { sound } = await Audio.Sound.createAsync({ uri });
        return {
          playAsync: async () => {
            await sound.playAsync();
          },
          stopAsync: async () => {
            await sound.stopAsync();
          },
          unloadAsync: async () => {
            await sound.unloadAsync();
          },
          setOnPlaybackStatusUpdate: (cb) =>
            sound.setOnPlaybackStatusUpdate((status) =>
              cb({ didJustFinish: 'didJustFinish' in status ? status.didJustFinish : false }),
            ),
        };
      },
      writeAudioFile: async (buffer, mimeType) => {
        const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
        const uri = `${FileSystem.cacheDirectory}ottervoice-tts-${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(uri, arrayBufferToBase64(buffer), {
          encoding: FileSystem.EncodingType.Base64,
        });
        return uri;
      },
    },
  });
}
