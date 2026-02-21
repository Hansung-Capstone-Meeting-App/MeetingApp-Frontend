import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const COLORS = {
  primary: '#4F46E5',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  inputBg: '#F1F5F9',
};

function formatNow() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

export default function AddMeetingScreen({ navigation }) {
  const { addMeeting } = useAppContext();
  const [meetingName, setMeetingName] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [description, setDescription] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const currentTime = formatNow();

  const handleAddParticipant = () => {
    const trimmed = participantInput.trim();
    if (!trimmed) return;
    if (participants.includes(trimmed)) {
      Alert.alert('중복', `'${trimmed}'은 이미 추가되어 있어요.`);
      return;
    }
    setParticipants((prev) => [...prev, trimmed]);
    setParticipantInput('');
  };

  const handleRemoveParticipant = (name) => {
    setParticipants((prev) => prev.filter((p) => p !== name));
  };

  const handleCreate = () => {
    if (!meetingName.trim()) {
      Alert.alert('입력 오류', '회의 이름을 입력해주세요.');
      return;
    }
    if (participants.length === 0) {
      Alert.alert('입력 오류', '참여자를 한 명 이상 추가해주세요.');
      return;
    }
    const meeting = addMeeting({
      name: meetingName.trim(),
      participants,
      description: description.trim(),
    });
    navigation.replace('MeetingDetail', {
      meetingId: meeting.id,
      meetingName: meeting.name,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 회의 이름 */}
          <View style={styles.section}>
            <Text style={styles.label}>
              회의 이름 <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputWrap, focusedField === 'name' && styles.inputFocused]}>
              <Ionicons name="mic-outline" size={18} color={COLORS.subtext} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="예) 주간 팀 스탠드업"
                placeholderTextColor="#A0AEC0"
                value={meetingName}
                onChangeText={setMeetingName}
                maxLength={50}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={styles.charCount}>{meetingName.length}/50</Text>
            </View>
          </View>

          {/* 참여자 */}
          <View style={styles.section}>
            <Text style={styles.label}>
              참여자 <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.participantInputRow}>
              <View style={[styles.inputWrap, styles.participantInputWrap, focusedField === 'participant' && styles.inputFocused]}>
                <Ionicons name="person-add-outline" size={18} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="이름 입력 후 추가 버튼"
                  placeholderTextColor="#A0AEC0"
                  value={participantInput}
                  onChangeText={setParticipantInput}
                  onSubmitEditing={handleAddParticipant}
                  returnKeyType="done"
                  onFocus={() => setFocusedField('participant')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <TouchableOpacity
                style={[styles.addParticipantBtn, !participantInput.trim() && styles.addBtnDisabled]}
                onPress={handleAddParticipant}
                disabled={!participantInput.trim()}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* 참여자 태그 */}
            {participants.length > 0 && (
              <View style={styles.participantTags}>
                {participants.map((p) => (
                  <View key={p} style={styles.participantTag}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>{p.charAt(0)}</Text>
                    </View>
                    <Text style={styles.participantTagText}>{p}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveParticipant(p)}
                      style={styles.participantRemoveBtn}
                    >
                      <Ionicons name="close" size={13} color={COLORS.subtext} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {participants.length === 0 && (
              <Text style={styles.participantHint}>참여자를 추가해주세요</Text>
            )}
          </View>

          {/* 회의 시간 (자동) */}
          <View style={styles.section}>
            <Text style={styles.label}>회의 시간</Text>
            <View style={styles.timeCard}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.timeText}>{currentTime}</Text>
              <View style={styles.autoTag}>
                <Text style={styles.autoTagText}>자동 저장</Text>
              </View>
            </View>
            <Text style={styles.timeHint}>회의 생성 시 현재 시간이 자동으로 저장됩니다</Text>
          </View>

          {/* 설명 (선택) */}
          <View style={styles.section}>
            <Text style={styles.label}>회의 설명 <Text style={styles.optional}>(선택)</Text></Text>
            <View style={[styles.inputWrap, styles.textareaWrap, focusedField === 'desc' && styles.inputFocused]}>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="회의 목적이나 안건을 입력해주세요"
                placeholderTextColor="#A0AEC0"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <Text style={styles.charCountRight}>{description.length}/200</Text>
          </View>

          {/* 생성 버튼 */}
          <TouchableOpacity
            style={[styles.createBtn, (!meetingName.trim() || participants.length === 0) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!meetingName.trim() || participants.length === 0}
            activeOpacity={0.88}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.createBtnText}>회의 만들기</Text>
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  optional: {
    color: COLORS.subtext,
    fontWeight: '400',
    fontSize: 12,
  },
  inputWrap: {
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
  },
  charCount: {
    fontSize: 11,
    color: COLORS.subtext,
  },
  participantInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  participantInputWrap: {
    flex: 1,
  },
  addParticipantBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  participantTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  participantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  participantTagText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  participantRemoveBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantHint: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 6,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  timeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  autoTag: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  timeHint: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 6,
  },
  textareaWrap: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textarea: {
    height: 80,
  },
  charCountRight: {
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 4,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
