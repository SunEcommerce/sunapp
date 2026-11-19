import { HomeSkeleton } from '@/components/HomeSkeleton';
import { IconButton } from '@/components/ui/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchPage } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { decode } from 'html-entities';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

type PageData = { title: string; description?: string; image?: string };
const pageDetails: Record<string, { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; summary: string }> = {
  'contact-us': { title: 'Contact Us', icon: 'chatbubble-ellipses-outline', summary: 'Questions? Find our contact details below.' },
  'privacy-policy': { title: 'Privacy Policy', icon: 'shield-checkmark-outline', summary: 'Learn how we handle your personal information.' },
  'terms-and-conditions': { title: 'Terms & Conditions', icon: 'document-text-outline', summary: 'Read the terms that apply when you shop with us.' },
};

export default function PageView() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] || '' : params.slug || '';
  const router = useRouter();
  const { colorScheme = 'light' } = useContext(ThemeContext) || {};
  const theme = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const softAccent = dark ? '#253b46' : '#eaf4f8';
  const onAccent = dark ? '#10232b' : '#ffffff';
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(Math.max(0, Math.min(width, 680) - 66));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const meta = pageDetails[slug];
  const fallbackTitle = meta?.title || (slug ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Information');
  const title = page?.title ? decode(page.title) : fallbackTitle;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setPage(null);
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }
    fetchPage(slug).then(response => {
      if (!active) return;
      if (!response?.data || typeof response.data.title !== 'string') throw new Error('Invalid page response');
      setPage(response.data);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, attempt]);

  const source = useMemo(() => ({ html: decode(page?.description || '')
    .replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\n/g, '').replace(/<p(?:\s[^>]*)?>(?:\s|<br\s*\/?>)*<\/p>/gi, '') }), [page?.description]);
  const baseStyle = useMemo(() => ({ color: theme.text, fontSize: 14, lineHeight: 23 }), [theme.text]);
  const tagsStyles = useMemo(() => ({
    body: { margin: 0 },
    p: { marginTop: 0, marginBottom: 12 },
    h1: { fontSize: 21, lineHeight: 28, fontWeight: '700' as const, marginTop: 16, marginBottom: 10 },
    h2: { fontSize: 18, lineHeight: 25, fontWeight: '700' as const, marginTop: 16, marginBottom: 8 },
    h3: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const, marginTop: 14, marginBottom: 8 },
    h4: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
    a: { color: accent, textDecorationLine: 'underline' as const },
    ul: { paddingLeft: 20, marginTop: 4, marginBottom: 12 },
    ol: { paddingLeft: 20, marginTop: 4, marginBottom: 12 },
    li: { marginBottom: 6 },
    blockquote: { borderLeftWidth: 3, borderLeftColor: border, paddingLeft: 12, marginLeft: 0, marginRight: 0 },
  }), [accent, border]);
  const classesStyles = useMemo(() => ({
    title: { fontSize: 20, lineHeight: 27, fontWeight: '700' as const, marginBottom: 12 },
    description: { fontSize: 14, lineHeight: 23, marginBottom: 12 },
    'info-group': { marginBottom: 14 },
    label: { fontSize: 12, color: theme.textSecondary, marginBottom: 3 },
    value: { fontSize: 15, lineHeight: 23, fontWeight: '600' as const, color: accent },
    footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border },
    'footer-text': { fontSize: 12, lineHeight: 20, color: theme.textSecondary },
  }), [accent, border, theme.textSecondary]);

  return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
    <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
      <View style={styles.headerContent}>
        <IconButton label="Go back" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={23} color={theme.text} />
        </IconButton>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>{title}</ThemedText>
        <View style={styles.headerButton} />
      </View>
    </View>
    <ScrollView key={slug} style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <View style={[styles.iconBadge, { backgroundColor: softAccent }]}>
          <Ionicons name={meta?.icon || 'information-circle-outline'} size={21} color={accent} />
        </View>
        <ThemedText style={[styles.summary, { color: theme.textSecondary }]}>{meta?.summary || 'Information from Sun Mobile.'}</ThemedText>
      </View>
      {loading ? <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <HomeSkeleton variant="banner" height={18} label="Loading page content" />
        <View style={{ marginTop: 14 }}><HomeSkeleton variant="banner" height={140} label="Loading page content" /></View>
      </View> : error ? <View style={[styles.card, styles.stateCard, { backgroundColor: surface, borderColor: border }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={theme.icon} />
        <ThemedText style={styles.stateTitle}>{slug ? 'Page unavailable' : 'No page selected'}</ThemedText>
        <ThemedText accessibilityRole="alert" style={[styles.stateCopy, { color: theme.textSecondary }]}>{slug ? 'We couldn’t load this page. Please try again.' : 'Go back and choose a page to read.'}</ThemedText>
        {!!slug && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry page" style={[styles.retryButton, { backgroundColor: accent }]} onPress={() => setAttempt(value => value + 1)}>
          <Ionicons name="refresh-outline" size={16} color={onAccent} />
          <ThemedText style={[styles.retryText, { color: onAccent }]}>Try again</ThemedText>
        </TouchableOpacity>}
      </View> : <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}
        onLayout={event => setContentWidth(Math.max(0, event.nativeEvent.layout.width - 34))}>
        {!!page?.image && <Image accessibilityLabel={`${title} illustration`} source={{ uri: page.image }} style={styles.pageImage} resizeMode="contain" />}
        {source.html.trim() ? <RenderHtml contentWidth={contentWidth} source={source} baseStyle={baseStyle}
          tagsStyles={tagsStyles} classesStyles={classesStyles} ignoredStyles={['width', 'height', 'color', 'backgroundColor', 'fontFamily', 'fontSize', 'lineHeight']} /> :
          <View style={styles.emptyContent}><Ionicons name="document-outline" size={28} color={theme.icon} />
            <ThemedText style={[styles.stateCopy, { color: theme.textSecondary }]}>No content available yet.</ThemedText>
          </View>}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { width: '100%', maxWidth: 680, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 48 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center', paddingHorizontal: 6 },
  scrollView: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, gap: 14 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summary: { flex: 1, fontSize: 13, lineHeight: 20 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  pageImage: { width: '100%', aspectRatio: 16 / 9, marginBottom: 14, borderRadius: 10 },
  stateCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  stateTitle: { fontSize: 18, lineHeight: 25, fontWeight: '600', textAlign: 'center' },
  stateCopy: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 20, borderRadius: 12, marginTop: 4 },
  retryText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  emptyContent: { alignItems: 'center', paddingVertical: 20, gap: 12 },
});
