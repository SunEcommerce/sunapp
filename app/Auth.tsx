import {
  login,
  register,
  requestPasswordResetOTP,
  resetPassword,
  verifyPasswordResetOTP
} from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register states
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Forgot password states
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotCountryCode, setForgotCountryCode] = useState('+95');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      const data = await login(loginEmail, loginPassword);
      if (data?.user) {
        await AsyncStorage.setItem('access_token', data.token);
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
      }
      
      Alert.alert('Success', 'Login successful!');
      router.push('/');
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPhone || !registerPassword || !registerConfirmPassword || !registerOtp) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await register(
        registerName,
        registerEmail,
        registerPhone,
        registerPassword,
        registerConfirmPassword,
        registerOtp
      );
      
      Alert.alert('Success', 'Registration successful! Please login.');
      setMode('login');
    } catch (err: any) {
      Alert.alert('Registration failed', err?.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOTP = async () => {
    if (forgotMethod === 'email' && !forgotEmail) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (forgotMethod === 'phone' && !forgotPhone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    try {
      setLoading(true);
      await requestPasswordResetOTP(
        forgotMethod,
        forgotEmail,
        forgotPhone,
        forgotCountryCode
      );
      Alert.alert('Success', 'OTP has been sent. Please check your ' + (forgotMethod === 'email' ? 'email' : 'phone') + '.');
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('Request failed', err?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!forgotOtp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }
    try {
      setLoading(true);
      await verifyPasswordResetOTP(
        forgotMethod,
        forgotOtp,
        forgotEmail,
        forgotPhone,
        forgotCountryCode
      );
      Alert.alert('Success', 'OTP verified! Please enter your new password.');
      setForgotStep(3);
    } catch (err: any) {
      Alert.alert('Verification failed', err?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!forgotPassword || !forgotConfirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await resetPassword(
        forgotMethod,
        forgotOtp,
        forgotPassword,
        forgotConfirmPassword,
        forgotEmail,
        forgotPhone,
        forgotCountryCode
      );
      Alert.alert('Success', 'Password reset successful! Please login.');
      setMode('login');
      // Reset forgot password states
      setForgotStep(1);
      setForgotEmail('');
      setForgotPhone('');
      setForgotOtp('');
      setForgotPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Reset failed', err?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="storefront" size={48} color="#2196F3" />
          </View>
          <Text style={styles.appName}>SunApp</Text>
          <Text style={styles.appTagline}>Your Shopping Destination</Text>
        </View>

        {/* Tab Switcher */}
        {mode !== 'forgot' && (
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, mode === 'login' && styles.tabActive]} 
            onPress={() => setMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, mode === 'register' && styles.tabActive]} 
            onPress={() => setMode('register')}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
                  <Ionicons 
                    name={showLoginPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => setMode('forgot')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={registerName}
                  onChangeText={setRegisterName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={registerPhone}
                  onChangeText={setRegisterPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry={!showRegisterPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowRegisterPassword(!showRegisterPassword)}>
                  <Ionicons 
                    name={showRegisterPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                  value={registerConfirmPassword}
                  onChangeText={setRegisterConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter the OTP"
                  placeholderTextColor="#999"
                  value={registerOtp}
                  onChangeText={setRegisterOtp}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Register</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <View style={styles.formContainer}>
            <Text style={styles.forgotTitle}>Reset Password</Text>
            <Text style={styles.forgotSubtitle}>
              {forgotStep === 1 && 'Enter your email or phone to receive an OTP.'}
              {forgotStep === 2 && 'Enter the OTP sent to your ' + (forgotMethod === 'email' ? 'email' : 'phone') + '.'}
              {forgotStep === 3 && 'Enter your new password to complete the reset.'}
            </Text>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, forgotStep >= 1 && styles.stepDotActive]}>
                <Text style={[styles.stepText, forgotStep >= 1 && styles.stepTextActive]}>1</Text>
              </View>
              <View style={[styles.stepLine, forgotStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, forgotStep >= 2 && styles.stepDotActive]}>
                <Text style={[styles.stepText, forgotStep >= 2 && styles.stepTextActive]}>2</Text>
              </View>
              <View style={[styles.stepLine, forgotStep >= 3 && styles.stepLineActive]} />
              <View style={[styles.stepDot, forgotStep >= 3 && styles.stepDotActive]}>
                <Text style={[styles.stepText, forgotStep >= 3 && styles.stepTextActive]}>3</Text>
              </View>
            </View>

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <>
                {/* Method Selector */}
                <View style={styles.methodSelector}>
                  <TouchableOpacity 
                    style={[styles.methodButton, forgotMethod === 'email' && styles.methodButtonActive]}
                    onPress={() => setForgotMethod('email')}
                  >
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color={forgotMethod === 'email' ? '#2196F3' : '#999'} 
                    />
                    <Text style={[styles.methodButtonText, forgotMethod === 'email' && styles.methodButtonTextActive]}>Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.methodButton, forgotMethod === 'phone' && styles.methodButtonActive]}
                    onPress={() => setForgotMethod('phone')}
                  >
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={forgotMethod === 'phone' ? '#2196F3' : '#999'} 
                    />
                    <Text style={[styles.methodButtonText, forgotMethod === 'phone' && styles.methodButtonTextActive]}>Phone</Text>
                  </TouchableOpacity>
                </View>

                {forgotMethod === 'email' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="#999"
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.phoneInputContainer}>
                      <View style={styles.countryCodeWrapper}>
                        <Text style={styles.countryCodeText}>{forgotCountryCode}</Text>
                      </View>
                      <View style={[styles.inputWrapper, styles.phoneInput]}>
                        <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your phone number"
                          placeholderTextColor="#999"
                          value={forgotPhone}
                          onChangeText={setForgotPhone}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
                  onPress={handleRequestOTP} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step 2: Verify OTP */}
            {forgotStep === 2 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OTP Code</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter the OTP"
                      placeholderTextColor="#999"
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      maxLength={6}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
                  onPress={handleVerifyOTP} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRequestOTP} style={styles.resendButton}>
                  <Text style={styles.resendButtonText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: Reset Password */}
            {forgotStep === 3 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor="#999"
                      value={forgotPassword}
                      onChangeText={setForgotPassword}
                      secureTextEntry={!showForgotPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowForgotPassword(!showForgotPassword)}>
                      <Ionicons 
                        name={showForgotPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color="#999" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor="#999"
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      secureTextEntry={!showForgotConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}>
                      <Ionicons 
                        name={showForgotConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color="#999" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
                  onPress={handleResetPassword} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              onPress={() => {
                setMode('login');
                setForgotStep(1);
                setForgotEmail('');
                setForgotPhone('');
                setForgotOtp('');
                setForgotPassword('');
                setForgotConfirmPassword('');
              }} 
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Skip/Guest Option */}
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={() => router.push('/')}
        >
          <Text style={styles.skipButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 14,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },
  forgotText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 24,
  },
  forgotTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  forgotSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2196F3',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  stepLineActive: {
    backgroundColor: '#2196F3',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  methodButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  methodButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  methodButtonTextActive: {
    color: '#2196F3',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeWrapper: {
    width: 70,
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
});
