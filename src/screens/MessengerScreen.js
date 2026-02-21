import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

const SAMPLE_CHATS = [
  { id: '1', name: '주간 팀 스탠드업', lastMessage: 'AI 요약이 도착했어요 📋', time: '오전 10:30', unread: 2, avatar: '주' },
  { id: '2', name: '제품 기획 회의', lastMessage: '다음 회의 일정 잡을까요?', time: '어제', unread: 0, avatar: '제' },
  { id: '3', name: '김철수', lastMessage: '회의 자료 공유해줘요', time: '어제', unread: 1, avatar: '김' },
  { id: '4', name: '이영희', lastMessage: '네 확인했습니다!', time: '월요일', unread: 0, avatar: '이' },
  { id: '5', name: 'AI 어시스턴트', lastMessage: '무엇이든 물어보세요 🤖', time: '항상', unread: 0, avatar: 'AI', isAI: true },
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

const SAMPLE_MESSAGES = [
  { id: '1', text: 'AI 요약이 도착했습니다! 오늘 스탠드업 요약 확인해보세요 📋', sender: 'other', time: '10:28' },
  { id: '2', text: '오 좋아요! 어떤 내용인가요?', sender: 'me', time: '10:29' },
  { id: '3', text: '주요 내용: 로그인 기능 완료, 대시보드 UI 작업 80% 진행 중, 내일까지 리뷰 완료 예정', sender: 'other', time: '10:30' },
  { id: '4', text: '감사합니다! 정말 유용하네요 👍', sender: 'me', time: '10:31' },
];

export default function MessengerScreen() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);

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
          <TouchableOpacity style={styles.chatRoomMoreBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
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
                <View style={[styles.messageBubble, item.sender === 'me' ? styles.myBubble : styles.otherBubble]}>
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
            <TouchableOpacity style={styles.attachBtn}>
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
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              disabled={!inputText.trim()}
              onPress={() => {
                if (!inputText.trim()) return;
                setMessages((prev) => [
                  ...prev,
                  { id: Date.now().toString(), text: inputText.trim(), sender: 'me', time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
                ]);
                setInputText('');
              }}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>메신저</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="search-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="create-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>전체</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>회의방</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>개인</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={SAMPLE_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRoom chat={item} onPress={() => setSelectedChat(item)} />
        )}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* 새 채팅 FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
      </TouchableOpacity>
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
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
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
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  // 채팅방
  chatRoomHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatRoomAvatar: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  chatRoomHeaderInfo: { flex: 1 },
  chatRoomName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  chatRoomStatus: { fontSize: 11, color: COLORS.subtext },
  chatRoomMoreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  messageBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 6 },
  myBubbleRow: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 28, height: 28, borderRadius: 9, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubbleAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  messageBubble: { maxWidth: '70%', borderRadius: 16, padding: 12 },
  myBubble: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  messageText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 10, color: COLORS.subtext, marginBottom: 2 },
  myMessageTime: { textAlign: 'right' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputContainer: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40 },
  textInput: { fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
