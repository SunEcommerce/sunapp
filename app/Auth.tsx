import { TextInput } from '@/components/ui/text-input';
import { IconButton } from '@/components/ui/icon-button';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import {
  login,
  register,
  requestPasswordResetOTP,
  resetPassword,
  verifyPasswordResetOTP
} from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { ComponentProps, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInputProps,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthMode = 'login' | 'register' | 'forgot';
type AuthPalette = { background: string; surface: string; text: string; muted: string; accent: string; soft: string; border: string; onAccent: string; error: string; success: string };

function AuthField({ label, icon, palette, password, visible, onToggle, ...props }: TextInputProps & {
  label: string; icon: ComponentProps<typeof Ionicons>['name']; palette: AuthPalette;
  password?: boolean; visible?: boolean; onToggle?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const styles = createStyles(palette);
  return <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, focused && { borderColor: palette.accent, backgroundColor: palette.surface }]}>
      <Ionicons name={icon} size={18} color={focused ? palette.accent : palette.muted} />
      <TextInput {...props} accessibilityLabel={label} style={styles.input} placeholderTextColor={palette.muted}
        autoCorrect={false} secureTextEntry={!!password && !visible}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }} />
      {password && <IconButton label={visible ? 'Hide password' : 'Show password'} onPress={onToggle}>
        <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={19} color={palette.muted} />
      </IconButton>}
    </View>
  </View>;
}

export default function AuthScreen() {
  const { colorScheme = 'light' } = useContext(ThemeContext) ?? {};
  const theme = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette: AuthPalette = {
    background: theme.background, surface: dark ? '#1b252c' : '#ffffff', text: theme.text,
    muted: theme.textSecondary, accent: dark ? '#8bd8ed' : '#086b83', soft: dark ? '#253b46' : '#eaf4f8',
    border: dark ? '#3a4b56' : '#dce4ea', onAccent: dark ? '#10232b' : '#ffffff',
    error: dark ? '#ffb4b4' : '#b12c3c', success: dark ? '#8ce0ba' : '#087443',
  };
  const styles = createStyles(palette);
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(initialMode === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const showFeedback = (title: string, message: string) => {
    setFeedback({ kind: title === 'Success' ? 'success' : 'error', message });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const switchMode = (next: AuthMode) => {
    setFeedback(null); setMode(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  
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
  const [forgotCountryCode] = useState('+95');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      showFeedback('Error', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      const data = await login(loginEmail, loginPassword);
      if (data?.user) {
        await AsyncStorage.setItem('user_profile', JSON.stringify(data.user));
      }
      
      showFeedback('Success', 'Login successful!');
      router.push('/');
    } catch (err: any) {
      showFeedback('Login failed', err?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPhone || !registerPassword || !registerConfirmPassword || !registerOtp) {
      showFeedback('Error', 'Please fill in all fields');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      showFeedback('Error', 'Passwords do not match');
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
      
      showFeedback('Success', 'Registration successful! Please login.');
      setMode('login');
    } catch (err: any) {
      showFeedback('Registration failed', err?.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOTP = async () => {
    if (forgotMethod === 'email' && !forgotEmail) {
      showFeedback('Error', 'Please enter your email');
      return;
    }
    if (forgotMethod === 'phone' && !forgotPhone) {
      showFeedback('Error', 'Please enter your phone number');
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
      showFeedback('Success', 'OTP has been sent. Please check your ' + (forgotMethod === 'email' ? 'email' : 'phone') + '.');
      setForgotStep(2);
    } catch (err: any) {
      showFeedback('Request failed', err?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!forgotOtp) {
      showFeedback('Error', 'Please enter the OTP');
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
      showFeedback('Success', 'OTP verified! Please enter your new password.');
      setForgotStep(3);
    } catch (err: any) {
      showFeedback('Verification failed', err?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!forgotPassword || !forgotConfirmPassword) {
      showFeedback('Error', 'Please fill in all password fields');
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      showFeedback('Error', 'Passwords do not match');
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
      showFeedback('Success', 'Password reset successful! Please login.');
      setMode('login');
      // Reset forgot password states
      setForgotStep(1);
      setForgotEmail('');
      setForgotPhone('');
      setForgotOtp('');
      setForgotPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      showFeedback('Reset failed', err?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset your password';
  const subtitle = mode === 'login' ? 'Sign in to pick up where you left off.' : mode === 'register' ? 'A few details to make this space yours.' : 'Let’s get you back to your account.';
  const fieldProps = { palette, editable: !loading };
  const submit = (label: string, action: () => Promise<void>) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: loading, busy: loading }}
      style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={() => { setFeedback(null); void action(); }} disabled={loading}>
      {loading ? <ActivityIndicator color={palette.onAccent} /> : <><Text style={styles.primaryButtonText}>{label}</Text><Ionicons name="arrow-forward" size={19} color={palette.onAccent} /></>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.brandRow}>
            <IconButton label="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </IconButton>
            <View style={styles.brandCopy}><Text style={styles.appName}>Sun Mobile</Text><Text style={styles.appTagline}>Your everyday finds</Text></View>
            <View style={styles.brandMark}><Ionicons name="storefront-outline" size={23} color={palette.accent} /></View>
          </View>

          <View style={styles.headingBlock}><Text accessibilityRole="header" style={styles.heading}>{heading}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>

          {mode !== 'forgot' && <View style={styles.tabContainer} accessibilityRole="tablist">
            {(['login', 'register'] as const).map(tab => <TouchableOpacity key={tab} accessibilityRole="tab" aria-selected={mode === tab} accessibilityState={{ selected: mode === tab, disabled: loading }}
              disabled={loading} style={[styles.tab, mode === tab && styles.tabActive]} onPress={() => switchMode(tab)}>
              <Text style={[styles.tabText, mode === tab && styles.tabTextActive]}>{tab === 'login' ? 'Sign in' : 'Create account'}</Text>
            </TouchableOpacity>)}
          </View>}

          {feedback && <View accessibilityRole={feedback.kind === 'error' ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={[styles.feedback, { borderColor: feedback.kind === 'error' ? palette.error : palette.success }]}>
            <Ionicons name={feedback.kind === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={19} color={feedback.kind === 'error' ? palette.error : palette.success} />
            <Text style={[styles.feedbackText, { color: feedback.kind === 'error' ? palette.error : palette.success }]}>{feedback.message}</Text>
          </View>}

          {mode === 'login' && <View style={styles.formContainer}>
            <AuthField {...fieldProps} label="Email" icon="mail-outline" placeholder="you@example.com" value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <AuthField {...fieldProps} label="Password" icon="lock-closed-outline" placeholder="Enter your password" value={loginPassword} onChangeText={setLoginPassword} autoCapitalize="none" autoComplete="current-password" textContentType="password" password visible={showLoginPassword} onToggle={() => setShowLoginPassword(!showLoginPassword)} returnKeyType="go" onSubmitEditing={() => { if (!loading) { setFeedback(null); void handleLogin(); } }} />
            <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => switchMode('forgot')} style={styles.forgotButton}><Text style={styles.linkText}>Forgot password?</Text></TouchableOpacity>
            {submit('Sign in', handleLogin)}
          </View>}

          {mode === 'register' && <View style={styles.formContainer}>
            <AuthField {...fieldProps} label="Full name" icon="person-outline" placeholder="Your name" value={registerName} onChangeText={setRegisterName} autoComplete="name" textContentType="name" autoCapitalize="words" />
            <AuthField {...fieldProps} label="Email" icon="mail-outline" placeholder="you@example.com" value={registerEmail} onChangeText={setRegisterEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <AuthField {...fieldProps} label="Phone number" icon="call-outline" placeholder="Enter your phone number" value={registerPhone} onChangeText={setRegisterPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            <AuthField {...fieldProps} label="Password" icon="lock-closed-outline" placeholder="Create a password" value={registerPassword} onChangeText={setRegisterPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" password visible={showRegisterPassword} onToggle={() => setShowRegisterPassword(!showRegisterPassword)} />
            <AuthField {...fieldProps} label="Confirm password" icon="lock-closed-outline" placeholder="Re-enter your password" value={registerConfirmPassword} onChangeText={setRegisterConfirmPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" password visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
            <AuthField {...fieldProps} label="OTP code" icon="key-outline" placeholder="Enter the OTP" value={registerOtp} onChangeText={setRegisterOtp} keyboardType="number-pad" autoCapitalize="none" autoComplete="one-time-code" textContentType="oneTimeCode" />
            {submit('Create account', handleRegister)}
          </View>}

          {mode === 'forgot' && <View style={styles.formContainer}>
            <View style={styles.stepHeader}><Text style={styles.stepCaption}>STEP {forgotStep} OF 3</Text><Text style={styles.stepCaption}>{forgotStep === 1 ? 'Find account' : forgotStep === 2 ? 'Verify code' : 'New password'}</Text></View>
            <View style={styles.stepIndicator}>{[1, 2, 3].map(step => <View key={step} style={[styles.stepTrack, step <= forgotStep && { backgroundColor: palette.accent }]} />)}</View>
            <Text style={styles.forgotSubtitle}>{forgotStep === 1 ? 'Choose where to receive your reset code.' : forgotStep === 2 ? `Enter the OTP sent to your ${forgotMethod === 'email' ? 'email' : 'phone'}.` : 'Choose a new password for your account.'}</Text>
            {forgotStep === 1 && <>
              <View style={styles.methodSelector} accessibilityRole="radiogroup" accessibilityLabel="Reset code delivery method">
                {(['email', 'phone'] as const).map(method => <TouchableOpacity key={method} accessibilityRole="radio" aria-checked={forgotMethod === method} accessibilityState={{ checked: forgotMethod === method, disabled: loading }} disabled={loading}
                  style={[styles.methodButton, forgotMethod === method && styles.methodButtonActive]} onPress={() => { setFeedback(null); setForgotMethod(method); }}>
                  <Ionicons name={method === 'email' ? 'mail-outline' : 'call-outline'} size={18} color={forgotMethod === method ? palette.accent : palette.muted} />
                  <Text style={[styles.methodText, forgotMethod === method && { color: palette.accent }]}>{method === 'email' ? 'Email' : 'Phone'}</Text>
                </TouchableOpacity>)}
              </View>
              {forgotMethod === 'email' ? <AuthField {...fieldProps} label="Email" icon="mail-outline" placeholder="you@example.com" value={forgotEmail} onChangeText={setForgotEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                : <View style={styles.phoneRow}><View style={styles.countryField}><Text style={styles.label}>Code</Text><View style={styles.countryCode}><Text style={styles.countryCodeText}>{forgotCountryCode}</Text></View></View><View style={styles.phoneField}><AuthField {...fieldProps} label="Phone number" icon="call-outline" placeholder="Phone number" value={forgotPhone} onChangeText={setForgotPhone} keyboardType="phone-pad" autoComplete="tel-national" /></View></View>}
              {submit('Send reset code', handleRequestOTP)}
            </>}
            {forgotStep === 2 && <>
              <AuthField {...fieldProps} label="OTP code" icon="key-outline" placeholder="Enter the OTP" value={forgotOtp} onChangeText={setForgotOtp} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" />
              {submit('Verify code', handleVerifyOTP)}
              <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => { setFeedback(null); void handleRequestOTP(); }} style={styles.backButton}><Text style={styles.linkText}>Resend code</Text></TouchableOpacity>
            </>}
            {forgotStep === 3 && <>
              <AuthField {...fieldProps} label="New password" icon="lock-closed-outline" placeholder="Create a new password" value={forgotPassword} onChangeText={setForgotPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" password visible={showForgotPassword} onToggle={() => setShowForgotPassword(!showForgotPassword)} />
              <AuthField {...fieldProps} label="Confirm new password" icon="lock-closed-outline" placeholder="Re-enter your new password" value={forgotConfirmPassword} onChangeText={setForgotConfirmPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" password visible={showForgotConfirmPassword} onToggle={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)} />
              {submit('Save new password', handleResetPassword)}
            </>}
            <TouchableOpacity accessibilityRole="button" disabled={loading} style={styles.backButton} onPress={() => {
              switchMode('login'); setForgotStep(1); setForgotEmail(''); setForgotPhone(''); setForgotOtp(''); setForgotPassword(''); setForgotConfirmPassword('');
            }}><Ionicons name="arrow-back" size={16} color={palette.accent} /><Text style={styles.linkText}>Back to sign in</Text></TouchableOpacity>
          </View>}

          <View style={styles.guestDivider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
          <TouchableOpacity accessibilityRole="button" disabled={loading} style={styles.skipButton} onPress={() => router.push('/')}>
            <Text style={styles.skipText}>Continue as guest</Text><Ionicons name="arrow-forward" size={17} color={palette.accent} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(palette: AuthPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.background },
    scrollContent: { width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -10 },
    brandCopy: { flex: 1 },
    appName: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
    appTagline: { color: palette.muted, fontSize: 11, lineHeight: 17 },
    brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' },
    headingBlock: { marginTop: 30, marginBottom: 22 },
    heading: { color: palette.text, fontSize: 29, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
    subtitle: { color: palette.muted, fontSize: 14, lineHeight: 22, marginTop: 7 },
    tabContainer: { flexDirection: 'row', backgroundColor: palette.soft, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
    tab: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: palette.surface },
    tabText: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: palette.muted },
    tabTextActive: { color: palette.accent },
    formContainer: { padding: 18, borderWidth: 1, borderColor: palette.border, borderRadius: 20, backgroundColor: palette.surface },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: palette.text, marginBottom: 7 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingLeft: 12, paddingRight: 4, backgroundColor: palette.background },
    input: { flex: 1, minWidth: 0, minHeight: 50, paddingVertical: 12, paddingHorizontal: 0, fontSize: 16, lineHeight: 22, color: palette.text, outlineWidth: 0 },
    forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginTop: -9, marginBottom: 9, paddingLeft: 12 },
    linkText: { color: palette.accent, fontSize: 12, lineHeight: 20, fontWeight: '600' },
    primaryButton: { backgroundColor: palette.accent, minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
    primaryButtonDisabled: { opacity: 0.65 },
    primaryButtonText: { color: palette.onAccent, fontSize: 15, lineHeight: 22, fontWeight: '600', flexShrink: 1 },
    feedback: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: palette.surface },
    feedbackText: { flex: 1, fontSize: 13, lineHeight: 20 },
    stepHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    stepCaption: { fontSize: 10, lineHeight: 16, fontWeight: '600', letterSpacing: 1, color: palette.accent },
    stepIndicator: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 16 },
    stepTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: palette.border },
    forgotSubtitle: { color: palette.muted, fontSize: 13, lineHeight: 21, marginBottom: 18 },
    methodSelector: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    methodButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.background, padding: 10 },
    methodButtonActive: { borderColor: palette.accent, backgroundColor: palette.soft },
    methodText: { color: palette.muted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
    phoneRow: { flexDirection: 'row', gap: 8 },
    phoneField: { flex: 1, minWidth: 0 },
    countryField: { width: 62 },
    countryCode: { minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 12, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' },
    countryCodeText: { color: palette.text, fontSize: 14, fontWeight: '600' },
    backButton: { flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    guestDivider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, marginBottom: 6 },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
    dividerText: { color: palette.muted, fontSize: 12, lineHeight: 18 },
    skipButton: { flexDirection: 'row', gap: 10, minHeight: 48, padding: 12, justifyContent: 'center', alignItems: 'center' },
    skipText: { color: palette.accent, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  });
}
