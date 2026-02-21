import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
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
  success: '#10B981',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(isoString) {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = DAY_NAMES[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}

function MeetingCard({ meeting, onPress }) {
  const latestSession = meeting.sessions[0];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.cardLeft}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{meeting.name.charAt(0)}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{meeting.name}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="people-outline" size={12} color={COLORS.subtext} />
            <Text style={styles.cardMeta}>
              {meeting.participants.join(', ')}
            </Text>
          </View>
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.subtext} />
            <Text style={styles.cardMeta}>{formatDate(meeting.createdAt)}</Text>
          </View>
          {latestSession && (
            <View style={styles.latestSessionBadge}>
              <Ionicons name="document-text-outline" size={10} color={COLORS.success} />
              <Text style={styles.latestSessionText} numberOfLines={1}>
                최근: {latestSession.summary || '진행 중...'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>{meeting.sessions.length}</Text>
          <Text style={styles.sessionBadgeLabel}>회</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.border} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function MeetingListScreen({ navigation }) {
  const { meetings } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'

  const filtered = meetings
    .filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.participants.some((p) => p.includes(searchQuery))
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
      return 0;
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="회의 이름, 참여자 검색..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 정렬 옵션 */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>
          전체 <Text style={styles.sortCount}>{filtered.length}개</Text>
        </Text>
        <View style={styles.sortBtnGroup}>
          {['newest', 'oldest', 'name'].map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[styles.sortBtn, sortBy === sort && styles.sortBtnActive]}
              onPress={() => setSortBy(sort)}
            >
              <Text style={[styles.sortBtnText, sortBy === sort && styles.sortBtnTextActive]}>
                {sort === 'newest' ? '최신순' : sort === 'oldest' ? '오래된순' : '이름순'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 회의 목록 */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={60} color={COLORS.border} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? '검색 결과가 없어요' : '회의가 없어요'}
          </Text>
          <Text style={styles.emptyDesc}>
            {searchQuery ? '다른 키워드로 검색해보세요' : '아래 버튼을 눌러 첫 회의를 만들어보세요'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MeetingCard
              meeting={item}
              onPress={() =>
                navigation.navigate('MeetingDetail', {
                  meetingId: item.id,
                  meetingName: item.name,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* 새 회의 추가 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMeeting')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortLabel: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  sortCount: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sortBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  sortBtnActive: {
    backgroundColor: '#EEF2FF',
  },
  sortBtnText: {
    fontSize: 11,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  sortBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  latestSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  latestSessionText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '500',
    maxWidth: 160,
  },
  cardRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  sessionBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sessionBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sessionBadgeLabel: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.subtext,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});
