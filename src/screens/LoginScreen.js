import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { loginApi, registerApi, getStoredDisplayName, setStoredDisplayName } from '../services/api';

const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  secondary: '#7C3AED',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  inputBg: '#F1F5F9',
};

export default function LoginScreen() {
  const { login } = useAppContext();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      await loginApi(email, password);
      // 이름: 회원가입 시 저장된 이름 → 없으면 이메일 @ 앞부분 사용
      const name = getStoredDisplayName() || email.split('@')[0];
      login({ email, name });
    } catch (e) {
      Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('입력 오류', '이메일, 비밀번호, 이름을 모두 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setIsLoading(true);
    try {
      await registerApi(email, password, displayName); // 내부에서 이름 자동 저장
      setStoredDisplayName(displayName); // 로그인 화면 전환 후에도 유지
      Alert.alert('회원가입 성공', '로그인해주세요.', [
        { text: '확인', onPress: () => setIsRegisterMode(false) },
      ]);
    } catch (e) {
      Alert.alert('회원가입 실패', '이미 사용 중인 이메일이거나 입력값을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTempLogin = () => {
    Alert.alert('안내', '백엔드가 연결되었습니다. 실제 이메일과 비밀번호로 로그인해주세요.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 로고 & 헤더 */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="mic" size={36} color="#FFFFFF" />
              </View>
              <View style={styles.logoAiBadge}>
                <Text style={styles.logoAiText}>AI</Text>
              </View>
            </View>
            <Text style={styles.appName}>MeetingApp</Text>
            <Text style={styles.tagline}>AI가 회의를 요약해 드릴게요</Text>
          </View>

          {/* 로그인/회원가입 폼 */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isRegisterMode ? '회원가입' : '로그인'}</Text>

            {/* 이름 (회원가입 전용) */}
            {isRegisterMode && (
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>이름</Text>
                <View style={[styles.inputContainer, focusedField === 'name' && styles.inputFocused]}>
                  <Ionicons name="person-outline" size={18} color={COLORS.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="이름 입력 (2자 이상)"
                    placeholderTextColor="#A0AEC0"
                    value={displayName}
                    onChangeText={setDisplayName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            )}

            {/* 이메일 */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>이메일</Text>
              <View style={[styles.inputContainer, focusedField === 'email' && styles.inputFocused]}>
                <Ionicons name="mail-outline" size={18} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="이메일 주소 입력"
                  placeholderTextColor="#A0AEC0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* 비밀번호 */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>비밀번호{isRegisterMode && ' (8자 이상)'}</Text>
              <View style={[styles.inputContainer, focusedField === 'password' && styles.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#A0AEC0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={COLORS.subtext}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 메인 버튼 */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={isRegisterMode ? handleRegister : handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{isRegisterMode ? '회원가입' : '로그인'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 로그인/회원가입 전환 */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>
              {isRegisterMode ? '이미 계정이 있으신가요? ' : '아직 계정이 없으신가요? '}
            </Text>
            <TouchableOpacity onPress={() => { setIsRegisterMode(!isRegisterMode); setEmail(''); setPassword(''); setDisplayName(''); }}>
              <Text style={styles.signupLink}>{isRegisterMode ? '로그인' : '회원가입'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoAiBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  logoAiText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.subtext,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    height: 50,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  tempLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    backgroundColor: '#EEF2FF',
  },
  tempLoginText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  tempLoginDesc: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 8,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  signupPrompt: {
    color: COLORS.subtext,
    fontSize: 14,
  },
  signupLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
