import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export type SculptedIconName = 'home' | 'widgets' | 'shopping-cart' | 'account-circle';

/** Solid vector faces and bevels, rather than offset glyphs and clipped highlights. */
export function SculptedTabIcon({ name, focused, dark }: { name: SculptedIconName; focused: boolean; dark: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = focused ? (dark ? '#c3f5ff' : '#7fdcf3') : (dark ? '#e0ebf2' : '#c3d4e0');
  const face = focused ? '#289fc5' : (dark ? '#8eaabd' : '#7192aa');
  const side = focused ? '#096484' : '#405f78';
  const front = `url(#${id}front)`;
  return (
    <Svg width={32} height={32} viewBox="0 0 40 40" accessible={false} aria-hidden>
      <Defs>
        <LinearGradient id={`${id}front`} x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={top} /><Stop offset="1" stopColor={face} />
        </LinearGradient>
      </Defs>
      <Ellipse cx="21" cy="36" rx="12" ry="2" fill={dark ? '#00000045' : '#163d5726'} />
      {name === 'home' && <G strokeLinejoin="round">
        <Path d="M8 18 21 6 34 17 31 20 21 11 10 21Z" fill={side} />
        <Path d="M11 18 21 10 30 18V32L26 35H11Z" fill={front} />
        <Path d="m26 19 4-1v14l-4 3Z" fill={side} />
        <Path d="m5 18 14-13 14 12-4 3L19 10 8 21Z" fill={front} />
        <Path d="m8 17 11-10 11 9" fill="none" stroke="#ffffffa6" strokeWidth="1.2" />
        <Path d="M16 34V23h7v11" fill={side} /><Path d="M16 23h7" stroke={top} />
      </G>}
      {name === 'widgets' && <G strokeLinejoin="round">
        {[[5, 6], [22, 6], [5, 23], [22, 23]].map(([x, y]) => <G key={`${x}-${y}`}>
          <Path d={`M${x} ${y + 2}l9-2 4 3-9 3Z`} fill={top} />
          <Path d={`M${x} ${y + 2}l9 1v10l-9-1Z`} fill={front} />
          <Path d={`M${x + 9} ${y + 3}l4-3v10l-4 3Z`} fill={side} />
          <Path d={`M${x + 1} ${y + 3}h6`} stroke="#ffffff99" strokeWidth="0.8" />
        </G>)}
      </G>}
      {name === 'shopping-cart' && <G strokeLinejoin="round" strokeLinecap="round">
        <Path d="m9 12 26-2-4 16-18 2Z" fill={side} />
        <Path d="m8 11 24-2-4 15-16 2Z" fill={front} />
        <Path d="m9 12 22-2" stroke="#ffffffbb" strokeWidth="1.5" />
        <Path d="m17 15 1 6m6-7-1 6" stroke={top} strokeWidth="1.5" />
        <Path d="M4 6h4l6 24h15" fill="none" stroke={side} strokeWidth="3" />
        <Path d="M4 5h4l1 5" fill="none" stroke={top} strokeWidth="2" />
        <Circle cx="16" cy="34" r="3.2" fill={side} /><Circle cx="28" cy="33" r="3.2" fill={side} />
        <Circle cx="15.3" cy="33.2" r="1.3" fill={top} /><Circle cx="27.3" cy="32.2" r="1.3" fill={top} />
      </G>}
      {name === 'account-circle' && <G>
        <Rect x="7" y="5" width="28" height="30" rx="13" fill={side} />
        <Rect x="5" y="3" width="27" height="30" rx="13" fill={front} />
        <Path d="M8 14C8 8 12 5 18 5" fill="none" stroke="#ffffff99" strokeWidth="1.4" strokeLinecap="round" />
        <Circle cx="19" cy="13" r="5" fill={side} />
        <Path d="M10 29c0-11 18-11 18 0Z" fill={side} />
        <Path d="M12 25c3-4 10-4 13 0" fill="none" stroke={top} strokeWidth="1" strokeLinecap="round" />
      </G>}
    </Svg>
  );
}
