import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { useAppContext } from '../context/AppContext';
import { uploadAndSummarize } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────

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

/** 화면 상태 */
const ScreenState = {
  IDLE: 'idle',               // 시작 전 (녹음 시작 + 파일 업로드 버튼 표시)
  FILE_SELECTED: 'file_selected', // 파일 선택 완료 (요약 시작 대기)
  RECORDING: 'recording',     // 녹음 중 (타이머 + 종료 버튼)
  SUMMARIZING: 'summarizing', // AI 요약 처리 중 (로딩 모달)
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

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

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 일정 추출 유틸 ────────────────────────────────────────────────────────────

/**
 * 요약 텍스트에서 날짜·시간이 포함된 일정 문장을 추출합니다.
 * 화자 레이블(예: [화자1]:, A:) 제거 후 파싱합니다.
 */
function extractSchedules(text) {
  if (!text) return [];

  const dateRe = /(\d{1,2})월\s*\d{1,2}일|다음\s*(주|달)|이번\s*(주|달)|오늘|내일|모레|\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2}|(월|화|수|목|금|토|일)요일/;
  const timeRe = /(오전|오후)\s*\d{1,2}시|\d{1,2}:\d{2}|\d{1,2}시(\s*(반|\d{1,2}분))?/;
  const eventRe = /회의|미팅|발표|제출|마감|검토|보고|공유|배포|릴리즈|스프린트|데모|일정|예정|진행/;

  const sentences = text
    .split(/[.!?\n]/)
    // 화자 레이블 제거: [화자1]: / 화자1: / A: 등
    .map((s) => s.replace(/^\s*[\[【]?[\w화자\s]*[\]】]?\s*:\s*/u, '').trim())
    .filter((s) => s.length > 5);

  const found = [];
  sentences.forEach((s, i) => {
    const hasDate = dateRe.test(s);
    const hasTime = timeRe.test(s);
    const hasEvent = eventRe.test(s);
    if ((hasDate || hasTime) && (hasEvent || (hasDate && hasTime))) {
      found.push({ id: String(i), text: s });
    }
  });
  return found;
}

/** Google Calendar URL로 일정 추가 */
function openGoogleCalendar(title, details) {
  const t = encodeURIComponent(title.slice(0, 80));
  const d = encodeURIComponent(details || title);
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&details=${d}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('오류', 'Google 캘린더를 열 수 없어요.\n앱 또는 브라우저를 확인해주세요.')
  );
}

// ─── 일정 추출 모달 ────────────────────────────────────────────────────────────

function ScheduleModal({ visible, schedules, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scheduleOverlay}>
        <View style={styles.scheduleSheet}>
          <View style={styles.scheduleHandle} />

          {/* 헤더 */}
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleHeaderLeft}>
              <View style={styles.scheduleHeaderIcon}>
                <Ionicons name="calendar" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.scheduleTitle}>일정 추출</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.scheduleCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>

          {schedules.length === 0 ? (
            /* 일정 없음 */
            <View style={styles.scheduleEmpty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
              <Text style={styles.scheduleEmptyTitle}>일정을 찾지 못했어요</Text>
              <Text style={styles.scheduleEmptyDesc}>
                요약에 날짜·시간 정보가 포함된{'\n'}문장이 없어요
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scheduleList} showsVerticalScrollIndicator={false}>
              <Text style={styles.scheduleHint}>
                {schedules.length}건 추출됨 · 항목을 탭하면 Google 캘린더에 추가돼요
              </Text>
              {schedules.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.scheduleItem}
                  onPress={() => openGoogleCalendar(item.text, item.text)}
                  activeOpacity={0.75}
                >
                  <View style={styles.scheduleItemLeft}>
                    <View style={styles.scheduleItemDot} />
                    <Text style={styles.scheduleItemText}>{item.text}</Text>
                  </View>
                  <View style={styles.scheduleItemAction}>
                    <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.scheduleItemActionText}>추가</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── AI 요약 로딩 모달 ────────────────────────────────────────────────────────

function SummarizingModal({ visible }) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 16 }} />
          <View style={styles.aiBadgeLarge}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.aiBadgeLargeText}>AI 요약 생성 중</Text>
          </View>
          <Text style={styles.modalTitle}>
            회의 내용을 분석하고 있어요{'.'.repeat(dotCount)}
          </Text>
          <Text style={styles.modalDesc}>
            AI가 회의 내용을 요약하고 있습니다.{'\n'}잠시만 기다려주세요.
          </Text>
          <View style={styles.modalProgressBar}>
            <View style={styles.modalProgressFill} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── 세션 카드 ────────────────────────────────────────────────────────────────

function SessionCard({ session, index, total, onExtractSchedule }) {
  const isOngoing = session.status === 'ongoing';
  const isFailed = session.status === 'failed';
  return (
    <View style={styles.sessionCard}>
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, isOngoing && styles.timelineDotActive, isFailed && styles.timelineDotFailed]} />
        {index < total - 1 && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <View style={[styles.sessionStatusBadge, isOngoing ? styles.badgeOngoing : isFailed ? styles.badgeFailed : styles.badgeCompleted]}>
            <View style={[styles.statusDot, isOngoing ? styles.statusDotActive : isFailed ? styles.statusDotFailed : styles.statusDotCompleted]} />
            <Text style={[styles.sessionStatusText, isOngoing ? styles.ongoingText : isFailed ? styles.failedText : styles.completedText]}>
              {isOngoing ? '진행 중' : isFailed ? '실패' : '완료'}
            </Text>
          </View>
          <Text style={styles.sessionDate}>{formatDateTime(session.startedAt)}</Text>
        </View>
        {session.duration && (
          <View style={styles.sessionInfoRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.subtext} />
            <Text style={styles.sessionInfoText}>소요시간: {session.duration}</Text>
          </View>
        )}
        {session.sourceType === 'upload' && (
          <View style={styles.sessionInfoRow}>
            <Ionicons name="folder-open-outline" size={13} color={COLORS.subtext} />
            <Text style={styles.sessionInfoText}>파일 업로드: {session.fileName}</Text>
          </View>
        )}
        {session.summary ? (
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                <Text style={styles.aiBadgeText}>AI 요약</Text>
              </View>
              {/* 일정 추출 버튼 */}
              <TouchableOpacity
                style={styles.extractBtn}
                onPress={() => onExtractSchedule && onExtractSchedule(session.summary)}
              >
                <Ionicons name="calendar-outline" size={11} color={COLORS.primary} />
                <Text style={styles.extractBtnText}>일정 추출</Text>
              </TouchableOpacity>
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

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

export default function MeetingDetailScreen({ route, navigation }) {
  const { meetingId } = route.params;
  const { getMeetingById, addMeetingSession, updateMeetingSession } = useAppContext();

  const [screenState, setScreenState] = useState(ScreenState.IDLE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // { uri, name, size }
  const [scheduleModal, setScheduleModal] = useState({ visible: false, schedules: [] });

  const recordingRef = useRef(null); // expo-av Recording 객체
  const timerRef = useRef(null);

  const meeting = getMeetingById(meetingId);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // 진행 중 녹음이 있으면 중지
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

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

  const isIdle = screenState === ScreenState.IDLE;
  const isFileSelected = screenState === ScreenState.FILE_SELECTED;
  const isRecording = screenState === ScreenState.RECORDING;
  const isSummarizing = screenState === ScreenState.SUMMARIZING;

  // ─── 일정 추출 핸들러 ──────────────────────────────────────────────────────

  const handleExtractSchedule = (summaryText) => {
    const schedules = extractSchedules(summaryText);
    setScheduleModal({ visible: true, schedules });
  };

  // ─── 마이크 권한 요청 ──────────────────────────────────────────────────────

  async function requestMicPermission() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '마이크 권한 필요',
        '회의 녹음을 위해 마이크 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.',
        [{ text: '확인' }]
      );
      return false;
    }
    return true;
  }

  // ─── 회의 시작 (녹음) ─────────────────────────────────────────────────────

  const handleStartMeeting = () => {
    Alert.alert(
      '회의 시작',
      `'${meeting.name}' 회의를 시작할까요?\nAI가 회의를 기록하고 요약해드릴게요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작',
          onPress: async () => {
            // 마이크 권한 확인
            const permitted = await requestMicPermission();
            if (!permitted) return;

            try {
              // 오디오 모드 설정 (iOS 녹음용)
              await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
              });

              // 녹음 시작
              const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
              );
              recordingRef.current = recording;

              // 세션 생성
              const session = addMeetingSession(meetingId);
              setCurrentSessionId(session.id);

              // 타이머 시작
              setElapsedSeconds(0);
              timerRef.current = setInterval(() => {
                setElapsedSeconds((s) => s + 1);
              }, 1000);

              setScreenState(ScreenState.RECORDING);
            } catch (error) {
              Alert.alert('녹음 시작 실패', `오류: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // ─── 회의 종료 ─────────────────────────────────────────────────────────────

  const handleStopMeeting = () => {
    Alert.alert(
      '회의 종료',
      `회의를 종료하고 AI 요약을 생성할까요?\n(소요시간: ${formatTimer(elapsedSeconds)})`,
      [
        { text: '계속 진행', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: async () => {
            // 타이머 중지
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            const finalSeconds = elapsedSeconds;

            // 녹음 중지 및 파일 URI 획득
            let audioUri = null;
            try {
              if (recordingRef.current) {
                await recordingRef.current.stopAndUnloadAsync();
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                audioUri = recordingRef.current.getURI();
                recordingRef.current = null;
              }
            } catch (e) {
              console.warn('녹음 중지 오류:', e);
            }

            // 녹음 파일 URI를 얻지 못한 경우 요약 불가
            if (!audioUri) {
              Alert.alert('녹음 오류', '녹음 파일을 저장하지 못했어요. 다시 시도해주세요.');
              setScreenState(ScreenState.IDLE);
              setCurrentSessionId(null);
              setElapsedSeconds(0);
              return;
            }

            await runSummarize(currentSessionId, audioUri, finalSeconds, null);
          },
        },
      ]
    );
  };

  // ─── 파일 선택 ─────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile({ uri: file.uri, name: file.name, size: file.size });
      setScreenState(ScreenState.FILE_SELECTED);
    } catch (error) {
      Alert.alert('파일 선택 실패', `오류: ${error.message}`);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    setScreenState(ScreenState.IDLE);
  };

  // ─── 파일 업로드로 AI 요약 시작 ───────────────────────────────────────────

  const handleStartSummarizeFromFile = async () => {
    if (!selectedFile) return;

    // 세션 생성
    const session = addMeetingSession(meetingId);
    setCurrentSessionId(session.id);

    await runSummarize(session.id, selectedFile.uri, 0, selectedFile.name);
  };

  // ─── 공통 요약 처리 ────────────────────────────────────────────────────────

  async function runSummarize(sessionId, audioUri, durationSeconds, fileName) {
    setScreenState(ScreenState.SUMMARIZING);
    setSelectedFile(null);

    try {
      const result = await uploadAndSummarize(
        meetingId,
        sessionId,
        audioUri,
        durationSeconds,
        fileName
      );

      updateMeetingSession(meetingId, sessionId, {
        status: 'completed',
        duration: result.duration,
        summary: result.summary,
        ...(fileName ? { sourceType: 'upload', fileName } : {}),
      });

      setScreenState(ScreenState.IDLE);
      setCurrentSessionId(null);
      setElapsedSeconds(0);
    } catch (error) {
      setScreenState(ScreenState.IDLE);
      const errMsg = error.message?.includes('시간이 초과')
        ? '서버 응답 시간이 초과됐어요.\nWi-Fi 연결 및 서버 상태를 확인해주세요.'
        : error.message?.includes('요약 조회')
        ? '요약 데이터를 불러오지 못했어요.\n같은 회의를 중복 분석했거나 서버 오류일 수 있어요.\n잠시 후 다시 시도해주세요.'
        : `AI 요약 생성에 실패했어요.\n세션은 저장되었습니다.\n\n오류: ${error.message}`;
      Alert.alert('요약 실패', errMsg);
      updateMeetingSession(meetingId, sessionId, {
        status: 'failed',
        duration: durationSeconds > 0 ? formatTimer(durationSeconds) : null,
        summary: null,
        ...(fileName ? { sourceType: 'upload', fileName } : {}),
      });
      setCurrentSessionId(null);
      setElapsedSeconds(0);
    }
  }

  // ─── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <SummarizingModal visible={isSummarizing} />
      <ScheduleModal
        visible={scheduleModal.visible}
        schedules={scheduleModal.schedules}
        onClose={() => setScheduleModal({ visible: false, schedules: [] })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── 회의 정보 카드 ── */}
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

          <View style={styles.participantsSection}>
            <View style={styles.participantsSectionHeader}>
              <Ionicons name="people-outline" size={15} color={COLORS.subtext} />
              <Text style={styles.participantsSectionLabel}>참여자 {meeting.participants.length}명</Text>
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

        {/* ── 컨트롤 영역 ── */}

        {isIdle && (
          <View style={styles.controlArea}>
            {/* 회의 시작 (녹음) */}
            <TouchableOpacity
              style={styles.startMeetingBtn}
              onPress={handleStartMeeting}
              activeOpacity={0.88}
            >
              <View style={styles.startMeetingInner}>
                <View style={styles.startMeetingIconWrap}>
                  <Ionicons name="mic" size={26} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.startMeetingTitle}>회의 시작</Text>
                  <Text style={styles.startMeetingDesc}>마이크로 녹음 후 AI가 자동 요약해드려요</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>또는</Text>
              <View style={styles.orLine} />
            </View>

            {/* 파일 업로드 */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickFile}
              activeOpacity={0.85}
            >
              <View style={styles.uploadBtnLeft}>
                <View style={styles.uploadIconWrap}>
                  <Ionicons name="folder-open-outline" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.uploadBtnTitle}>녹음 파일 업로드</Text>
                  <Text style={styles.uploadBtnDesc}>저장된 녹음 파일로 AI 요약을 만들어요</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
            </TouchableOpacity>
          </View>
        )}

        {isFileSelected && selectedFile && (
          <View style={styles.controlArea}>
            {/* 선택된 파일 정보 */}
            <View style={styles.fileSelectedCard}>
              <View style={styles.fileSelectedHeader}>
                <View style={styles.fileIconWrap}>
                  <Ionicons name="musical-note" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                  {selectedFile.size ? (
                    <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={handleCancelFile} style={styles.fileCancelBtn}>
                  <Ionicons name="close-circle" size={22} color={COLORS.subtext} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 파일 변경 버튼 */}
            <TouchableOpacity style={styles.changeFileBtn} onPress={handlePickFile} activeOpacity={0.75}>
              <Ionicons name="swap-horizontal-outline" size={15} color={COLORS.primary} />
              <Text style={styles.changeFileBtnText}>다른 파일 선택</Text>
            </TouchableOpacity>

            {/* AI 요약 시작 버튼 */}
            <TouchableOpacity
              style={styles.startSummarizeBtn}
              onPress={handleStartSummarizeFromFile}
              activeOpacity={0.88}
            >
              <View style={styles.startMeetingInner}>
                <View style={styles.startMeetingIconWrap}>
                  <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.startMeetingTitle}>AI 요약 시작</Text>
                  <Text style={styles.startMeetingDesc}>선택한 파일로 요약을 생성해드려요</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* 취소 */}
            <TouchableOpacity style={styles.cancelTextBtn} onPress={handleCancelFile}>
              <Text style={styles.cancelTextBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingCard}>
            <View style={styles.recordingHeader}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingLabel}>녹음 중</Text>
            </View>
            <Text style={styles.recordingTimer}>{formatTimer(elapsedSeconds)}</Text>
            <Text style={styles.recordingSubLabel}>AI가 회의를 기록하고 있어요</Text>

            <TouchableOpacity
              style={styles.stopBtn}
              onPress={handleStopMeeting}
              activeOpacity={0.88}
            >
              <View style={styles.stopBtnIconWrap}>
                <Ionicons name="stop" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.stopBtnTitle}>회의 종료</Text>
                <Text style={styles.stopBtnDesc}>종료 후 AI 요약이 생성돼요</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 회의 기록 목록 ── */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>회의 기록</Text>
          {meeting.sessions.length === 0 ? (
            <View style={styles.emptySessionCard}>
              <Ionicons name="document-outline" size={36} color={COLORS.border} />
              <Text style={styles.emptySessionTitle}>아직 진행된 회의가 없어요</Text>
              <Text style={styles.emptySessionDesc}>위의 버튼으로 회의를 시작하거나{'\n'}녹음 파일을 업로드해보세요</Text>
            </View>
          ) : (
            meeting.sessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                total={meeting.sessions.length}
                onExtractSchedule={handleExtractSchedule}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: COLORS.subtext },
  goBackText: { color: COLORS.primary, marginTop: 12, fontSize: 15, fontWeight: '600' },

  // ── 회의 정보 카드 ──
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  infoCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  meetingAvatarWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  meetingAvatarText: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  infoCardText: { flex: 1 },
  meetingNameLarge: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  meetingCreateDate: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },
  descriptionBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  descriptionText: { fontSize: 13, color: COLORS.subtext, lineHeight: 19 },
  participantsSection: { marginBottom: 16 },
  participantsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  participantsSectionLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  participantsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
    borderRadius: 20, paddingVertical: 5, paddingLeft: 6, paddingRight: 12, gap: 6,
  },
  participantChipAvatar: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  participantChipAvatarText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  participantChipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  statDivider: { width: 1, height: '80%', backgroundColor: COLORS.border, alignSelf: 'center' },

  // ── 컨트롤 영역 ──
  controlArea: { marginBottom: 24 },

  // 회의 시작 버튼
  startMeetingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, borderRadius: 20, padding: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  startMeetingInner: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  startMeetingIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  startMeetingTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  startMeetingDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // 또는 구분선
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { fontSize: 12, color: COLORS.subtext, fontWeight: '500' },

  // 파일 업로드 버튼
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  uploadBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  uploadIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  uploadBtnDesc: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },

  // 파일 선택 완료 카드
  fileSelectedCard: {
    backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#C7D2FE',
  },
  fileSelectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  fileSize: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  fileCancelBtn: { padding: 2 },

  changeFileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, marginBottom: 12,
  },
  changeFileBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  startSummarizeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#7C3AED', borderRadius: 20, padding: 20,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  cancelTextBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelTextBtnText: { fontSize: 14, color: COLORS.subtext, fontWeight: '500' },

  // 녹음 중 카드
  recordingCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, marginBottom: 24,
    alignItems: 'center', borderWidth: 2, borderColor: '#FCA5A5',
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  recordingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error },
  recordingLabel: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  recordingTimer: {
    fontSize: 52, fontWeight: '800', color: COLORS.text, letterSpacing: -1, marginBottom: 6,
  },
  recordingSubLabel: { fontSize: 13, color: COLORS.subtext, marginBottom: 24 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.error, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24, width: '100%',
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  stopBtnIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stopBtnTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  stopBtnDesc: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // ── AI 요약 로딩 모달 ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 20,
  },
  aiBadgeLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  aiBadgeLargeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  modalTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8,
    textAlign: 'center', minHeight: 24,
  },
  modalDesc: {
    fontSize: 13, color: COLORS.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  modalProgressBar: {
    width: '100%', height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden',
  },
  modalProgressFill: {
    width: '60%', height: '100%', backgroundColor: COLORS.primary, borderRadius: 2,
  },

  // ── 세션 목록 ──
  sessionsSection: { marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  emptySessionCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center',
  },
  emptySessionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.subtext, marginTop: 12 },
  emptySessionDesc: { fontSize: 12, color: '#A0AEC0', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  sessionCard: { flexDirection: 'row', marginBottom: 4 },
  timelineCol: { width: 24, alignItems: 'center', marginRight: 14 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border,
    borderWidth: 2, borderColor: COLORS.border, marginTop: 6,
  },
  timelineDotActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4, minHeight: 20 },
  sessionContent: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  sessionStatusBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, gap: 5,
  },
  badgeOngoing: { backgroundColor: '#F0FDF4' },
  badgeCompleted: { backgroundColor: '#F1F5F9' },
  badgeFailed: { backgroundColor: '#FEF2F2' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: COLORS.success },
  statusDotCompleted: { backgroundColor: COLORS.subtext },
  statusDotFailed: { backgroundColor: COLORS.error },
  timelineDotFailed: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  sessionStatusText: { fontSize: 11, fontWeight: '700' },
  ongoingText: { color: COLORS.success },
  completedText: { color: COLORS.subtext },
  failedText: { color: COLORS.error },
  sessionDate: { fontSize: 11, color: COLORS.subtext },
  sessionInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  sessionInfoText: { fontSize: 12, color: COLORS.subtext, flex: 1 },
  summaryBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#A855F7',
  },
  summaryHeader: { marginBottom: 6 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#A855F7',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, gap: 3, alignSelf: 'flex-start',
  },
  aiBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  summaryText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  summaryBoxPlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
  },
  summaryPlaceholderText: { fontSize: 13, color: COLORS.warning, fontWeight: '500' },

  // ── 일정 추출 버튼 (세션 카드 내) ──
  extractBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  extractBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },

  // ── 일정 추출 모달 ──
  scheduleOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  scheduleSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 34, maxHeight: '75%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  scheduleHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  scheduleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleHeaderIcon: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  scheduleTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scheduleCloseBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  scheduleEmpty: { alignItems: 'center', paddingVertical: 40 },
  scheduleEmptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.subtext, marginTop: 12 },
  scheduleEmptyDesc: { fontSize: 12, color: '#A0AEC0', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  scheduleList: { flex: 1 },
  scheduleHint: {
    fontSize: 12, color: COLORS.subtext, marginBottom: 12,
    paddingHorizontal: 2, fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scheduleItemLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  scheduleItemDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
    marginTop: 5, flexShrink: 0,
  },
  scheduleItemText: { fontSize: 13, color: COLORS.text, lineHeight: 19, flex: 1 },
  scheduleItemAction: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    marginLeft: 8, flexShrink: 0,
  },
  scheduleItemActionText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});
