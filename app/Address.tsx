import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { createAddress, deleteAddress, fetchAddresses, updateAddress } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
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

type Address = {
  id: number;
  full_name: string;
  country_code: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  label: string;
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
};

type AddressForm = {
  full_name: string;
  country_code: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  label: string;
};

type AddressPalette = {
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

const EMPTY_FORM: AddressForm = {
  full_name: '',
  country_code: '+95',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  zip_code: '',
  label: '',
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

function AddressField({
  label,
  icon,
  required,
  palette,
  containerStyle,
  multiline,
  ...props
}: TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  palette: AddressPalette;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <ThemedText style={styles.fieldLabel}>
        {label}{required ? <Text style={{ color: palette.danger }}> *</Text> : null}
      </ThemedText>
      <View style={[
        styles.fieldShell,
        multiline && styles.fieldShellMultiline,
        { backgroundColor: palette.surface, borderColor: focused ? palette.accent : palette.border },
      ]}>
        <Ionicons name={icon} size={19} color={focused ? palette.accent : palette.muted} style={multiline && styles.multilineIcon} />
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          multiline={multiline}
          placeholderTextColor={palette.muted}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.fieldInput, multiline && styles.fieldInputMultiline, { color: palette.text }, props.style]}
        />
      </View>
    </View>
  );
}

export default function AddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromCheckout?: string }>();
  const fromCheckout = params.fromCheckout === 'true';
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette = useMemo<AddressPalette>(() => ({
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

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAddresses = useCallback(async ({ showSpinner = false, forceRefresh = false }: { showSpinner?: boolean; forceRefresh?: boolean } = {}) => {
    if (showSpinner) setIsLoading(true);
    try {
      setLoadError(null);
      const [response, storedDefaultId, storedSelectedId] = await Promise.all([
        fetchAddresses(forceRefresh),
        AsyncStorage.getItem('default_address_id'),
        AsyncStorage.getItem('selected_address_id'),
      ]);
      const defaultId = storedDefaultId ? Number(storedDefaultId) : null;
      const selectedId = storedSelectedId ? Number(storedSelectedId) : null;
      const addressList = (response?.data || []) as Address[];
      setDefaultAddressId(defaultId);
      setSelectedAddressId(selectedId);
      setAddresses(addressList.map(address => ({ ...address, isDefault: address.id === defaultId })));
    } catch (error) {
      console.error('Failed to load addresses:', error);
      setLoadError(errorMessage(error, 'Failed to load addresses'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses({ showSpinner: true });
  }, [loadAddresses]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAddresses({ forceRefresh: true });
  }, [loadAddresses]);

  const openAddForm = () => {
    setFormData(EMPTY_FORM);
    setEditingAddress(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    setFormData({
      full_name: address.full_name || '',
      country_code: address.country_code || '+95',
      phone: address.phone || '',
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      country: address.country || '',
      zip_code: address.zip_code || '',
      label: address.label || '',
    });
    setEditingAddress(address);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setShowForm(false);
    setEditingAddress(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const updateForm = (field: keyof AddressForm, value: string) => {
    setFormError(null);
    setFormData(current => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    const requiredFields: [keyof AddressForm, string][] = [
      ['full_name', 'Enter the receiver’s name'],
      ['phone', 'Enter a phone number'],
      ['address', 'Enter a street address'],
      ['city', 'Enter a city'],
      ['state', 'Enter a state or region'],
      ['zip_code', 'Enter a postal code'],
      ['country', 'Enter a country'],
    ];
    return requiredFields.find(([field]) => !formData[field].trim())?.[1] ?? null;
  };

  const handleSubmitAddress = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
        setNotice('Address updated');
      } else {
        await createAddress(formData);
        setNotice('New address added');
      }
      setShowForm(false);
      setEditingAddress(null);
      setFormData(EMPTY_FORM);
      await loadAddresses();
    } catch (error) {
      console.error('Failed to save address:', error);
      setFormError(errorMessage(error, 'Failed to save address'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAddress = async (address: Address) => {
    if (!fromCheckout) return;
    try {
      setSelectedAddressId(address.id);
      await AsyncStorage.setItem('selected_address_id', String(address.id));
      router.back();
    } catch (error) {
      Alert.alert('Couldn’t select address', errorMessage(error, 'Please try again.'));
    }
  };

  const handleDeleteAddress = (address: Address) => {
    Alert.alert('Delete address?', `The address for ${address.full_name} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(address.id);
          try {
            await deleteAddress(address.id);
            if (address.id === defaultAddressId) await AsyncStorage.removeItem('default_address_id');
            if (address.id === selectedAddressId) await AsyncStorage.removeItem('selected_address_id');
            setNotice('Address deleted');
            await loadAddresses();
          } catch (error) {
            Alert.alert('Couldn’t delete address', errorMessage(error, 'Please try again.'));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (address: Address) => {
    setSettingDefaultId(address.id);
    try {
      await AsyncStorage.setItem('default_address_id', String(address.id));
      setDefaultAddressId(address.id);
      setAddresses(current => current.map(item => ({ ...item, isDefault: item.id === address.id })));
      setNotice(`${address.full_name} is now your default`);
    } catch (error) {
      Alert.alert('Couldn’t update default', errorMessage(error, 'Please try again.'));
    } finally {
      setSettingDefaultId(null);
    }
  };

  const refreshControl = (
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={palette.accent} colors={[palette.accent]} />
  );

  const header = (title: string, onBack: () => void, backLabel: string) => (
    <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
      <IconButton label={backLabel} onPress={onBack} disabled={isSaving} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </IconButton>
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      <View style={styles.headerButton} />
    </View>
  );

  if (showForm) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {header(editingAddress ? 'Edit Address' : 'New Address', closeForm, 'Cancel address editing')}
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formIntro}>
              <View style={[styles.formIntroIcon, { backgroundColor: palette.accentSoft }]}>
                <Ionicons name={editingAddress ? 'create-outline' : 'location-outline'} size={25} color={palette.accent} />
              </View>
              <View style={styles.formIntroCopy}>
                <ThemedText style={styles.formTitle}>{editingAddress ? 'Update delivery details' : 'Where should we deliver?'}</ThemedText>
                <ThemedText style={[styles.formDescription, { color: palette.muted }]}>Required fields are marked with an asterisk.</ThemedText>
              </View>
            </View>

            {formError && (
              <View accessibilityRole="alert" style={[styles.feedbackBanner, { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
                <Ionicons name="alert-circle-outline" size={19} color={palette.danger} />
                <ThemedText style={[styles.feedbackText, { color: palette.danger }]}>{formError}</ThemedText>
              </View>
            )}

            <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons name="person-outline" size={18} color={palette.accent} />
                </View>
                <View>
                  <ThemedText style={styles.sectionTitle}>Contact details</ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>Who will receive this order?</ThemedText>
                </View>
              </View>

              <AddressField label="Receiver’s name" icon="person-outline" required palette={palette}
                value={formData.full_name} onChangeText={value => updateForm('full_name', value)}
                placeholder="Full name" autoCapitalize="words" autoComplete="name" textContentType="name" />

              <View style={styles.phoneRow}>
                <View style={[styles.codeField, { backgroundColor: palette.elevated, borderColor: palette.border }]}>
                  <ThemedText style={[styles.codeLabel, { color: palette.muted }]}>CODE</ThemedText>
                  <ThemedText style={styles.codeValue}>{formData.country_code}</ThemedText>
                </View>
                <AddressField containerStyle={styles.phoneField} label="Phone number" icon="call-outline" required palette={palette}
                  value={formData.phone} onChangeText={value => updateForm('phone', value.replace(/[^0-9]/g, ''))}
                  placeholder="09 123 456 789" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
                  <Ionicons name="navigate-outline" size={18} color={palette.accent} />
                </View>
                <View>
                  <ThemedText style={styles.sectionTitle}>Delivery address</ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>Add enough detail for a smooth delivery.</ThemedText>
                </View>
              </View>

              <AddressField label="Street address" icon="location-outline" required palette={palette} multiline
                value={formData.address} onChangeText={value => updateForm('address', value)}
                placeholder="Building, street and neighborhood" numberOfLines={3} />
              <AddressField label="City" icon="business-outline" required palette={palette}
                value={formData.city} onChangeText={value => updateForm('city', value)} placeholder="City" autoCapitalize="words" />
              <View style={styles.formRow}>
                <AddressField containerStyle={styles.halfField} label="State / Region" icon="map-outline" required palette={palette}
                  value={formData.state} onChangeText={value => updateForm('state', value)} placeholder="State" autoCapitalize="words" />
                <AddressField containerStyle={styles.halfField} label="Postal code" icon="mail-outline" required palette={palette}
                  value={formData.zip_code} onChangeText={value => updateForm('zip_code', value)} placeholder="Code" keyboardType="numbers-and-punctuation" autoComplete="postal-code" textContentType="postalCode" />
              </View>
              <AddressField label="Country" icon="globe-outline" required palette={palette}
                value={formData.country} onChangeText={value => updateForm('country', value)} placeholder="Country" autoCapitalize="words" autoComplete="country" textContentType="countryName" />
            </View>

            <View style={[styles.formCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <ThemedText style={styles.sectionTitle}>Address label</ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>Optional, but helpful when you have several addresses.</ThemedText>
              <View style={styles.labelOptions}>
                {[
                  { value: 'Home', icon: 'home-outline' as const },
                  { value: 'Work', icon: 'briefcase-outline' as const },
                  { value: 'Other', icon: 'bookmark-outline' as const },
                ].map(option => {
                  const selected = formData.label === option.value;
                  return (
                    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }}
                      onPress={() => updateForm('label', selected ? '' : option.value)}
                      style={({ pressed }) => [styles.labelOption, {
                        backgroundColor: selected ? palette.accentSoft : palette.elevated,
                        borderColor: selected ? palette.accent : palette.border,
                      }, pressed && styles.pressed]}>
                      <Ionicons name={option.icon} size={18} color={selected ? palette.accent : palette.muted} />
                      <ThemedText style={[styles.labelOptionText, { color: selected ? palette.accent : palette.text }]}>{option.value}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSaving, busy: isSaving }} disabled={isSaving}
              onPress={handleSubmitAddress} style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.accent }, pressed && !isSaving && styles.pressed]}>
              {isSaving ? <ActivityIndicator size="small" color={palette.onAccent} /> : <Ionicons name="checkmark-circle-outline" size={20} color={palette.onAccent} />}
              <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>
                {isSaving ? 'Saving…' : editingAddress ? 'Save changes' : 'Save address'}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {header(fromCheckout ? 'Delivery Address' : 'My Addresses', () => router.back(), 'Go back')}

      {isLoading ? (
        <View style={styles.stateContainer} accessibilityLiveRegion="polite">
          <View style={[styles.loadingIcon, { backgroundColor: palette.accentSoft }]}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
          <ThemedText style={styles.stateTitle}>Loading addresses</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Getting your saved delivery details.</ThemedText>
        </View>
      ) : loadError && addresses.length === 0 ? (
        <View style={styles.stateContainer} accessibilityRole="alert">
          <View style={[styles.stateIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={palette.danger} />
          </View>
          <ThemedText style={styles.stateTitle}>Couldn&apos;t load addresses</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>{loadError}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => loadAddresses({ showSpinner: true })}
            style={({ pressed }) => [styles.primaryButton, styles.retryButton, { backgroundColor: palette.accent }, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={19} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.listIntro}>
            <View style={styles.listIntroCopy}>
              <ThemedText style={styles.listTitle}>{fromCheckout ? 'Where should we deliver?' : 'Saved places'}</ThemedText>
              <ThemedText style={[styles.listSubtitle, { color: palette.muted }]}>
                {fromCheckout ? 'Choose an address to continue checkout.' : 'Manage the addresses you use for delivery.'}
              </ThemedText>
            </View>
            {addresses.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: palette.accentSoft }]}>
                <ThemedText style={[styles.countText, { color: palette.accent }]}>{addresses.length}</ThemedText>
              </View>
            )}
          </View>

          {notice && (
            <Pressable accessibilityRole="button" accessibilityLabel={`${notice}. Dismiss`} accessibilityLiveRegion="polite"
              onPress={() => setNotice(null)} style={[styles.noticeBanner, { backgroundColor: palette.successSoft, borderColor: palette.success }]}>
              <Ionicons name="checkmark-circle" size={19} color={palette.success} />
              <ThemedText style={[styles.noticeText, { color: palette.success }]}>{notice}</ThemedText>
              <Ionicons name="close" size={17} color={palette.success} />
            </Pressable>
          )}

          {loadError && addresses.length > 0 && (
            <View accessibilityRole="alert" style={[styles.noticeBanner, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="cloud-offline-outline" size={19} color={palette.muted} />
              <ThemedText style={[styles.noticeText, { color: palette.muted }]}>Showing saved addresses. Pull down to refresh.</ThemedText>
            </View>
          )}

          <Pressable accessibilityRole="button" onPress={openAddForm}
            style={({ pressed }) => [styles.addButton, { backgroundColor: palette.accent, shadowColor: dark ? '#000000' : palette.accent }, pressed && styles.pressed]}>
            <View style={[styles.addButtonIcon, { backgroundColor: palette.onAccent + '20' }]}>
              <Ionicons name="add" size={22} color={palette.onAccent} />
            </View>
            <View style={styles.addButtonCopy}>
              <Text style={[styles.addButtonTitle, { color: palette.onAccent }]}>Add a new address</Text>
              <Text style={[styles.addButtonSubtitle, { color: palette.onAccent }]}>Save another delivery location</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={palette.onAccent} />
          </Pressable>

          {addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyArtwork, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
                <Ionicons name="location-outline" size={50} color={palette.accent} />
              </View>
              <ThemedText style={styles.stateTitle}>No saved addresses</ThemedText>
              <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Add your first delivery address to make checkout faster.</ThemedText>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map(address => {
                const selected = fromCheckout && address.id === selectedAddressId;
                const busy = deletingId === address.id || settingDefaultId === address.id;
                const addressLabel = address.label?.trim() || 'Address';
                return (
                  <Pressable key={address.id} accessibilityRole={fromCheckout ? 'button' : undefined}
                    accessibilityLabel={`${addressLabel} for ${address.full_name}${address.isDefault ? ', default address' : ''}${selected ? ', selected' : ''}`}
                    accessibilityHint={fromCheckout ? 'Selects this delivery address' : 'Address management options are inside this card'}
                    accessibilityState={{ selected, disabled: busy }} disabled={busy}
                    onPress={fromCheckout ? () => handleSelectAddress(address) : undefined}
                    style={({ pressed }) => [styles.addressCard, {
                      backgroundColor: palette.surface,
                      borderColor: selected ? palette.accent : palette.border,
                    }, selected && { backgroundColor: palette.accentSoft }, pressed && fromCheckout && styles.pressed]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.placeIcon, { backgroundColor: address.isDefault ? palette.successSoft : palette.accentSoft }]}>
                        <Ionicons name={address.label === 'Work' ? 'briefcase-outline' : address.label === 'Home' ? 'home-outline' : 'location-outline'}
                          size={21} color={address.isDefault ? palette.success : palette.accent} />
                      </View>
                      <View style={styles.cardIdentity}>
                        <View style={styles.cardTitleRow}>
                          <ThemedText numberOfLines={1} style={styles.addressLabel}>{addressLabel}</ThemedText>
                          {address.isDefault && (
                            <View style={[styles.defaultBadge, { backgroundColor: palette.successSoft }]}>
                              <Ionicons name="checkmark-circle" size={13} color={palette.success} />
                              <ThemedText style={[styles.defaultText, { color: palette.success }]}>Default</ThemedText>
                            </View>
                          )}
                          {selected && (
                            <View style={[styles.defaultBadge, { backgroundColor: palette.surface }]}>
                              <Ionicons name="radio-button-on" size={13} color={palette.accent} />
                              <ThemedText style={[styles.defaultText, { color: palette.accent }]}>Selected</ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText numberOfLines={1} style={[styles.receiverName, { color: palette.muted }]}>{address.full_name}</ThemedText>
                      </View>
                      {busy && <ActivityIndicator size="small" color={palette.accent} />}
                      {fromCheckout && !busy && <Ionicons name="chevron-forward" size={20} color={palette.muted} />}
                    </View>

                    <View style={[styles.addressDetails, { backgroundColor: palette.elevated }]}>
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={17} color={palette.muted} />
                        <ThemedText style={[styles.detailText, { color: palette.muted }]}>{address.country_code} {address.phone}</ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="navigate-outline" size={17} color={palette.muted} />
                        <ThemedText style={[styles.detailText, { color: palette.muted }]}>
                          {[address.address, address.city, address.state, address.zip_code, address.country].filter(Boolean).join(', ')}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={[styles.cardActions, { borderTopColor: palette.border }]}>
                      {!address.isDefault && (
                        <Pressable accessibilityRole="button" accessibilityLabel={`Set ${addressLabel} as default`}
                          onPress={(event) => { event.stopPropagation(); handleSetDefault(address); }}
                          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                          <Ionicons name="star-outline" size={17} color={palette.accent} />
                          <ThemedText style={[styles.actionText, { color: palette.accent }]}>Set default</ThemedText>
                        </Pressable>
                      )}
                      <View style={styles.actionSpacer} />
                      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${addressLabel}`}
                        onPress={(event) => { event.stopPropagation(); openEditForm(address); }}
                        style={({ pressed }) => [styles.iconAction, { backgroundColor: palette.accentSoft }, pressed && styles.pressed]}>
                        <Ionicons name="create-outline" size={18} color={palette.accent} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${addressLabel}`}
                        onPress={(event) => { event.stopPropagation(); handleDeleteAddress(address); }}
                        style={({ pressed }) => [styles.iconAction, { backgroundColor: palette.dangerSoft }, pressed && styles.pressed]}>
                        <Ionicons name="trash-outline" size={18} color={palette.danger} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44 },
  headerTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  pressed: { opacity: 0.76 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  stateDescription: { maxWidth: 340, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 7 },
  primaryButton: { minHeight: 52, borderRadius: 15, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  retryButton: { marginTop: 22 },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  formScrollContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 36 },
  formIntro: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18, paddingHorizontal: 2 },
  formIntroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  formIntroCopy: { minWidth: 0, flex: 1 },
  formTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700' },
  formDescription: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  feedbackBanner: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  formCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 1 },
  fieldGroup: { minWidth: 0, marginBottom: 15 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 7 },
  fieldShell: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldShellMultiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: 13 },
  multilineIcon: { marginTop: 2 },
  fieldInput: { minWidth: 0, flex: 1, minHeight: 50, paddingVertical: 11, paddingHorizontal: 0, fontSize: 16, lineHeight: 22 },
  fieldInputMultiline: { minHeight: 70, paddingVertical: 0, textAlignVertical: 'top' },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  codeField: { width: 76, height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, justifyContent: 'center', marginBottom: 15 },
  codeLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8 },
  codeValue: { fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 1 },
  phoneField: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  labelOptions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  labelOption: { minHeight: 46, flex: 1, borderWidth: 1, borderRadius: 13, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  labelOptionText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  listContent: { width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 30 },
  listIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, paddingHorizontal: 2 },
  listIntroCopy: { minWidth: 0, flex: 1 },
  listTitle: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  listSubtitle: { fontSize: 14, lineHeight: 21, marginTop: 2 },
  countBadge: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  noticeBanner: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  addButton: { minHeight: 74, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3 },
  addButtonIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addButtonCopy: { minWidth: 0, flex: 1 },
  addButtonTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  addButtonSubtitle: { fontSize: 12, lineHeight: 18, opacity: 0.82, marginTop: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 22 },
  emptyArtwork: { width: 112, height: 112, borderRadius: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22, transform: [{ rotate: '-3deg' }] },
  addressList: { gap: 14 },
  addressCard: { borderWidth: 1, borderRadius: 20, padding: 15, shadowColor: '#07151b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11 },
  placeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardIdentity: { minWidth: 0, flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  addressLabel: { minWidth: 0, maxWidth: '52%', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  receiverName: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  defaultBadge: { minHeight: 24, borderRadius: 12, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  defaultText: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
  addressDetails: { borderRadius: 14, marginTop: 14, padding: 12, gap: 9 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 20 },
  cardActions: { minHeight: 49, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actionSpacer: { flex: 1 },
  iconAction: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
