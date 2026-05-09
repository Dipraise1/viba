declare module '@api.video/react-native-livestream' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export type ApiVideoLiveStreamMethods = {
    startStreaming(streamKey: string, url?: string): Promise<boolean>;
    stopStreaming(): void;
  };

  type Props = {
    style?: any;
    camera?: 'front' | 'back';
    isMuted?: boolean;
    video?: { fps?: number; resolution?: string; bitrate?: number; gopDuration?: number };
    audio?: { bitrate?: number; sampleRate?: number; isStereo?: boolean };
    zoomRatio?: number;
    enablePinchedZoom?: boolean;
    onConnectionSuccess?: () => void;
    onConnectionFailed?: (code: string) => void;
    onDisconnect?: () => void;
  };

  export default class LivestreamView extends Component<Props> implements ApiVideoLiveStreamMethods {
    startStreaming(streamKey: string, url?: string): Promise<boolean>;
    stopStreaming(): void;
  }
}
