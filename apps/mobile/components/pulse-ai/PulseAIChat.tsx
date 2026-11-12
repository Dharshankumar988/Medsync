import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import {
  Send,
  RotateCcw,
  Paperclip,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { aiService } from '../../services/ai.service';
import { useTheme } from '../../context/ThemeContext';

interface BoundingBox {
  coordinates?: number[];
  bbox?: number[];
  class?: string;
  confidence?: number;
}

interface ScanResult {
  diagnosis?: string;
  predicted_class?: string;
  confidence?: number;
  confidence_percent?: number;
  boxes?: BoundingBox[];
  summary?: string;
  recommendations?: string[];
  scan_type?: string;
  analysis?: string;
  data?: {
    diagnosis?: string;
    predicted_class?: string;
    confidence?: number;
    confidence_percent?: number;
    boxes?: BoundingBox[];
    summary?: string;
    recommendations?: string[];
    scan_type?: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  scanResult?: ScanResult;
}

interface PulseAIChatProps {
  role?: 'doctor' | 'patient' | 'pharmacy' | 'admin';
}

const QUICK_PROMPTS = [
  '💊 Explain my medication schedule & side effects',
  '🩺 What do these symptoms typically indicate?',
  '📋 Explain my recent lab results in simple terms',
  '🥗 What foods should I avoid with antibiotics?',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCAN_VIEWER_WIDTH = Math.min(SCREEN_WIDTH - 80, 280);

/** Renders bounding boxes over a scan image using SVG overlay aligned pixel-for-pixel */
function ScanViewer({ imageUri, boxes, diagnosis }: {
  imageUri: string;
  boxes: BoundingBox[];
  diagnosis?: string;
}) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState({
    width: SCAN_VIEWER_WIDTH,
    height: Math.round(SCAN_VIEWER_WIDTH * 0.75),
  });

  const resolvedBoxes = boxes.filter((b) => {
    const coords = b?.coordinates || b?.bbox;
    return Array.isArray(coords) && coords.length >= 4;
  });

  return (
    <View
      style={{
        width: renderedSize.width,
        height: renderedSize.height,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#09090B',
        alignSelf: 'center',
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: renderedSize.width, height: renderedSize.height }}
        resizeMode="stretch"
        onLoad={(e) => {
          const src = e.nativeEvent?.source;
          if (src?.width && src?.height) {
            setNaturalSize({ width: src.width, height: src.height });
            const aspect = src.height / src.width;
            const maxH = 260;
            let w = SCAN_VIEWER_WIDTH;
            let h = Math.round(w * aspect);
            if (h > maxH) {
              h = maxH;
              w = Math.round(h / aspect);
            }
            setRenderedSize({ width: Math.max(120, w), height: Math.max(100, h) });
          }
        }}
      />
      {resolvedBoxes.length > 0 && (
        <Svg
          style={{ position: 'absolute', top: 0, left: 0 }}
          width={renderedSize.width}
          height={renderedSize.height}
          viewBox={`0 0 ${renderedSize.width} ${renderedSize.height}`}
        >
          {resolvedBoxes.map((rawBox, i) => {
            const coords = rawBox?.coordinates || rawBox?.bbox || [0, 0, 0, 0];
            const rawX1 = Number(coords[0]);
            const rawY1 = Number(coords[1]);
            const rawX2 = Number(coords[2]);
            const rawY2 = Number(coords[3]);

            const maxVal = Math.max(rawX1, rawY1, rawX2, rawY2);
            let nx1 = rawX1;
            let ny1 = rawY1;
            let nx2 = rawX2;
            let ny2 = rawY2;

            if (maxVal > 1.05) {
              const refW = naturalSize.width > 0 ? naturalSize.width : Math.max(640, rawX1, rawX2);
              const refH = naturalSize.height > 0 ? naturalSize.height : Math.max(640, rawY1, rawY2);
              const denomW = Math.max(refW, rawX1, rawX2);
              const denomH = Math.max(refH, rawY1, rawY2);
              nx1 = rawX1 / denomW;
              nx2 = rawX2 / denomW;
              ny1 = rawY1 / denomH;
              ny2 = rawY2 / denomH;
            }

            const left = Math.max(0, Math.min(1, Math.min(nx1, nx2)));
            const right = Math.max(0, Math.min(1, Math.max(nx1, nx2)));
            const top = Math.max(0, Math.min(1, Math.min(ny1, ny2)));
            const bottom = Math.max(0, Math.min(1, Math.max(ny1, ny2)));

            const x1 = left * renderedSize.width;
            const y1 = top * renderedSize.height;
            const x2 = right * renderedSize.width;
            const y2 = bottom * renderedSize.height;
            const bw = Math.max(12, x2 - x1);
            const bh = Math.max(12, y2 - y1);
            const clampedX2 = Math.min(renderedSize.width, x1 + bw);
            const clampedY2 = Math.min(renderedSize.height, y1 + bh);

            const label = rawBox?.class || diagnosis || `ROI #${i + 1}`;
            const cornerLen = Math.min(bw * 0.25, bh * 0.25, 14);
            const labelInside = y1 < 22;
            const badgeY = labelInside ? y1 + 3 : y1 - 20;
            const badgeW = Math.min(label.length * 6.8 + 14, renderedSize.width - x1 - 4);

            return (
              <React.Fragment key={i}>
                {/* Solid border highlight region */}
                <Rect
                  x={x1} y={y1} width={clampedX2 - x1} height={clampedY2 - y1}
                  fill="rgba(239, 68, 68, 0.14)"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                {/* Crisp targeting corner accents */}
                <Line x1={x1} y1={y1} x2={x1 + cornerLen} y2={y1} stroke="#f87171" strokeWidth={3} />
                <Line x1={x1} y1={y1} x2={x1} y2={y1 + cornerLen} stroke="#f87171" strokeWidth={3} />
                <Line x1={clampedX2} y1={y1} x2={clampedX2 - cornerLen} y2={y1} stroke="#f87171" strokeWidth={3} />
                <Line x1={clampedX2} y1={y1} x2={clampedX2} y2={y1 + cornerLen} stroke="#f87171" strokeWidth={3} />
                <Line x1={x1} y1={clampedY2} x2={x1 + cornerLen} y2={clampedY2} stroke="#f87171" strokeWidth={3} />
                <Line x1={x1} y1={clampedY2} x2={x1} y2={clampedY2 - cornerLen} stroke="#f87171" strokeWidth={3} />
                <Line x1={clampedX2} y1={clampedY2} x2={clampedX2 - cornerLen} y2={clampedY2} stroke="#f87171" strokeWidth={3} />
                <Line x1={clampedX2} y1={clampedY2} x2={clampedX2} y2={clampedY2 - cornerLen} stroke="#f87171" strokeWidth={3} />
                {/* Label badge */}
                <Rect
                  x={Math.min(x1, renderedSize.width - badgeW - 2)}
                  y={badgeY}
                  width={Math.max(40, badgeW)}
                  height={18}
                  fill="rgba(9, 9, 11, 0.92)"
                  stroke="#ef4444"
                  strokeWidth={1}
                  rx={4}
                />
                <SvgText
                  x={Math.min(x1, renderedSize.width - badgeW - 2) + 6}
                  y={badgeY + 12.5}
                  fill="#fca5a5"
                  fontSize={10}
                  fontWeight="bold"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Scan analysis result card */
function ScanResultCard({ scanResult, imageUri, theme, isDark }: {
  scanResult: ScanResult;
  imageUri: string;
  theme: any;
  isDark: boolean;
}) {
  const result: any = scanResult?.data || scanResult;
  const prediction = result?.prediction || result;
  const details = prediction?.details || {};
  const explanation = result?.patient_explanation || result?.clinical_summary || {};
  const diagnosis = prediction?.diagnosis || prediction?.predicted_class || details?.diagnosis || 'Analysis Complete';
  const confidencePct =
    prediction?.confidence_percent ??
    (prediction?.confidence ? Math.round(prediction.confidence * 100) : null);
  const boxes: BoundingBox[] = prediction?.boxes || details?.boxes || result?.boxes || [];
  const summary = explanation?.summary || result?.summary;
  const recommendations: string[] =
    explanation?.recommended_next_steps || explanation?.recommendations || result?.recommendations || [];

  const isAbnormal = diagnosis && !diagnosis.toLowerCase().includes('normal') &&
    !diagnosis.toLowerCase().includes('no fracture') &&
    !diagnosis.toLowerCase().includes('benign');

  return (
    <View style={[scanStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Image + bounding boxes */}
      <ScanViewer imageUri={imageUri} boxes={boxes} diagnosis={diagnosis} />

      {/* Classification badge */}
      <View style={[
        scanStyles.diagnosisBadge,
        {
          backgroundColor: isAbnormal
            ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
            : (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5'),
          borderColor: isAbnormal
            ? (isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5')
            : (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0'),
        }
      ]}>
        {isAbnormal
          ? <AlertTriangle size={14} color="#EF4444" />
          : <CheckCircle2 size={14} color="#10B981" />}
        <Text style={[scanStyles.diagnosisText, { color: isAbnormal ? '#EF4444' : '#10B981' }]}>
          {diagnosis}
        </Text>
        {confidencePct != null && (
          <Text style={[scanStyles.confText, { color: isDark ? '#71717A' : '#94A3B8' }]}>
            {confidencePct}% confidence
          </Text>
        )}
      </View>

      {/* Summary */}
      {summary ? (
        <Text style={[scanStyles.summary, { color: theme.textSecondary }]}>{summary}</Text>
      ) : null}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={scanStyles.recoList}>
          {recommendations.slice(0, 3).map((r, i) => (
            <View key={i} style={scanStyles.recoRow}>
              <Text style={[scanStyles.recoBullet, { color: '#38BDF8' }]}>•</Text>
              <Text style={[scanStyles.recoText, { color: theme.textSecondary }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {boxes.length > 0 && (
        <Text style={[scanStyles.roiHint, { color: isDark ? '#52525B' : '#94A3B8' }]}>
          🎯 {boxes.length} region{boxes.length > 1 ? 's' : ''} of interest detected
        </Text>
      )}
    </View>
  );
}

export function PulseAIChat({ role = 'patient' }: PulseAIChatProps) {
  const { theme, isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **Pulse AI**, your dedicated MedSync clinical health assistant.\n\nAsk me about your symptoms, prescriptions, or tap the 📎 to upload a medical scan for analysis.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(
    (textToSend?: string) => {
      const messageContent = (textToSend || input).trim();
      if (!messageContent || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const aiMsgId = (Date.now() + 1).toString();
      let hasAddedAssistantMsg = false;

      aiService.streamChat(
        role,
        userMessage.content,
        null,
        (chunk) => {
          if (!hasAddedAssistantMsg) {
            hasAddedAssistantMsg = true;
            setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: chunk }]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + chunk } : m))
            );
          }
        },
        () => setIsLoading(false),
        (err) => {
          console.warn('Pulse AI chat error:', err);
          if (!hasAddedAssistantMsg) {
            setMessages((prev) => [
              ...prev,
              {
                id: aiMsgId,
                role: 'assistant',
                content: 'I encountered a temporary connection issue. Please try again.',
              },
            ]);
          }
          setIsLoading(false);
        }
      );
    },
    [input, isLoading, role]
  );

  const handleResetChat = () => {
    Alert.alert('Clear Chat', 'Start a fresh conversation with Pulse AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content:
                'Hello! I am **Pulse AI**, your dedicated MedSync clinical health assistant.\n\nAsk me about your symptoms, prescriptions, or tap the 📎 to upload a medical scan for analysis.',
            },
          ]);
        },
      },
    ]);
  };

  const handleAttachImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAnalyzingImage(true);
        const imageUri = result.assets[0].uri;

        // Show the user message immediately with image
        const userMsgId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          {
            id: userMsgId,
            role: 'user',
            content: 'Please analyze this medical scan.',
            imageUri,
          },
        ]);

        try {
          const rawResult: ScanResult = await aiService.analyzeImage(imageUri, 'bone');

          // Extract structured prediction & explanation from backend ImageAnalysisResponse
          const resultData: any = rawResult?.data || rawResult;
          const prediction = resultData?.prediction || resultData;
          const explanation = resultData?.patient_explanation || resultData?.clinical_summary || {};
          const diagnosis = prediction?.diagnosis || prediction?.predicted_class || 'Analysis complete';
          const confidencePct =
            prediction?.confidence_percent ??
            (prediction?.confidence ? Math.round(prediction.confidence * 100) : null);
          const summary = explanation?.summary || resultData?.summary || rawResult?.analysis;

          let replyText = `**Scan Analysis — ${diagnosis}**`;
          if (confidencePct != null) {
            replyText += `\n\nConfidence: **${confidencePct}%**`;
          }
          if (summary) {
            replyText += `\n\n${summary}`;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: replyText,
              imageUri,
              scanResult: rawResult,
            },
          ]);
        } catch (analyzeErr: any) {
          const isForbidden = analyzeErr?.status === 403;
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: isForbidden
                ? 'Diagnostic radiology scan analysis (`/ai/analyze-image`) is restricted to licensed physicians. You can upload your scan to your **Medical Records** vault for your doctor to review, or ask me about any diagnostic report terms right here!'
                : `I could not analyze the scan at this time. ${analyzeErr?.message || 'Please try again.'}`,
            },
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err?.message || 'Could not open image picker.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  const markdownStyles = {
    body: {
      fontSize: 14.5,
      lineHeight: 21,
      color: theme.text,
    },
    code_block: {
      backgroundColor: isDark ? '#121215' : '#1E293B',
      color: '#FAFAFA',
      padding: 10,
      borderRadius: 10,
    },
    code_inline: {
      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.08)',
      color: isDark ? '#38BDF8' : '#0284C7',
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    heading1: {
      fontSize: 17,
      fontWeight: '800' as const,
      marginVertical: 6,
      color: theme.text,
    },
    heading2: {
      fontSize: 15,
      fontWeight: '700' as const,
      marginVertical: 4,
      color: theme.text,
    },
    bullet_list: { marginVertical: 4 },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Controls Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            justifyContent: 'flex-end',
            paddingVertical: 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetChat} activeOpacity={0.75}>
          <RotateCcw size={15} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>New Consultation</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {!isUser && (
                <View
                  style={[
                    styles.aiAvatar,
                    {
                      backgroundColor: isDark ? '#27272A' : '#09090B',
                      borderColor: theme.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Sparkles size={16} color="#38BDF8" />
                </View>
              )}

              <View style={[styles.messageCol, isUser && styles.messageColUser]}>
                {/* User image preview */}
                {isUser && item.imageUri && (
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.userImagePreview}
                    resizeMode="cover"
                  />
                )}

                {/* Scan result card for AI messages */}
                {!isUser && item.scanResult && item.imageUri && (
                  <ScanResultCard
                    scanResult={item.scanResult}
                    imageUri={item.imageUri}
                    theme={theme}
                    isDark={isDark}
                  />
                )}

                {/* Text bubble */}
                {item.content ? (
                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.bubbleUser, { backgroundColor: isDark ? '#FAFAFA' : '#09090B' }]
                        : [styles.bubbleAi, { backgroundColor: theme.card, borderColor: theme.border }],
                    ]}
                  >
                    <Markdown
                      style={{
                        ...markdownStyles,
                        body: {
                          ...markdownStyles.body,
                          color: isUser
                            ? isDark ? '#09090B' : '#FFFFFF'
                            : theme.text,
                        },
                      }}
                    >
                      {item.content}
                    </Markdown>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListFooterComponent={() =>
          isLoading || analyzingImage ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={[styles.typingText, { color: theme.textMuted }]}>
                {analyzingImage ? 'Analyzing medical scan...' : 'Pulse AI is thinking...'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && (
        <View
          style={[
            styles.promptContainer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptScroll}
          >
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => sendMessage(prompt)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.promptChipText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        {/* Attach image button */}
        <TouchableOpacity
          onPress={handleAttachImage}
          style={[
            styles.attachBtn,
            { backgroundColor: isDark ? '#27272A' : '#F4F4F5', borderColor: theme.border },
          ]}
          accessibilityLabel="Attach Medical Scan"
        >
          <Paperclip size={18} color={isDark ? '#A1A1AA' : '#71717A'} />
        </TouchableOpacity>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Pulse AI about your health..."
          placeholderTextColor={isDark ? '#52525B' : '#94A3B8'}
          style={[
            styles.textInput,
            {
              backgroundColor: isDark ? '#18181B' : '#F9FAFB',
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          multiline
        />

        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={[
            styles.sendBtn,
            input.trim() && !isLoading
              ? { backgroundColor: theme.primaryButton }
              : { backgroundColor: isDark ? '#27272A' : '#E4E4E7' },
          ]}
        >
          <Send
            size={17}
            color={
              input.trim() && !isLoading
                ? theme.primaryButtonText
                : isDark ? '#52525B' : '#A1A1AA'
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageCol: {
    maxWidth: '84%',
    gap: 8,
  },
  messageColUser: {
    alignItems: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  userImagePreview: {
    width: 180,
    height: 140,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12.5,
    marginLeft: 8,
    fontWeight: '500',
  },
  promptContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  promptScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const scanStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 10,
    padding: 10,
    maxWidth: SCAN_VIEWER_WIDTH + 20,
  },
  diagnosisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  diagnosisText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  confText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summary: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  recoList: {
    gap: 4,
  },
  recoRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  recoBullet: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: -1,
  },
  recoText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  roiHint: {
    fontSize: 11,
    fontWeight: '500',
  },
});
