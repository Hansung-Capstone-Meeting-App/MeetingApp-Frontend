import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  secondary: '#7C3AED',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
};

// 요일 이름
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요 ☀️';
  if (hour < 18) return '좋은 오후예요 🌤️';
  return '좋은 저녁이에요 🌙';
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = DAY_NAMES[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}

export default function HomeScreen({ navigation }) {
  const { user, meetings } = useAppContext();

  const recentMeetings = meetings.slice(0, 3);
  const totalSessions = meetings.reduce((acc, m) => acc + m.sessions.length, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || '사용자'} 님</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{meetings.length}</Text>
            <Text style={styles.statLabel}>전체 회의</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>완료된 세션</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>진행 중</Text>
          </View>
        </View>

        {/* 핵심 Meeting 버튼 */}
        <TouchableOpacity
          style={styles.meetingMainButton}
          onPress={() => navigation.navigate('MeetingList')}
          activeOpacity={0.88}
        >
          <View style={styles.meetingMainLeft}>
            <View style={styles.meetingMainIconWrap}>
              <Ionicons name="videocam" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.meetingMainTextWrap}>
              <Text style={styles.meetingMainTitle}>Meeting</Text>
              <Text style={styles.meetingMainDesc}>회의를 시작하거나 기록을 확인하세요</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* AI 요약 배너 */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <View>
              <Text style={styles.aiBannerTitle}>회의 AI 요약</Text>
              <Text style={styles.aiBannerDesc}>회의 종료 후 자동으로 요약이 생성돼요</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.aiBannerBtn}>
            <Text style={styles.aiBannerBtnText}>알아보기</Text>
          </TouchableOpacity>
        </View>

        {/* 최근 회의 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 회의</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MeetingList')}>
            <Text style={styles.seeAllText}>전체 보기</Text>
          </TouchableOpacity>
        </View>

        {recentMeetings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>아직 회의가 없어요</Text>
            <Text style={styles.emptySubtext}>Meeting 버튼을 눌러 첫 회의를 만들어보세요</Text>
          </View>
        ) : (
          recentMeetings.map((meeting) => (
            <TouchableOpacity
              key={meeting.id}
              style={styles.recentMeetingCard}
              onPress={() =>
                navigation.navigate('MeetingDetail', {
                  meetingId: meeting.id,
                  meetingName: meeting.name,
                })
              }
              activeOpacity={0.75}
            >
              <View style={styles.recentCardLeft}>
                <View style={styles.recentAvatarCircle}>
                  <Text style={styles.recentAvatarText}>
                    {meeting.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.recentMeetingName} numberOfLines={1}>
                    {meeting.name}
                  </Text>
                  <Text style={styles.recentMeetingMeta}>
                    {formatDate(meeting.createdAt)} · {meeting.participants.length}명
                  </Text>
                </View>
              </View>
              <View style={styles.sessionCountBadge}>
                <Text style={styles.sessionCountText}>{meeting.sessions.length}회</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* 빠른 액션 */}
        <Text style={styles.sectionTitle}>빠른 액션</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('AddMeeting')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionLabel}>새 회의</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.8}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionLabel}>요약 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.8}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="share-outline" size={24} color="#F97316" />
            </View>
            <Text style={styles.quickActionLabel}>공유하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.8}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FDF4FF' }]}>
              <Ionicons name="search-outline" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.quickActionLabel}>검색</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.subtext,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    textAlign: 'center',
  },
  meetingMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  meetingMainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  meetingMainIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  meetingMainTextWrap: {
    flex: 1,
  },
  meetingMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  meetingMainDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDF4FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  aiBannerDesc: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 1,
  },
  aiBannerBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.subtext,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
    textAlign: 'center',
  },
  recentMeetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  recentAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recentMeetingName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  recentMeetingMeta: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },
  sessionCountBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sessionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});
