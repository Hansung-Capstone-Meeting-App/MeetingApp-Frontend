import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const COLORS = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#10B981',
};

function SettingRow({ icon, iconBg, iconColor, label, value, onPress, hasArrow = true, rightEl }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={[styles.settingIconWrap, { backgroundColor: iconBg || '#F1F5F9' }]}>
        <Ionicons name={icon} size={18} color={iconColor || COLORS.subtext} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {rightEl || (hasArrow && <Ionicons name="chevron-forward" size={16} color={COLORS.border} />)}
    </TouchableOpacity>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function MyInfoScreen() {
  const { user, meetings, logout } = useAppContext();
  const [notifMeeting, setNotifMeeting] = useState(true);
  const [notifSummary, setNotifSummary] = useState(true);
  const [aiAutoSummary, setAiAutoSummary] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const totalSessions = meetings.reduce((acc, m) => acc + m.sessions.length, 0);
  const completedSessions = meetings.reduce(
    (acc, m) => acc + m.sessions.filter((s) => s.status === 'completed').length,
    0
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarWrap}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@meetingapp.io'}</Text>
          <View style={styles.profileRoleBadge}>
            <Text style={styles.profileRoleText}>{user?.role || '개발팀'}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editProfileText}>프로필 편집</Text>
          </TouchableOpacity>
        </View>

        {/* 활동 통계 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{meetings.length}</Text>
            <Text style={styles.statLabel}>전체 회의</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>총 세션</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedSessions}</Text>
            <Text style={styles.statLabel}>완료 세션</Text>
          </View>
        </View>

        {/* 계정 설정 */}
        <SectionCard title="계정">
          <SettingRow
            icon="person-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.primary}
            label="이름"
            value={user?.name || '김개발'}
            onPress={() => Alert.alert('이름 변경', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.primary}
            label="이메일"
            value={user?.email || 'dev@meetingapp.io'}
            onPress={() => Alert.alert('이메일 변경', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="lock-closed-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.primary}
            label="비밀번호 변경"
            onPress={() => Alert.alert('비밀번호 변경', '(추후 구현 예정)')}
          />
        </SectionCard>

        {/* 알림 설정 */}
        <SectionCard title="알림">
          <SettingRow
            icon="notifications-outline"
            iconBg="#FFF7ED"
            iconColor="#F97316"
            label="회의 알림"
            hasArrow={false}
            rightEl={<Switch value={notifMeeting} onValueChange={setNotifMeeting} trackColor={{ true: COLORS.primary }} thumbColor="#FFFFFF" />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="document-text-outline"
            iconBg="#F0FDF4"
            iconColor={COLORS.success}
            label="AI 요약 알림"
            hasArrow={false}
            rightEl={<Switch value={notifSummary} onValueChange={setNotifSummary} trackColor={{ true: COLORS.primary }} thumbColor="#FFFFFF" />}
          />
        </SectionCard>

        {/* AI 설정 */}
        <SectionCard title="AI 기능">
          <SettingRow
            icon="sparkles-outline"
            iconBg="#FDF4FF"
            iconColor={COLORS.secondary}
            label="자동 요약"
            value="회의 종료 시 자동 생성"
            hasArrow={false}
            rightEl={<Switch value={aiAutoSummary} onValueChange={setAiAutoSummary} trackColor={{ true: COLORS.primary }} thumbColor="#FFFFFF" />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="language-outline"
            iconBg="#FDF4FF"
            iconColor={COLORS.secondary}
            label="요약 언어"
            value="한국어"
            onPress={() => Alert.alert('언어 설정', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="analytics-outline"
            iconBg="#FDF4FF"
            iconColor={COLORS.secondary}
            label="AI 요약 기록 보기"
            onPress={() => Alert.alert('AI 요약 기록', '(추후 구현 예정)')}
          />
        </SectionCard>

        {/* 앱 설정 */}
        <SectionCard title="앱 설정">
          <SettingRow
            icon="moon-outline"
            iconBg="#F1F5F9"
            iconColor={COLORS.subtext}
            label="다크 모드"
            hasArrow={false}
            rightEl={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.primary }} thumbColor="#FFFFFF" />}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="globe-outline"
            iconBg="#F1F5F9"
            iconColor={COLORS.subtext}
            label="언어"
            value="한국어"
            onPress={() => Alert.alert('언어', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="information-circle-outline"
            iconBg="#F1F5F9"
            iconColor={COLORS.subtext}
            label="버전"
            value="1.0.0"
            hasArrow={false}
          />
        </SectionCard>

        {/* 지원 */}
        <SectionCard title="지원">
          <SettingRow
            icon="help-circle-outline"
            iconBg="#F0FDF4"
            iconColor={COLORS.success}
            label="도움말"
            onPress={() => Alert.alert('도움말', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="chatbubble-outline"
            iconBg="#F0FDF4"
            iconColor={COLORS.success}
            label="문의하기"
            onPress={() => Alert.alert('문의하기', '(추후 구현 예정)')}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="star-outline"
            iconBg="#FFFBEB"
            iconColor="#F59E0B"
            label="앱 평가하기"
            onPress={() => Alert.alert('앱 평가', '(추후 구현 예정)')}
          />
        </SectionCard>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>MeetingApp v1.0.0 · Powered by AI</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  // 프로필
  profileHeader: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  profileAvatarWrap: { position: 'relative', marginBottom: 12 },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  profileAvatarText: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  editAvatarBtn: {
    position: 'absolute', bottom: -2, right: -2, width: 26, height: 26,
    borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface,
  },
  profileName: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: COLORS.subtext, marginTop: 3 },
  profileRoleBadge: {
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 3, marginTop: 8,
  },
  profileRoleText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#EEF2FF',
  },
  editProfileText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  // 통계
  statsCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16,
    marginHorizontal: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.subtext, marginTop: 3 },
  statDivider: { width: 1, height: '80%', backgroundColor: COLORS.border, alignSelf: 'center' },
  // 섹션
  sectionCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: COLORS.surface, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.subtext, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionContent: {},
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  settingIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  settingValue: { fontSize: 12, color: COLORS.subtext, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },
  // 로그아웃
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 6, marginBottom: 16,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#FEF2F2', gap: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, color: COLORS.danger, fontWeight: '700' },
  versionFooter: { textAlign: 'center', fontSize: 11, color: '#A0AEC0', marginBottom: 8 },
});
