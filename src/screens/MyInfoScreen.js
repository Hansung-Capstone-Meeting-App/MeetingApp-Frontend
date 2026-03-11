import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
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

// ─── 이름 수정 모달 ────────────────────────────────────────────────────────────
function EditFieldModal({ visible, title, placeholder, initialValue, onClose, onSave }) {
  const [value, setValue] = useState(initialValue || '');

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', `${title}을(를) 입력해주세요.`);
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.editModal} activeOpacity={1}>
          <Text style={styles.editModalTitle}>{title} 변경</Text>
          <View style={styles.editInputWrap}>
            <TextInput
              style={styles.editInput}
              placeholder={placeholder}
              placeholderTextColor="#A0AEC0"
              value={value}
              onChangeText={setValue}
              autoFocus
            />
          </View>
          <View style={styles.editModalBtns}>
            <TouchableOpacity style={styles.editCancelBtn} onPress={onClose}>
              <Text style={styles.editCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editConfirmBtn, !value.trim() && styles.editConfirmDisabled]}
              onPress={handleSave}
              disabled={!value.trim()}
            >
              <Text style={styles.editConfirmText}>저장</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── 프로필 편집 모달 ──────────────────────────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '이름을 입력해주세요.');
      return;
    }
    onSave({ name: name.trim(), role: role.trim() });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.profileEditModal} activeOpacity={1}>
          {/* 핸들 */}
          <View style={styles.modalHandle} />
          <Text style={styles.editModalTitle}>프로필 편집</Text>

          {/* 아바타 미리보기 */}
          <View style={styles.editAvatarPreview}>
            <View style={styles.editAvatarCircle}>
              <Text style={styles.editAvatarText}>{name.charAt(0) || '?'}</Text>
            </View>
          </View>

          <View style={styles.editFieldSection}>
            <Text style={styles.editFieldLabel}>이름</Text>
            <View style={styles.editInputWrap}>
              <Ionicons name="person-outline" size={16} color={COLORS.subtext} />
              <TextInput
                style={styles.editInput}
                placeholder="이름 입력"
                placeholderTextColor="#A0AEC0"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.editFieldSection}>
            <Text style={styles.editFieldLabel}>소속 / 역할</Text>
            <View style={styles.editInputWrap}>
              <Ionicons name="briefcase-outline" size={16} color={COLORS.subtext} />
              <TextInput
                style={styles.editInput}
                placeholder="예: 개발팀, PM, 디자이너"
                placeholderTextColor="#A0AEC0"
                value={role}
                onChangeText={setRole}
              />
            </View>
          </View>

          <View style={styles.editModalBtns}>
            <TouchableOpacity style={styles.editCancelBtn} onPress={onClose}>
              <Text style={styles.editCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editConfirmBtn, !name.trim() && styles.editConfirmDisabled]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.editConfirmText}>저장</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function MyInfoScreen() {
  const { user, meetings, logout, updateUser } = useAppContext();

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);

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

  const handleCameraBtn = () => {
    Alert.alert(
      '프로필 사진 변경',
      '프로필 사진 기능을 선택하세요',
      [
        {
          text: '사진 라이브러리',
          onPress: () => Alert.alert('안내', '이 기능은 준비 중이에요.'),
        },
        {
          text: '카메라',
          onPress: () => Alert.alert('안내', '이 기능은 준비 중이에요.'),
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  };

  const handleEmailChange = () => {
    Alert.alert(
      '이메일 변경',
      '이메일 변경은 보안을 위해 고객센터를 통해 진행됩니다.\n\nsupport@meetingapp.io',
      [{ text: '확인' }]
    );
  };

  const handlePasswordChange = () => {
    Alert.alert(
      '비밀번호 변경',
      '비밀번호 재설정 이메일을 보내드릴까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '이메일 전송',
          onPress: () => Alert.alert('전송 완료', `${user?.email || '등록된 이메일'}로 재설정 링크를 보냈어요.`),
        },
      ]
    );
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
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handleCameraBtn}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@meetingapp.io'}</Text>
          <View style={styles.profileRoleBadge}>
            <Text style={styles.profileRoleText}>{user?.role || '개발팀'}</Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.85}
            onPress={() => setShowEditProfileModal(true)}
          >
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
            onPress={() => setShowEditNameModal(true)}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="mail-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.primary}
            label="이메일"
            value={user?.email || 'dev@meetingapp.io'}
            onPress={handleEmailChange}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="lock-closed-outline"
            iconBg="#EEF2FF"
            iconColor={COLORS.primary}
            label="비밀번호 변경"
            onPress={handlePasswordChange}
          />
        </SectionCard>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>MeetingApp v1.0.0 · Powered by AI</Text>
      </ScrollView>

      {/* 프로필 편집 모달 */}
      <EditProfileModal
        visible={showEditProfileModal}
        user={user}
        onClose={() => setShowEditProfileModal(false)}
        onSave={(updates) => {
          updateUser(updates);
          Alert.alert('저장 완료', '프로필이 업데이트되었어요.');
        }}
      />

      {/* 이름 단독 수정 모달 */}
      <EditFieldModal
        visible={showEditNameModal}
        title="이름"
        placeholder="새 이름 입력"
        initialValue={user?.name}
        onClose={() => setShowEditNameModal(false)}
        onSave={(newName) => {
          updateUser({ name: newName });
          Alert.alert('저장 완료', '이름이 변경되었어요.');
        }}
      />
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
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatarText: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileName: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: COLORS.subtext, marginTop: 3 },
  profileRoleBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  profileRoleText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  editProfileText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // 통계
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.subtext, marginTop: 3 },
  statDivider: { width: 1, height: '80%', backgroundColor: COLORS.border, alignSelf: 'center' },

  // 섹션
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.subtext,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {},
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  settingIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  settingValue: { fontSize: 12, color: COLORS.subtext, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },

  // 로그아웃
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, color: COLORS.danger, fontWeight: '700' },
  versionFooter: { textAlign: 'center', fontSize: 11, color: '#A0AEC0', marginBottom: 8 },

  // 모달 공통
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  editModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  editModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  editInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 20,
  },
  editInput: { flex: 1, fontSize: 15, color: COLORS.text },
  editModalBtns: { flexDirection: 'row', gap: 10 },
  editCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.subtext },
  editConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  editConfirmDisabled: { opacity: 0.4 },
  editConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // 프로필 편집 모달 (하단 시트 스타일)
  profileEditModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  editAvatarPreview: { alignItems: 'center', marginBottom: 20 },
  editAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  editAvatarText: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  editFieldSection: { marginBottom: 14 },
  editFieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.subtext, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
});
