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
import {
  uploadAndSummarize,
  analyzeAndFetch,
  fetchTranscript,
  fetchRecordings,
  fetchEvents,
  fetchTasks,
  getRecordingPresignedUrl,
} from '../services/api';

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

const ScreenState = {
  IDLE: 'idle',
  FILE_SELECTED: 'file_selected',
  RECORDING: 'recording',
  SUMMARIZING: 'summarizing',
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

// ISO 날짜 문자열 → Google Calendar 형식 "YYYYMMDDTHHmmss"
function toGCalDate(isoString) {
  if (!isoString) return null;
  // "2026-03-30T18:00:00" → "20260330T180000"
  return isoString.replace(/[-:]/g, '').split('.')[0];
}

function openGoogleCalendar(title, details, startAt, endAt) {
  const t = encodeURIComponent(title.slice(0, 80));
  const d = encodeURIComponent(details || title);
  const start = toGCalDate(startAt);
  const end = toGCalDate(endAt);
  const dates = start ? `&dates=${start}/${end || start}` : '';
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&details=${d}${dates}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('오류', 'Google 캘린더를 열 수 없어요.\n앱 또는 브라우저를 확인해주세요.')
  );
}

// ─── AI 요약 로딩 모달 ────────────────────────────────────────────────────────

function SummarizingModal({ visible }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setDotCount((d) => (d % 3) + 1), 500);
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
            STT 변환 → AI 요약 순서로 처리됩니다.{'\n'}1~2분 정도 소요될 수 있어요.
          </Text>
          <View style={styles.modalProgressBar}>
            <View style={styles.modalProgressFill} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── 오디오 플레이어 ──────────────────────────────────────────────────────────

function AudioPlayer({ recordingId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  const handleTogglePlay = async () => {
    if (isLoading) return;

    // 재생 중이면 정지
    if (isPlaying && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      // Presigned URL 조회
      const data = await getRecordingPresignedUrl(recordingId);
      const presignedUrl = data.presignedUrl;

      // 오디오 재생 모드 설정
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // 사운드 로드 & 재생
      const { sound } = await Audio.Sound.createAsync(
        { uri: presignedUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);

      // 재생 완료 콜백
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      Alert.alert('재생 실패', `녹음 파일을 재생할 수 없어요.\n${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <TouchableOpacity style={styles.audioPlayerBtn} onPress={handleTogglePlay} activeOpacity={0.8}>
      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Ionicons
          name={isPlaying ? 'stop-circle' : 'play-circle'}
          size={22}
          color={isPlaying ? COLORS.error : COLORS.primary}
        />
      )}
      <Text style={[styles.audioPlayerText, isPlaying && { color: COLORS.error }]}>
        {isLoading ? '로딩 중...' : isPlaying ? '재생 중 (탭하면 정지)' : '녹음 듣기'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── 세션 카드 ────────────────────────────────────────────────────────────────

function SessionCard({ session, index, total, onRetryAnalyze }) {
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
        {/* 녹음 재생 버튼 */}
        {session.recordingId && !isOngoing && (
          <AudioPlayer recordingId={session.recordingId} />
        )}
        {/* AI 분석 재시도 버튼 - 업로드는 성공했으나 분석 실패 시 */}
        {isFailed && session.recordingId && onRetryAnalyze && (
          <TouchableOpacity
            style={styles.retryAnalyzeBtn}
            onPress={() => onRetryAnalyze(session.id, session.recordingId)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={15} color={COLORS.primary} />
            <Text style={styles.retryAnalyzeBtnText}>AI 분석 재시도</Text>
          </TouchableOpacity>
        )}
        {session.summary ? (
          <View style={styles.summaryBox}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI 요약</Text>
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

// ─── 백엔드 분석 결과 섹션 ────────────────────────────────────────────────────

function AnalysisSection({ meetingId }) {
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showSegments, setShowSegments] = useState(false);
  const [showAllSegments, setShowAllSegments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [t, r, e, ta] = await Promise.all([
        fetchTranscript(meetingId),
        fetchRecordings(meetingId),
        fetchEvents(meetingId),
        fetchTasks(meetingId),
      ]);
      if (!cancelled) {
        setTranscript(t);
        setRecordings(Array.isArray(r) ? r : []);
        setEvents(Array.isArray(e) ? e : []);
        setTasks(Array.isArray(ta) ? ta : []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [meetingId]);

  if (loading) {
    return (
      <View style={styles.analysisLoading}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.analysisLoadingText}>분석 결과 불러오는 중...</Text>
      </View>
    );
  }

  const hasData = transcript || recordings.length > 0 || events.length > 0 || tasks.length > 0;
  if (!hasData) return null;

  return (
    <View style={styles.analysisSection}>
      <Text style={styles.sectionTitle}>AI 분석 결과</Text>

      {/* 녹음 파일 재생 */}
      {recordings.length > 0 && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <Ionicons name="mic-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.analysisCardTitle}>녹음 파일 ({recordings.length}개)</Text>
          </View>
          {recordings.map((rec, idx) => (
            <View key={rec.recordingId || idx} style={styles.recordingItem}>
              <View style={styles.recordingInfo}>
                <Text style={styles.recordingName}>
                  녹음 #{idx + 1}
                  {rec.status ? ` · ${rec.status}` : ''}
                </Text>
                {rec.fileSize ? (
                  <Text style={styles.recordingMeta}>{formatFileSize(rec.fileSize)}</Text>
                ) : null}
              </View>
              {rec.recordingId && (
                <AudioPlayer recordingId={rec.recordingId} />
              )}
            </View>
          ))}
        </View>
      )}

      {/* AI 요약 */}
      {transcript?.summary && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI 요약</Text>
            </View>
          </View>
          <Text style={styles.summaryText}>{transcript.summary}</Text>
        </View>
      )}

      {/* 키워드 */}
      {Array.isArray(transcript?.keywords) && transcript.keywords.length > 0 && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
            <Text style={styles.analysisCardTitle}>핵심 키워드</Text>
          </View>
          <View style={styles.keywordsRow}>
            {transcript.keywords.map((kw, i) => (
              <View key={i} style={styles.keywordChip}>
                <Text style={styles.keywordText}>{typeof kw === 'string' ? kw : kw.keyword || kw.word || String(kw)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 화자별 발화 */}
      {Array.isArray(transcript?.segments) && transcript.segments.length > 0 && (
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisCardHeader}
            onPress={() => setShowSegments(!showSegments)}
          >
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.analysisCardTitle}>화자별 발화 ({transcript.segments.length}개)</Text>
            <Ionicons
              name={showSegments ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.subtext}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
          {showSegments && (showAllSegments ? transcript.segments : transcript.segments.slice(0, 30)).map((seg, i) => (
            <View key={seg.id || i} style={styles.segmentRow}>
              <View style={styles.segmentSpeakerBadge}>
                <Text style={styles.segmentSpeaker}>{seg.speakerLabel || '?'}</Text>
              </View>
              <Text style={styles.segmentContent}>{seg.content}</Text>
            </View>
          ))}
          {showSegments && transcript.segments.length > 30 && (
            <TouchableOpacity
              style={styles.segmentToggleBtn}
              onPress={() => setShowAllSegments((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={showAllSegments ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.segmentToggleBtnText}>
                {showAllSegments
                  ? '접기'
                  : `전체 보기 (${transcript.segments.length - 30}개 더)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 추출된 일정 */}
      {events.length > 0 && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.analysisCardTitle}>추출된 일정 ({events.length}개)</Text>
          </View>
          {events.map((ev, i) => (
            <TouchableOpacity
              key={ev.id || i}
              style={styles.eventItem}
              onPress={() => openGoogleCalendar(ev.title, ev.description, ev.startAt, ev.endAt)}
              activeOpacity={0.75}
            >
              <View style={styles.eventItemLeft}>
                <View style={[styles.eventDot, { backgroundColor: ev.color || COLORS.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.startAt && (
                    <Text style={styles.eventDate}>{formatDateTime(ev.startAt)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.calendarAddBtn}>
                <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                <Text style={styles.calendarAddText}>추가</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 할 일 */}
      {tasks.length > 0 && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisCardHeader}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
            <Text style={styles.analysisCardTitle}>할 일 ({tasks.length}개)</Text>
          </View>
          {tasks.map((task, i) => (
            <View key={task.id || i} style={styles.taskItem}>
              <View style={styles.taskDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.description ? (
                  <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                ) : null}
                {task.dueDate ? (
                  <Text style={styles.taskDue}>마감: {formatDateTime(task.dueDate)}</Text>
                ) : null}
              </View>
              <View style={[styles.taskStatusBadge,
                task.status === 'DONE' ? styles.taskDone : styles.taskTodo
              ]}>
                <Text style={[styles.taskStatusText,
                  task.status === 'DONE' ? { color: COLORS.success } : { color: COLORS.subtext }
                ]}>
                  {task.status === 'DONE' ? '완료' : 'TODO'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // AnalysisSection 새로고침용

  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  const meeting = getMeetingById(meetingId);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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

  // ─── 마이크 권한 요청 ──────────────────────────────────────────────────────

  async function requestMicPermission() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('마이크 권한 필요', '회의 녹음을 위해 마이크 접근 권한이 필요합니다.');
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
            const permitted = await requestMicPermission();
            if (!permitted) return;
            try {
              await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
              });
              const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
              );
              recordingRef.current = recording;
              const session = addMeetingSession(meetingId);
              setCurrentSessionId(session.id);
              setElapsedSeconds(0);
              timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
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
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            const finalSeconds = elapsedSeconds;
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
            if (!audioUri) {
              Alert.alert('녹음 오류', '녹음 파일을 저장하지 못했어요. 다시 시도해주세요.');
              setScreenState(ScreenState.IDLE);
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
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
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

  const handleStartSummarizeFromFile = async () => {
    if (!selectedFile) return;
    const session = addMeetingSession(meetingId);
    setCurrentSessionId(session.id);
    await runSummarize(session.id, selectedFile.uri, 0, selectedFile.name);
  };

  // ─── AI 분석 재시도 ────────────────────────────────────────────────────────

  const handleRetryAnalyze = async (sessionId, recordingId) => {
    setScreenState(ScreenState.SUMMARIZING);
    try {
      const result = await analyzeAndFetch(meetingId, recordingId);
      updateMeetingSession(meetingId, sessionId, {
        status: 'completed',
        summary: result.summary,
        keywords: result.keywords,
        segments: result.segments,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const errMsg = error.message?.includes('시간이 초과')
        ? '서버 응답 시간이 초과됐어요. 잠시 후 다시 시도해주세요.'
        : `AI 분석 재시도에 실패했어요.\n\n오류: ${error.message}`;
      Alert.alert('재시도 실패', errMsg);
    } finally {
      setScreenState(ScreenState.IDLE);
    }
  };

  // ─── 공통 요약 처리 ────────────────────────────────────────────────────────

  async function runSummarize(sessionId, audioUri, durationSeconds, fileName) {
    setScreenState(ScreenState.SUMMARIZING);
    setSelectedFile(null);
    try {
      const result = await uploadAndSummarize(meetingId, sessionId, audioUri, durationSeconds, fileName);
      updateMeetingSession(meetingId, sessionId, {
        status: 'completed',
        duration: result.duration,
        summary: result.summary,
        recordingId: result.recordingId,  // 재생용 ID 저장
        keywords: result.keywords,
        segments: result.segments,
        ...(fileName ? { sourceType: 'upload', fileName } : {}),
      });
      setScreenState(ScreenState.IDLE);
      setCurrentSessionId(null);
      setElapsedSeconds(0);
      // AnalysisSection 새로고침
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setScreenState(ScreenState.IDLE);
      // 업로드는 성공했으나 분석 실패인 경우 recordingId가 에러에 첨부됨
      const partialRecordingId = error.recordingId || null;
      const errMsg = error.message?.includes('시간이 초과')
        ? '서버 응답 시간이 초과됐어요.\nWi-Fi 연결 및 서버 상태를 확인해주세요.'
        : error.message?.includes('AI 분석')
        ? '녹음 업로드는 완료됐으나 AI 분석에 실패했어요.\n잠시 후 세션의 "AI 분석 재시도" 버튼을 눌러보세요.\n\n(백엔드 오류: AssemblyAI 연동 문제)'
        : error.message?.includes('요약 조회')
        ? '요약 데이터를 불러오지 못했어요.\n잠시 후 다시 시도해주세요.'
        : `AI 요약 생성에 실패했어요.\n\n오류: ${error.message}`;
      Alert.alert('요약 실패', errMsg);
      updateMeetingSession(meetingId, sessionId, {
        status: 'failed',
        duration: durationSeconds > 0 ? formatTimer(durationSeconds) : null,
        recordingId: partialRecordingId, // 업로드 성공 시 저장 (재생·재시도용)
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
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meeting.sessions.length}</Text>
              <Text style={styles.statLabel}>세션</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{meeting.sessions.filter((s) => s.status === 'completed').length}</Text>
              <Text style={styles.statLabel}>완료</Text>
            </View>
          </View>
        </View>

        {/* ── 컨트롤 영역 ── */}
        {isIdle && (
          <View style={styles.controlArea}>
            <TouchableOpacity style={styles.startMeetingBtn} onPress={handleStartMeeting} activeOpacity={0.88}>
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

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>또는</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickFile} activeOpacity={0.85}>
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
            <View style={styles.fileSelectedCard}>
              <View style={styles.fileSelectedHeader}>
                <View style={styles.fileIconWrap}>
                  <Ionicons name="musical-note" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                  {selectedFile.size ? <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text> : null}
                </View>
                <TouchableOpacity onPress={handleCancelFile} style={styles.fileCancelBtn}>
                  <Ionicons name="close-circle" size={22} color={COLORS.subtext} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.changeFileBtn} onPress={handlePickFile} activeOpacity={0.75}>
              <Ionicons name="swap-horizontal-outline" size={15} color={COLORS.primary} />
              <Text style={styles.changeFileBtnText}>다른 파일 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startSummarizeBtn} onPress={handleStartSummarizeFromFile} activeOpacity={0.88}>
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
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopMeeting} activeOpacity={0.88}>
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

        {/* ── 백엔드 분석 결과 (transcript / recordings / events / tasks) ── */}
        <AnalysisSection key={refreshKey} meetingId={meetingId} />

        {/* ── 로컬 세션 목록 ── */}
        {meeting.sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={styles.sectionTitle}>최근 세션</Text>
            {meeting.sessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                total={meeting.sessions.length}
                onRetryAnalyze={handleRetryAnalyze}
              />
            ))}
          </View>
        )}
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
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  statDivider: { width: 1, height: '80%', backgroundColor: COLORS.border, alignSelf: 'center' },

  // ── 컨트롤 영역 ──
  controlArea: { marginBottom: 24 },
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
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { fontSize: 12, color: COLORS.subtext, fontWeight: '500' },
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
  fileSelectedCard: {
    backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#C7D2FE',
  },
  fileSelectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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

  // ── 녹음 중 카드 ──
  recordingCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, marginBottom: 24,
    alignItems: 'center', borderWidth: 2, borderColor: '#FCA5A5',
  },
  recordingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error },
  recordingLabel: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  recordingTimer: { fontSize: 52, fontWeight: '800', color: COLORS.text, letterSpacing: -1, marginBottom: 6 },
  recordingSubLabel: { fontSize: 13, color: COLORS.subtext, marginBottom: 24 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.error, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24, width: '100%',
  },
  stopBtnIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stopBtnTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  stopBtnDesc: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // ── AI 요약 로딩 모달 ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalCard: {
    backgroundColor: COLORS.surface, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%',
  },
  aiBadgeLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16,
  },
  aiBadgeLargeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 13, color: COLORS.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalProgressBar: { width: '100%', height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  modalProgressFill: { width: '60%', height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },

  // ── 오디오 플레이어 ──
  audioPlayerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, alignSelf: 'flex-start',
  },
  audioPlayerText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  retryAnalyzeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary,
    paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, alignSelf: 'flex-start',
  },
  retryAnalyzeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // ── 분석 결과 섹션 ──
  analysisSection: { marginBottom: 24 },
  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  analysisLoadingText: { fontSize: 13, color: COLORS.subtext },
  analysisCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  analysisCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  analysisCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },

  // 녹음 목록
  recordingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  recordingInfo: { flex: 1 },
  recordingName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  recordingMeta: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },

  // AI 요약
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#A855F7',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, gap: 3, alignSelf: 'flex-start',
  },
  aiBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  summaryBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#A855F7' },
  summaryText: { fontSize: 13, color: COLORS.text, lineHeight: 20, marginTop: 8 },
  summaryBoxPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12 },
  summaryPlaceholderText: { fontSize: 13, color: COLORS.warning, fontWeight: '500' },

  // 키워드
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keywordChip: {
    backgroundColor: '#EEF2FF', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  keywordText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // 화자별 발화
  segmentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  segmentSpeakerBadge: {
    backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  segmentSpeaker: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  segmentContent: { fontSize: 12, color: COLORS.text, lineHeight: 18, flex: 1 },
  segmentMore: { fontSize: 12, color: COLORS.subtext, textAlign: 'center', paddingTop: 8 },
  segmentToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 4,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  segmentToggleBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // 일정
  eventItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  eventItemLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  eventDate: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  calendarAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8,
  },
  calendarAddText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // 할 일
  taskItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginTop: 5, flexShrink: 0 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  taskDesc: { fontSize: 12, color: COLORS.subtext, marginTop: 2, lineHeight: 17 },
  taskDue: { fontSize: 11, color: COLORS.warning, marginTop: 3 },
  taskStatusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  taskTodo: { backgroundColor: '#F1F5F9' },
  taskDone: { backgroundColor: '#D1FAE5' },
  taskStatusText: { fontSize: 11, fontWeight: '700' },

  // ── 세션 목록 ──
  sessionsSection: { marginTop: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  sessionCard: { flexDirection: 'row', marginBottom: 4 },
  timelineCol: { width: 24, alignItems: 'center', marginRight: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border, borderWidth: 2, borderColor: COLORS.border, marginTop: 6 },
  timelineDotActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  timelineDotFailed: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4, minHeight: 20 },
  sessionContent: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sessionStatusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 5 },
  badgeOngoing: { backgroundColor: '#F0FDF4' },
  badgeCompleted: { backgroundColor: '#F1F5F9' },
  badgeFailed: { backgroundColor: '#FEF2F2' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: COLORS.success },
  statusDotCompleted: { backgroundColor: COLORS.subtext },
  statusDotFailed: { backgroundColor: COLORS.error },
  sessionStatusText: { fontSize: 11, fontWeight: '700' },
  ongoingText: { color: COLORS.success },
  completedText: { color: COLORS.subtext },
  failedText: { color: COLORS.error },
  sessionDate: { fontSize: 11, color: COLORS.subtext },
  sessionInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  sessionInfoText: { fontSize: 12, color: COLORS.subtext, flex: 1 },
});
