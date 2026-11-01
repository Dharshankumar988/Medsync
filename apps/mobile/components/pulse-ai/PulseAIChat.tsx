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
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
  Send,
  Paperclip,
  Sparkles,
  Bot,
  RotateCcw,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { aiService } from '../../services/ai.service';
import { PulseAIIcon } from './PulseAIIcon';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
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

const MARKDOWN_STYLES = {
  body: { fontSize: 14.5, lineHeight: 21 },
  code_block: { backgroundColor: '#1E293B', color: '#F8FAFC', padding: 10, borderRadius: 10 },
  code_inline: { backgroundColor: 'rgba(37, 99, 235, 0.08)', borderRadius: 4, paddingHorizontal: 4 },
  heading1: { fontSize: 18, fontWeight: '800' as const, marginVertical: 6 },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
};

export function PulseAIChat({ role = 'patient' }: PulseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **Pulse AI**, your dedicated MedSync clinical health assistant.\n\nAsk me about your symptoms, prescriptions, or tap the paperclip to upload a medical scan for analysis.',
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
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

      let receivedChunks = '';
      aiService.streamChat(
        role,
        userMessage.content,
        null,
        (chunk) => {
          receivedChunks += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + chunk } : m))
          );
        },
        () => setIsLoading(false),
        async () => {
          if (!receivedChunks) {
            try {
              const data = await aiService.chat(role, userMessage.content, null);
              if (data?.reply) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, content: data.reply } : m))
                );
                setIsLoading(false);
                return;
              }
            } catch (chatErr) {
              console.warn('Fallback direct AI chat failed:', chatErr);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content:
                        '⚠️ Unable to reach Pulse AI server. Please verify your internet connection or backend status.',
                    }
                  : m
              )
            );
          }
          setIsLoading(false);
        }
      );
    },
    [input, isLoading, role]
  );

  const handleAttachImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const imageUri = result.assets[0].uri;
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: '📎 [Medical Scan Attached for Analysis]',
          imageUri,
        };

        setMessages((prev) => [...prev, userMsg]);
        setAnalyzingImage(true);

        const aiMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'assistant',
            content: '🔬 *Analyzing scan against medical vision model...*',
          },
        ]);

        try {
          const analysisResult = await aiService.analyzeImage(imageUri, 'scan');
          const summary =
            analysisResult?.findings ||
            analysisResult?.summary ||
            analysisResult?.analysis ||
            JSON.stringify(analysisResult, null, 2);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: `### 🩺 Vision Scan Analysis Report\n\n${summary}\n\n*Note: Image analysis is for patient guidance only. Always review results with your consulting physician.*`,
                  }
                : m
            )
          );
        } catch (e: any) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content:
                      '⚠️ Image analysis service is currently unavailable. Please verify connection to `/ai/analyze-image`.',
                  }
                : m
            )
          );
        } finally {
          setAnalyzingImage(false);
        }
      }
    } catch (e) {
      console.warn('Scan attachment error:', e);
    }
  }, []);

  const handleResetChat = () => {
    Alert.alert('Clear Chat History', 'Do you want to reset your Pulse AI consultation session?', [
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
                'Chat cleared. How can I assist you with your health today?',
            },
          ]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header Disclaimer & Clear Button */}
      <View style={styles.topBar}>
        <View style={styles.disclaimerBox}>
          <ShieldAlert size={14} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            Informational assistant only. For urgent emergencies, use SOS on Home.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetChat}>
          <RotateCcw size={16} color="#64748B" />
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
            <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}>
              {!isUser && (
                <View style={styles.aiAvatar}>
                  <Sparkles size={16} color="#FFFFFF" />
                </View>
              )}

              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                <Markdown
                  style={{
                    ...MARKDOWN_STYLES,
                    body: {
                      ...MARKDOWN_STYLES.body,
                      color: isUser ? '#FFFFFF' : '#0F172A',
                    },
                  }}
                >
                  {item.content}
                </Markdown>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() =>
          isLoading || analyzingImage ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.typingText}>
                {analyzingImage ? 'Reviewing medical image...' : 'Pulse AI is analyzing...'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && (
        <View style={styles.promptContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptScroll}>
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptChip}
                onPress={() => sendMessage(prompt)}
                activeOpacity={0.8}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          onPress={handleAttachImage}
          style={styles.attachBtn}
          accessibilityLabel="Attach Medical Image"
        >
          <ImageIcon size={20} color="#2563EB" />
        </TouchableOpacity>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Pulse AI about your health..."
          placeholderTextColor="#94A3B8"
          style={styles.textInput}
          multiline
        />

        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={[styles.sendBtn, input.trim() && !isLoading ? styles.sendBtnActive : styles.sendBtnDisabled]}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 11.5,
    color: '#2563EB',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  resetBtn: {
    padding: 8,
    marginLeft: 8,
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
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.12)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12.5,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
  promptContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  promptScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 90,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendBtnActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
