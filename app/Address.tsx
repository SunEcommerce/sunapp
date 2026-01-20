import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
};

export default function AddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromCheckout = params.fromCheckout === 'true';
  const themeContext = React.useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];

  // State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    country_code: '+95',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zip_code: '',
  });

  // Load addresses on mount
  useEffect(() => {
    loadDefaultAddressId();
    loadAddresses();
  }, []);

  const loadDefaultAddressId = async () => {
    try {
      const storedId = await AsyncStorage.getItem('default_address_id');
      if (storedId) {
        setDefaultAddressId(parseInt(storedId));
      }
    } catch (error) {
      console.error('Failed to load default address ID:', error);
    }
  };

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await fetchAddresses();
      const addressList = response?.data || [];
      
      // Mark default address based on storage
      const defaultId = defaultAddressId || (await AsyncStorage.getItem('default_address_id'));
      const markedAddresses = addressList.map((addr: Address) => ({
        ...addr,
        isDefault: defaultId ? addr.id === parseInt(defaultId) : false,
      }));
      
      setAddresses(markedAddresses);
    } catch (error: any) {
      console.error('Failed to load addresses:', error);
      Alert.alert('Error', error.message || 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAddresses();
    setIsRefreshing(false);
  };

  const handleAddAddress = () => {
    setFormData({
      full_name: '',
      country_code: '+95',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
    });
    setEditingAddress(null);
    setShowAddForm(true);
  };

  const handleSubmitAddress = async () => {
    // Validation
    if (!formData.full_name.trim()) {
      Alert.alert('Error', 'Please enter the receiver\'s name');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter the phone number');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter the address');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter the city');
      return;
    }
    if (!formData.state.trim()) {
      Alert.alert('Error', 'Please enter the state');
      return;
    }
    if (!formData.country.trim()) {
      Alert.alert('Error', 'Please enter the country');
      return;
    }
    if (!formData.zip_code.trim()) {
      Alert.alert('Error', 'Please enter the zip code');
      return;
    }

    try {
      if (editingAddress) {
        // Update existing address
        await updateAddress(editingAddress.id, formData);
        Alert.alert('Success', 'Address updated successfully');
      } else {
        // Create new address
        await createAddress(formData);
        Alert.alert('Success', 'Address added successfully');
      }
      
      setShowAddForm(false);
      setEditingAddress(null);
      await loadAddresses();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      Alert.alert('Error', error.message || 'Failed to save address');
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    setFormData({
      full_name: '',
      country_code: '+95',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
    });
  };

  const handleSelectAddress = async (address: Address) => {
    if (fromCheckout) {
      // Save selected address to storage
      await AsyncStorage.setItem('selected_address_id', address.id.toString());
      // Return to Checkout
      router.back();
    }
  };

  const handleEditAddress = (address: Address) => {
    setFormData({
      full_name: address.full_name || '',
      country_code: address.country_code || '+95',
      phone: address.phone || '',
      address: address.address,
      city: address.city,
      state: address.state,
      country: address.country,
      zip_code: address.zip_code,
    });
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleDeleteAddress = (id: number, fullName: string) => {
    Alert.alert(
      'Delete Address',
      `Delete address for ${fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(id);
              Alert.alert('Success', 'Address deleted successfully');
              await loadAddresses();
            } catch (error: any) {
              console.error('Failed to delete address:', error);
              Alert.alert('Error', error.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address: Address) => {
    try {
      // Store default address ID in AsyncStorage
      await AsyncStorage.setItem('default_address_id', address.id.toString());
      setDefaultAddressId(address.id);
      
      // Update local state to mark as default
      setAddresses(
        addresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === address.id,
        }))
      );
      Alert.alert('Success', 'Default address updated');
    } catch (error: any) {
      console.error('Failed to set default address:', error);
      Alert.alert('Error', error.message || 'Failed to set default address');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <ThemedView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Addresses</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <ThemedText style={styles.loadingText}>Loading addresses...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Address form modal
  if (showAddForm) {
    return (
      <ThemedView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity onPress={handleCancelForm} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <ThemedText style={styles.formLabel}>Receiver's Name *</ThemedText>
            <TextInput
              style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
              placeholder="Full name of the person receiving"
              placeholderTextColor="#999"
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formSection, { width: 100 }]}>
              <ThemedText style={styles.formLabel}>Code</ThemedText>
              <TextInput
                style={[styles.formInput, styles.formInputDisabled, { backgroundColor: themeColors.background, borderColor: themeColors.borderColor, color: themeColors.text }]}
                value={formData.country_code}
                editable={false}
              />
            </View>

            <View style={[styles.formSection, { flex: 1 }]}>
              <ThemedText style={styles.formLabel}>Phone Number *</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
                placeholder="Phone number"
                placeholderTextColor="#999"
                value={formData.phone}
                onChangeText={(text) => {
                  // Only allow digits and may start with zero
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, phone: cleaned });
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <ThemedText style={styles.formLabel}>Address *</ThemedText>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
              placeholder="Street address"
              placeholderTextColor="#999"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formSection}>
            <ThemedText style={styles.formLabel}>City *</ThemedText>
            <TextInput
              style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
              placeholder="City name"
              placeholderTextColor="#999"
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formSection, styles.formSectionHalf]}>
              <ThemedText style={styles.formLabel}>State *</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
                placeholder="State"
                placeholderTextColor="#999"
                value={formData.state}
                onChangeText={(text) => setFormData({ ...formData, state: text })}
              />
            </View>

            <View style={[styles.formSection, styles.formSectionHalf]}>
              <ThemedText style={styles.formLabel}>Zip Code *</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
                placeholder="Zip code"
                placeholderTextColor="#999"
                value={formData.zip_code}
                onChangeText={(text) => setFormData({ ...formData, zip_code: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <ThemedText style={styles.formLabel}>Country *</ThemedText>
            <TextInput
              style={[styles.formInput, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor, color: themeColors.text }]}
              placeholder="Country"
              placeholderTextColor="#999"
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAddress}>
            <ThemedText style={styles.submitButtonText}>
              {editingAddress ? 'Update Address' : 'Add Address'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.safeArea}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Addresses</ThemedText>
        <View style={styles.headerRight} />
      </View>
        {/* Add Address Button */}
        <TouchableOpacity
          style={[styles.addAddressButton, { backgroundColor: themeColors.card, borderColor: '#2196F3' }]}
          onPress={handleAddAddress}
        >
          <View style={styles.addAddressContent}>
            <Ionicons name="add-circle-outline" size={32} color="#2196F3" />
            <ThemedText style={styles.addAddressText}>Add New Address</ThemedText>
          </View>
        </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >

        {/* Address List */}
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <ThemedText style={styles.emptyText}>No addresses yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Add your first address to get started</ThemedText>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[styles.addressCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }]}
                onPress={() => handleSelectAddress(address)}
                activeOpacity={fromCheckout ? 0.7 : 1}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressHeaderLeft}>
                    <ThemedText style={styles.addressName}>{address.full_name}</ThemedText>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <ThemedText style={styles.defaultText}>Default</ThemedText>
                      </View>
                    )}
                  </View>
                  {!address.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(address)}
                      style={styles.setDefaultButton}
                    >
                      <ThemedText style={styles.setDefaultText}>Set Default</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.addressBody, { borderBottomColor: themeColors.borderColor }]}>
                  <View style={styles.addressInfoRow}>
                    <Ionicons name="call-outline" size={16} color={themeColors.icon} />
                    <ThemedText style={styles.addressText}>
                      {address.country_code} {address.phone}
                    </ThemedText>
                  </View>
                  <View style={styles.addressInfoRow}>
                    <Ionicons name="location-outline" size={16} color={themeColors.icon} />
                    <ThemedText style={styles.addressText}>
                      {address.address}
                    </ThemedText>
                  </View>
                  <View style={styles.addressInfoRow}>
                    <Ionicons name="business-outline" size={16} color={themeColors.icon} />
                    <ThemedText style={styles.addressText}>
                      {address.city}, {address.state} {address.zip_code}
                    </ThemedText>
                  </View>
                  <View style={styles.addressInfoRow}>
                    <Ionicons name="globe-outline" size={16} color={themeColors.icon} />
                    <ThemedText style={styles.addressText}>{address.country}</ThemedText>
                  </View>
                </View>

                <View style={styles.addressActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditAddress(address)}
                  >
                    <Ionicons name="create-outline" size={18} color="#2196F3" />
                    <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteAddress(address.id, address.full_name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <ThemedText style={[styles.actionButtonText, styles.deleteText]}>
                      Delete
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Form styles
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formInputDisabled: {
    opacity: 0.6,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
  // Add Address Button
  addAddressButton: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addAddressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  // Address List
  addressList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  addressCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '700',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  addressBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  addressInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  deleteText: {
    color: '#FF3B30',
  },
});
