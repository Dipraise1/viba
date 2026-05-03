import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function SolanaLogo({ size = 24 }: { size?: number }) {
  const aspect = 397.7 / 311.7;
  const h = size;
  const w = size * aspect;

  return (
    <Svg width={w} height={h} viewBox="0 0 397.7 311.7">
      <Defs>
        <LinearGradient id="solGrad1" x1="360.8791" y1="-37.5447" x2="141.213" y2="383.2064" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="solGrad2" x1="264.8291" y1="-87.6019" x2="45.163" y2="333.1492" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="solGrad3" x1="312.5484" y1="-62.6998" x2="92.8823" y2="358.0513" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
      </Defs>
      {/* Bottom bar */}
      <Path
        fill="url(#solGrad1)"
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
      />
      {/* Top bar */}
      <Path
        fill="url(#solGrad2)"
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
      />
      {/* Middle bar */}
      <Path
        fill="url(#solGrad3)"
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
      />
    </Svg>
  );
}
