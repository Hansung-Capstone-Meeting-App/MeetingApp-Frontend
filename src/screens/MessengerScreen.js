import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = {
  primary: '#4F46E5',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  subtext: '#64748B',
  border: '#E2E8F0',
  myBubble: '#4F46E5',
  otherBubble: '#FFFFFF',
};

// type: 'meeting' | 'personal' | 'ai'
const INITIAL_CHATS = [
  { id: '1', name: '주간 팀 스탠드업', lastMessage: 'AI 요약이 도착했어요 📋', time: '오전 10:30', unread: 2, avatar: '주', type: 'meeting' },
  { id: '2', name: '제품 기획 회의', lastMessage: '다음 회의 일정 잡을까요?', time: '어제', unread: 0, avatar: '제', type: 'meeting' },
  { id: '3', name: '김철수', lastMessage: '회의 자료 공유해줘요', time: '어제', unread: 1, avatar: '김', type: 'personal' },
  { id: '4', name: '이영희', lastMessage: '네 확인했습니다!', time: '월요일', unread: 0, avatar: '이', type: 'personal' },
  { id: '5', name: 'AI 어시스턴트', lastMessage: '무엇이든 물어보세요 🤖', time: '항상', unread: 0, avatar: 'AI', isAI: true, type: 'ai' },
];

const INITIAL_MESSAGES = [
  { id: '1', text: 'AI 요약이 도착했습니다! 오늘 스탠드업 요약 확인해보세요 📋', sender: 'other', time: '10:28' },
  { id: '2', text: '오 좋아요! 어떤 내용인가요?', sender: 'me', time: '10:29' },
  { id: '3', text: '주요 내용: 로그인 기능 완료, 대시보드 UI 작업 80% 진행 중, 내일까지 리뷰 완료 예정', sender: 'other', time: '10:30' },
  { id: '4', text: '감사합니다! 정말 유용하네요 👍', sender: 'me', time: '10:31' },
];

function ChatRoom({ chat, onPress }) {
  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.chatAvatar, chat.isAI && styles.aiAvatar]}>
        {chat.isAI ? (
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        ) : (
          <Text style={styles.chatAvatarText}>{chat.avatar}</Text>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName}>{chat.name}</Text>
          <Text style={styles.chatTime}>{chat.time}</Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={styles.chatLastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
          {chat.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessengerScreen() {
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [selectedChat, setSelectedChat] = useState(null);
  const [inputText, setInputText] = useState('');
  // 채팅방 ID별 메시지 관리 (채팅방마다 독립적인 메시지 기록)
  const [messagesByChat, setMessagesByChat] = useState({
    '1': INITIAL_MESSAGES,
    '2': [], '3': [], '4': [], '5': [],
  });

  // 현재 채팅방 메시지 (selectedChat 기준)
  const messages = selectedChat ? (messagesByChat[selectedChat.id] || []) : [];

  // 목록 화면 상태
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'meeting' | 'personal'
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');

  const flatListRef = useRef(null);

  // ─── 채팅 목록 필터링 ──────────────────────────────────────────────────────
  const filteredChats = chats.filter((chat) => {
    // 탭 필터
    if (activeTab === 'meeting' && chat.type !== 'meeting') return false;
    if (activeTab === 'personal' && chat.type !== 'personal' && !chat.isAI) return false;

    // 검색 필터
    if (searchQuery.trim()) {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // ─── 새 채팅 만들기 ────────────────────────────────────────────────────────
  const handleCreateNewChat = () => {
    const trimmed = newChatName.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', '대화 상대 이름을 입력해주세요.');
      return;
    }
    const newChat = {
      id: Date.now().toString(),
      name: trimmed,
      lastMessage: '새 대화를 시작하세요',
      time: '방금',
      unread: 0,
      avatar: trimmed.charAt(0),
      type: 'personal',
    };
    setChats((prev) => [newChat, ...prev]);
    setMessagesByChat((prev) => ({ ...prev, [newChat.id]: [] }));
    setShowNewChatModal(false);
    setNewChatName('');
    setSelectedChat(newChat);
  };

  // ─── 채팅방 더보기 ─────────────────────────────────────────────────────────
  const handleMoreOptions = () => {
    Alert.alert(
      selectedChat.name,
      '채팅방 옵션',
      [
        {
          text: '알림 끄기',
          onPress: () => Alert.alert('알림', `'${selectedChat.name}' 알림이 꺼졌어요.`),
        },
        {
          text: '채팅방 나가기',
          style: 'destructive',
          onPress: () => {
            setChats((prev) => prev.filter((c) => c.id !== selectedChat.id));
            setSelectedChat(null);
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  };

  // ─── 파일 첨부 ─────────────────────────────────────────────────────────────
  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const fileMsg = {
        id: Date.now().toString(),
        text: `📎 ${file.name}`,
        sender: 'me',
        time: now,
        isFile: true,
      };
      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChat.id]: [...(prev[selectedChat.id] || []), fileMsg],
      }));
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChat.id ? { ...c, lastMessage: `📎 ${file.name}`, time: now } : c
        )
      );
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('오류', '파일을 불러올 수 없어요.');
    }
  };

  // ─── 메시지 전송 ───────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'me',
      time: now,
    };
    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg],
    }));
    // 채팅 목록 lastMessage 업데이트
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChat.id ? { ...c, lastMessage: inputText.trim(), time: now } : c
      )
    );
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── 채팅방 뷰 ─────────────────────────────────────────────────────────────
  if (selectedChat) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* 채팅방 헤더 */}
        <View style={styles.chatRoomHeader}>
          <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={[styles.chatRoomAvatar, selectedChat.isAI && styles.aiAvatar]}>
            {selectedChat.isAI ? (
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            ) : (
              <Text style={styles.chatAvatarText}>{selectedChat.avatar}</Text>
            )}
          </View>
          <View style={styles.chatRoomHeaderInfo}>
            <Text style={styles.chatRoomName}>{selectedChat.name}</Text>
            <Text style={styles.chatRoomStatus}>온라인</Text>
          </View>
          <TouchableOpacity style={styles.chatRoomMoreBtn} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.messageBubbleRow, item.sender === 'me' && styles.myBubbleRow]}>
                {item.sender !== 'me' && (
                  <View style={[styles.bubbleAvatar, selectedChat.isAI && styles.aiAvatar]}>
                    {selectedChat.isAI ? (
                      <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.bubbleAvatarText}>{selectedChat.avatar}</Text>
                    )}
                  </View>
                )}
                <View style={[
                  styles.messageBubble,
                  item.sender === 'me' ? styles.myBubble : styles.otherBubble,
                  item.isFile && styles.fileBubble,
                ]}>
                  <Text style={[styles.messageText, item.sender === 'me' && styles.myMessageText]}>
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.messageTime, item.sender === 'me' && styles.myMessageTime]}>
                  {item.time}
                </Text>
              </View>
            )}
          />

          {/* 입력창 */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.subtext} />
            </TouchableOpacity>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="메시지를 입력하세요..."
                placeholderTextColor="#A0AEC0"
                value={inputText}
                onChangeText={setInputText}
                multiline
                onSubmitEditing={handleSend}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              disabled={!inputText.trim()}
              onPress={handleSend}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── 채팅 목록 뷰 ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        {showSearch ? (
          // 검색 모드
          <View style={styles.searchBarInHeader}>
            <Ionicons name="search-outline" size={16} color={COLORS.subtext} />
            <TextInput
              style={styles.searchInput}
              placeholder="이름으로 검색..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>메신저</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setShowSearch(true)}
              >
                <Ionicons name="search-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setShowNewChatModal(true)}
              >
                <Ionicons name="create-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {[
          { key: 'all', label: '전체' },
          { key: 'meeting', label: '회의방' },
          { key: 'personal', label: '개인' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={52} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {searchQuery ? '검색 결과가 없어요' : '채팅이 없어요'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRoom
              chat={item}
              onPress={() => setSelectedChat(item)}
            />
          )}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* 새 채팅 FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNewChatModal(true)}>
        <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 새 채팅 모달 */}
      <Modal
        visible={showNewChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewChatModal(false)}
        >
          <TouchableOpacity style={styles.newChatModal} activeOpacity={1}>
            <Text style={styles.newChatTitle}>새 대화 시작</Text>
            <Text style={styles.newChatDesc}>대화 상대의 이름을 입력하세요</Text>
            <View style={styles.newChatInputWrap}>
              <Ionicons name="person-outline" size={18} color={COLORS.subtext} />
              <TextInput
                style={styles.newChatInput}
                placeholder="이름 입력"
                placeholderTextColor="#A0AEC0"
                value={newChatName}
                onChangeText={setNewChatName}
                autoFocus
                onSubmitEditing={handleCreateNewChat}
              />
            </View>
            <View style={styles.newChatBtns}>
              <TouchableOpacity
                style={styles.newChatCancelBtn}
                onPress={() => {
                  setShowNewChatModal(false);
                  setNewChatName('');
                }}
              >
                <Text style={styles.newChatCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newChatConfirmBtn, !newChatName.trim() && styles.newChatConfirmDisabled]}
                onPress={handleCreateNewChat}
                disabled={!newChatName.trim()}
              >
                <Text style={styles.newChatConfirmText}>시작</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  // 목록 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },

  // 헤더 검색바
  searchBarInHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  // 탭
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 13, color: COLORS.subtext, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  // 빈 상태
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyText: { fontSize: 15, color: COLORS.subtext, marginTop: 12, fontWeight: '500' },

  // 채팅 목록
  chatListContent: { paddingBottom: 80 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 72 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatar: { backgroundColor: '#7C3AED' },
  chatAvatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  chatName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  chatTime: { fontSize: 11, color: COLORS.subtext },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLastMessage: { fontSize: 13, color: COLORS.subtext, flex: 1 },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // FAB
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

  // 새 채팅 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  newChatModal: {
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
  newChatTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  newChatDesc: { fontSize: 13, color: COLORS.subtext, marginBottom: 18 },
  newChatInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 20,
  },
  newChatInput: { flex: 1, fontSize: 15, color: COLORS.text },
  newChatBtns: { flexDirection: 'row', gap: 10 },
  newChatCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.subtext },
  newChatConfirmBtn: {
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
  newChatConfirmDisabled: { opacity: 0.4 },
  newChatConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // 채팅방
  chatRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatRoomAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRoomHeaderInfo: { flex: 1 },
  chatRoomName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  chatRoomStatus: { fontSize: 11, color: COLORS.subtext },
  chatRoomMoreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // 메시지
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  messageBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 6 },
  myBubbleRow: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubbleAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  messageBubble: { maxWidth: '70%', borderRadius: 16, padding: 12 },
  fileBubble: { borderWidth: 1, borderColor: COLORS.border },
  myBubble: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 10, color: COLORS.subtext, marginBottom: 2 },
  myMessageTime: { textAlign: 'right' },

  // 입력창
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
  },
  textInput: { fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
