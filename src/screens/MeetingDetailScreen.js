import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = DAY_NAMES[date.getDay()];
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 (${dayName}) ${h}:${mi}`;
}

function SessionCard({ session, index, total }) {
  const isOngoing = session.status === 'ongoing';
  return (
    <View style={styles.sessionCard}>
      {/* 타임라인 선 */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, isOngoing && styles.timelineDotActive]} />
        {index < total - 1 && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.sessionContent}>
        {/* 헤더 */}
        <View style={styles.sessionHeader}>
          <View style={[styles.sessionStatusBadge, isOngoing ? styles.badgeOngoing : styles.badgeCompleted]}>
            <View style={[styles.statusDot, isOngoing ? styles.statusDotActive : styles.statusDotCompleted]} />
            <Text style={[styles.sessionStatusText, isOngoing ? styles.ongoingText : styles.completedText]}>
              {isOngoing ? '진행 중' : '완료'}
            </Text>
          </View>
          <Text style={styles.sessionDate}>{formatDateTime(session.startedAt)}</Text>
        </View>

        {/* 세션 정보 */}
        {session.duration && (
          <View style={styles.sessionInfoRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.subtext} />
            <Text style={styles.sessionInfoText}>소요시간: {session.duration}</Text>
          </View>
        )}

        {/* AI 요약 */}
        {session.summary ? (
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                <Text style={styles.aiBadgeText}>AI 요약</Text>
              </View>
            </View>
            <Text style={styles.summaryText}>{session.summary}</Text>
          </View>
        ) : isOngoing ? (
          <View style={styles.summaryBoxPlaceholder}>
            <Ionicons name="mic-outline" size={16} color={COLORS.warning} />
            <Text style={styles.summaryPlaceholderText}>회의가 진행 중이에요...</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function MeetingDetailScreen({ route, navigation }) {
  const { meetingId } = route.params;
  const { getMeetingById, addMeetingSession } = useAppContext();
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);

  const meeting = getMeetingById(meetingId);

  if (!meeting) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>회의를 찾을 수 없어요</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartMeeting = () => {
    if (isMeetingStarted) {
      Alert.alert('이미 진행 중', '이미 회의가 진행 중이에요.');
      return;
    }
    Alert.alert(
      '회의 시작',
      `'${meeting.name}' 회의를 시작할까요?\nAI가 회의를 기록하고 요약해드릴게요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작',
          style: 'default',
          onPress: () => {
            addMeetingSession(meetingId);
            setIsMeetingStarted(true);
            Alert.alert('🎙️ 회의 시작', 'AI 기록이 시작되었어요!\n회의가 종료되면 자동으로 요약이 생성됩니다.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 회의 정보 카드 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View style={styles.meetingAvatarWrap}>
              <Text style={styles.meetingAvatarText}>{meeting.name.charAt(0)}</Text>
            </View>
            <View style={styles.infoCardText}>
              <Text style={styles.meetingNameLarge}>{meeting.name}</Text>
              <Text style={styles.meetingCreateDate}>생성일: {formatDateTime(meeting.createdAt)}</Text>
            </View>
          </View>

          {meeting.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{meeting.description}</Text>
            </View>
          ) : null}

          {/* 참여자 */}
          <View style={styles.participantsSection}>
            <View style={styles.participantsSectionHeader}>
              <Ionicons name="people-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.participantsSectionLabel}>
                참여자 {meeting.participants.length}명
              </Text>
            </View>
            <View style={styles.participantsList}>
              {meeting.participants.map((p, idx) => (
                <View key={idx} style={styles.participantChip}>
                  <View style={styles.participantChipAvatar}>
                    <Text style={styles.participantChipAvatarText}>{p.charAt(0)}</Text>
                  </View>
                  <Text style={styles.participantChipText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 통계 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meeting.sessions.length}</Text>
              <Text style={styles.statLabel}>전체 세션</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {meeting.sessions.filter((s) => s.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>완료</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {meeting.sessions.filter((s) => s.status === 'ongoing').length}
              </Text>
              <Text style={styles.statLabel}>진행 중</Text>
            </View>
          </View>
        </View>

        {/* 회의 시작 버튼 - 핵심 CTA */}
        <TouchableOpacity
          style={[styles.startMeetingBtn, isMeetingStarted && styles.startMeetingBtnOngoing]}
          onPress={handleStartMeeting}
          activeOpacity={0.88}
        >
          <View style={styles.startMeetingInner}>
            <View style={styles.startMeetingIconWrap}>
              <Ionicons
                name={isMeetingStarted ? 'mic' : 'play'}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <View>
              <Text style={styles.startMeetingTitle}>
                {isMeetingStarted ? '회의 진행 중...' : '회의 시작'}
              </Text>
              <Text style={styles.startMeetingDesc}>
                {isMeetingStarted
                  ? 'AI가 회의를 기록하고 있어요'
                  : 'AI가 자동으로 기록 및 요약해드려요'}
              </Text>
            </View>
          </View>
          {isMeetingStarted && (
            <View style={styles.ongoingIndicator}>
              <View style={styles.ongoingPulse} />
            </View>
          )}
        </TouchableOpacity>

        {/* 이전 회의 세션 목록 */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>회의 기록</Text>
          {meeting.sessions.length === 0 ? (
            <View style={styles.emptySessionCard}>
              <Ionicons name="document-outline" size={36} color={COLORS.border} />
              <Text style={styles.emptySessionTitle}>아직 진행된 회의가 없어요</Text>
              <Text style={styles.emptySessionDesc}>위의 '회의 시작' 버튼으로 첫 회의를 시작해보세요</Text>
            </View>
          ) : (
            meeting.sessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                total={meeting.sessions.length}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.subtext,
  },
  goBackText: {
    color: COLORS.primary,
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  // 회의 정보 카드
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  meetingAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  infoCardText: {
    flex: 1,
  },
  meetingNameLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  meetingCreateDate: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 4,
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.subtext,
    lineHeight: 19,
  },
  participantsSection: {
    marginBottom: 16,
  },
  participantsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  participantsSectionLabel: {
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 12,
    gap: 6,
  },
  participantChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantChipAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  participantChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
  // 회의 시작 버튼
  startMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  startMeetingBtnOngoing: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
  },
  startMeetingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  startMeetingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMeetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  startMeetingDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  ongoingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  // 세션 목록
  sessionsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptySessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptySessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.subtext,
    marginTop: 12,
  },
  emptySessionDesc: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 4,
  },
  // 세션 카드
  sessionCard: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  timelineDotActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
    marginBottom: 0,
    minHeight: 20,
  },
  sessionContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  badgeOngoing: {
    backgroundColor: '#F0FDF4',
  },
  badgeCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  statusDotCompleted: {
    backgroundColor: COLORS.subtext,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ongoingText: {
    color: COLORS.success,
  },
  completedText: {
    color: COLORS.subtext,
  },
  sessionDate: {
    fontSize: 11,
    color: COLORS.subtext,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  sessionInfoText: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#A855F7',
  },
  summaryHeader: {
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A855F7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  summaryBoxPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
  },
  summaryPlaceholderText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
});
