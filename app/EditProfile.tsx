import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchProfile, updateProfile } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  username: string;
  balance: string;
  currency_balance: string;
  image: string;
  role_id: number;
  country_code: string;
  order: number;
  create_date: string;
  update_date: string;
}

type ProfilePalette = {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function ProfileField({
  label,
  icon,
  palette,
  required,
  containerStyle,
  ...props
}: TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  palette: ProfilePalette;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <ThemedText style={styles.fieldLabel}>
        {label}{required ? <Text style={{ color: palette.danger }}> *</Text> : null}
      </ThemedText>
      <View style={[styles.fieldShell, {
        backgroundColor: palette.surface,
        borderColor: focused ? palette.accent : palette.border,
      }]}>
        <Ionicons name={icon} size={19} color={focused ? palette.accent : palette.muted} />
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={palette.muted}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.fieldInput, { color: palette.text }, props.style]}
        />
      </View>
    </View>
  );
}

export default function EditProfile() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette = useMemo<ProfilePalette>(() => ({
    background: themeColors.background,
    surface: dark ? '#1d252a' : '#ffffff',
    elevated: dark ? '#252f35' : '#f3f6f7',
    text: themeColors.text,
    muted: themeColors.textSecondary,
    border: dark ? '#34434b' : '#dfe7eb',
    accent: dark ? '#77cee6' : '#086b83',
    accentSoft: dark ? '#193842' : '#e4f3f7',
    onAccent: dark ? '#10232b' : '#ffffff',
    success: dark ? '#7de0ad' : '#087443',
    successSoft: dark ? '#163b2b' : '#e4f7ed',
    danger: dark ? '#ff9b98' : '#b42318',
    dangerSoft: dark ? '#49211f' : '#ffebe9',
  }), [dark, themeColors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [usingCachedProfile, setUsingCachedProfile] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+95');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const applyProfile = useCallback((profileData: UserProfile) => {
    setProfile(profileData);
    setName(profileData.name || '');
    setPhone(profileData.phone || '');
    setEmail(profileData.email || '');
    setCountryCode(profileData.country_code || '+95');
    setImageUri(profileData.image || null);
    setNewImage(null);
    setFailedImage(null);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUsingCachedProfile(false);
    try {
      const response = await fetchProfile();
      if (!response?.data) throw new Error('Profile data was unavailable');
      applyProfile(response.data);
      await AsyncStorage.setItem('user_profile', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to load profile from API:', error);
      try {
        const cachedProfile = await AsyncStorage.getItem('user_profile');
        if (!cachedProfile) throw error;
        applyProfile(JSON.parse(cachedProfile));
        setUsingCachedProfile(true);
      } catch (cacheError) {
        console.error('Failed to load cached profile:', cacheError);
        setLoadError(errorMessage(error, 'Failed to load profile data'));
      }
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => {
    const source = name.trim() || profile?.username || 'User';
    return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }, [name, profile?.username]);

  const isDirty = useMemo(() => {
    if (!profile) return false;
    return name.trim() !== (profile.name || '').trim()
      || phone.trim() !== (profile.phone || '').trim()
      || email.trim() !== (profile.email || '').trim()
      || countryCode.trim() !== (profile.country_code || '+95').trim()
      || Boolean(newImage);
  }, [countryCode, email, name, newImage, phone, profile]);

  const clearFeedback = () => {
    setFormError(null);
    setNotice(null);
  };

  const pickImage = async () => {
    clearFeedback();
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setNewImage(result.assets[0]);
        setFailedImage(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setFormError('Couldn’t open your photo library. Please try again.');
    }
  };

  const validateForm = () => {
    if (!name.trim()) return 'Enter your full name';
    if (!email.trim()) return 'Enter your email address';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address';
    if (!countryCode.trim()) return 'Enter your country code';
    if (!phone.trim()) return 'Enter your phone number';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      setNotice(null);
      return;
    }

    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('country_code', countryCode.trim());

      if (newImage) {
        if (Platform.OS === 'web') {
          const imageResponse = await fetch(newImage.uri);
          formData.append('image', await imageResponse.blob(), 'profile.jpg');
        } else {
          formData.append('image', {
            uri: newImage.uri,
            type: newImage.mimeType || 'image/jpeg',
            name: newImage.fileName || 'profile.jpg',
          } as never);
        }
      }

      const response = await updateProfile(formData);
      if (!response?.data) throw new Error('Updated profile data was unavailable');
      applyProfile(response.data);
      await AsyncStorage.setItem('user_profile', JSON.stringify(response.data));
      setUsingCachedProfile(false);
      setNotice('Profile changes saved');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setFormError(errorMessage(error, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
      <IconButton label="Go back" onPress={() => router.back()} disabled={saving} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </IconButton>
      <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
      <View style={styles.headerButton} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {header}
        <View style={styles.stateContainer} accessibilityLiveRegion="polite">
          <View style={[styles.loadingIcon, { backgroundColor: palette.accentSoft }]}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
          <ThemedText style={styles.stateTitle}>Loading your profile</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Getting your latest account details.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {header}
        <View style={styles.stateContainer} accessibilityRole="alert">
          <View style={[styles.stateIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={palette.danger} />
          </View>
          <ThemedText style={styles.stateTitle}>Couldn&apos;t load your profile</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>{loadError || 'Profile data was unavailable'}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadProfile}
            style={({ pressed }) => [styles.primaryButton, styles.retryButton, { backgroundColor: palette.accent }, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={19} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {header}
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <ThemedText style={styles.pageTitle}>Make it yours</ThemedText>
            <ThemedText style={[styles.pageSubtitle, { color: palette.muted }]}>Keep your contact details and profile photo up to date.</ThemedText>
          </View>

          {usingCachedProfile && (
            <View accessibilityRole="alert" style={[styles.feedbackBanner, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="cloud-offline-outline" size={19} color={palette.muted} />
              <ThemedText style={[styles.feedbackText, { color: palette.muted }]}>Showing saved profile details. You may need a connection to save changes.</ThemedText>
            </View>
          )}

          {formError && (
            <View accessibilityRole="alert" style={[styles.feedbackBanner, { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
              <Ionicons name="alert-circle-outline" size={19} color={palette.danger} />
              <ThemedText style={[styles.feedbackText, { color: palette.danger }]}>{formError}</ThemedText>
            </View>
          )}

          {notice && (
            <Pressable accessibilityRole="button" accessibilityLabel={`${notice}. Dismiss`} accessibilityLiveRegion="polite"
              onPress={() => setNotice(null)} style={[styles.feedbackBanner, { backgroundColor: palette.successSoft, borderColor: palette.success }]}>
              <Ionicons name="checkmark-circle" size={19} color={palette.success} />
              <ThemedText style={[styles.feedbackText, { color: palette.success }]}>{notice}</ThemedText>
              <Ionicons name="close" size={17} color={palette.success} />
            </Pressable>
          )}

          <View style={[styles.avatarCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.avatarCopy}>
              <ThemedText style={styles.sectionTitle}>Profile photo</ThemedText>
              <ThemedText style={[styles.sectionDescription, { color: palette.muted }]}>Choose a clear square photo so your account is easy to recognize.</ThemedText>
              {newImage && (
                <View style={[styles.pendingBadge, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons name="time-outline" size={14} color={palette.accent} />
                  <ThemedText style={[styles.pendingText, { color: palette.accent }]}>Ready to save</ThemedText>
                </View>
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile picture" onPress={pickImage}
              style={({ pressed }) => [styles.avatarButton, { borderColor: palette.border, backgroundColor: palette.elevated }, pressed && styles.pressed]}>
              {imageUri && imageUri !== failedImage ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} contentFit="cover" accessibilityLabel="Profile photo preview" onError={() => setFailedImage(imageUri)} />
              ) : (
                <ThemedText style={[styles.initials, { color: palette.accent }]}>{initials}</ThemedText>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: palette.accent, borderColor: palette.surface }]}>
                <Ionicons name="camera" size={17} color={palette.onAccent} />
              </View>
            </Pressable>
          </View>

          <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
                <Ionicons name="person-outline" size={19} color={palette.accent} />
              </View>
              <View style={styles.sectionHeadingCopy}>
                <ThemedText style={styles.sectionTitle}>Personal details</ThemedText>
                <ThemedText style={[styles.sectionDescription, { color: palette.muted }]}>Used for your account and order updates.</ThemedText>
              </View>
            </View>

            <ProfileField label="Full name" icon="person-outline" palette={palette} required value={name}
              onChangeText={value => { clearFeedback(); setName(value); }} placeholder="Your full name"
              autoCapitalize="words" autoComplete="name" textContentType="name" />
            <ProfileField label="Email address" icon="mail-outline" palette={palette} required value={email}
              onChangeText={value => { clearFeedback(); setEmail(value); }} placeholder="you@example.com"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />

            <View style={styles.phoneRow}>
              <ProfileField containerStyle={styles.codeField} label="Country code" icon="flag-outline" palette={palette} required value={countryCode}
                onChangeText={value => { clearFeedback(); setCountryCode(value.replace(/[^0-9+]/g, '')); }} placeholder="+95"
                keyboardType="phone-pad" maxLength={6} />
              <ProfileField containerStyle={styles.phoneField} label="Phone number" icon="call-outline" palette={palette} required value={phone}
                onChangeText={value => { clearFeedback(); setPhone(value.replace(/[^0-9]/g, '')); }} placeholder="09 123 456 789"
                keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            </View>
          </View>

          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !isDirty, busy: saving }}
            disabled={saving || !isDirty} onPress={handleSave}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.accent }, (!isDirty || saving) && styles.disabled, pressed && !saving && isDirty && styles.pressed]}>
            {saving ? <ActivityIndicator size="small" color={palette.onAccent} /> : <Ionicons name="checkmark-circle-outline" size={20} color={palette.onAccent} />}
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>
              {saving ? 'Saving…' : isDirty ? 'Save changes' : 'Everything is up to date'}
            </Text>
          </Pressable>
          <ThemedText style={[styles.saveHint, { color: palette.muted }]}>Your account information is stored securely.</ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44 },
  headerTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.5 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  stateDescription: { maxWidth: 340, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 7 },
  retryButton: { marginTop: 22 },
  scrollContent: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 36 },
  intro: { marginBottom: 18, paddingHorizontal: 2 },
  pageTitle: { fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 14, lineHeight: 21, marginTop: 3 },
  feedbackBanner: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  avatarCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarCopy: { minWidth: 0, flex: 1 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  sectionDescription: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  pendingBadge: { alignSelf: 'flex-start', minHeight: 26, borderRadius: 13, paddingHorizontal: 8, marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pendingText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  avatarButton: { width: 94, height: 94, borderRadius: 31, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  avatarImage: { ...StyleSheet.absoluteFillObject, borderRadius: 30 },
  initials: { fontSize: 30, lineHeight: 38, fontWeight: '800' },
  cameraBadge: { position: 'absolute', right: -4, bottom: -4, width: 36, height: 36, borderRadius: 18, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  formCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { minWidth: 0, flex: 1 },
  fieldGroup: { minWidth: 0, marginBottom: 15 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 7 },
  fieldShell: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldInput: { minWidth: 0, flex: 1, minHeight: 50, paddingVertical: 11, paddingHorizontal: 0, fontSize: 16, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  codeField: { width: 150 },
  phoneField: { flex: 1 },
  primaryButton: { minHeight: 52, borderRadius: 15, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  saveHint: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
});
