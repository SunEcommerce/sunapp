import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function CategoryThumbnail({ sources, size, color, background }: {
  sources: string[];
  size: number;
  color: string;
  background: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const uri = sources.find(source => !failed.includes(source));
  return (
    <View aria-hidden style={[styles.thumbnail, { width: size, height: size, backgroundColor: background }]}>
      {uri ? <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill}
        onError={() => setFailed(previous => [...previous, uri])} />
        : <Ionicons name="grid-outline" size={size * 0.48} color={color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: { borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
