import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  CameraType,
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { publishPost } from '@/lib/feed';

const { width } = Dimensions.get('window');

type DraftSource = 'camera' | 'library';

type VideoDraft = {
  uri: string;
  source: DraftSource;
  fileName?: string | null;
  fileSize?: number;
  width: number;
  height: number;
  durationMs?: number | null;
  mimeType?: string | null;
};

type PlatformId = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'twitch';

const PLATFORM_TARGETS: {
  id: PlatformId;
  icon: keyof typeof FontAwesome5.glyphMap;
  label: string;
  color: string;
}[] = [
  { id: 'tiktok', icon: 'tiktok', label: 'TikTok', color: '#69C9D0' },
  { id: 'instagram', icon: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'youtube', icon: 'youtube', label: 'YouTube', color: '#FF0000' },
  { id: 'facebook', icon: 'facebook-f', label: 'Facebook', color: '#1877F2' },
  { id: 'twitch', icon: 'twitch', label: 'Twitch', color: '#9146FF' },
];

const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;
const VOLUME_OPTIONS = [0, 0.5, 1] as const;

const VIDEO_PICKER_OPTIONS = {
  mediaTypes: ['videos'] as ImagePicker.MediaType[],
  allowsEditing: true,
  quality: 1,
  videoMaxDuration: 0,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
  videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
};

function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
  }, [opacity, scale]);

  const s = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        s,
        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF2D87' },
      ]}
    />
  );
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return '--:--';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return 'High quality';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function normalizeVideoDraft(asset: ImagePicker.ImagePickerAsset, source: DraftSource): VideoDraft {
  return {
    uri: asset.uri,
    source,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    durationMs: asset.duration,
    mimeType: asset.mimeType,
  };
}

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [draft, setDraft] = useState<VideoDraft | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(
    () => new Set(['tiktok', 'instagram', 'youtube']),
  );
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const cameraReady = cameraPermission?.granted;

  const resetDraftTools = () => {
    setCaption('');
    setSelectedPlatforms(new Set(['tiktok', 'instagram', 'youtube']));
    setSpeed(1);
    setVolume(1);
    setCoverUri(null);
    setSaved(false);
    setPosted(false);
  };

  const handlePost = async () => {
    if (!draft || isPosting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPosting(true);
    try {
      await publishPost({
        videoUri:     draft.uri,
        thumbnailUri: coverUri,
        caption:      caption.trim(),
        durationMs:   draft.durationMs ?? null,
        tags:         [],
      });
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setDraft(null);
        router.replace('/(tabs)');
      }, 1400);
    } catch (e: any) {
      Alert.alert('Post failed', e?.message ?? 'Could not upload your video. Try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const openDraft = async (asset: ImagePicker.ImagePickerAsset, source: DraftSource) => {
    resetDraftTools();
    setDraft(normalizeVideoDraft(asset, source));
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
        time: 0,
        quality: 1,
      });
      setCoverUri(thumb.uri);
    } catch {
      setCoverUri(null);
    }
  };

  const requestPreviewPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  const ensureRecordPermissions = async () => {
    const camera = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    const pickerCamera = camera.granted
      ? camera
      : await ImagePicker.requestCameraPermissionsAsync();
    const mic = micPermission?.granted ? micPermission : await requestMicPermission();

    if (!pickerCamera.granted || !mic.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera and microphone access to record videos with audio.',
      );
      return false;
    }

    return true;
  };

  const handleGoLive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/(tabs)/live');
  };

  const handleRecord = async () => {
    if (isLaunching) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const canRecord = await ensureRecordPermissions();
    if (!canRecord) return;

    setIsLaunching(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        ...VIDEO_PICKER_OPTIONS,
        cameraType:
          facing === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      });

      if (!result.canceled && result.assets[0]) {
        await openDraft(result.assets[0], 'camera');
      }
    } catch (e: any) {
      Alert.alert('Recording failed', e?.message ?? 'Unable to open the camera.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleUpload = async () => {
    if (isLaunching) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLaunching(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow Viba to access your videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(VIDEO_PICKER_OPTIONS);
      if (!result.canceled && result.assets[0]) {
        await openDraft(result.assets[0], 'library');
      }
    } catch (e: any) {
      Alert.alert('Video picker failed', e?.message ?? 'Unable to open your video library.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!draft || isSaving) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true, ['video']);
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow Viba to save videos to your library.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(draft.uri);
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Your video was saved to your device library.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unable to save this video.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlatform = (id: PlatformId) => {
    Haptics.selectionAsync();
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (draft) {
    return (
      <VideoEditor
        draft={draft}
        caption={caption}
        onCaptionChange={setCaption}
        selectedPlatforms={selectedPlatforms}
        onTogglePlatform={togglePlatform}
        speed={speed}
        onSpeedChange={setSpeed}
        volume={volume}
        onVolumeChange={setVolume}
        coverUri={coverUri}
        onCoverUriChange={setCoverUri}
        onClose={() => setDraft(null)}
        onRecordAnother={handleRecord}
        onUploadAnother={handleUpload}
        onSaveToLibrary={handleSaveToLibrary}
        isSaving={isSaving}
        saved={saved}
        onPost={handlePost}
        isPosting={isPosting}
        posted={posted}
        insets={insets}
      />
    );
  }

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          videoQuality="2160p"
          mute={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05050F' }]} />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.92)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.topBar, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Create</Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            Haptics.selectionAsync();
            setFacing((f) => (f === 'front' ? 'back' : 'front'));
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {!cameraReady && (
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.permNudge}>
          <TouchableOpacity onPress={requestPreviewPermissions} activeOpacity={0.8} style={styles.permBtn}>
            <Ionicons name="camera-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.permText}>Enable camera preview</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {isLaunching && (
        <View style={styles.launchOverlay}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.launchText}>Opening camera</Text>
        </View>
      )}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInUp.delay(60).duration(420)}>
          <TouchableOpacity style={styles.recordHero} onPress={handleRecord} activeOpacity={0.9}>
            <LinearGradient
              colors={['#FF2D87', '#9B30FF', '#00D4AA']}
              style={styles.recordHeroGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.liveBtnLeft}>
                <Ionicons name="videocam" size={22} color="#FFFFFF" />
                <View style={styles.heroCopy}>
                  <Text style={styles.liveBtnTitle}>Record Video</Text>
                  <Text style={styles.liveBtnSub}>Native camera, highest available quality</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.75)" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(420)} style={styles.row}>
          <TouchableOpacity style={styles.optionCard} onPress={handleGoLive} activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.optionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255,45,135,0.2)' }]}>
                <PulseDot />
                <Ionicons name="radio-outline" size={24} color="#FF2D87" />
              </View>
              <Text style={styles.optionTitle}>Go Live</Text>
              <Text style={styles.optionSub}>Broadcast now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleUpload} activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.optionGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(123,47,255,0.2)' }]}>
                <Ionicons name="cloud-upload-outline" size={26} color="#A855F7" />
              </View>
              <Text style={styles.optionTitle}>Upload</Text>
              <Text style={styles.optionSub}>Edit a saved clip</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).duration(400)} style={styles.platformHint}>
          {PLATFORM_TARGETS.slice(0, 4).map((p) => (
            <View key={p.id} style={styles.platDot}>
              <FontAwesome5 name={p.icon} size={11} color="rgba(255,255,255,0.5)" />
            </View>
          ))}
          <Text style={styles.platformHintText}>Record, edit, and prep for every platform</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function VideoEditor({
  draft,
  caption,
  onCaptionChange,
  selectedPlatforms,
  onTogglePlatform,
  speed,
  onSpeedChange,
  volume,
  onVolumeChange,
  coverUri,
  onCoverUriChange,
  onClose,
  onRecordAnother,
  onUploadAnother,
  onSaveToLibrary,
  isSaving,
  saved,
  onPost,
  isPosting,
  posted,
  insets,
}: {
  draft: VideoDraft;
  caption: string;
  onCaptionChange: (caption: string) => void;
  selectedPlatforms: Set<PlatformId>;
  onTogglePlatform: (id: PlatformId) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  coverUri: string | null;
  onCoverUriChange: (uri: string | null) => void;
  onClose: () => void;
  onRecordAnother: () => void;
  onUploadAnother: () => void;
  onSaveToLibrary: () => void;
  isSaving: boolean;
  saved: boolean;
  onPost: () => Promise<void>;
  isPosting: boolean;
  posted: boolean;
  insets: { top: number; bottom: number };
}) {
  const [playing, setPlaying] = useState(false);
  const [coverTime, setCoverTime] = useState(0);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  const durationSeconds = Math.max(0, Math.round((draft.durationMs ?? 0) / 1000));
  const coverStep = durationSeconds > 30 ? 5 : 1;

  const player = useVideoPlayer({ uri: draft.uri }, (p) => {
    p.loop = true;
    p.volume = volume;
    p.playbackRate = speed;
  });

  useEffect(() => {
    player.volume = volume;
    player.playbackRate = speed;
  }, [player, speed, volume]);

  useEffect(() => {
    return () => player.pause();
  }, [player]);

  const selectedCount = useMemo(() => selectedPlatforms.size, [selectedPlatforms]);

  const togglePlayback = () => {
    Haptics.selectionAsync();
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  const moveCoverTime = (direction: -1 | 1) => {
    Haptics.selectionAsync();
    setCoverTime((value) => {
      const max = durationSeconds || 0;
      return Math.max(0, Math.min(max, value + direction * coverStep));
    });
  };

  const generateCover = async () => {
    if (isGeneratingCover) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGeneratingCover(true);
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(draft.uri, {
        time: coverTime * 1000,
        quality: 1,
      });
      onCoverUriChange(thumb.uri);
    } catch (e: any) {
      Alert.alert('Cover failed', e?.message ?? 'Unable to create a cover frame.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={editorStyles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[editorStyles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={editorStyles.headerBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={editorStyles.headerTitleWrap}>
          <Text style={editorStyles.headerTitle}>Edit video</Text>
          <Text style={editorStyles.headerSub}>
            {draft.source === 'camera' ? 'Recorded clip' : 'Uploaded clip'} - {formatDuration(draft.durationMs)}
          </Text>
        </View>
        <TouchableOpacity
          style={[editorStyles.headerBtn, saved && editorStyles.headerBtnSaved]}
          onPress={onSaveToLibrary}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={21} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={editorStyles.scroll}
        contentContainerStyle={[editorStyles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={editorStyles.previewWrap}>
          <VideoView
            player={player}
            style={editorStyles.video}
            nativeControls
            contentFit="contain"
            allowsFullscreen
          />
          <TouchableOpacity style={editorStyles.playBtn} onPress={togglePlayback} activeOpacity={0.84}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={editorStyles.qualityPill}>
            <Ionicons name="sparkles-outline" size={13} color="#00D4AA" />
            <Text style={editorStyles.qualityText}>Highest quality source</Text>
          </View>
        </View>

        <View style={editorStyles.metaRow}>
          <MetaPill icon="time-outline" label={formatDuration(draft.durationMs)} />
          <MetaPill icon="resize-outline" label={`${draft.width || '--'} x ${draft.height || '--'}`} />
          <MetaPill icon="document-outline" label={formatFileSize(draft.fileSize)} />
        </View>

        <View style={editorStyles.toolBlock}>
          <View style={editorStyles.toolHeader}>
            <View>
              <Text style={editorStyles.toolTitle}>Cover frame</Text>
              <Text style={editorStyles.toolSub}>{coverTime}s frame selected</Text>
            </View>
            <TouchableOpacity
              style={editorStyles.smallAction}
              onPress={generateCover}
              activeOpacity={0.84}
              disabled={isGeneratingCover}
            >
              {isGeneratingCover ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="image-outline" size={16} color="#FFFFFF" />
              )}
              <Text style={editorStyles.smallActionText}>Set</Text>
            </TouchableOpacity>
          </View>

          <View style={editorStyles.coverRow}>
            <TouchableOpacity style={editorStyles.stepBtn} onPress={() => moveCoverTime(-1)}>
              <Ionicons name="remove" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={editorStyles.coverTimeTrack}>
              <View
                style={[
                  editorStyles.coverTimeFill,
                  {
                    width: `${durationSeconds ? Math.min(100, (coverTime / durationSeconds) * 100) : 0}%`,
                  },
                ]}
              />
            </View>
            <TouchableOpacity style={editorStyles.stepBtn} onPress={() => moveCoverTime(1)}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={editorStyles.coverThumb}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.45)" />
              )}
            </View>
          </View>
        </View>

        <View style={editorStyles.toolBlock}>
          <Text style={editorStyles.toolTitle}>Playback</Text>
          <Text style={editorStyles.toolSub}>Preview speed and audio before posting.</Text>

          <View style={editorStyles.segmentLabelRow}>
            <Text style={editorStyles.segmentLabel}>Speed</Text>
            <Text style={editorStyles.segmentValue}>{speed}x</Text>
          </View>
          <View style={editorStyles.segmentRow}>
            {SPEED_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[editorStyles.segment, speed === s && editorStyles.segmentActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSpeedChange(s);
                }}
              >
                <Text style={[editorStyles.segmentText, speed === s && editorStyles.segmentTextActive]}>
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={editorStyles.segmentLabelRow}>
            <Text style={editorStyles.segmentLabel}>Volume</Text>
            <Text style={editorStyles.segmentValue}>{Math.round(volume * 100)}%</Text>
          </View>
          <View style={editorStyles.segmentRow}>
            {VOLUME_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[editorStyles.segment, volume === v && editorStyles.segmentActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onVolumeChange(v);
                }}
              >
                <Ionicons
                  name={v === 0 ? 'volume-mute' : v === 0.5 ? 'volume-low' : 'volume-high'}
                  size={16}
                  color={volume === v ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={editorStyles.toolBlock}>
          <Text style={editorStyles.toolTitle}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={onCaptionChange}
            placeholder="Write a caption..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            maxLength={2200}
            style={editorStyles.captionInput}
          />
          <Text style={editorStyles.charCount}>{caption.length}/2200</Text>
        </View>

        <View style={editorStyles.toolBlock}>
          <View style={editorStyles.toolHeader}>
            <View>
              <Text style={editorStyles.toolTitle}>Platforms</Text>
              <Text style={editorStyles.toolSub}>{selectedCount} selected</Text>
            </View>
          </View>
          <View style={editorStyles.platformGrid}>
            {PLATFORM_TARGETS.map((platform) => {
              const active = selectedPlatforms.has(platform.id);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[editorStyles.platformChip, active && editorStyles.platformChipActive]}
                  onPress={() => onTogglePlatform(platform.id)}
                  activeOpacity={0.84}
                >
                  <View style={[editorStyles.platformIcon, { backgroundColor: `${platform.color}26` }]}>
                    <FontAwesome5 name={platform.icon} size={13} color={platform.color} />
                  </View>
                  <Text style={editorStyles.platformText}>{platform.label}</Text>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={active ? '#00D4AA' : 'rgba(255,255,255,0.3)'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={editorStyles.actionRow}>
          <TouchableOpacity style={editorStyles.secondaryAction} onPress={onRecordAnother} activeOpacity={0.84}>
            <Ionicons name="videocam-outline" size={18} color="#FFFFFF" />
            <Text style={editorStyles.secondaryActionText}>Record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={editorStyles.secondaryAction} onPress={onUploadAnother} activeOpacity={0.84}>
            <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" />
            <Text style={editorStyles.secondaryActionText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[editorStyles.secondaryAction, saved && editorStyles.secondaryActionSaved]}
            onPress={onSaveToLibrary}
            activeOpacity={0.84}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={18} color={saved ? '#00D4AA' : '#FFFFFF'} />
            )}
            <Text style={[editorStyles.secondaryActionText, saved && { color: '#00D4AA' }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={editorStyles.saveAction}
          onPress={onPost}
          activeOpacity={0.88}
          disabled={isPosting || posted}
        >
          <LinearGradient
            colors={posted ? ['#00D4AA', '#00A884'] : ['#FF2D87', '#7B2FFF']}
            style={editorStyles.saveActionGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isPosting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name={posted ? 'checkmark-circle' : 'paper-plane-outline'} size={20} color="#FFFFFF" />
            )}
            <Text style={editorStyles.saveActionText}>
              {posted ? 'Posted!' : isPosting ? 'Uploading...' : 'Post to Viba'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={editorStyles.metaPill}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.58)" />
      <Text style={editorStyles.metaPillText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topTitle: { fontFamily: 'Syne-Bold', fontSize: 17, color: '#FFFFFF' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  permNudge: { position: 'absolute', top: '40%', alignSelf: 'center' },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  permText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  launchOverlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 15,
  },
  launchText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 12,
  },

  recordHero: { borderRadius: 18, overflow: 'hidden' },
  recordHeroGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 18,
  },
  liveBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  heroCopy: { flex: 1 },
  liveBtnTitle: { fontFamily: 'Syne-Bold', fontSize: 17, color: '#FFFFFF' },
  liveBtnSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 1,
  },

  row: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  optionGrad: { padding: 16, gap: 8, minHeight: 136, justifyContent: 'center' },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  optionTitle: { fontFamily: 'Syne-Bold', fontSize: 16, color: '#FFFFFF' },
  optionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.55)' },

  platformHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  platDot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformHintText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
});

const editorStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05050F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  headerBtnSaved: { backgroundColor: 'rgba(0,212,170,0.18)', borderColor: 'rgba(0,212,170,0.32)' },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontFamily: 'Syne-Bold', fontSize: 18, color: '#FFFFFF' },
  headerSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  previewWrap: {
    width: '100%',
    aspectRatio: 9 / 15.6,
    maxHeight: Math.max(390, width * 1.36),
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  video: { width: '100%', height: '100%' },
  playBtn: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  qualityText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  metaPillText: {
    flexShrink: 1,
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
  },
  toolBlock: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 14,
    gap: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolTitle: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFFFFF' },
  toolSub: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
    marginTop: 3,
  },
  smallAction: {
    minWidth: 68,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,45,135,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.26)',
    paddingHorizontal: 10,
  },
  smallActionText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FFFFFF' },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coverTimeTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.11)',
    overflow: 'hidden',
  },
  coverTimeFill: { height: '100%', borderRadius: 999, backgroundColor: '#FF2D87' },
  coverThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  segmentLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: 'rgba(255,255,255,0.76)' },
  segmentValue: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#00D4AA' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: 'rgba(255,45,135,0.24)',
    borderColor: 'rgba(255,45,135,0.36)',
  },
  segmentText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.56)',
  },
  segmentTextActive: { color: '#FFFFFF' },
  captionInput: {
    minHeight: 92,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  platformGrid: { gap: 8 },
  platformChip: {
    minHeight: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 11,
  },
  platformChipActive: {
    borderColor: 'rgba(0,212,170,0.34)',
    backgroundColor: 'rgba(0,212,170,0.08)',
  },
  platformIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformText: {
    flex: 1,
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryActionText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#FFFFFF' },
  secondaryActionSaved: { borderColor: 'rgba(0,212,170,0.3)', backgroundColor: 'rgba(0,212,170,0.1)' },
  saveAction: { borderRadius: 8, overflow: 'hidden' },
  saveActionGrad: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
  },
  saveActionText: { fontFamily: 'Syne-Bold', fontSize: 15, color: '#FFFFFF' },
});
